const configuredApiUrl =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const API_BASE_URL = `${configuredApiUrl
  .replace(/\/+$/, "")
  .replace(/\/api$/, "")}/api`;

export function getAuthToken() {
  return (
    sessionStorage.getItem("codearena_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken")
  );
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiRequest(
  endpoint,
  { method = "GET", body, auth = true, token, signal } = {},
) {
  const requestToken = token ?? (auth ? getAuthToken() : null);
  const headers = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (auth && requestToken) {
    headers.Authorization = `Bearer ${requestToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  const rawText = await response.text();
  let data;

  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    throw new ApiError(
      `The server returned an invalid response (HTTP ${response.status}).`,
      response.status,
    );
  }

  if (!response.ok || data?.success === false) {
    throw new ApiError(
      data?.message || `Request failed with status ${response.status}.`,
      response.status,
    );
  }

  return data;
}
