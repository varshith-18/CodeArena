import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import "./Register.css";

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setError("");

    const name = form.name.trim();
    const email = form.email.trim();

    if (name.length < 2 || name.length > 50) {
      setError("Name must be between 2 and 50 characters.");
      return;
    }

    if (form.password.length < 8 || form.password.length > 72) {
      setError("Password must be between 8 and 72 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const data = await registerUser({
        name,
        email,
        password: form.password,
      });

      // Ensure your AuthContext login function accepts the
      // response shape returned by registerUser.
      login(data);

      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to register. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="auth-card"
      onSubmit={handleSubmit}
      noValidate
    >
      <Link to="/" className="auth-brand">
        CodeArena
      </Link>

      <h1>Create your account</h1>

      <p className="auth-subtitle">
        Join CodeArena and start solving problems.
      </p>

      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}

      <label htmlFor="register-name">Full name</label>
      <input
        id="register-name"
        name="name"
        type="text"
        autoComplete="name"
        placeholder="Your name"
        minLength={2}
        maxLength={50}
        value={form.name}
        onChange={handleChange}
        required
        disabled={loading}
      />

      <label htmlFor="register-email">Email address</label>
      <input
        id="register-email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={form.email}
        onChange={handleChange}
        required
        disabled={loading}
      />

      <label htmlFor="register-password">Password</label>
      <input
        id="register-password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        minLength={8}
        maxLength={72}
        value={form.password}
        onChange={handleChange}
        required
        disabled={loading}
      />

      <label htmlFor="confirm-password">
        Confirm password
      </label>
      <input
        id="confirm-password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        placeholder="Enter password again"
        value={form.confirmPassword}
        onChange={handleChange}
        required
        disabled={loading}
      />

      <button
        className="auth-submit"
        type="submit"
        disabled={loading}
      >
        {loading ? "Creating account..." : "Create account"}
      </button>

      <p className="auth-footer">
        Already have an account?{" "}
        <Link to="/login">Log in</Link>
      </p>
    </form>
  );
}