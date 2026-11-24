import {
  getDashboardActivity as fetchDashboardActivity,
  getDashboardStats as fetchDashboardStats,
} from "../services/dashboardService";

export function getDashboardStats(token) {
  return fetchDashboardStats(token ? { token } : {});
}

export function getDashboardActivity(token) {
  return fetchDashboardActivity(token ? { token } : {});
}
