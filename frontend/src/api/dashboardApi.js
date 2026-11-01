const configuredApiUrl =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const API_BASE_URL = `${configuredApiUrl
  .replace(/\/+$/, "")
  .replace(/\/api$/, "")}/api`;

async function fetchWithAuth(endpoint, token) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to load dashboard data.");
  }

  return data;
}

export async function getDashboardStats(token) {
  const data = await fetchWithAuth("/leaderboard/me", token);
  return data.stats;
}

export async function getDashboardActivity(token) {
  const data = await fetchWithAuth("/activity/me", token);
  return data.activity;
}