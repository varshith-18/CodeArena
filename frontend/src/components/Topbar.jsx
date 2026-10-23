
import { Bell, Search, Menu, Flame, LogOut, Terminal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Topbar.css";

export default function Topbar({ onMenuClick, sidebarOpen }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const initial = user?.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <header className="topbar">
      <button
        className="mobile-menu"
        onClick={onMenuClick}
        aria-expanded={sidebarOpen}
        aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
      >
        <Menu size={22} />
      </button>

      <button
        className="topbar-brand"
        onClick={() => navigate("/")}
        aria-label="Go to CodeArena dashboard"
      >
        <span className="topbar-brand-icon">
          <Terminal size={17} />
        </span>
        <span className="topbar-brand-copy">
          <strong>CodeArena</strong>
          <small>LEVEL UP YOUR CODE</small>
        </span>
      </button>

      <div className="breadcrumb">
        <span>Workspace</span>
        <span className="breadcrumb-divider">/</span>
        <strong>Dashboard</strong>
      </div>

      <div className="topbar-actions">
        <button
          className="search-button"
          onClick={() => navigate("/problems")}
        >
          <Search size={17} />
          <span>Find problems...</span>
          <kbd>⌕</kbd>
        </button>

        <div className="streak-badge">
          <Flame size={17} />
          <span>0 days</span>
        </div>

        <button className="icon-button" aria-label="Notifications">
          <Bell size={19} />
        </button>

        <div className="topbar-avatar" title={user?.name || "User"}>
          {initial}
        </div>

        <button
          className="icon-button"
          onClick={handleLogout}
          aria-label="Log out"
          title="Log out"
        >
          <LogOut size={19} />
        </button>
      </div>
    </header>
  );
}
