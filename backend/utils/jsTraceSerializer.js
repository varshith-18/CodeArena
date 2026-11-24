const traceLimits = require("../config/traceLimits");

function truncateText(value, maxBytes = traceLimits.maxValuePreviewBytes) {
  const text = String(value);
  if (Buffer.byteLength(text, "utf8") <= maxBytes) return text;
  return `${Buffer.from(text).subarray(0, maxBytes).toString("utf8")}…`;
}

function serializeValue(value) {
  if (value && typeof value === "object" && typeof value.type === "string") {
    if (value.type === "array") {
      return {
        type: "array",
        length: Number.isInteger(value.length) ? value.length : null,
        preview: Array.isArray(value.preview)
          ? value.preview.slice(0, traceLimits.maxArrayPreviewItems)
          : [],
      };
    }

    if (value.type === "object") {
      return {
        type: "object",
        description: truncateText(value.description || "Object"),
        preview: truncateText(value.preview || ""),
      };
    }

    return {
      type: value.type,
      value: truncateText(value.value ?? ""),
    };
  }

  if (value && typeof value === "object") {
    if (Array.isArray(value)) {
      return {
        type: "array",
        length: value.length,
        preview: value
          .slice(0, traceLimits.maxArrayPreviewItems)
          .map((item) =>
            item && typeof item === "object"
              ? serializeValue(item)
              : truncateText(item),
          ),
      };
    }

    return {
      type: "object",
      description: truncateText(value.description || "Object"),
      preview: truncateText(value.preview || ""),
    };
  }

  return {
    type: typeof value,
    value: truncateText(value),
  };
}

function serializeStep(step) {
  const variables = Array.isArray(step.variables)
    ? step.variables.slice(0, traceLimits.maxVariables).map((variable) => ({
        name: truncateText(variable.name, 256),
        ...serializeValue(variable.value),
      }))
    : [];

  const callStack = Array.isArray(step.callStack)
    ? step.callStack.slice(0, traceLimits.maxCallFrames).map((frame) => ({
        name: truncateText(frame.name || "(anonymous)", 256),
        line: Number.isInteger(frame.line) ? frame.line : null,
        column: Number.isInteger(frame.column) ? frame.column : null,
        depth: Number.isInteger(frame.depth) ? frame.depth : null,
      }))
    : [];

  return {
    id: Number.isInteger(step.id) ? step.id : 0,
    line: Number.isInteger(step.line) ? step.line : null,
    column: Number.isInteger(step.column) ? step.column : null,
    event: truncateText(step.event || "line", 64),
    reason: truncateText(step.reason || "breakpoint", 64),
    changedVariables: Array.isArray(step.changedVariables)
      ? step.changedVariables
          .slice(0, traceLimits.maxVariables)
          .map((name) => truncateText(name, 256))
      : [],
    variables,
    callStack,
  };
}

function serializeTrace(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Tracing engine returned an invalid response.");
  }

  const supportedStatuses = new Set([
    "completed",
    "unsupported_syntax",
    "unsupported_construct",
    "runtime_error",
    "step_limit",
    "depth_limit",
    "timeout",
  ]);

  const status = supportedStatuses.has(raw.status) ? raw.status : "runtime_error";
  const steps = Array.isArray(raw.steps)
    ? raw.steps.slice(0, traceLimits.maxSteps).map(serializeStep)
    : [];

  const result = {
    status,
    result: raw.result === undefined ? null : serializeValue(raw.result),
    error: raw.error ? truncateText(raw.error, 2_000) : null,
    unsupported: Array.isArray(raw.unsupported)
      ? raw.unsupported.slice(0, 20).map((item) => truncateText(item, 256))
      : [],
    steps,
  };

  let encoded = JSON.stringify(result);
  while (
    Buffer.byteLength(encoded, "utf8") > traceLimits.maxTraceBytes &&
    steps.length > 0
  ) {
    steps.splice(Math.floor(steps.length / 2), 1);
    result.steps = steps;
    encoded = JSON.stringify(result);
  }

  if (Buffer.byteLength(encoded, "utf8") > traceLimits.maxTraceBytes) {
    result.error =
      truncateText(
        `${result.error || "Trace snapshot"}; trace output exceeded the snapshot limit.`,
        2_000,
      );
    result.steps = [];
  }

  return result;
}

module.exports = {
  serializeTrace,
  serializeStep,
  serializeValue,
  truncateText,
};
