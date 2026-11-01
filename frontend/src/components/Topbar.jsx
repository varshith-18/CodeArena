import {
  Bell,
  Search,
  Menu,
  Flame,
  LogOut,
  Terminal,
  X,
  ArrowUpRight,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useRef, useState } from "react";
import { problems } from "../data/problems";
import "./Topbar.css";

export default function Topbar({ onMenuClick, sidebarOpen }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const searchRef = useRef(null);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const initial = user?.name?.charAt(0)?.toUpperCase() || "U";

  const searchResults = problems.filter((problem) => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return false;

    return (
      problem.title.toLowerCase().includes(query) ||
      problem.topics.some((topic) =>
        topic.toLowerCase().includes(query)
      ) ||
      problem.difficulty.toLowerCase().includes(query)
    );
  }).slice(0, 6);

  function openProblem(slug) {
    navigate(`/problems/${slug}`);
    setSearchOpen(false);
    setSearchQuery("");
  }

  useEffect(() => {
    if (searchOpen) {
      searchRef.current?.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
        <div className="global-search">
          {!searchOpen ? (
            <button
              className="search-button"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={17} />
              <span>Find problems...</span>
              <kbd>⌕</kbd>
            </button>
          ) : (
            <div className="global-search-input">
              <Search size={17} />

              <input
                ref={searchRef}
                type="text"
                placeholder="Search problems or topics..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                aria-label="Search coding problems"
              />

              <button
                className="search-close"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery("");
                }}
                aria-label="Close search"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {searchOpen && searchQuery.trim() && (
            <div className="search-results">
              {searchResults.length > 0 ? (
                searchResults.map((problem) => (
                  <button
                    key={problem.slug}
                    className="search-result-item"
                    onClick={() => openProblem(problem.slug)}
                  >
                    <div className="search-result-info">
                      <strong>{problem.title}</strong>

                      <span>
                        {problem.topics.slice(0, 2).join(" · ")}
                      </span>
                    </div>

                    <span
                      className={`difficulty difficulty-${problem.difficulty.toLowerCase()}`}
                    >
                      {problem.difficulty}
                    </span>

                    <ArrowUpRight size={16} />
                  </button>
                ))
              ) : (
                <div className="search-no-results">
                  <Search size={20} />
                  <strong>No problems found</strong>
                  <span>Try another problem name or topic.</span>
                </div>
              )}
            </div>
          )}
        </div>

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
