const acorn = require("acorn");

const DEFAULT_AST_LIMITS = Object.freeze({
  sourceSizeBytes: 20_000,
  maxAstNodes: 4_000,
  maxDepth: 40,
  maxAstDepth: 40,
  maxCallDepth: 40,
  maxArrayLength: 10_000,
  maxObjectProperties: 1_000,
  maxEnvironmentBindings: 500,
  maxRuntimeValues: 50_000,
  maxStringBytes: 20_000,
  maxExecutionSteps: 10_000,
  maxTraceSteps: 2_000,
  maxTraceVariables: 200,
  maxTraceFrames: 40,
  maxTraceScopes: 20,
  maxTraceArrayPreview: 100,
  maxTraceObjectProperties: 50,
  maxTracePreviewDepth: 4,
  maxTracePreviewBytes: 4_096,
  maxTraceBytes: 1024 * 1024,
});

const LIMIT_CEILINGS = Object.freeze({
  sourceSizeBytes: 1_048_576,
  maxAstNodes: 100_000,
  maxDepth: 1_000,
  maxAstDepth: 1_000,
  maxCallDepth: 1_000,
  maxArrayLength: 100_000,
  maxObjectProperties: 10_000,
  maxEnvironmentBindings: 10_000,
  maxRuntimeValues: 1_000_000,
  maxStringBytes: 1_048_576,
  maxExecutionSteps: 1_000_000,
  maxTraceSteps: 100_000,
  maxTraceVariables: 10_000,
  maxTraceFrames: 1_000,
  maxTraceScopes: 1_000,
  maxTraceArrayPreview: 10_000,
  maxTraceObjectProperties: 10_000,
  maxTracePreviewDepth: 64,
  maxTracePreviewBytes: 1_048_576,
  maxTraceBytes: 16_777_216,
});

const SUPPORTED_NODE_TYPES = new Set([
  "Program",
  "BlockStatement",
  "EmptyStatement",
  "ExpressionStatement",
  "VariableDeclaration",
  "VariableDeclarator",
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
  "IfStatement",
  "SwitchStatement",
  "SwitchCase",
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
  "WhileStatement",
  "DoWhileStatement",
  "BreakStatement",
  "ContinueStatement",
  "LabeledStatement",
  "ReturnStatement",
  "ThrowStatement",
  "Identifier",
  "Literal",
  "ArrayExpression",
  "ObjectExpression",
  "Property",
  "UnaryExpression",
  "UpdateExpression",
  "BinaryExpression",
  "LogicalExpression",
  "AssignmentExpression",
  "ConditionalExpression",
  "SequenceExpression",
  "CallExpression",
  "MemberExpression",
  "ThisExpression",
]);

const FORBIDDEN_IDENTIFIERS = new Set([
  "process",
  "require",
  "module",
  "exports",
  "global",
  "globalThis",
  "Deno",
  "Buffer",
  "console",
  "fetch",
  "WebAssembly",
  "eval",
  "Function",
  "Proxy",
  "Reflect",
  "crypto",
]);

const UNSUPPORTED_OPERATORS = new Set([
  "delete",
  "in",
  "instanceof",
  "=>",
]);

class UnsupportedSyntaxError extends SyntaxError {
  constructor(message, node = null) {
    super(message);
    this.name = "UnsupportedSyntaxError";
    this.node = node
      ? {
          type: node.type,
          line: node.loc?.start?.line ?? null,
          column: node.loc?.start?.column ?? null,
        }
      : null;
  }
}

class AstLimitError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "AstLimitError";
    this.details = details;
  }
}

class RuntimePrimitive {
  constructor(type, value) {
    this.kind = "primitive";
    this.type = type;
    this.value = value;
  }
}

class RuntimeArray {
  constructor(elements = []) {
    this.kind = "array";
    this.elements = elements;
  }
}

class RuntimeObject {
  constructor(properties = new Map()) {
    this.kind = "object";
    this.properties = properties;
  }
}

class RuntimeFunction {
  constructor(node, lexicalEnvironment, name = null) {
    this.kind = "function";
    this.node = node;
    this.lexicalEnvironment = lexicalEnvironment;
    this.name = name || node.id?.name || null;
  }
}

class LexicalEnvironment {
  constructor(parent = null, limits = DEFAULT_AST_LIMITS, traceIdState = null) {
    limits = normalizeExecutionLimits(limits);
    this.parent = parent;
    this.bindings = new Map();
    this.constBindings = new Set();
    this.limits = limits;
    this._traceIdState =
      traceIdState || parent?._traceIdState || { next: 1 };
    this._traceId = this._traceIdState.next++;
  }

  define(name, value, mutable = true) {
    if (typeof name !== "string" || !name) {
      throw new Error("A binding name is required.");
    }

    if (this.bindings.has(name)) {
      this.bindings.set(name, value);
      if (!mutable) this.constBindings.add(name);
      else this.constBindings.delete(name);
      return;
    }

    if (this.bindings.size >= this.limits.maxEnvironmentBindings) {
      throw new AstLimitError(
        "Environment binding limit exceeded.",
        { limit: this.limits.maxEnvironmentBindings },
      );
    }

    this.bindings.set(name, value);
    if (!mutable) this.constBindings.add(name);
    else this.constBindings.delete(name);
  }

  has(name) {
    if (this.bindings.has(name)) return true;
    return this.parent ? this.parent.has(name) : false;
  }

  get(name) {
    if (this.bindings.has(name)) return this.bindings.get(name);
    if (this.parent) return this.parent.get(name);
    throw new ReferenceError(`Unknown variable: ${name}`);
  }

  set(name, value) {
    if (this.bindings.has(name)) {
      if (this.constBindings.has(name)) {
        throw new UnsupportedSyntaxError(
          `Cannot assign to constant variable "${name}".`,
        );
      }
      this.bindings.set(name, value);
      return;
    }

    if (this.parent) {
      this.parent.set(name, value);
      return;
    }

    throw new ReferenceError(`Unknown variable: ${name}`);
  }

  snapshot() {
    const result = [];
    let environment = this;

    while (environment) {
      for (const [name, value] of environment.bindings) {
        if (!result.some((entry) => entry.name === name)) {
          result.push({ name, value });
        }
      }
      environment = environment.parent;
    }

    return result;
  }
}

function primitiveUndefined() {
  return new RuntimePrimitive("undefined", undefined);
}

function primitiveNull() {
  return new RuntimePrimitive("null", null);
}

function primitiveBoolean(value) {
  return new RuntimePrimitive("boolean", Boolean(value));
}

function primitiveNumber(value) {
  return new RuntimePrimitive("number", Number(value));
}

function primitiveString(value, limits = DEFAULT_AST_LIMITS) {
  const text = String(value);
  if (Buffer.byteLength(text, "utf8") > limits.maxStringBytes) {
    throw new AstLimitError("String length limit exceeded.", {
      limit: limits.maxStringBytes,
    });
  }
  return new RuntimePrimitive("string", text);
}

function createRuntimeArray(elements = [], limits = DEFAULT_AST_LIMITS) {
  if (elements.length > limits.maxArrayLength) {
    throw new AstLimitError("Array length limit exceeded.", {
      limit: limits.maxArrayLength,
    });
  }
  return new RuntimeArray(elements);
}

function createRuntimeObject(properties = new Map(), limits = DEFAULT_AST_LIMITS) {
  if (properties.size > limits.maxObjectProperties) {
    throw new AstLimitError("Object property limit exceeded.", {
      limit: limits.maxObjectProperties,
    });
  }
  return new RuntimeObject(properties);
}

function createRuntimeFunction(node, lexicalEnvironment, name = null) {
  return new RuntimeFunction(node, lexicalEnvironment, name);
}

function sourceLocation(node) {
  if (!node?.loc?.start) return null;
  return {
    line: node.loc.start.line,
    column: node.loc.start.column,
  };
}

function unsupportedNode(node, reason = "Node type is outside the Stage 1 subset.") {
  throw new UnsupportedSyntaxError(
    `${reason} Unsupported node: ${node.type}` +
      (node.loc?.start ? ` at line ${node.loc.start.line}` : ""),
    node,
  );
}

function validatePattern(pattern) {
  if (!pattern) return;

  if (pattern.type === "Identifier") return;

  unsupportedNode(
    pattern,
    "Destructuring patterns are outside the Stage 1 subset.",
  );
}

function validateAst(ast, limits = DEFAULT_AST_LIMITS) {
  limits = normalizeExecutionLimits(limits);
  let nodeCount = 0;
  let maxObservedDepth = 0;

  function visit(node, depth) {
    if (!node || typeof node !== "object") return;

    nodeCount += 1;
    if (nodeCount > limits.maxAstNodes) {
      throw new AstLimitError("AST node limit exceeded.", {
        limit: limits.maxAstNodes,
        nodeCount,
      });
    }

    const astDepthLimit = limits.maxAstDepth ?? limits.maxDepth;
    if (depth > astDepthLimit) {
      throw new AstLimitError("AST depth limit exceeded.", {
        limit: astDepthLimit,
        depth,
      });
    }
    maxObservedDepth = Math.max(maxObservedDepth, depth);

    if (!SUPPORTED_NODE_TYPES.has(node.type)) {
      unsupportedNode(node);
    }

    if (node.type === "Identifier" && FORBIDDEN_IDENTIFIERS.has(node.name)) {
      unsupportedNode(
        node,
        `Identifier "${node.name}" is not available in the JavaScript tracing subset.`,
      );
    }

    if (node.type === "Literal") {
      if (node.regex) {
        unsupportedNode(node, "Regular expression literals are unsupported.");
      }
      if (typeof node.value === "bigint") {
        unsupportedNode(node, "BigInt literals are unsupported.");
      }
    }

    if (node.type === "UnaryExpression") {
      if (UNSUPPORTED_OPERATORS.has(node.operator)) {
        unsupportedNode(
          node,
          `Unary operator "${node.operator}" is unsupported.`,
        );
      }
    }

    if (node.type === "BinaryExpression") {
      if (UNSUPPORTED_OPERATORS.has(node.operator)) {
        unsupportedNode(
          node,
          `Binary operator "${node.operator}" is unsupported.`,
        );
      }
    }

    if (node.type === "UpdateExpression") {
      if (node.prefix !== true && node.prefix !== false) {
        unsupportedNode(node, "Invalid update expression.");
      }
    }

    if (
      node.type === "AssignmentExpression" &&
      node.operator !== "=" &&
      node.operator !== "+=" &&
      node.operator !== "-=" &&
      node.operator !== "*=" &&
      node.operator !== "/=" &&
      node.operator !== "%="
    ) {
      unsupportedNode(
        node,
        `Assignment operator "${node.operator}" is unsupported.`,
      );
    }

    if (
      node.type === "ForOfStatement" ||
      node.type === "ForInStatement"
    ) {
      validatePattern(node.left);
    }

    if (node.type === "VariableDeclaration") {
      for (const declarator of node.declarations) {
        validatePattern(declarator.id);
      }
    }

    if (
      node.type === "FunctionDeclaration" ||
      node.type === "FunctionExpression" ||
      node.type === "ArrowFunctionExpression"
    ) {
      if (node.generator || node.async) {
        unsupportedNode(node, "Async and generator functions are unsupported.");
      }
      for (const parameter of node.params) {
        validatePattern(parameter);
      }
    }

    if (node.type === "CallExpression" && node.optional) {
      unsupportedNode(node, "Optional call syntax is unsupported.");
    }

    if (node.type === "MemberExpression") {
      if (node.optional) {
        unsupportedNode(node, "Optional member syntax is unsupported.");
      }
    }

    if (node.type === "Property") {
      if (node.computed || node.method || node.kind !== "init") {
        unsupportedNode(
          node,
          "Only data-only object properties are supported.",
        );
      }
    }

    if (node.type === "LabeledStatement") {
      unsupportedNode(node, "Labeled statements are unsupported.");
    }

    if (node.type === "SwitchStatement") {
      unsupportedNode(node, "Switch statements are unsupported.");
    }

    if (node.type === "ThisExpression") {
      unsupportedNode(node, "The this value is unsupported.");
    }

    for (const [key, value] of Object.entries(node)) {
      if (
        key === "loc" ||
        key === "start" ||
        key === "end" ||
        key === "range"
      ) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const child of value) {
          visit(child, depth + 1);
        }
      } else if (value && typeof value === "object") {
        visit(value, depth + 1);
      }
    }
  }

  visit(ast, 1);

  return {
    nodeCount,
    maxDepth: maxObservedDepth,
  };
}

function parseJavaScriptAst(sourceCode, options = {}) {
  const suppliedLimits = options.limits;
  const limits = normalizeExecutionLimits(suppliedLimits);

  if (typeof sourceCode !== "string") {
    throw new UnsupportedSyntaxError("Source code must be a string.");
  }

  if (!sourceCode.trim()) {
    throw new UnsupportedSyntaxError("Source code is required.");
  }

  if (Buffer.byteLength(sourceCode, "utf8") > limits.sourceSizeBytes) {
    throw new AstLimitError("Source size limit exceeded.", {
      limit: limits.sourceSizeBytes,
      sourceSizeBytes: Buffer.byteLength(sourceCode, "utf8"),
    });
  }

  let ast;
  try {
    ast = acorn.parse(sourceCode, {
      ecmaVersion: "latest",
      sourceType: "script",
      locations: true,
      ranges: true,
    });
  } catch (error) {
    const location =
      error.loc?.line && error.loc?.column !== undefined
        ? ` at line ${error.loc.line}, column ${error.loc.column + 1}`
        : "";
    throw new UnsupportedSyntaxError(
      `Unsupported JavaScript syntax${location}: ${error.message}`,
    );
  }

  const validation = validateAst(ast, limits);

  return {
    ast,
    limits,
    validation,
  };
}

class UnsupportedOperationError extends Error {
  constructor(message, node = null) {
    super(message);
    this.name = "UnsupportedOperationError";
    this.node = sourceLocation(node);
  }
}

class BreakSignal {
  constructor() {
    this.kind = "break";
  }
}

class ContinueSignal {
  constructor() {
    this.kind = "continue";
  }
}

class ReturnSignal {
  constructor(value) {
    this.kind = "return";
    this.value = value;
  }
}

class ThrowSignal {
  constructor(value, node = null) {
    this.kind = "throw";
    this.value = value;
    this.node = node;
  }
}

class InterpreterThrownError extends Error {
  constructor(value, node = null) {
    super(
      value?.kind === "primitive"
        ? String(value.value)
        : "Interpreter threw an unsupported value.",
    );
    this.name = "InterpreterThrownError";
    this.value = value;
    this.node = sourceLocation(node);
  }
}

class ExecutionLimitError extends AstLimitError {
  constructor(message, details = {}) {
    super(message, details);
    this.name = "ExecutionLimitError";
  }
}

class TraceLimitError extends ExecutionLimitError {
  constructor(message, details = {}) {
    super(message, details);
    this.name = "TraceLimitError";
  }
}

function truncateTraceText(value, maxBytes) {
  const text = String(value);
  if (Buffer.byteLength(text, "utf8") <= maxBytes) return text;
  return `${Buffer.from(text).subarray(0, maxBytes).toString("utf8")}…`;
}

function normalizeExecutionLimits(suppliedLimits) {
  if (suppliedLimits === undefined) return { ...DEFAULT_AST_LIMITS };
  if (
    suppliedLimits === null ||
    typeof suppliedLimits !== "object" ||
    Array.isArray(suppliedLimits)
  ) {
    throw new AstLimitError("Execution limits must be an object.", {
      limitsType: typeof suppliedLimits,
    });
  }

  for (const [name, value] of Object.entries(suppliedLimits)) {
    if (!Object.prototype.hasOwnProperty.call(DEFAULT_AST_LIMITS, name)) {
      throw new AstLimitError(`Unknown execution limit "${name}".`, { name });
    }
    if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
      throw new AstLimitError(
        `Execution limit "${name}" must be a positive finite integer.`,
        { name, value },
      );
    }
    if (value > LIMIT_CEILINGS[name]) {
      throw new AstLimitError(
        `Execution limit "${name}" exceeds its hard maximum.`,
        { name, limit: LIMIT_CEILINGS[name], value },
      );
    }
  }

  const limits = { ...DEFAULT_AST_LIMITS, ...suppliedLimits };
  if (
    suppliedLimits.maxAstDepth === undefined &&
    suppliedLimits.maxDepth !== undefined
  ) {
    limits.maxAstDepth = suppliedLimits.maxDepth;
  }
  if (
    suppliedLimits.maxCallDepth === undefined &&
    suppliedLimits.maxDepth !== undefined
  ) {
    limits.maxCallDepth = suppliedLimits.maxDepth;
  }
  return limits;
}

function cloneRuntimeValue(
  value,
  limits,
  seen = new WeakSet(),
  depth = 0,
  budget = { nodes: 0, maxNodes: 5_000 },
) {
  if (budget.nodes >= budget.maxNodes) {
    return { type: "unsupported", description: "[Snapshot limited]" };
  }
  budget.nodes += 1;

  if (!value) {
    return { type: "undefined", value: undefined };
  }

  if (value.kind === "primitive") {
    return {
      type: value.type,
      value:
        value.type === "string"
          ? truncateTraceText(
              value.value,
              limits.maxTracePreviewBytes,
            )
          : value.value,
    };
  }

  if (value.kind === "function") {
    const closureScopeIds = [];
    let closureEnvironment = value.lexicalEnvironment;

    while (
      closureEnvironment &&
      closureScopeIds.length < limits.maxTraceScopes
    ) {
      closureScopeIds.push(closureEnvironment._traceId);
      closureEnvironment = closureEnvironment.parent;
    }

    return {
      type: "function",
      name: truncateTraceText(
        value.name || "(anonymous)",
        256,
      ),
      line: value.node?.loc?.start?.line ?? null,
      scopeId: value.lexicalEnvironment?._traceId ?? null,
      closureScopeIds,
    };
  }

  if (seen.has(value)) {
    return { type: "circular", description: "[Circular]" };
  }

  if (depth >= limits.maxTracePreviewDepth) {
    return {
      type: value.kind,
      description: "[Depth limited]",
    };
  }

  seen.add(value);

  if (value.kind === "array") {
    seen.add(value);
    const preview = value.elements
      .slice(0, limits.maxTraceArrayPreview)
      .map((item) =>
        cloneRuntimeValue(
          item,
          limits,
          seen,
          depth + 1,
          budget,
        ),
      );
    seen.delete(value);
    return {
      type: "array",
      length: value.elements.length,
      preview,
    };
  }

  if (value.kind === "object") {
    seen.add(value);
    const preview = Object.create(null);
    let count = 0;
    for (const [key, item] of value.properties) {
      if (count >= limits.maxTraceObjectProperties) break;
      const previewKey = truncateTraceText(key, 256);
      Object.defineProperty(preview, previewKey, {
        value: cloneRuntimeValue(
          item,
          limits,
          seen,
          depth + 1,
          budget,
        ),
        enumerable: true,
        configurable: true,
        writable: true,
      });
      count++;
    }
    seen.delete(value);
    return {
      type: "object",
      preview,
    };
  }

  return { type: "unsupported", description: "[Unsupported]" };
}

function cloneEnvironmentSnapshot(environment, limits, budget = null) {
  const snapshotBudget =
    budget || { nodes: 0, maxNodes: 5_000 };
  const scopes = [];
  let omittedScopes = 0;
  let omittedVariables = 0;
  let omittedBindings = 0;
  let current = environment;
  let scopeCount = 0;

  while (current) {
    if (scopeCount >= limits.maxTraceScopes) {
      omittedScopes += 1;
      current = current.parent;
      continue;
    }

    const bindings = [];
    let bindingCount = 0;

    for (const [name, value] of current.bindings) {
      if (bindingCount >= limits.maxTraceVariables) {
        omittedVariables += 1;
        omittedBindings += 1;
        continue;
      }
      bindings.push({
        name: truncateTraceText(name, 256),
        value: cloneRuntimeValue(
          value,
          limits,
          new WeakSet(),
          0,
          snapshotBudget,
        ),
      });
      bindingCount++;
    }

    scopes.push({
      id: current._traceId,
      parentId: current.parent?._traceId ?? null,
      bindings,
      omittedBindings: Math.max(
        0,
        current.bindings.size - bindings.length,
      ),
    });
    current = current.parent;
    scopeCount++;
  }

  return {
    scopes,
    omittedScopes,
    omittedVariables,
    omittedBindings,
  };
}

function flattenEnvironmentSnapshot(environment, limits, budget = null) {
  const snapshotBudget =
    budget || { nodes: 0, maxNodes: 5_000 };
  const variables = [];
  let omittedVariables = 0;
  const names = new Set();
  let current = environment;

  while (current) {
    for (const [name, value] of current.bindings) {
      if (names.has(name)) continue;
      names.add(name);
      variables.push({
        name: truncateTraceText(name, 256),
        value: cloneRuntimeValue(
          value,
          limits,
          new WeakSet(),
          0,
          snapshotBudget,
        ),
      });
      if (variables.length >= limits.maxTraceVariables) {
        omittedVariables += 1;
        return { variables, omittedVariables };
      }
    }
    current = current.parent;
  }

  return { variables, omittedVariables };
}

class InterpreterExecution {
  constructor(limits) {
    this.limits = limits;
    this.traceIdState = { next: 1 };
    this.steps = 0;
    this.runtimeValues = 0;
    this.callStack = [];
    this.trace = [];
    this.previousVariables = new Map();
    this.exceptionEmitted = false;
    this.traceMetadata = {
      truncated: false,
      omittedSteps: 0,
      omittedVariables: 0,
      omittedScopes: 0,
      omittedBindings: 0,
    };
    this.traceRecordingStopped = false;
    this.traceInnerBytes = 0;
    this.traceError = null;
  }

  tick(node = null) {
    this.steps += 1;
    if (this.steps > this.limits.maxExecutionSteps) {
      throw new ExecutionLimitError(
        "Execution step limit exceeded.",
        {
          limit: this.limits.maxExecutionSteps,
          node: sourceLocation(node),
        },
      );
    }
  }

  allocate(value) {
    this.runtimeValues += 1;
    if (this.runtimeValues > this.limits.maxRuntimeValues) {
      throw new ExecutionLimitError(
        "Runtime value limit exceeded.",
        { limit: this.limits.maxRuntimeValues },
      );
    }
    return value;
  }

  pushFrame(frame) {
    const callDepthLimit =
      this.limits.maxCallDepth ?? this.limits.maxDepth;
    if (this.callStack.length >= callDepthLimit) {
      throw new ExecutionLimitError(
        "Call stack depth limit exceeded.",
        {
          limit: callDepthLimit,
          callStack: this.callStack.length + 1,
        },
      );
    }
    this.callStack.push(frame);
  }

  popFrame() {
    this.callStack.pop();
  }

  emitExceptionOnce(node, environment, error, reason = "exception") {
    if (this.exceptionEmitted) return;
    this.exceptionEmitted = true;
    this.emitTrace(
      "exception",
      node,
      environment,
      reason,
      { error: truncateTraceText(error?.message || String(error), 2_000) },
    );
  }

  emitTrace(event, node, environment, reason = "statement", extra = {}) {
    if (
      this.traceRecordingStopped ||
      this.trace.length >= this.limits.maxTraceSteps
    ) {
      this.traceMetadata.truncated = true;
      this.traceMetadata.omittedSteps += 1;
      this.traceRecordingStopped = true;
      if (!this.traceError) {
        this.traceError = new TraceLimitError(
          "Trace step limit exceeded.",
          {
            limit: this.limits.maxTraceSteps,
            node: sourceLocation(node),
            truncated: true,
          },
        );
      }
      return null;
    }

    const snapshotBudget = { nodes: 0, maxNodes: 5_000 };
    const variableSnapshot = flattenEnvironmentSnapshot(
      environment,
      this.limits,
      snapshotBudget,
    );
    const variables = variableSnapshot.variables;
    this.traceMetadata.omittedVariables +=
      variableSnapshot.omittedVariables;

    const scopeSnapshot = cloneEnvironmentSnapshot(
      environment,
      this.limits,
      snapshotBudget,
    );
    this.traceMetadata.omittedScopes += scopeSnapshot.omittedScopes;
    this.traceMetadata.omittedBindings += scopeSnapshot.omittedBindings;

    const changedVariables = [];
    const changedVariableRecords = [];

    for (const variable of variables) {
      const signature = JSON.stringify(variable.value);
      if (this.previousVariables.get(variable.name) !== signature) {
        changedVariables.push(variable.name);
        let scopeId = null;
        let current = environment;
        while (current) {
          if (current.bindings.has(variable.name)) {
            scopeId = current._traceId;
            break;
          }
          current = current.parent;
        }
        changedVariableRecords.push({
          name: variable.name,
          scopeId,
        });
      }
    }

    this.previousVariables = new Map(
      variables.map((variable) => [
        variable.name,
        JSON.stringify(variable.value),
      ]),
    );

    const traceStep = {
      id: this.trace.length + 1,
      line: node?.loc?.start?.line ?? null,
      column: node?.loc?.start?.column ?? null,
      event,
      reason,
      changedVariables,
      changedVariableRecords,
      variables,
      scopes: scopeSnapshot.scopes,
      omittedVariables: variableSnapshot.omittedVariables,
      omittedScopes: scopeSnapshot.omittedScopes,
      omittedBindings: scopeSnapshot.omittedBindings,
      callStack: this.callStack
        .slice(-this.limits.maxTraceFrames)
        .map((frame, index) => ({
          name: truncateTraceText(
            frame.name || "(anonymous)",
            256,
          ),
          line: frame.line ?? null,
          column: frame.column ?? null,
          depth: index,
          scopeId: frame.environment?._traceId ?? null,
        })),
      ...extra,
    };

    const stepBytes = Buffer.byteLength(JSON.stringify(traceStep), "utf8");
    const separatorBytes =
      this.traceInnerBytes > 0 ? 1 : 0;
    const projectedTraceArrayBytes =
      2 + this.traceInnerBytes + separatorBytes + stepBytes;
    const emptyEnvelope = JSON.stringify({
      status: "trace-limit",
      steps: [],
      truncated: this.traceMetadata.truncated,
      omittedSteps: this.traceMetadata.omittedSteps,
      omittedVariables: this.traceMetadata.omittedVariables,
      omittedScopes: this.traceMetadata.omittedScopes,
      omittedBindings: this.traceMetadata.omittedBindings,
    });
    const projectedEnvelopeBytes =
      Buffer.byteLength(emptyEnvelope, "utf8") -
      2 +
      projectedTraceArrayBytes;
    if (projectedEnvelopeBytes > this.limits.maxTraceBytes) {
      this.traceMetadata.truncated = true;
      this.traceMetadata.omittedSteps += 1;
      this.traceRecordingStopped = true;
      if (!this.traceError) {
        this.traceError = new TraceLimitError(
          "Trace byte limit exceeded.",
          {
            limit: this.limits.maxTraceBytes,
            traceBytes: projectedEnvelopeBytes,
            node: sourceLocation(node),
            truncated: true,
          },
        );
      }
      return null;
    }

    this.trace.push(traceStep);
    this.traceInnerBytes =
      this.traceInnerBytes +
      separatorBytes +
      stepBytes;

    if (this.trace.length >= this.limits.maxTraceSteps) {
      this.traceMetadata.truncated = true;
      this.traceMetadata.omittedSteps += 1;
      this.traceRecordingStopped = true;
      if (!this.traceError) {
        this.traceError = new TraceLimitError(
          "Trace step limit exceeded.",
          {
            limit: this.limits.maxTraceSteps,
            node: sourceLocation(node),
            truncated: true,
          },
        );
      }
    }

    return traceStep;
  }
}

function toBoolean(value) {
  if (value.kind === "primitive") {
    if (value.type === "undefined" || value.type === "null") return false;
    if (value.type === "boolean") return value.value;
    if (value.type === "number") return value.value !== 0 && !Number.isNaN(value.value);
    if (value.type === "string") return value.value.length > 0;
  }
  return true;
}

function toPrimitiveHostValue(value) {
  if (value.kind === "primitive") return value.value;
  if (value.kind === "array") return "[Array]";
  if (value.kind === "object") return "[Object]";
  if (value.kind === "function") return "[Function]";
  return undefined;
}

function primitiveFromLiteral(node, execution) {
  execution.tick(node);

  if (node.value === null) {
    return execution.allocate(primitiveNull());
  }

  if (typeof node.value === "boolean") {
    return execution.allocate(primitiveBoolean(node.value));
  }

  if (typeof node.value === "number") {
    if (!Number.isFinite(node.value)) {
      return execution.allocate(primitiveNumber(node.value));
    }
    return execution.allocate(primitiveNumber(node.value));
  }

  if (typeof node.value === "string") {
    return execution.allocate(primitiveString(node.value, execution.limits));
  }

  throw new UnsupportedOperationError(
    `Literal type "${typeof node.value}" is unsupported.`,
    node,
  );
}

function strictEqual(left, right) {
  if (left.kind !== right.kind) return false;

  if (left.kind === "primitive") {
    if (left.type !== right.type) return false;
    if (left.type === "number") {
      if (Number.isNaN(left.value) || Number.isNaN(right.value)) return false;
      return Object.is(left.value, right.value);
    }
    return Object.is(left.value, right.value);
  }

  return left === right;
}

function looseEqual(left, right) {
  if (left.kind === "primitive" && right.kind === "primitive") {
    if (left.type === right.type) return strictEqual(left, right);
  }

  const leftHost = toPrimitiveHostValue(left);
  const rightHost = toPrimitiveHostValue(right);
  return leftHost == rightHost;
}

function evaluateIdentifier(node, environment, execution) {
  execution.tick(node);

  if (FORBIDDEN_IDENTIFIERS.has(node.name)) {
    throw new UnsupportedOperationError(
      `Identifier "${node.name}" is not available in the interpreter.`,
      node,
    );
  }

  return environment.get(node.name);
}

function evaluateArray(node, environment, execution) {
  execution.tick(node);

  if (node.elements.length > execution.limits.maxArrayLength) {
    throw new ExecutionLimitError("Array length limit exceeded.", {
      limit: execution.limits.maxArrayLength,
    });
  }

  const elements = [];
  for (const element of node.elements) {
    if (element?.type === "SpreadElement") {
      throw new UnsupportedOperationError(
        "Array spread is unsupported.",
        element,
      );
    }
    elements.push(evaluateExpression(element, environment, execution));
  }

  return execution.allocate(createRuntimeArray(elements, execution.limits));
}

function staticPropertyKey(property, environment, execution) {
  if (property.computed) {
    throw new UnsupportedOperationError(
      "Computed object properties are unsupported.",
      property,
    );
  }

  if (property.key.type === "Identifier") return property.key.name;
  if (property.key.type === "Literal") return String(property.key.value);

  throw new UnsupportedOperationError(
    "Only identifier or literal object keys are supported.",
    property,
  );
}

function evaluateObject(node, environment, execution) {
  execution.tick(node);

  if (node.properties.length > execution.limits.maxObjectProperties) {
    throw new ExecutionLimitError("Object property limit exceeded.", {
      limit: execution.limits.maxObjectProperties,
    });
  }

  const properties = new Map();
  for (const property of node.properties) {
    if (property.type !== "Property" || property.kind !== "init" || property.computed) {
      throw new UnsupportedOperationError(
        "Only data-only object properties are supported.",
        property,
      );
    }

    if (property.method || property.shorthand) {
      throw new UnsupportedOperationError(
        "Object methods and shorthand properties are unsupported.",
        property,
      );
    }

    const key = staticPropertyKey(property, environment, execution);
    if (properties.has(key)) {
      properties.set(
        key,
        evaluateExpression(property.value, environment, execution),
      );
    } else {
      properties.set(
        key,
        evaluateExpression(property.value, environment, execution),
      );
    }
  }

  return execution.allocate(createRuntimeObject(properties, execution.limits));
}

function evaluateUnary(node, environment, execution) {
  execution.tick(node);
  const value = evaluateExpression(node.argument, environment, execution);
  const host = toPrimitiveHostValue(value);

  switch (node.operator) {
    case "!":
      return execution.allocate(primitiveBoolean(!toBoolean(value)));
    case "+":
      if (value.kind !== "primitive" || !["number", "string"].includes(value.type)) {
        throw new UnsupportedOperationError(
          "Unary plus supports primitive numbers and strings only.",
          node,
        );
      }
      return execution.allocate(primitiveNumber(host));
    case "-":
      if (value.kind !== "primitive" || !["number", "string"].includes(value.type)) {
        throw new UnsupportedOperationError(
          "Unary minus supports primitive numbers and strings only.",
          node,
        );
      }
      return execution.allocate(primitiveNumber(-Number(host)));
    case "~":
      if (value.kind !== "primitive" || !["number", "string"].includes(value.type)) {
        throw new UnsupportedOperationError(
          "Bitwise not supports primitive numbers and strings only.",
          node,
        );
      }
      return execution.allocate(primitiveNumber(~Number(host)));
    case "typeof":
      if (node.argument.type === "Identifier" && !environment.has(node.argument.name)) {
        return execution.allocate(primitiveString("undefined", execution.limits));
      }
      if (value.kind === "primitive" && value.type === "null") {
        return execution.allocate(primitiveString("object", execution.limits));
      }
      return execution.allocate(
        primitiveString(
          value.kind === "primitive"
            ? value.type
            : value.kind === "array"
              ? "object"
              : value.kind === "function"
                ? "function"
                : value.kind,
          execution.limits,
        ),
      );
    case "void":
      return execution.allocate(primitiveUndefined());
    default:
      throw new UnsupportedOperationError(
        `Unary operator "${node.operator}" is unsupported.`,
        node,
      );
  }
}

function getBinaryHostValues(left, right) {
  return [
    toPrimitiveHostValue(left),
    toPrimitiveHostValue(right),
  ];
}

function evaluateBinary(node, environment, execution) {
  execution.tick(node);
  const left = evaluateExpression(node.left, environment, execution);
  const right = evaluateExpression(node.right, environment, execution);
  const [leftHost, rightHost] = getBinaryHostValues(left, right);

  switch (node.operator) {
    case "+":
      if (
        (left.kind === "primitive" && left.type === "string") ||
        (right.kind === "primitive" && right.type === "string")
      ) {
        return execution.allocate(
          primitiveString(
            `${String(leftHost)}${String(rightHost)}`,
            execution.limits,
          ),
        );
      }
      return execution.allocate(primitiveNumber(Number(leftHost) + Number(rightHost)));
    case "-":
      return execution.allocate(primitiveNumber(Number(leftHost) - Number(rightHost)));
    case "*":
      return execution.allocate(primitiveNumber(Number(leftHost) * Number(rightHost)));
    case "/":
      return execution.allocate(primitiveNumber(Number(leftHost) / Number(rightHost)));
    case "%":
      return execution.allocate(primitiveNumber(Number(leftHost) % Number(rightHost)));
    case "**":
      return execution.allocate(primitiveNumber(Number(leftHost) ** Number(rightHost)));
    case "<":
      return execution.allocate(primitiveBoolean(leftHost < rightHost));
    case "<=":
      return execution.allocate(primitiveBoolean(leftHost <= rightHost));
    case ">":
      return execution.allocate(primitiveBoolean(leftHost > rightHost));
    case ">=":
      return execution.allocate(primitiveBoolean(leftHost >= rightHost));
    case "==":
      return execution.allocate(primitiveBoolean(looseEqual(left, right)));
    case "!=":
      return execution.allocate(primitiveBoolean(!looseEqual(left, right)));
    case "===":
      return execution.allocate(primitiveBoolean(strictEqual(left, right)));
    case "!==":
      return execution.allocate(primitiveBoolean(!strictEqual(left, right)));
    case "<<":
      return execution.allocate(primitiveNumber(Number(leftHost) << Number(rightHost)));
    case ">>":
      return execution.allocate(primitiveNumber(Number(leftHost) >> Number(rightHost)));
    case ">>>":
      return execution.allocate(primitiveNumber(Number(leftHost) >>> Number(rightHost)));
    case "&":
      return execution.allocate(primitiveNumber(Number(leftHost) & Number(rightHost)));
    case "|":
      return execution.allocate(primitiveNumber(Number(leftHost) | Number(rightHost)));
    case "^":
      return execution.allocate(primitiveNumber(Number(leftHost) ^ Number(rightHost)));
    default:
      throw new UnsupportedOperationError(
        `Binary operator "${node.operator}" is unsupported.`,
        node,
      );
  }
}

function evaluateLogical(node, environment, execution) {
  execution.tick(node);
  const left = evaluateExpression(node.left, environment, execution);

  if (node.operator === "&&") {
    if (!toBoolean(left)) return left;
    return evaluateExpression(node.right, environment, execution);
  }

  if (node.operator === "||") {
    if (toBoolean(left)) return left;
    return evaluateExpression(node.right, environment, execution);
  }

  throw new UnsupportedOperationError(
    `Logical operator "${node.operator}" is unsupported.`,
    node,
  );
}

function evaluateMember(node, environment, execution) {
  execution.tick(node);
  const object = evaluateExpression(node.object, environment, execution);

  let key;
  if (node.computed) {
    const keyValue = evaluateExpression(node.property, environment, execution);
    key = String(toPrimitiveHostValue(keyValue));
  } else {
    if (node.property.type !== "Identifier") {
      throw new UnsupportedOperationError(
        "Only identifier member names are supported.",
        node,
      );
    }
    key = node.property.name;
  }

  if (object.kind === "array") {
    if (key === "length") {
      return execution.allocate(
        primitiveNumber(object.elements.length),
      );
    }
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0) {
      throw new UnsupportedOperationError(
        "Only non-negative integer array indices are supported.",
        node,
      );
    }
    return object.elements[index] || execution.allocate(primitiveUndefined());
  }

  if (object.kind === "object") {
    if (object.properties.has(key)) return object.properties.get(key);
    return execution.allocate(primitiveUndefined());
  }

  throw new UnsupportedOperationError(
    "Member access is only supported for arrays and data-only objects.",
    node,
  );
}

function evaluateAssignment(node, environment, execution) {
  execution.tick(node);

  if (node.left.type !== "Identifier" && node.left.type !== "MemberExpression") {
    throw new UnsupportedOperationError(
      "Assignment targets must be identifiers or member expressions.",
      node,
    );
  }

  const right = evaluateExpression(node.right, environment, execution);

  if (node.left.type === "Identifier") {
    const name = node.left.name;
    if (FORBIDDEN_IDENTIFIERS.has(name)) {
      throw new UnsupportedOperationError(
        `Identifier "${name}" is not available in the interpreter.`,
        node.left,
      );
    }

    const current = environment.has(name)
      ? environment.get(name)
      : primitiveUndefined();
    const next = applyAssignmentOperator(
      node.operator,
      current,
      right,
      execution,
    );
    environment.set(name, next);
    execution.emitTrace(
      "variable-change",
      node,
      environment,
      "assign",
      { names: [name] },
    );
    return next;
  }

  const object = evaluateExpression(node.left.object, environment, execution);
  let key;
  if (node.left.computed) {
    const keyValue = evaluateExpression(
      node.left.property,
      environment,
      execution,
    );
    key = String(toPrimitiveHostValue(keyValue));
  } else {
    key = node.left.property.name;
  }

  const current =
    object.kind === "array"
      ? object.elements[Number(key)] || execution.allocate(primitiveUndefined())
      : object.kind === "object"
        ? object.properties.get(key) || execution.allocate(primitiveUndefined())
        : null;

  if (!current) {
    throw new UnsupportedOperationError(
      "Assignment is only supported for arrays and data-only objects.",
      node,
    );
  }

  const next = applyAssignmentOperator(
    node.operator,
    current,
    right,
    execution,
  );

  if (object.kind === "array") {
    if (key === "length") {
      throw new UnsupportedOperationError(
        "Array length assignment is unsupported.",
        node,
      );
    }
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0) {
      throw new UnsupportedOperationError(
        "Only non-negative integer array indices are supported.",
        node,
      );
    }
    if (index >= execution.limits.maxArrayLength) {
      throw new ExecutionLimitError("Array length limit exceeded.", {
        limit: execution.limits.maxArrayLength,
      });
    }
    object.elements[index] = next;
    execution.emitTrace(
      "variable-change",
      node,
      environment,
      "member-assign",
      { names: [key] },
    );
  } else {
    if (object.properties.size >= execution.limits.maxObjectProperties &&
        !object.properties.has(key)) {
      throw new ExecutionLimitError("Object property limit exceeded.", {
        limit: execution.limits.maxObjectProperties,
      });
    }
    object.properties.set(key, next);
    execution.emitTrace(
      "variable-change",
      node,
      environment,
      "member-assign",
      { names: [key] },
    );
  }

  return next;
}

function applyAssignmentOperator(operator, current, right, execution) {
  switch (operator) {
    case "=":
      return right;
    case "+=":
      if (
        (current.kind === "primitive" && current.type === "string") ||
        (right.kind === "primitive" && right.type === "string")
      ) {
        return primitiveString(
          `${String(toPrimitiveHostValue(current))}${String(toPrimitiveHostValue(right))}`,
          execution?.limits,
        );
      }
      return primitiveNumber(
        Number(toPrimitiveHostValue(current)) +
          Number(toPrimitiveHostValue(right)),
      );
    case "-=":
      return primitiveNumber(
        Number(toPrimitiveHostValue(current)) -
          Number(toPrimitiveHostValue(right)),
      );
    case "*=":
      return primitiveNumber(
        Number(toPrimitiveHostValue(current)) *
          Number(toPrimitiveHostValue(right)),
      );
    case "/=":
      return primitiveNumber(
        Number(toPrimitiveHostValue(current)) /
          Number(toPrimitiveHostValue(right)),
      );
    case "%=":
      return primitiveNumber(
        Number(toPrimitiveHostValue(current)) %
          Number(toPrimitiveHostValue(right)),
      );
    default:
      throw new UnsupportedOperationError(
        `Assignment operator "${operator}" is unsupported.`,
      );
  }
}

function evaluateUpdate(node, environment, execution) {
  execution.tick(node);

  if (node.argument.type === "Identifier") {
    const name = node.argument.name;
    const current = environment.get(name);
    if (current.kind !== "primitive" || current.type !== "number") {
      throw new UnsupportedOperationError(
        "Update expressions require numeric variables.",
        node,
      );
    }
    const next = primitiveNumber(current.value + (node.operator === "++" ? 1 : -1));
    environment.set(name, next);
    execution.emitTrace(
      "variable-change",
      node,
      environment,
      "update",
      { names: [name] },
    );
    return node.prefix ? next : current;
  }

  if (node.argument.type === "MemberExpression") {
    const right = evaluateMember(
      node.argument,
      environment,
      execution,
    );
    if (right.kind !== "primitive" || right.type !== "number") {
      throw new UnsupportedOperationError(
        "Update expressions require numeric values.",
        node,
      );
    }
    const next = primitiveNumber(
      right.value + (node.operator === "++" ? 1 : -1),
    );

    const assignment = {
      type: "AssignmentExpression",
      operator: "=",
      left: node.argument,
      right: next,
      loc: node.loc,
    };
    evaluateAssignment(assignment, environment, execution);
    return node.prefix ? next : right;
  }

  throw new UnsupportedOperationError(
    "Update expressions require an identifier or member target.",
    node,
  );
}

function evaluateConditional(node, environment, execution) {
  execution.tick(node);
  const test = evaluateExpression(node.test, environment, execution);
  return toBoolean(test)
    ? evaluateExpression(node.consequent, environment, execution)
    : evaluateExpression(node.alternate, environment, execution);
}

function evaluateSequence(node, environment, execution) {
  execution.tick(node);
  let value = execution.allocate(primitiveUndefined());
  for (const expression of node.expressions) {
    value = evaluateExpression(expression, environment, execution);
  }
  return value;
}

function validateFunctionParameters(node) {
  if (!Array.isArray(node.params)) return;
  for (const parameter of node.params) {
    if (parameter.type !== "Identifier") {
      throw new UnsupportedOperationError(
        "Only identifier function parameters are supported.",
        parameter,
      );
    }
  }
}

function evaluateCall(node, environment, execution) {
  execution.tick(node);

  if (
    node.callee.type !== "Identifier" &&
    node.callee.type !== "MemberExpression"
  ) {
    throw new UnsupportedOperationError(
      "Only identifier and member-expression calls are supported.",
      node.callee,
    );
  }

  let callee;
  if (node.callee.type === "Identifier") {
    callee = evaluateIdentifier(node.callee, environment, execution);
  } else {
    callee = evaluateMember(node.callee, environment, execution);
  }

  if (callee.kind !== "function") {
    throw new UnsupportedOperationError(
      "The call target is not an interpreter function.",
      node.callee,
    );
  }

  validateFunctionParameters(callee.node);

  const args = [];
  for (const argument of node.arguments) {
    if (argument.type === "SpreadElement") {
      throw new UnsupportedOperationError(
        "Spread call arguments are unsupported.",
        argument,
      );
    }
    args.push(evaluateExpression(argument, environment, execution));
  }

  return executeRuntimeFunction(callee, args, execution);
}

function executeRuntimeFunction(runtimeFunction, args, execution) {
  execution.tick(runtimeFunction.node);
  const callEnvironment = new LexicalEnvironment(
    runtimeFunction.lexicalEnvironment,
    execution.limits,
    execution.traceIdState,
  );
  const frame = {
    name: runtimeFunction.name || "(anonymous)",
    line: runtimeFunction.node.loc?.start?.line ?? null,
    column: runtimeFunction.node.loc?.start?.column ?? null,
    environment: callEnvironment,
  };
  let framePushed = false;

  try {
    execution.pushFrame(frame);
    framePushed = true;

    for (let index = 0; index < runtimeFunction.node.params.length; index++) {
      const parameter = runtimeFunction.node.params[index];
      const argument =
        args[index] || execution.allocate(primitiveUndefined());
      callEnvironment.define(parameter.name, argument, true);
    }

    execution.emitTrace(
      "function-enter",
      runtimeFunction.node,
      callEnvironment,
      "call",
    );

    let value = execution.allocate(primitiveUndefined());

    if (runtimeFunction.node.body.type === "BlockStatement") {
      value = executeStatementList(
        runtimeFunction.node.body.body,
        callEnvironment,
        execution,
      );
    } else {
      value = evaluateExpression(
        runtimeFunction.node.body,
        callEnvironment,
        execution,
      );
    }

    if (value?.kind === "return") {
      execution.emitTrace(
        "function-return",
        runtimeFunction.node,
        callEnvironment,
        "return",
        { returned: cloneRuntimeValue(value.value, execution.limits) },
      );
      return value.value;
    }

    if (value?.kind === "throw") {
      throw new InterpreterThrownError(value.value, value.node);
    }

    execution.emitTrace(
      "function-return",
      runtimeFunction.node,
      callEnvironment,
      "implicit-return",
      { returned: cloneRuntimeValue(value, execution.limits) },
    );
    return value;
  } catch (error) {
    if (error instanceof InterpreterThrownError) {
      throw error;
    }
    execution.emitExceptionOnce(
      error.node || runtimeFunction.node,
      callEnvironment,
      error,
      "runtime-error",
    );
    throw error;
  } finally {
    if (framePushed) {
      execution.popFrame();
    }
  }
}

function evaluateExpression(node, environment, execution) {
  if (!node) return execution.allocate(primitiveUndefined());

  switch (node.type) {
    case "Literal":
      return primitiveFromLiteral(node, execution);
    case "Identifier":
      return evaluateIdentifier(node, environment, execution);
    case "ArrayExpression":
      return evaluateArray(node, environment, execution);
    case "ObjectExpression":
      return evaluateObject(node, environment, execution);
    case "UnaryExpression":
      return evaluateUnary(node, environment, execution);
    case "UpdateExpression":
      return evaluateUpdate(node, environment, execution);
    case "BinaryExpression":
      return evaluateBinary(node, environment, execution);
    case "LogicalExpression":
      return evaluateLogical(node, environment, execution);
    case "AssignmentExpression":
      return evaluateAssignment(node, environment, execution);
    case "MemberExpression":
      return evaluateMember(node, environment, execution);
    case "ConditionalExpression":
      return evaluateConditional(node, environment, execution);
    case "SequenceExpression":
      return evaluateSequence(node, environment, execution);
    case "CallExpression":
      return evaluateCall(node, environment, execution);
    case "FunctionExpression":
      validateFunctionParameters(node);
      if (node.id?.name) {
        const nameEnvironment = new LexicalEnvironment(
          environment,
          execution.limits,
        );
        const namedFunction = createRuntimeFunction(
          node,
          nameEnvironment,
          node.id.name,
        );
        nameEnvironment.define(
          node.id.name,
          namedFunction,
          false,
        );
        return execution.allocate(namedFunction);
      }
      return execution.allocate(
        createRuntimeFunction(
          node,
          environment,
          node.id?.name || null,
        ),
      );
    case "ArrowFunctionExpression":
      validateFunctionParameters(node);
      return execution.allocate(
        createRuntimeFunction(
          node,
          environment,
          node.id?.name || null,
        ),
      );
    default:
      throw new UnsupportedOperationError(
        `Expression node "${node.type}" is unsupported in Stage 2.`,
        node,
      );
  }
}

function executeVariableDeclaration(node, environment, execution) {
  execution.tick(node);
  for (const declarator of node.declarations) {
    if (declarator.id.type !== "Identifier") {
      throw new UnsupportedOperationError(
        "Variable destructuring is unsupported.",
        declarator.id,
      );
    }

    const name = declarator.id.name;
    if (FORBIDDEN_IDENTIFIERS.has(name)) {
      throw new UnsupportedOperationError(
        `Identifier "${name}" is not available in the interpreter.`,
        declarator.id,
      );
    }

    const value = declarator.init
      ? evaluateExpression(declarator.init, environment, execution)
      : execution.allocate(primitiveUndefined());
    environment.define(
      name,
      value,
      node.kind !== "const",
    );
    execution.emitTrace(
      "variable-change",
      declarator,
      environment,
      "declare",
      { names: [name] },
    );
  }
  return execution.allocate(primitiveUndefined());
}

function executeBlock(node, environment, execution) {
  execution.tick(node);
  const blockEnvironment = new LexicalEnvironment(
    environment,
    execution.limits,
  );
  return executeStatementList(node.body, blockEnvironment, execution);
}

function executeStatementList(statements, environment, execution) {
  let value = execution.allocate(primitiveUndefined());

  for (const statement of statements) {
    if (statement.type === "FunctionDeclaration" && statement.id?.name) {
      validateFunctionParameters(statement);
      environment.define(
        statement.id.name,
        createRuntimeFunction(
          statement,
          environment,
          statement.id.name,
        ),
        false,
      );
    }
  }

  for (const statement of statements) {
    value = executeStatement(statement, environment, execution);
    if (
      value?.kind === "break" ||
      value?.kind === "continue" ||
      value?.kind === "return" ||
      value?.kind === "throw"
    ) {
      return value;
    }
  }

  return value;
}

function executeIf(node, environment, execution) {
  execution.tick(node);
  const test = evaluateExpression(node.test, environment, execution);
  if (toBoolean(test)) {
    return executeStatement(node.consequent, environment, execution);
  }
  if (node.alternate) {
    return executeStatement(node.alternate, environment, execution);
  }
  return execution.allocate(primitiveUndefined());
}

function executeFor(node, environment, execution) {
  execution.tick(node);
  execution.emitTrace(
    "loop-iteration",
    node,
    environment,
    "for-start",
  );
  const loopEnvironment = new LexicalEnvironment(
    environment,
    execution.limits,
  );

  if (node.init) {
    if (node.init.type === "VariableDeclaration") {
      executeVariableDeclaration(node.init, loopEnvironment, execution);
    } else {
      evaluateExpression(node.init, loopEnvironment, execution);
    }
  }

  while (true) {
    execution.tick(node);
    execution.emitTrace(
      "loop-iteration",
      node,
      loopEnvironment,
      "for-condition",
    );
    if (
      node.test &&
      !toBoolean(
        evaluateExpression(node.test, loopEnvironment, execution),
      )
    ) {
      break;
    }

    const iterationResult = executeStatement(
      node.body,
      loopEnvironment,
      execution,
    );
    if (iterationResult?.kind === "break") break;
    if (iterationResult?.kind === "return") return iterationResult;
    if (iterationResult?.kind === "throw") return iterationResult;
    if (node.update) {
      evaluateExpression(node.update, loopEnvironment, execution);
    }
  }

  return execution.allocate(primitiveUndefined());
}

function executeWhile(node, environment, execution) {
  execution.tick(node);

  while (true) {
    execution.tick(node);
    execution.emitTrace(
      "loop-iteration",
      node,
      environment,
      "while-condition",
    );
    if (!toBoolean(evaluateExpression(node.test, environment, execution))) {
      break;
    }

    const iterationResult = executeStatement(
      node.body,
      environment,
      execution,
    );
    if (iterationResult?.kind === "break") break;
    if (iterationResult?.kind === "return") return iterationResult;
    if (iterationResult?.kind === "throw") return iterationResult;
    if (iterationResult?.kind === "continue") continue;
  }

  return execution.allocate(primitiveUndefined());
}

function executeDoWhile(node, environment, execution) {
  execution.tick(node);

  do {
    execution.tick(node);
    execution.emitTrace(
      "loop-iteration",
      node,
      environment,
      "do-while-iteration",
    );
    const iterationResult = executeStatement(
      node.body,
      environment,
      execution,
    );
    if (iterationResult?.kind === "break") break;
    if (iterationResult?.kind === "return") return iterationResult;
    if (iterationResult?.kind === "throw") return iterationResult;
  } while (
    toBoolean(evaluateExpression(node.test, environment, execution))
  );

  return execution.allocate(primitiveUndefined());
}

function executeStatement(node, environment, execution) {
  if (!node) return execution.allocate(primitiveUndefined());
  execution.emitTrace(
    "statement",
    node,
    environment,
    "statement",
  );

  switch (node.type) {
    case "EmptyStatement":
      execution.tick(node);
      return execution.allocate(primitiveUndefined());
    case "ExpressionStatement":
      execution.tick(node);
      return evaluateExpression(node.expression, environment, execution);
    case "VariableDeclaration":
      return executeVariableDeclaration(node, environment, execution);
    case "BlockStatement":
      return executeBlock(node, environment, execution);
    case "IfStatement":
      return executeIf(node, environment, execution);
    case "ForStatement":
      return executeFor(node, environment, execution);
    case "WhileStatement":
      return executeWhile(node, environment, execution);
    case "DoWhileStatement":
      return executeDoWhile(node, environment, execution);
    case "ForInStatement":
    case "ForOfStatement":
      throw new UnsupportedOperationError(
        "For-in and for-of loops are unsupported in Stage 2.",
        node,
      );
    case "BreakStatement":
      execution.tick(node);
      return new BreakSignal();
    case "ContinueStatement":
      execution.tick(node);
      return new ContinueSignal();
    case "FunctionDeclaration":
      validateFunctionParameters(node);
      if (node.id?.name) {
        environment.define(
          node.id.name,
          createRuntimeFunction(node, environment, node.id.name),
          false,
        );
      }
      return execution.allocate(primitiveUndefined());
    case "ReturnStatement":
      execution.tick(node);
      const returned = node.argument
        ? evaluateExpression(node.argument, environment, execution)
        : execution.allocate(primitiveUndefined());
      execution.emitTrace(
        "return",
        node,
        environment,
        "return",
        { returned: cloneRuntimeValue(returned, execution.limits) },
      );
      return new ReturnSignal(returned);
    case "ThrowStatement":
      execution.tick(node);
      const thrown = node.argument
        ? evaluateExpression(node.argument, environment, execution)
        : execution.allocate(primitiveUndefined());
      return new ThrowSignal(thrown, node);
    case "LabeledStatement":
    case "SwitchStatement":
      throw new UnsupportedOperationError(
        `Statement node "${node.type}" is unsupported in Stage 2.`,
        node,
      );
    default:
      throw new UnsupportedOperationError(
        `Statement node "${node.type}" is unsupported in Stage 2.`,
        node,
      );
  }
}

function serializeInterpreterTrace(execution) {
  const trace = execution.trace.map((step) => ({
    ...step,
  }));

  const result = {
    status: execution.traceMetadata.truncated ? "trace-limit" : "completed",
    steps: trace,
    truncated: execution.traceMetadata.truncated,
    omittedSteps: execution.traceMetadata.omittedSteps,
    omittedVariables: execution.traceMetadata.omittedVariables,
    omittedScopes: execution.traceMetadata.omittedScopes,
    omittedBindings: execution.traceMetadata.omittedBindings,
  };

  return result;
}

function executeAst(ast, options = {}) {
  if (!ast || ast.type !== "Program") {
    throw new UnsupportedSyntaxError("Only a Program AST can be executed.");
  }

  const suppliedLimits = options.limits;
  const limits = normalizeExecutionLimits(suppliedLimits);
  const validation = validateAst(ast, limits);
  const execution = new InterpreterExecution(limits);
  const environment = options.environment instanceof LexicalEnvironment
    ? options.environment
    : new LexicalEnvironment(null, limits, execution.traceIdState);
  if (options.environment instanceof LexicalEnvironment) {
    const chain = [];
    let current = environment;
    while (current) {
      chain.push(current);
      current = current.parent;
    }
    for (const scope of chain.reverse()) {
      scope._traceIdState = execution.traceIdState;
      scope._traceId = execution.traceIdState.next++;
    }
  }

  let value = execution.allocate(primitiveUndefined());

  for (const statement of ast.body) {
    if (statement.type === "FunctionDeclaration" && statement.id?.name) {
      validateFunctionParameters(statement);
      environment.define(
        statement.id.name,
        createRuntimeFunction(
          statement,
          environment,
          statement.id.name,
        ),
        false,
      );
    }
  }

  try {
    for (const statement of ast.body) {
      value = executeStatement(statement, environment, execution);
      if (value?.kind === "break" || value?.kind === "continue") {
        throw new UnsupportedOperationError(
          `${value.kind} appeared outside a loop.`,
        );
      }
      if (value?.kind === "return") {
        throw new UnsupportedOperationError(
          "Return appeared outside a function.",
        );
      }
      if (value?.kind === "throw") {
        throw new InterpreterThrownError(value.value, value.node);
      }
    }
  } catch (error) {
    if (error instanceof TraceLimitError) {
      return {
        value: execution.allocate(primitiveUndefined()),
        environment,
        steps: execution.steps,
        runtimeValues: execution.runtimeValues,
        callStack: execution.callStack,
        trace: serializeInterpreterTrace(execution),
        status: "trace-limit",
        traceError: error,
        validation,
      };
    }

    try {
      execution.emitExceptionOnce(
        error.node || null,
        execution.callStack.at(-1)?.environment || environment,
        error,
        error instanceof InterpreterThrownError ? "throw" : "exception",
      );
    } catch (traceError) {
      if (traceError instanceof TraceLimitError) {
        error.trace = serializeInterpreterTrace(execution);
        error.status = "trace-limit";
        error.callStack = execution.callStack.map((frame) => ({ ...frame }));
        throw error;
      }
    }
    error.trace = serializeInterpreterTrace(execution);
    error.callStack = execution.callStack.map((frame) => ({ ...frame }));
    throw error;
  }

  return {
    value,
    environment,
    steps: execution.steps,
    runtimeValues: execution.runtimeValues,
    callStack: execution.callStack,
    trace: serializeInterpreterTrace(execution),
    status: execution.traceMetadata.truncated ? "trace-limit" : "completed",
    ...(execution.traceError ? { traceError: execution.traceError } : {}),
    validation,
  };
}

function executeJavaScript(sourceCode, options = {}) {
  const parsed = parseJavaScriptAst(sourceCode, options);
  return executeAst(parsed.ast, {
    ...options,
    limits: parsed.limits,
  });
}

module.exports = {
  DEFAULT_AST_LIMITS,
  SUPPORTED_NODE_TYPES,
  UnsupportedSyntaxError,
  UnsupportedOperationError,
  AstLimitError,
  ExecutionLimitError,
  TraceLimitError,
  ReturnSignal,
  ThrowSignal,
  InterpreterThrownError,
  RuntimePrimitive,
  RuntimeArray,
  RuntimeObject,
  RuntimeFunction,
  LexicalEnvironment,
  primitiveUndefined,
  primitiveNull,
  primitiveBoolean,
  primitiveNumber,
  primitiveString,
  createRuntimeArray,
  createRuntimeObject,
  createRuntimeFunction,
  sourceLocation,
  validateAst,
  parseJavaScriptAst,
  executeAst,
  executeJavaScript,
  evaluateExpression,
  executeStatement,
  executeStatementList,
};
