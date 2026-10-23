
const configuredApiUrl =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const API_BASE_URL = `${configuredApiUrl
  .replace(/\/+$/, "")
  .replace(/\/api$/, "")}/api`;

async function request(endpoint, token) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: token
      ? { Authorization: `Bearer ${token}` }
      : {},
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

export async function getLeaderboard(limit = 50) {
  const data = await request(`/leaderboard?limit=${limit}`);
  return data.leaderboard;
}

export async function getMyLeaderboardStats(token) {
  const data = await request("/leaderboard/me", token);
  return data.stats;
}
