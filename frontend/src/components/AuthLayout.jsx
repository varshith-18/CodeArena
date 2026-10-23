import { Link, Outlet, useLocation } from "react-router-dom";
import { Code2, Terminal, Zap } from "lucide-react";
import "./AuthLayout.css";

export default function AuthLayout() {
  const location = useLocation();
  const isRegister = location.pathname === "/register";

 return (
  <div className={`auth-page ${isRegister ? "register-mode" : "login-mode"}`}>
    <div className="auth-shell">
      {/* Left: Login / Register Form */}
      <div className="auth-form-side">
        <div className="auth-form-inner">
          <Link to="/" className="auth-brand">
            CodeArena
          </Link>

          <div
            key={isRegister ? "register" : "login"}
            className={`auth-form-content ${
              isRegister ? "register-form" : "login-form"
            }`}
          >
            <Outlet />
          </div>
        </div>
      </div>

      {/* Right: Promotional Panel */}
      <aside className="auth-promo">
        <div
          key={isRegister ? "register-promo" : "login-promo"}
          className={`promo-content ${
            isRegister ? "register-promo" : "login-promo"
          }`}
        >
          <div className="promo-logo">
            <Terminal size={25} />
            <span>CodeArena</span>
          </div>

          <div className="promo-illustration">
            <div className="promo-code-icon">
              <Code2 size={38} />
            </div>

            <div className="promo-orbit orbit-one" />
            <div className="promo-orbit orbit-two" />

            <span className="promo-spark spark-one">✦</span>
            <span className="promo-spark spark-two">✧</span>
          </div>

          <div className="promo-copy">
            <span className="promo-eyebrow">
              <Zap size={14} />
              YOUR NEXT LEVEL STARTS HERE
            </span>

            <h2>
              {isRegister
                ? "Your coding journey starts now."
                : "Ready to level up your code?"}
            </h2>

            <p>
              {isRegister
                ? "Join CodeArena, solve challenges, track your progress, and become a stronger developer."
                : "Sharpen your problem-solving skills, master algorithms, and turn your practice into progress."}
            </p>
          </div>

          <div className="promo-dots">
            <span className={!isRegister ? "active" : ""} />
            <span className={isRegister ? "active" : ""} />
          </div>

          <div className="promo-switch">
            <span>
              {isRegister
                ? "Already have an account?"
                : "New to CodeArena?"}
            </span>

            <Link to={isRegister ? "/login" : "/register"}>
              {isRegister ? "Log in" : "Create account"}
              <span aria-hidden="true"> →</span>
            </Link>
          </div>
        </div>
      </aside>
    </div>
  </div>
);
}
