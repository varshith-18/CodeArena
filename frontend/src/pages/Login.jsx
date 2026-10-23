
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginUser } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await loginUser({
        email: form.email.trim(),
        password: form.password,
      });

      // Save the user and token through AuthContext.
      login(data);

      // Return to the originally requested page or dashboard.
      const destination = location.state?.from?.pathname || "/";

      navigate(destination, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to log in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <Link to="/" className="auth-brand">
        CodeArena
      </Link>

      <h1>Welcome back</h1>

      <p className="auth-subtitle">
        Log in to continue your coding journey.
      </p>

      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}

      <label htmlFor="login-email">Email address</label>
      <input
        id="login-email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={form.email}
        onChange={handleChange}
        required
      />

      <label htmlFor="login-password">Password</label>
      <input
        id="login-password"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="Enter your password"
        value={form.password}
        onChange={handleChange}
        required
      />

      <button
        className="auth-submit"
        type="submit"
        disabled={loading}
      >
        {loading ? "Logging in..." : "Log in"}
      </button>

      <p className="auth-footer">
        Don't have an account?{" "}
        <Link to="/register">Create one</Link>
      </p>
    </form>
  );}