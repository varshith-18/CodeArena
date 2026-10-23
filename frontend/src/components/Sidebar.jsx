
import { NavLink } from "react-router-dom";
import "./Sidebar.css";
import {
  LayoutDashboard,
  Code2,
  Trophy,
  BookOpen,
  Settings,
  X,
  Terminal,
} from "lucide-react";

const navigation = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Problems", path: "/problems", icon: Code2 },
  { label: "Leaderboard", path: "/leaderboard", icon: Trophy },
  { label: "Learn", path: "/learn", icon: BookOpen },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && (
        <button
          className="sidebar-overlay"
          onClick={onClose}
          aria-label="Close navigation"
        />
      )}

      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">
            <Terminal size={23} />
          </div>
          <div>
            <h2>CodeArena</h2>
            <p>LEVEL UP YOUR CODE</p>
          </div>
          <button
            className="mobile-close"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <p className="nav-heading">WORKSPACE</p>

        <nav className="navigation">
          {navigation.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                `nav-link ${isActive ? "nav-link-active" : ""}`
              }
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-icon">
              <Trophy size={19} />
            </div>
            <h3>Keep improving</h3>
            <p>Solve problems daily and build your coding streak.</p>
            <NavLink to="/problems" onClick={onClose}>
              Explore problems →
            </NavLink>
          </div>

          <NavLink to="/settings" className="nav-link" onClick={onClose}>
            <Settings size={19} />
            <span>Settings</span>
          </NavLink>

          <div className="sidebar-footer">
            <div className="avatar">V</div>
            <div className="user-info">
              <strong>Code Explorer</strong>
              <span>Free account</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
