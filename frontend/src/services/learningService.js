import { apiRequest } from "./apiClient";

export function getLearningPathsProgress(options = {}) {
  return apiRequest("/learning-paths/me", options);
}

export function getLearningPathProgress(pathSlug, options = {}) {
  if (!pathSlug) {
    throw new Error("A learning path slug is required.");
  }

  return apiRequest(
    `/learning-paths/${encodeURIComponent(pathSlug)}/me`,
    options,
  );
}

export function getContinueLearning(options = {}) {
  return apiRequest("/learning-paths/me/continue", options);
}
