import { apiRequest } from "./apiClient";

export async function getMyActivity(options = {}) {
  const data = await apiRequest("/activity/me", options);
  return data.activity;
}
