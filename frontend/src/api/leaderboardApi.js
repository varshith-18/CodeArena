import {
  getLeaderboard as fetchLeaderboard,
  getMyLeaderboardStats as fetchMyLeaderboardStats,
} from "../services/leaderboardService";

export function getLeaderboard(limit = 50) {
  return fetchLeaderboard(limit);
}

export function getMyLeaderboardStats(token) {
  return fetchMyLeaderboardStats(token ? { token } : {});
}
