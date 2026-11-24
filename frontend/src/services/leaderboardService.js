import { apiRequest } from "./apiClient";

export async function getLeaderboard(limit = 50, options = {}) {
  const data = await apiRequest(
    `/leaderboard?limit=${encodeURIComponent(limit)}`,
    { auth: false, ...options },
  );
  return data.leaderboard;
}

export async function getMyLeaderboardStats(options = {}) {
  const data = await apiRequest("/leaderboard/me", options);
  return data.stats;
}
