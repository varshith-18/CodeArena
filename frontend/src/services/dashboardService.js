import { apiRequest } from "./apiClient";

export async function getDashboardStats(options = {}) {
  const data = await apiRequest("/leaderboard/me", options);
  return data.stats;
}

export async function getDashboardActivity(options = {}) {
  const data = await apiRequest("/activity/me", options);
  return data.activity;
}
