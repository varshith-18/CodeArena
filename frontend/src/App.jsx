import { useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthLayout from "./components/AuthLayout";

import { useAuth } from "./context/AuthContext";

import SubmissionHistory from "./pages/SubmissionHistory";
import SubmissionDetails from "./pages/SubmissionDetails";
import Problems from "./pages/Problems";
import Dashboard from "./pages/Dashboard";
import ProblemWorkspace from "./pages/ProblemWorkspace";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Leaderboard from "./pages/Leaderboard";

import "./index.css";
import "./App.css";

function PlaceholderPage({ title }) {
  return (
    <div className="page-content">
      <section className="welcome-section">
        <div>
          <span className="section-eyebrow">CODEARENA</span>
          <h1>{title}</h1>
          <p>This section is being prepared. Check back soon for updates.</p>
        </div>
      </section>
    </div>
  );
}

function AuthLoading() {
  return (
    <main className="auth-loading-page">
      <div className="auth-loading-card">
        <span className="auth-loading-spinner" aria-hidden="true" />
        <h1>Checking your session</h1>
        <p>Please wait while CodeArena verifies your account.</p>
      </div>
    </main>
  );
}

function AuthOnlyRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoading />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes() {
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 769px)").matches
      : false,
  );
  const location = useLocation();

  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/register";

  const isWorkspacePage = /^\/problems\/[^/]+\/?$/.test(location.pathname);

  // Close the sidebar when navigating to another page on small screens.
  const closeSidebar = () => {
    if (window.matchMedia("(max-width: 768px)").matches) {
      setSidebarOpen(false);
    }
  };
  const toggleSidebar = () => setSidebarOpen((isOpen) => !isOpen);

  // Authentication pages use their own layout.
  if (isAuthPage) {
    return (
      <Routes>
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={
              <AuthOnlyRoute>
                <Login />
              </AuthOnlyRoute>
            }
          />

          <Route
            path="/register"
            element={
              <AuthOnlyRoute>
                <Register />
              </AuthOnlyRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div
      className={`app-shell ${isWorkspacePage ? "app-shell-workspace" : ""} ${
        sidebarOpen ? "app-shell-sidebar-open" : "app-shell-sidebar-closed"
      }`}
    >
      {!isWorkspacePage && (
        <Sidebar open={sidebarOpen} onClose={closeSidebar} />
      )}

      <main
        className={`main-area ${isWorkspacePage ? "workspace-main-area" : ""}`}
      >
        {!isWorkspacePage && (
          <Topbar onMenuClick={toggleSidebar} sidebarOpen={sidebarOpen} />
        )}

        <div className="route-content">
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Dashboard />} />

              <Route path="/problems" element={<Problems />} />

              <Route path="/problems/:slug" element={<ProblemWorkspace />} />

              <Route path="/submissions" element={<SubmissionHistory />} />

              <Route
                path="/submissions/:submissionId"
                element={<SubmissionDetails />}
              />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route
                path="/learn"
                element={<PlaceholderPage title="Learn" />}
              />

              <Route
                path="/settings"
                element={<PlaceholderPage title="Settings" />}
              />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
      <AppRoutes />
  );
}
