import "./Dashboard.css";
import { Link } from "react-router-dom";
import {
  Code2,
  Target,
  TrendingUp,
  Flame,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Clock3,
  Zap,
} from "lucide-react";
import StatCard from "../components/StatCard";
import { problems } from "../data/problems";

const activities = [
  { day: "M", level: 1 },
  { day: "T", level: 2 },
  { day: "W", level: 0 },
  { day: "T", level: 3 },
  { day: "F", level: 1 },
  { day: "S", level: 0 },
  { day: "S", level: 2 },
];

function DifficultyBadge({ difficulty }) {
  return (
    <span className={`difficulty difficulty-${difficulty.toLowerCase()}`}>
      {difficulty}
    </span>
  );
}

export default function Dashboard() {
  return (
    <div className="page-content">
      <section className="welcome-section">
        <div>
          <div className="eyebrow">
            <Zap size={14} /> YOUR CODING JOURNEY
          </div>
          <h1>Welcome back, Explorer <span>👋</span></h1>
          <p>
            Every problem you solve brings you one step closer to mastery.
          </p>
        </div>

        <Link to="/problems" className="primary-button">
          <Code2 size={18} />
          Solve problems
          <ArrowRight size={17} />
        </Link>
      </section>

      <section className="stats-grid">
        <StatCard
          title="Problems solved"
          value="0"
          description="Start your first challenge"
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title="Submissions"
          value="0"
          description="No submissions yet"
          icon={Code2}
          color="blue"
        />
        <StatCard
          title="Acceptance rate"
          value="—"
          description="Appears after submissions"
          icon={Target}
          color="purple"
        />
        <StatCard
          title="Current streak"
          value="0 days"
          description="Solve one problem today"
          icon={Flame}
          color="orange"
        />
      </section>

      <section className="dashboard-grid">
        <div className="panel featured-panel">
          <div className="panel-header">
            <div>
              <h2>Continue practicing</h2>
              <p>Pick a challenge and get started.</p>
            </div>
            <Link to="/problems" className="text-link">
              View all <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="problem-list">
            {problems.slice(0, 4).map((problem) => (
              <Link
                to={`/problems/${problem.slug}`}
                className="problem-row"
                key={problem.id}
              >
                <div className="problem-status">
                  <Circle size={18} />
                </div>

                <div className="problem-main">
                  <strong>{problem.title}</strong>
                  <div className="problem-meta">
                    <DifficultyBadge difficulty={problem.difficulty} />
                    <span>{problem.acceptance} acceptance</span>
                  </div>
                </div>

                <ArrowUpRight className="problem-arrow" size={17} />
              </Link>
            ))}
          </div>

          <Link to="/problems" className="secondary-button full-width">
            Explore problem set <ArrowRight size={17} />
          </Link>
        </div>

        <div className="right-column">
          <div className="panel progress-panel">
            <div className="panel-header">
              <div>
                <h2>Your progress</h2>
                <p>Weekly activity overview</p>
              </div>
              <TrendingUp size={19} className="muted-icon" />
            </div>

            <div className="progress-summary">
              <div>
                <span className="muted-label">Problems completed</span>
                <div className="progress-number">0 <span>/ 7 days</span></div>
              </div>
              <span className="progress-percent">0%</span>
            </div>

            <div className="progress-track">
              <div className="progress-fill" />
            </div>

            <div className="activity-chart">
              {activities.map((activity, index) => (
                <div className="activity-day" key={index}>
                  <div className={`activity-bar activity-level-${activity.level}`}>
                    {activity.level > 0 && <span />}
                  </div>
                  <span>{activity.day}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel daily-panel">
            <div className="daily-icon">
              <Clock3 size={21} />
            </div>
            <div>
              <h2>Daily challenge</h2>
              <p>Build consistency by solving at least one problem every day.</p>
              <Link to="/problems" className="text-link">
                Start challenge <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="dashboard-footer">
        <span>CodeArena <span className="footer-dot">•</span> Keep building. Keep solving.</span>
        <span>Made for developers <Code2 size={14} /></span>
      </footer>
    </div>
  );
}
