const configuredApiUrl =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const API_BASE_URL = `${configuredApiUrl.replace(/\/+$/, "").replace(/\/api$/, "")}/api`;

async function apiRequest(endpoint) {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("codearena_token");

  if (!token) {
    throw new Error("Please log in to view your submissions.");
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const rawText = await response.text();
  let data;

  try {
    data = JSON.parse(rawText);
  } catch {
    const contentType = response.headers.get("content-type") || "unknown";
    const preview = rawText.replace(/\s+/g, " ").trim().slice(0, 160);

    console.error("Submission API returned non-JSON:", {
      url: `${API_BASE_URL}${endpoint}`,
      status: response.status,
      contentType,
      body: preview,
    });

    throw new Error(
      `Expected JSON from the API, but received ${contentType} (HTTP ${response.status}). Check the API URL and backend.`
    );
  }

  if (!response.ok || data?.success === false) {
    throw new Error(
      data?.message || `Request failed with status ${response.status}.`
    );
  }

  if (!data || typeof data !== "object") {
    throw new Error("The API returned an invalid response.");
  }

  return data;
}

export async function getSubmissionHistory(problemSlug) {
  const query = problemSlug
    ? `?problemSlug=${encodeURIComponent(problemSlug)}`
    : "";

  const data = await apiRequest(`/submissions/history${query}`);

  if (!Array.isArray(data.submissions)) {
    throw new Error("The submission history response is missing its submissions array.");
  }

  return data;
}

export async function getSubmissionDetails(submissionId) {
  if (!submissionId) {
    throw new Error("A submission ID is required.");
  }

  const data = await apiRequest(
    `/submissions/${encodeURIComponent(submissionId)}`
  );

  if (!data.submission) {
    throw new Error("The submission details response is missing its submission.");
  }

  return data;
}