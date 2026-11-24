import {
  getSubmissionDetails as fetchSubmissionDetails,
  getSubmissionHistory as fetchSubmissionHistory,
  runCode as runSubmissionCode,
  submitCode as submitSubmissionCode,
} from "../services/submissionService";

export async function runCode({ problemSlug, sourceCode }, options) {
  const data = await runSubmissionCode({ problemSlug, sourceCode }, options);

  if (!data.success) {
    throw new Error("Failed to run test cases.");
  }

  return data;
}

export async function submitCode({ problemSlug, sourceCode, learningContext }, options) {
  const data = await submitSubmissionCode(
    { problemSlug, sourceCode, learningContext },
    options,
  );

  if (!data.success) {
    throw new Error("Failed to submit your solution.");
  }

  return data;
}

export async function getSubmissionHistory(problemSlug, options) {
  const data = await fetchSubmissionHistory(problemSlug, options);

  if (!Array.isArray(data.submissions)) {
    throw new Error(
      "The submission history response is missing its submissions array.",
    );
  }

  return data;
}

export async function getSubmissionDetails(submissionId, options) {
  const data = await fetchSubmissionDetails(submissionId, options);

  if (!data.submission) {
    throw new Error(
      "The submission details response is missing its submission.",
    );
  }

  return data;
}
