const configuredApiUrl =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const API_BASE_URL = `${configuredApiUrl
  .replace(/\/+$/, "")
  .replace(/\/api$/, "")}/api`;

export async function getMyActivity(token) {
  const response = await fetch(`${API_BASE_URL}/activity/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to load activity.");
  }

  return data.activity;
}