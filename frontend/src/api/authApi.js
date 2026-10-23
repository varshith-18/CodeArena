import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export async function registerUser(userData) {
  const response = await API.post("/auth/register", userData);
  return response.data;
}

export async function loginUser(credentials) {
  const response = await API.post("/auth/login", credentials);

  // Store the JWT token after successful login
  const { token } = response.data;

  if (token) {
    localStorage.setItem("token", token);
  }

  return response.data;
}

export async function getCurrentUser(token) {
  const response = await API.get("/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

export function logoutUser() {
  localStorage.removeItem("token");
}
