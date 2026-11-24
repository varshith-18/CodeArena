const test = require("node:test");
const assert = require("node:assert/strict");
const { traceJavaScript } = require("../utils/jsTraceEngine");
const traceLimits = require("../config/traceLimits");

async function trace(sourceCode, functionName, args) {
  return traceJavaScript({ sourceCode, functionName, args });
}

test("traces normal JavaScript variables and loops", async () => {
  const result = await trace(
    "function sum(nums) {\n  let total = 0;\n  for (let i = 0; i < nums.length; i++) {\n    total += nums[i];\n  }\n  return total;\n}",
    "sum",
    [[1, 2, 3]],
  );

  assert.equal(result.status, "completed");
  assert.ok(result.steps.length > 0);
  assert.ok(result.steps.every((step) => step.line >= 1));
});

test("captures recursive function call frames", async () => {
  const result = await trace(
    "function factorial(n) {\n  if (n <= 1) return 1;\n  return n * factorial(n - 1);\n}",
    "factorial",
    [5],
  );

  assert.equal(result.status, "completed");
  assert.ok(
    result.steps.some(
      (step) =>
        step.event === "function-enter" ||
        step.callStack.some((frame) => frame.name === "factorial"),
    ),
  );
});
test("stops an infinite loop by an execution limit", async () => {
  const result = await trace(
    "function forever() {\n  let n = 0;\n  while (true) {\n    n++;\n  }\n}",
    "forever",
    [],
  );

  assert.ok(["step_limit", "timeout", "runtime_error"].includes(result.status));
  assert.ok(result.error);
  assert.ok(result.steps.length <= traceLimits.maxSteps);
});

test("stops excessive recursion by depth limit", async () => {
  const result = await trace(
    "function recurse(n) {\n  if (n <= 0) return 0;\n  return recurse(n - 1);\n}",
    "recurse",
    [1000],
  );

  assert.ok(
    ["depth_limit", "runtime_error", "step_limit", "timeout"].includes(
      result.status,
    ),
  );
});

test("bounds large array snapshots", async () => {
  const result = await trace(
    "function sumLarge() {\n  const nums = Array.from({ length: 10000 }, (_, i) => i);\n  let total = 0;\n  for (let i = 0; i < nums.length; i++) total += nums[i];\n  return total;\n}",
    "sumLarge",
    [],
  );

  assert.equal(result.status, "completed");
  for (const step of result.steps) {
    const arrayVariables = step.variables.filter(
      (variable) => variable.type === "array",
    );
    for (const variable of arrayVariables) {
      assert.ok(
        !variable.preview || variable.preview.length <= traceLimits.maxArrayPreviewItems,
      );
    }
  }
});

test("handles cyclic objects without unbounded serialization", async () => {
  const result = await trace(
    "function cyclic() {\n  const value = {};\n  value.self = value;\n  return value;\n}",
    "cyclic",
    [],
  );

  assert.equal(result.status, "completed");
  assert.ok(result.result);
  assert.equal(result.result.type, "object");
});

test("reports unsupported syntax explicitly", async () => {
  const result = await trace(
    "async function unsupported() {\n  const value = await Promise.resolve(1);\n  return value;\n}",
    "unsupported",
    [],
  );

  assert.equal(result.status, "unsupported_construct");
  assert.ok(result.unsupported.length > 0);
  assert.ok(result.error);
});

test("reports malformed JavaScript syntax explicitly", async () => {
  const result = await trace(
    "function broken( {\n  return 1;\n}",
    "broken",
    [],
  );

  assert.equal(result.status, "unsupported_syntax");
  assert.ok(result.error);
});
