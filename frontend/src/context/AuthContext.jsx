
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { getCurrentUser } from "../api/authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const token = sessionStorage.getItem("codearena_token");

      if (!token) {
        if (active) setLoading(false);
        return;
      }

      try {
        const response = await getCurrentUser(token);
        const currentUser = response.user ?? response;

        if (active) {
          setUser(currentUser);
          sessionStorage.setItem(
            "codearena_user",
            JSON.stringify(currentUser)
          );
        }
      } catch {
        sessionStorage.removeItem("codearena_token");
        sessionStorage.removeItem("codearena_user");

        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  function login(data) {
    const currentUser = data.user ?? data;

    if (data.token) {
      sessionStorage.setItem("codearena_token", data.token);
    }

    sessionStorage.setItem(
      "codearena_user",
      JSON.stringify(currentUser)
    );

    setUser(currentUser);
  }

  function logout() {
    sessionStorage.removeItem("codearena_token");
    sessionStorage.removeItem("codearena_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
