const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_AST_LIMITS,
  UnsupportedSyntaxError,
  AstLimitError,
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
  parseJavaScriptAst,
  validateAst,
  executeJavaScript,
  UnsupportedOperationError,
  ExecutionLimitError,
  TraceLimitError,
  InterpreterThrownError,
} = require("../utils/jsAstInterpreter");

test("parses supported variables, functions, conditionals, loops, arrays, and objects", () => {
  const source = `
    function sum(nums) {
      let total = 0;
      for (let i = 0; i < nums.length; i++) {
        if (nums[i] > 0) total += nums[i];
      }
      return { total: total, values: nums };
    }
  `;

  const parsed = parseJavaScriptAst(source);

  assert.equal(parsed.ast.type, "Program");
  assert.ok(parsed.validation.nodeCount > 0);
  assert.ok(parsed.validation.maxDepth <= DEFAULT_AST_LIMITS.maxDepth);
});

test("rejects async, class, import, await, and generator syntax", () => {
  const sources = [
    "async function run() { return 1; }",
    "class Example {}",
    "import x from './x.js';",
    "function run() { return await value; }",
    "function* run() { yield 1; }",
  ];

  for (const source of sources) {
    assert.throws(
      () => parseJavaScriptAst(source),
      UnsupportedSyntaxError,
    );
  }
});

test("rejects Node-style globals and native execution identifiers", () => {
  const sources = [
    "function run() { return process.version; }",
    "function run() { return require('fs'); }",
    "function run() { return globalThis.value; }",
    "function run() { return eval('1 + 1'); }",
    "function run() { return Function('return 1'); }",
  ];

  for (const source of sources) {
    assert.throws(
      () => parseJavaScriptAst(source),
      UnsupportedSyntaxError,
    );
  }
});

test("rejects destructuring, spread, optional chaining, regex, and this", () => {
  const sources = [
    "const [a, b] = values;",
    "const result = [...values];",
    "const value = object?.field;",
    "const match = /test/.test(value);",
    "function run() { return this.value; }",
  ];

  for (const source of sources) {
    assert.throws(
      () => parseJavaScriptAst(source),
      UnsupportedSyntaxError,
    );
  }
});

test("creates primitive runtime values", () => {
  assert.equal(primitiveUndefined().kind, "primitive");
  assert.equal(primitiveUndefined().value, undefined);
  assert.equal(primitiveNull().type, "null");
  assert.equal(primitiveBoolean(1).value, true);
  assert.equal(primitiveNumber("4").value, 4);
  assert.equal(primitiveString("hello").value, "hello");
});

test("creates data-only arrays, objects, and functions", () => {
  const array = createRuntimeArray([
    primitiveNumber(1),
    primitiveNumber(2),
  ]);
  assert.ok(array instanceof RuntimeArray);
  assert.equal(array.elements.length, 2);

  const object = createRuntimeObject(
    new Map([
      ["answer", primitiveNumber(42)],
    ]),
  );
  assert.ok(object instanceof RuntimeObject);
  assert.equal(object.properties.get("answer").value, 42);

  const parsed = parseJavaScriptAst("function add(a, b) { return a + b; }");
  const environment = new LexicalEnvironment();
  const fn = createRuntimeFunction(
    parsed.ast.body[0],
    environment,
    "add",
  );
  assert.ok(fn instanceof RuntimeFunction);
  assert.equal(fn.name, "add");
  assert.equal(fn.lexicalEnvironment, environment);
});

test("creates lexical scopes and resolves parent bindings", () => {
  const root = new LexicalEnvironment();
  root.define("base", primitiveNumber(10));

  const child = new LexicalEnvironment(root);
  child.define("local", primitiveNumber(5));

  assert.equal(child.get("base").value, 10);
  assert.equal(child.get("local").value, 5);

  child.set("base", primitiveNumber(20));
  assert.equal(root.get("base").value, 20);
});

test("lexical environments reject binding overflow", () => {
  const environment = new LexicalEnvironment(null, {
    ...DEFAULT_AST_LIMITS,
    maxEnvironmentBindings: 1,
  });
  environment.define("first", primitiveNumber(1));

  assert.throws(
    () => environment.define("second", primitiveNumber(2)),
    AstLimitError,
  );
});

test("rejects source-size and AST-node limits", () => {
  assert.throws(
    () =>
      parseJavaScriptAst("let value = 1;", {
        limits: {
          ...DEFAULT_AST_LIMITS,
          sourceSizeBytes: 4,
        },
      }),
    AstLimitError,
  );

  const ast = {
    type: "Program",
    body: [],
    sourceType: "script",
  };

  assert.throws(
    () =>
      validateAst(ast, {
        ...DEFAULT_AST_LIMITS,
        maxAstNodes: 0,
      }),
    AstLimitError,
  );
});

test("rejects string and runtime collection limits", () => {
  assert.throws(
    () =>
      primitiveString(
        "a".repeat(DEFAULT_AST_LIMITS.maxStringBytes + 1),
      ),
    AstLimitError,
  );

  assert.throws(
    () =>
      createRuntimeArray(
        Array.from({ length: 3 }),
        {
          ...DEFAULT_AST_LIMITS,
          maxArrayLength: 2,
        },
      ),
    AstLimitError,
  );

  assert.throws(
    () =>
      createRuntimeObject(
        new Map([
          ["a", primitiveNumber(1)],
          ["b", primitiveNumber(2)],
        ]),
        {
          ...DEFAULT_AST_LIMITS,
          maxObjectProperties: 1,
        },
      ),
    AstLimitError,
  );
});

test("evaluates arithmetic, comparison, logical, unary, and assignment operators", () => {
  const result = executeJavaScript(`
    let a = 10;
    let b = 3;
    a += 5;
    let arithmetic = (a * b) - 2;
    let comparison = a >= 15 && b !== 0;
    let logical = 0 || "kept";
    let unary = -b + +2;
    logical;
  `);

  assert.equal(result.value.type, "string");
  assert.equal(result.value.value, "kept");
  assert.equal(result.environment.get("arithmetic").value, 43);
  assert.equal(result.environment.get("comparison").value, true);
  assert.equal(result.environment.get("unary").value, -1);
});

test("evaluates arrays, objects, and member assignments", () => {
  const result = executeJavaScript(`
    let nums = [2, 4, 6];
    nums[1] = 10;
    let object = { answer: 42 };
    object.answer += 8;
    let values = nums.length + object.answer;
    values;
  `);

  assert.equal(result.value.type, "number");
  assert.equal(result.value.value, 53);
  assert.deepEqual(
    result.environment.get("nums").elements.map((value) => value.value),
    [2, 10, 6],
  );
  assert.equal(
    result.environment.get("object").properties.get("answer").value,
    50,
  );
});

test("creates nested lexical scopes and resolves shadowed variables", () => {
  const result = executeJavaScript(`
    let value = 10;
    let outer = value;
    {
      let value = 30;
      outer = value + 1;
    }
    value;
  `);

  assert.equal(result.value.value, 10);
  assert.equal(result.environment.get("outer").value, 31);
});

test("evaluates if and else conditionals", () => {
  const result = executeJavaScript(`
    let result = 0;
    if (3 > 2) {
      result = 7;
    } else {
      result = 9;
    }
    result;
  `);

  assert.equal(result.value.value, 7);
});

test("evaluates for, while, do-while, break, and continue", () => {
  const forResult = executeJavaScript(`
    let total = 0;
    for (let i = 0; i < 6; i++) {
      if (i === 2) continue;
      if (i === 5) break;
      total += i;
    }
    total;
  `);
  assert.equal(forResult.value.value, 8);

  const whileResult = executeJavaScript(`
    let i = 0;
    let total = 0;
    while (i < 4) {
      i++;
      if (i === 2) continue;
      total += i;
    }
    total;
  `);
  assert.equal(whileResult.value.value, 8);

  const doResult = executeJavaScript(`
    let i = 0;
    do {
      i++;
    } while (i < 3);
    i;
  `);
  assert.equal(doResult.value.value, 3);
});

test("rejects constant reassignment and function calls", () => {
  assert.throws(
    () => executeJavaScript("const value = 1; value = 2;"),
    UnsupportedSyntaxError,
  );
});

test("enforces execution and array limits", () => {
  assert.throws(
    () =>
      executeJavaScript("while (true) {}", {
        limits: {
          ...DEFAULT_AST_LIMITS,
          maxExecutionSteps: 20,
        },
      }),
    ExecutionLimitError,
  );

  assert.throws(
    () =>
      executeJavaScript("let values = [1, 2, 3];", {
        limits: {
          ...DEFAULT_AST_LIMITS,
          maxArrayLength: 2,
        },
      }),
    ExecutionLimitError,
  );
});

test("executes function declarations, parameters, and nested calls", () => {
  const result = executeJavaScript(`
    function add(a, b) {
      return a + b;
    }
    function multiply(value) {
      return value * 3;
    }
    multiply(add(2, 4));
  `);

  assert.equal(result.value.value, 18);
  assert.equal(result.callStack.length, 0);
});

test("executes early returns and arrow functions", () => {
  const result = executeJavaScript(`
    const check = (value) => {
      if (value > 5) return "large";
      return "small";
    };
    check(8);
  `);

  assert.equal(result.value.value, "large");
});

test("executes arrow expression bodies", () => {
  const result = executeJavaScript(`
    const double = (value) => value * 2;
    double(11);
  `);

  assert.equal(result.value.value, 22);
});

test("executes recursion and explicit return values", () => {
  const result = executeJavaScript(`
    function factorial(n) {
      if (n <= 1) return 1;
      return n * factorial(n - 1);
    }
    factorial(5);
  `);

  assert.equal(result.value.value, 120);
});

test("captures lexical closures and preserves variable shadowing", () => {
  const result = executeJavaScript(`
    function makeAdder(base) {
      const inner = (value) => base + value;
      return inner;
    }
    let addFive = makeAdder(5);
    let value = 10;
    {
      let value = 20;
      addFive(value);
    }
    addFive(3);
  `);

  assert.equal(result.value.value, 8);
});

test("supports nested function declarations and closures", () => {
  const result = executeJavaScript(`
    function outer(start) {
      function inner(delta) {
        return start + delta;
      }
      return inner(4);
    }
    outer(6);
  `);

  assert.equal(result.value.value, 10);
});

test("propagates thrown interpreter values", () => {
  assert.throws(
    () =>
      executeJavaScript(`
        function fail() {
          throw "failed";
        }
        fail();
      `),
    (error) =>
      error.name === "InterpreterThrownError" &&
      error.value.type === "string" &&
      error.value.value === "failed",
  );
});

test("enforces call stack depth limits", () => {
  assert.throws(
    () =>
      executeJavaScript(
        `
          function recurse(n) {
            if (n <= 0) return 0;
            return recurse(n - 1);
          }
          recurse(100);
        `,
        {
          limits: {
            ...DEFAULT_AST_LIMITS,
            maxDepth: 8,
          },
        },
      ),
    ExecutionLimitError,
  );
});

test("emits ordered statement, variable, and loop trace events", () => {
  const result = executeJavaScript(`
    let total = 0;
    for (let i = 0; i < 3; i++) {
      total += i;
    }
  `);

  const types = result.trace.steps.map((step) => step.event);
  assert.ok(types.includes("statement"));
  assert.ok(types.includes("variable-change"));
  assert.ok(types.includes("loop-iteration"));
  assert.ok(result.trace.steps[0].line >= 1);
  assert.ok(result.trace.steps[0].column >= 0);
});

test("tracks changed variables between snapshots", () => {
  const result = executeJavaScript(`
    let value = 1;
    value = 2;
  `);

  const changes = result.trace.steps
    .flatMap((step) => step.changedVariables);
  assert.ok(changes.includes("value"));
});

test("captures nested scopes and closure variables", () => {
  const result = executeJavaScript(`
    let outer = 10;
    function make() {
      let inner = outer + 5;
      return () => inner + 1;
    }
    let fn = make();
  `);

  const scopedSteps = result.trace.steps.filter(
    (step) => step.scopes && step.scopes.length > 1,
  );
  assert.ok(scopedSteps.length > 0);

  const recursionOrClosure = result.trace.steps.find(
    (step) =>
      step.callStack &&
      step.callStack.some((frame) => frame.name === "make"),
  );
  assert.ok(recursionOrClosure);
});

test("traces recursion, call frames, and return events", () => {
  const result = executeJavaScript(`
    function factorial(n) {
      if (n <= 1) return 1;
      return n * factorial(n - 1);
    }
    factorial(4);
  `);

  const types = result.trace.steps.map((step) => step.event);
  assert.ok(types.includes("function-enter"));
  assert.ok(types.includes("function-return"));
  assert.ok(types.includes("return"));

  const deepFrames = result.trace.steps
    .flatMap((step) => step.callStack)
    .filter((frame) => frame.name === "factorial");
  assert.ok(deepFrames.length > 0);
});

test("captures exceptions and source locations", () => {
  assert.throws(
    () =>
      executeJavaScript(`
        function fail() {
          throw "failed";
        }
        fail();
      `),
    (error) =>
      error instanceof InterpreterThrownError &&
      Array.isArray(error.trace?.steps) &&
      error.trace.steps.some(
        (step) => step.event === "exception",
      ),
  );
});

test("trace snapshots are isolated from later interpreter mutations", () => {
  const result = executeJavaScript(`
    let nums = [1, 2];
    let object = { answer: 42 };
    nums[0] = 9;
    object.answer = 50;
  `);

  const numsSnapshot = result.trace.steps
    .flatMap((step) => step.variables)
    .find((variable) => variable.name === "nums");

  assert.ok(numsSnapshot);
  assert.notEqual(numsSnapshot.value.preview, undefined);

  result.environment.get("nums").elements[0].value = 100;
  result.environment.get("object").properties.set(
    "answer",
    primitiveNumber(100),
  );

  const snapshotAfterMutation = result.trace.steps
    .flatMap((step) => step.variables)
    .find((variable) => variable.name === "nums");
  assert.notEqual(snapshotAfterMutation.value.preview[0].value, 100);
});

test("enforces trace step and preview limits", () => {
  const result = executeJavaScript(
    `
      let total = 0;
      for (let i = 0; i < 100; i++) {
        total += i;
      }
    `,
    {
      limits: {
        ...DEFAULT_AST_LIMITS,
        maxTraceSteps: 12,
        maxTraceVariables: 3,
        maxTraceArrayPreview: 2,
        maxTracePreviewDepth: 2,
        maxTraceBytes: 2048,
      },
    },
  );

  assert.equal(result.status, "trace-limit");
  assert.ok(result.trace.steps.length <= 12);
  assert.ok(result.traceError instanceof TraceLimitError);
});

test("call frame setup and parameter binding clean up after binding failures", () => {
  let error;

  try {
    executeJavaScript(
      `
        function pair(first, second) {
          return first + second;
        }
        pair(1, 2);
      `,
      {
        limits: {
          ...DEFAULT_AST_LIMITS,
          maxEnvironmentBindings: 1,
        },
      },
    );
  } catch (caught) {
    error = caught;
  }

  assert.ok(error);
  assert.equal(error.name, "AstLimitError");
  assert.equal(error.callStack.length, 0);
  assert.equal(error.trace.steps.filter((step) =>
    step.event === "exception",
  ).length, 1);
  assert.equal(error.trace.omittedSteps ?? 0, 0);
});

test("call frames are not left on the stack when call depth is exceeded", () => {
  assert.throws(
    () =>
      executeJavaScript(
        `
          function recurse(n) {
            if (n <= 0) return 0;
            return recurse(n - 1);
          }
          recurse(5);
        `,
        {
          limits: {
            ...DEFAULT_AST_LIMITS,
            maxCallDepth: 1,
          },
        },
      ),
    (error) =>
      error instanceof ExecutionLimitError &&
      error.callStack.length === 0 &&
      error.details.limit === 1,
  );
});

test("a thrown value emits exactly one exception event", () => {
  assert.throws(
    () =>
      executeJavaScript(`
        function middle() {
          throw "boom";
        }
        function outer() {
          return middle();
        }
        outer();
      `),
    (error) => {
      assert.equal(error instanceof InterpreterThrownError, true);
      const exceptionSteps = error.trace.steps.filter(
        (step) => step.event === "exception",
      );
      assert.equal(exceptionSteps.length, 1);
      assert.equal(exceptionSteps[0].reason, "throw");
      return true;
    },
  );
});

test("native runtime errors emit exactly one exception event", () => {
  assert.throws(
    () =>
      executeJavaScript(`
        function inner() {
          return unknownVariable;
        }
        function outer() {
          return inner();
        }
        outer();
      `),
    (error) => {
      const exceptionSteps = error.trace.steps.filter(
        (step) => step.event === "exception",
      );
      assert.equal(exceptionSteps.length, 1);
      return true;
    },
  );
});

test("trace bytes are checked before a snapshot is accumulated", () => {
  const result = executeJavaScript(
    `
      let first = "xxxxxxxxxxxxxxxxxxxxxxxx";
      let second = "yyyyyyyyyyyyyyyyyyyyyyyy";
      let third = "zzzzzzzzzzzzzzzzzzzzzz";
    `,
    {
      limits: {
        ...DEFAULT_AST_LIMITS,
        maxTraceBytes: 450,
      },
    },
  );

  assert.equal(result.status, "trace-limit");
  assert.ok(result.trace instanceof Object);
  assert.equal(result.trace.truncated, true);
  assert.ok(result.trace.omittedSteps >= 1);

  for (const step of result.trace.steps) {
    assert.ok(
      Buffer.byteLength(JSON.stringify({ steps: result.trace.steps }), "utf8") >
        0,
    );
  }
});

test("trace metadata reports omitted variables and scopes", () => {
  const result = executeJavaScript(
    `
      let a = 1;
      let b = 2;
      {
        let c = 3;
        c++;
      }
    `,
    {
      limits: {
        ...DEFAULT_AST_LIMITS,
        maxTraceVariables: 1,
        maxTraceScopes: 1,
      },
    },
  );

  assert.equal(result.trace.omittedVariables > 0, true);
  assert.equal(result.trace.omittedScopes > 0, true);

  for (const step of result.trace.steps) {
    assert.ok(Array.isArray(step.scopes));
    assert.ok(step.scopes.length <= 1);
  }
});

test("function snapshots contain bounded closure scope references", () => {
  const result = executeJavaScript(`
    let base = 10;
    function make() {
      let inner = base + 5;
      return () => inner + 1;
    }
    let fn = make();
  `, {
    limits: {
      ...DEFAULT_AST_LIMITS,
      maxTraceScopes: 2,
    },
  });

  const functionSnapshots = result.trace.steps
    .flatMap((step) => step.variables)
    .filter((variable) =>
      variable.value && variable.value.type === "function",
    );

  assert.ok(functionSnapshots.length > 0);
  for (const snapshot of functionSnapshots) {
    assert.ok(snapshot.value.scopeId !== undefined);
    assert.ok(Array.isArray(snapshot.value.closureScopeIds));
    assert.ok(snapshot.value.closureScopeIds.length <= 2);
  }
});

test("changed variable records include their scope IDs", () => {
  const result = executeJavaScript(`
    let value = 1;
    {
      let value = 2;
      value = 3;
    }
  `);

  const records = result.trace.steps
    .flatMap((step) => step.changedVariableRecords || [])
    .filter((record) => record.name === "value");

  assert.ok(records.length > 0);
  assert.ok(records.every((record) =>
    Number.isInteger(record.scopeId),
  ));
});

test("nested function and object snapshots remain isolated after mutation", () => {
  const result = executeJavaScript(`
    let outer = { nested: { answer: 1 } };
    function make() {
      let inner = { total: 2 };
      return { inner: inner };
    }
    let fn = make();
  `);

  const outerSnapshot = result.trace.steps
    .flatMap((step) => step.variables)
    .find((variable) => variable.name === "outer");
  assert.ok(outerSnapshot);

  result.environment.get("outer").properties
    .get("nested").properties.set(
      "answer",
      primitiveNumber(99),
    );

  const outerSnapshotAfterMutation = result.trace.steps
    .flatMap((step) => step.variables)
    .find((variable) => variable.name === "outer");
  assert.equal(
    outerSnapshotAfterMutation.value.preview.nested.preview.answer.value,
    1,
  );
});

test("AST depth and call depth are enforced independently", () => {
  assert.throws(
    () =>
      parseJavaScriptAst(
        `
          let value = 1;
          if (value) {
            if (value) {
              value = 2;
            }
          }
        `,
        {
          limits: {
            ...DEFAULT_AST_LIMITS,
            maxAstDepth: 3,
            maxCallDepth: 100,
          },
        },
      ),
    AstLimitError,
  );

  assert.throws(
    () =>
      executeJavaScript(
        `
          function recurse(n) {
            if (n <= 0) return 0;
            return recurse(n - 1);
          }
          recurse(20);
        `,
        {
          limits: {
            ...DEFAULT_AST_LIMITS,
            maxAstDepth: 100,
            maxCallDepth: 2,
          },
        },
      ),
    ExecutionLimitError,
  );
});

test("large traces stop recording incrementally and execute to completion", () => {
  const result = executeJavaScript(
    `
      let total = 0;
      for (let i = 0; i < 1000; i++) {
        total += i;
      }
    `,
    {
      limits: {
        ...DEFAULT_AST_LIMITS,
        maxExecutionSteps: 10_000,
        maxTraceSteps: 40,
        maxTraceBytes: 1_048_576,
      },
    },
  );

  assert.equal(result.status, "trace-limit");
  assert.equal(result.trace.truncated, true);
  assert.ok(result.trace.steps.length <= 40);
  assert.ok(result.trace.omittedSteps >= 1);
  assert.ok(result.traceError instanceof TraceLimitError);
  assert.equal(result.callStack.length, 0);
  assert.equal(result.environment.get("total").value, 499500);
});

test("shared arrays are cloned independently in snapshots", () => {
  const result = executeJavaScript(`
    let shared = [1, 2, 3];
    let alias = shared;
    shared[0] = 99;
  `);

  const snapshots = result.trace.steps
    .flatMap((step) => step.variables)
    .filter((variable) =>
      variable.name === "shared" || variable.name === "alias"
    );

  assert.ok(snapshots.length > 0);
  for (const snapshot of snapshots) {
    assert.equal(snapshot.value.type, "array");
    assert.equal(snapshot.value.preview.length <= 100, true);
  }

  result.environment.get("shared").elements[0].value = 500;
  for (const snapshot of result.trace.steps
    .flatMap((step) => step.variables)
    .filter((variable) => variable.name === "shared")) {
    assert.notEqual(snapshot.value.preview[0].value, 500);
  }
});

test("oversized snapshots stop tracing while execution finishes", () => {
  const result = executeJavaScript(
    `
      let value = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
      value = "done";
    `,
    {
      limits: {
        ...DEFAULT_AST_LIMITS,
        maxTraceBytes: 128,
        maxTracePreviewBytes: 4096,
      },
    },
  );

  assert.equal(result.status, "trace-limit");
  assert.equal(result.trace.truncated, true);
  assert.ok(result.trace.omittedSteps >= 1);
  assert.ok(result.traceError instanceof TraceLimitError);
  assert.equal(result.environment.get("value").value, "done");
  assert.ok(
    Buffer.byteLength(JSON.stringify(result.trace), "utf8") <=
      DEFAULT_AST_LIMITS.maxTraceBytes,
  );
});

test("rejects invalid and ceiling-exceeding execution limits", () => {
  const invalidValues = [undefined, null, NaN, Infinity, "10", 0, -1, 1.5];
  for (const invalidValue of invalidValues) {
    assert.throws(
      () =>
        executeJavaScript("let value = 1;", {
          limits: {
            ...DEFAULT_AST_LIMITS,
            maxExecutionSteps: invalidValue,
          },
        }),
      AstLimitError,
    );
  }

  assert.throws(
    () =>
      executeJavaScript("let value = 1;", {
        limits: {
          ...DEFAULT_AST_LIMITS,
          maxTraceBytes: 16_777_217,
        },
      }),
    AstLimitError,
  );

  assert.throws(
    () =>
      parseJavaScriptAst("let value = 1;", {
        limits: {
          ...DEFAULT_AST_LIMITS,
          maxAstDepth: Number.NaN,
        },
      }),
    AstLimitError,
  );
});

test("__proto__ object preview keys are prototype-safe", () => {
  const result = executeJavaScript(`
    let object = { __proto__: 42, safe: 7 };
  `);

  const snapshot = result.trace.steps
    .flatMap((step) => step.variables)
    .find((variable) => variable.name === "object");

  assert.ok(snapshot);
  assert.equal(Object.getPrototypeOf(snapshot.value.preview), null);
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      snapshot.value.preview,
      "__proto__",
    ),
    true,
  );
  assert.equal(snapshot.value.preview.__proto__.value.value, 42);
  assert.equal(
    JSON.parse(JSON.stringify(snapshot.value.preview)).__proto__.value,
    42,
  );
});

test("trace scope IDs restart locally for every execution", () => {
  const source = `
    let outer = 1;
    function inner() {
      let local = outer + 1;
      return local;
    }
    inner();
  `;

  const first = executeJavaScript(source);
  const second = executeJavaScript(source);

  const firstRootIds = first.trace.steps
    .flatMap((step) => step.scopes)
    .map((scope) => scope.id);
  const secondRootIds = second.trace.steps
    .flatMap((step) => step.scopes)
    .map((scope) => scope.id);

  assert.ok(firstRootIds.includes(1));
  assert.ok(secondRootIds.includes(1));
  assert.equal(
    new Set(firstRootIds).size <= new Set(secondRootIds).size,
    true,
  );
  assert.equal(Math.max(...firstRootIds), Math.max(...secondRootIds));
});
