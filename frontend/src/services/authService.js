import { apiRequest } from "./apiClient";

export function registerUser(userData) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: userData,
    auth: false,
  });
}

export function loginUser(credentials) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: credentials,
    auth: false,
  });
}

export function getCurrentUser(token) {
  return apiRequest("/auth/me", { token });
}
