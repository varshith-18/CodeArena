const { randomUUID } = require("node:crypto");
const { spawn } = require("node:child_process");
const acorn = require("acorn");
const traceLimits = require("../config/traceLimits");
const { serializeTrace } = require("./jsTraceSerializer");

const TRACE_IMAGE = process.env.JS_TRACE_IMAGE || "node:20-alpine";

const unsupportedPattern =
  /\b(import|export|await|async|class|eval|Function|require|process|globalThis|Deno|fetch|WebAssembly)\b|import\s*\(/;

function validateTraceRequest({ sourceCode, functionName, args }) {
  if (typeof sourceCode !== "string" || !sourceCode.trim()) {
    throw new Error("Source code is required.");
  }

  if (Buffer.byteLength(sourceCode, "utf8") > traceLimits.sourceSizeBytes) {
    throw new Error(
      `Source code must be ${traceLimits.sourceSizeBytes} bytes or fewer.`,
    );
  }

  if (
    typeof functionName !== "string" ||
    !/^[$A-Z_a-z][$\w]*$/.test(functionName)
  ) {
    throw new Error("A valid JavaScript function name is required.");
  }

  if (!Array.isArray(args)) {
    throw new Error("Trace arguments must be an array.");
  }
}

function patternNames(node) {
  if (!node) return [];
  if (node.type === "Identifier") return [node.name];
  if (node.type === "RestElement") return patternNames(node.argument);
  if (node.type === "AssignmentPattern") return patternNames(node.left);
  if (node.type === "ArrayPattern") {
    return node.elements.flatMap(patternNames);
  }
  if (node.type === "ObjectPattern") {
    return node.properties.flatMap((property) =>
      property.type === "Property"
        ? patternNames(property.value)
        : patternNames(property.argument),
    );
  }
  return [];
}

function walkAst(node, callback) {
  if (!node || typeof node !== "object") return;
  callback(node);

  for (const [key, value] of Object.entries(node)) {
    if (key === "loc" || key === "start" || key === "end") continue;
    if (Array.isArray(value)) {
      for (const child of value) walkAst(child, callback);
    } else {
      walkAst(value, callback);
    }
  }
}

function collectFunctionScopes(ast) {
  const scopes = [];
  const functionTypes = new Set([
    "FunctionDeclaration",
    "FunctionExpression",
    "ArrowFunctionExpression",
  ]);

  walkAst(ast, (node) => {
    if (!functionTypes.has(node.type)) return;

    const variables = new Map();
    for (const parameter of node.params || []) {
      for (const name of patternNames(parameter)) {
        variables.set(name, node.loc.start.line);
      }
    }

    function collectDeclarations(child) {
      if (!child || typeof child !== "object") return;
      if (
        child !== node &&
        functionTypes.has(child.type)
      ) {
        return;
      }

      if (child.type === "VariableDeclarator") {
        for (const name of patternNames(child.id)) {
          if (!variables.has(name) && child.loc?.start?.line) {
            variables.set(name, child.loc.start.line);
          }
        }
      }

      for (const [key, value] of Object.entries(child)) {
        if (key === "loc" || key === "start" || key === "end") continue;
        if (Array.isArray(value)) {
          for (const item of value) collectDeclarations(item);
        } else {
          collectDeclarations(value);
        }
      }
    }

    collectDeclarations(node.body);

    scopes.push({
      startLine: node.loc.start.line,
      endLine: node.loc.end.line,
      variables,
    });
  });

  return scopes;
}

function collectGlobalVariables(ast) {
  const variables = new Map();
  const functionTypes = new Set([
    "FunctionDeclaration",
    "FunctionExpression",
    "ArrowFunctionExpression",
  ]);

  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (
      functionTypes.has(node.type) &&
      node !== ast
    ) {
      if (node.type === "FunctionDeclaration" && node.id?.name) {
        variables.set(node.id.name, node.loc.start.line);
      }
      return;
    }

    if (node.type === "VariableDeclarator") {
      for (const name of patternNames(node.id)) {
        if (!variables.has(name) && node.loc?.start?.line) {
          variables.set(name, node.loc.start.line);
        }
      }
    }

    for (const [key, value] of Object.entries(node)) {
      if (key === "loc" || key === "start" || key === "end") continue;
      if (Array.isArray(value)) {
        for (const child of value) visit(child);
      } else {
        visit(value);
      }
    }
  }

  visit(ast);
  return variables;
}

function instrumentSource(sourceCode) {
  let ast;
  try {
    ast = acorn.parse(sourceCode, {
      ecmaVersion: "latest",
      sourceType: "script",
      locations: true,
      allowAwaitOutsideFunction: false,
    });
  } catch (error) {
    const unsupportedLine = error.loc
      ? ` at line ${error.loc.line}, column ${error.loc.column + 1}`
      : "";
    const parserError = new Error(
      `Unsupported JavaScript syntax${unsupportedLine}: ${error.message}`,
    );
    parserError.code = "UNSUPPORTED_SYNTAX";
    throw parserError;
  }

  const callExpressions = [];
  walkAst(ast, (node) => {
    if (node.type !== "CallExpression") return;
    callExpressions.push(node);
  });

  const replacements = callExpressions
    .map((node) => {
      const args = node.arguments
        .map((argument) => sourceCode.slice(argument.start, argument.end))
        .join(",");
      let invocation;

      if (node.callee.type === "MemberExpression") {
        const objectText = sourceCode.slice(
          node.callee.object.start,
          node.callee.object.end,
        );
        if (node.callee.computed) {
          const propertyText = sourceCode.slice(
            node.callee.property.start,
            node.callee.property.end,
          );
          invocation = `(${objectText}[${propertyText}].call(${objectText},${args}))`;
        } else {
          const propertyText = sourceCode.slice(
            node.callee.property.start,
            node.callee.property.end,
          );
          invocation = `(${objectText}.${propertyText}.call(${objectText},${args}))`;
        }
      } else {
        const calleeText = sourceCode.slice(
          node.callee.start,
          node.callee.end,
        );
        invocation = `(${calleeText})(${args})`;
      }

      return {
        start: node.start,
        end: node.end,
        invocation,
      };
    })
    .sort((a, b) => b.start - a.start);

  for (const replacement of replacements) {
    const wrapped =
      "(globalThis.__codeArenaEnter(),(()=>{try{return " +
      replacement.invocation +
      "}finally{globalThis.__codeArenaExit()}})())";
    sourceCode =
      sourceCode.slice(0, replacement.start) +
      wrapped +
      sourceCode.slice(replacement.end);
  }

  try {
    ast = acorn.parse(sourceCode, {
      ecmaVersion: "latest",
      sourceType: "script",
      locations: true,
      allowAwaitOutsideFunction: false,
    });
  } catch (error) {
    const unsupportedLine = error.loc
      ? ` at line ${error.loc.line}, column ${error.loc.column + 1}`
      : "";
    throw new Error(
      `Unsupported JavaScript syntax after tracing instrumentation${unsupportedLine}: ${error.message}`,
    );
  }

  const executableTypes = new Set([
    "VariableDeclaration",
    "ExpressionStatement",
    "IfStatement",
    "ForStatement",
    "ForInStatement",
    "ForOfStatement",
    "WhileStatement",
    "DoWhileStatement",
    "SwitchStatement",
    "ReturnStatement",
    "ThrowStatement",
    "FunctionDeclaration",
  ]);
  const executableLines = new Set();

  walkAst(ast, (node) => {
    if (executableTypes.has(node.type) && node.loc?.start?.line) {
      executableLines.add(node.loc.start.line);
    }
  });

  const functionScopes = collectFunctionScopes(ast);
  const globalVariables = collectGlobalVariables(ast);
  const lines = sourceCode.split("\n");

  for (let index = lines.length - 1; index >= 0; index--) {
    const lineNumber = index + 1;
    if (!executableLines.has(lineNumber)) continue;

    const containingScopes = functionScopes
      .filter(
        (scope) =>
          lineNumber > scope.startLine && lineNumber <= scope.endLine,
      )
      .sort((a, b) => b.startLine - a.startLine);
    const scope = containingScopes[0];
    const names = new Map(globalVariables);

    if (scope) {
      for (const [name, declarationLine] of scope.variables) {
        if (
          declarationLine <= lineNumber ||
          scope.startLine < lineNumber
        ) {
          names.set(name, declarationLine);
        }
      }
    }

    const availableNames = [...names.entries()]
      .filter(([, declarationLine]) => declarationLine < lineNumber)
      .map(([name]) => name)
      .filter((name, position, all) => all.indexOf(name) === position);

    const variableObject =
      availableNames.length === 0
        ? "{}"
        : `{${availableNames
            .map(
              (name) =>
                `${JSON.stringify(name)}:(typeof ${name} !== "undefined"?${name}:null)`,
            )
            .join(",")}}`;

    lines[index] =
      `globalThis.__codeArenaTrace(${lineNumber},${variableObject});\n${lines[index]}`;
  }

  return lines.join("\n");
}

const RUNNER_SOURCE = String.raw`
const fs = require("node:fs");
const limits = __LIMITS__;

let payloadInput = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => payloadInput += chunk);
process.stdin.on("end", () => {
  let payload;
  try {
    payload = JSON.parse(payloadInput);
  } catch {
    process.stdout.write(JSON.stringify({
      status: "runtime_error",
      error: "Invalid trace runner payload.",
      steps: []
    }));
    process.exit(2);
  }

  const source = payload.sourceCode || "";
  fs.writeFileSync(
    "/tmp/user.js",
    source +
      "\nmodule.exports={__traceFunction:typeof " +
      payload.functionName +
      "==='function'?" +
      payload.functionName +
      ":null};"
  );

  const steps = [];
  let stepCount = 0;
  let previousVariables = {};
  let previousDepth = 0;
  let codeArenaDepth = 0;

  globalThis.__codeArenaEnter = () => {
    codeArenaDepth += 1;
    if (codeArenaDepth > limits.maxDepth) {
      const error = new Error("__CODEARENA_DEPTH_LIMIT__");
      error.code = "DEPTH_LIMIT";
      throw error;
    }
  };
  globalThis.__codeArenaExit = () => {
    codeArenaDepth = Math.max(0, codeArenaDepth - 1);
  };

  function cloneValue(value, seen = new WeakSet(), depth = 0) {
    if (value === null) return { type: "null", value: "null" };
    if (typeof value === "undefined") return { type: "undefined", value: "undefined" };
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return { type: typeof value, value: String(value).slice(0, limits.maxValuePreviewBytes) };
    }
    if (typeof value === "bigint") return { type: "bigint", value: String(value).slice(0, limits.maxValuePreviewBytes) };
    if (typeof value === "function") return { type: "function", description: "Function" };
    if (typeof value !== "object") return { type: typeof value, value: String(value).slice(0, limits.maxValuePreviewBytes) };
    if (seen.has(value)) return { type: "object", description: "Circular" };
    if (depth > 3) return { type: "object", description: "Depth limited" };

    seen.add(value);
    if (Array.isArray(value)) {
      return {
        type: "array",
        length: value.length,
        preview: value.slice(0, limits.maxArrayPreviewItems).map(item =>
          cloneValue(item, seen, depth + 1)
        )
      };
    }

    const keys = Object.keys(value).slice(0, limits.maxObjectPreviewProperties);
    return {
      type: "object",
      description: "Object",
      preview: keys.join(", ").slice(0, limits.maxValuePreviewBytes)
    };
  }

  function parseCallStack() {
    const stack = String(new Error().stack || "")
      .split("\n")
      .slice(1)
      .map(line => line.trim())
      .filter(line => line.includes("/tmp/user.js"));
    return stack.slice(0, limits.maxCallFrames).map((line, index) => {
      const match = line.match(/at (.+?) \(.+?:(\d+):(\d+)\)|at (.+?):(\d+):(\d+)/);
      return {
        name: (match && (match[1] || match[4])) || "(anonymous)",
        line: match ? Number(match[2] || match[5]) : null,
        column: match ? Number(match[3] || match[6]) : null,
        depth: index
      };
    });
  }

  globalThis.__codeArenaTrace = (line, variables) => {
    stepCount += 1;
    if (stepCount > limits.maxSteps) {
      const error = new Error("__CODEARENA_STEP_LIMIT__");
      error.code = "STEP_LIMIT";
      throw error;
    }

    const callStack = parseCallStack();
    if (callStack.length > limits.maxDepth) {
      const error = new Error("__CODEARENA_DEPTH_LIMIT__");
      error.code = "DEPTH_LIMIT";
      throw error;
    }

    const serializedVariables = [];
    for (const [name, value] of Object.entries(variables || {}).slice(0, limits.maxVariables)) {
      serializedVariables.push({
        name,
        value: cloneValue(value)
      });
    }

    const changedVariables = [];
    for (const variable of serializedVariables) {
      const signature = JSON.stringify(variable.value);
      if (previousVariables[variable.name] !== signature) {
        changedVariables.push(variable.name);
      }
    }
    previousVariables = {};
    for (const variable of serializedVariables) {
      previousVariables[variable.name] = JSON.stringify(variable.value);
    }

    const depth = callStack.length;
    const event = depth > previousDepth
      ? "function-enter"
      : depth < previousDepth
        ? "function-return"
        : "line";
    previousDepth = depth;

    steps.push({
      id: stepCount,
      line,
      column: null,
      event,
      reason: "probe",
      changedVariables,
      variables: serializedVariables,
      callStack
    });
  };

  try {
    console.log = () => {};
    console.error = () => {};

    const loaded = require("/tmp/user.js");
    const target = loaded.__traceFunction;
    if (typeof target !== "function") {
      throw new Error("Function not found: " + payload.functionName);
    }

    const value = target(...payload.args);
    const resultJson = JSON.stringify({
      status: "completed",
      result: cloneValue(value),
      error: null,
      unsupported: [],
      steps
    });
    process.stdout.write(resultJson, () => process.exit(0));
  } catch (error) {
    if (error && error.code === "STEP_LIMIT") {
      const json = JSON.stringify({
        status: "step_limit",
        error: "Maximum trace step count exceeded.",
        steps
      });
      process.stdout.write(json, () => process.exit(124));
      return;
    }
    if (error && error.code === "DEPTH_LIMIT") {
      const json = JSON.stringify({
        status: "depth_limit",
        error: "Maximum call depth exceeded.",
        steps
      });
      process.stdout.write(json, () => process.exit(124));
      return;
    }

    const json = JSON.stringify({
      status: "runtime_error",
      error: (error && error.message ? error.message : String(error)).slice(0, 2000),
      steps
    });
    process.stdout.write(json, () => process.exit(125));
  }
});
`;

function runDockerTrace(payload) {
  return new Promise((resolve, reject) => {
    const containerName =
      `codearena-trace-${process.pid}-${randomUUID().replace(/-/g, "")}`;
    const runnerSource = RUNNER_SOURCE.replace(
      "__LIMITS__",
      JSON.stringify(traceLimits),
    );

    const args = [
      "run",
      "--rm",
      "--name",
      containerName,
      "--network",
      "none",
      "--read-only",
      "--memory",
      `${Math.floor(traceLimits.memoryBytes / 1024 / 1024)}m`,
      "--memory-swap",
      `${Math.floor(traceLimits.memoryBytes / 1024 / 1024)}m`,
      "--cpus",
      "1",
      "--pids-limit",
      "32",
      "--cap-drop",
      "ALL",
      "--security-opt",
      "no-new-privileges",
      "--tmpfs",
      "/tmp:rw,noexec,nosuid,size=16m,mode=1777",
      "--init",
      "--user",
      "65534:65534",
      "-i",
      TRACE_IMAGE,
      "node",
      "--stack-size=256",
      "-e",
      runnerSource,
    ];

    const child = spawn("docker", args, {
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
      if (Buffer.byteLength(stdout, "utf8") > traceLimits.maxTraceBytes * 2) {
        child.kill("SIGKILL");
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    const timeout = setTimeout(() => {
      settled = true;
      child.kill("SIGKILL");
      spawn("docker", ["stop", containerName], {
        windowsHide: true,
        stdio: "ignore",
      });
      resolve({
        status: "timeout",
        error: "JavaScript trace exceeded the execution timeout.",
        steps: [],
      });
    }, traceLimits.timeoutMs);

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);

      const trimmed = stdout.trim();
      if (!trimmed) {
        reject(
          new Error(
            `Tracing engine returned no output${
              stderr ? `: ${stderr.trim().slice(0, 1000)}` : "."
            }`,
          ),
        );
        return;
      }

      try {
        resolve(JSON.parse(trimmed));
      } catch {
        reject(
          new Error(
            `Tracing engine returned invalid JSON${
              stderr ? `: ${stderr.trim().slice(0, 1000)}` : "."
            }`,
          ),
        );
      }
    });

    child.stdin.end(JSON.stringify(payload));
  });
}

async function traceJavaScript({ sourceCode, functionName, args = [] }) {
  validateTraceRequest({ sourceCode, functionName, args });

  const unsupportedMatches = sourceCode.match(unsupportedPattern);
  if (unsupportedMatches) {
    return serializeTrace({
      status: "unsupported_construct",
      unsupported: [
        ...new Set(unsupportedMatches.map((value) => value.trim())),
      ].slice(0, 20),
      error: "This JavaScript construct is outside the tracing subset.",
      steps: [],
    });
  }

  let instrumentedSource;
  try {
    instrumentedSource = instrumentSource(sourceCode);
  } catch (error) {
    if (error.code === "UNSUPPORTED_SYNTAX") {
      return serializeTrace({
        status: "unsupported_syntax",
        error: error.message,
        unsupported: [],
        steps: [],
      });
    }
    throw error;
  }

  const raw = await runDockerTrace({
    sourceCode: instrumentedSource,
    functionName,
    args,
  });
  return serializeTrace(raw);
}

module.exports = {
  traceJavaScript,
  validateTraceRequest,
  instrumentSource,
};
