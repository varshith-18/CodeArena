import { apiRequest } from "./apiClient";

export function runCode({ problemSlug, sourceCode }, options = {}) {
  return apiRequest("/submissions/run", {
    method: "POST",
    body: { problemSlug, sourceCode },
    ...options,
  });
}

export function submitCode({ problemSlug, sourceCode, learningContext }, options = {}) {
  return apiRequest("/submissions/submit", {
    method: "POST",
    body: {
      problemSlug,
      sourceCode,
      ...(learningContext ? { learningContext } : {}),
    },
    ...options,
  });
}

export function getSubmissionHistory(problemSlug, options = {}) {
  const query = problemSlug
    ? `?problemSlug=${encodeURIComponent(problemSlug)}`
    : "";

  return apiRequest(`/submissions/history${query}`, options);
}

export function getSubmissionDetails(submissionId, options = {}) {
  if (!submissionId) {
    throw new Error("A submission ID is required.");
  }

  return apiRequest(
    `/submissions/${encodeURIComponent(submissionId)}`,
    options,
  );
}
