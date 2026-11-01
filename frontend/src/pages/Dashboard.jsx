import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  Code2,
  Target,
  Circle,
  TrendingUp,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Zap,
} from "lucide-react";

import StatCard from "../components/StatCard";
import ActivityCalendar from "../components/ActivityCalendar";

import { problems } from "../data/problems";
import { getDashboardStats, getDashboardActivity } from "../api/dashboardApi";

import "./Dashboard.css";

function DifficultyBadge({ difficulty }) {
  return (
    <span className={`difficulty difficulty-${difficulty.toLowerCase()}`}>
      {difficulty}
    </span>
  );
}

function getActivityLevel(count) {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  return 3;
}

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const solvedProblemSlugs = new Set(stats?.solvedProblemSlugs || []);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      const token = sessionStorage.getItem("codearena_token");

      if (!token) {
        if (active) {
          setError("Please log in to view your dashboard.");
          setLoading(false);
        }
        return;
      }

      try {
        const [statsResult, activityResult] = await Promise.allSettled([
          getDashboardStats(token),
          getDashboardActivity(token),
        ]);

        if (!active) return;

        if (statsResult.status === "fulfilled") {
          setStats(statsResult.value);
        }

        if (activityResult.status === "fulfilled") {
          setActivity(activityResult.value);
        }

        if (
          statsResult.status === "rejected" &&
          activityResult.status === "rejected"
        ) {
          setError("Unable to load dashboard data. Please try again.");
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Something went wrong.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  // Get the last seven days from the actual activity API.
  const weeklyActivity = (activity?.dailyActivity || [])
    .slice(-7)
    .map((item) => ({
      ...item,
      day: new Date(`${item.date}T00:00:00`).toLocaleDateString("en-US", {
        weekday: "short",
      }),
      level: getActivityLevel(item.count),
    }))
    .sort((a, b) => {
      const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return order.indexOf(a.day) - order.indexOf(b.day);
    });

  const activeDaysThisWeek = weeklyActivity.filter(
    (day) => day.count > 0,
  ).length;

  const weeklyPercentage = Math.round((activeDaysThisWeek / 7) * 100);

  return (
    <div className="page-content">
      {/* Welcome Section */}
      <section className="welcome-section">
        <div>
          <div className="eyebrow">
            <Zap size={14} /> YOUR CODING JOURNEY
          </div>

          <h1>
            Welcome back, {stats?.username || "Explorer"} <span>👋</span>
          </h1>

          <p>Every problem you solve brings you one step closer to mastery.</p>
        </div>

        <Link to="/problems" className="primary-button">
          <Code2 size={18} />
          Solve problems
          <ArrowRight size={17} />
        </Link>
      </section>

      {/* 365-Day Activity Calendar */}
      <ActivityCalendar />

      {/* Dashboard Statistics */}
      <section className="stats-grid">
        <StatCard
          title="Problems solved"
          value={loading ? "..." : (stats?.problemsSolved ?? 0)}
          description="Unique problems accepted"
          icon={CheckCircle2}
          color="green"
        />

        <StatCard
          title="Submissions"
          value={loading ? "..." : (stats?.totalSubmissions ?? 0)}
          description="Total submission attempts"
          icon={Code2}
          color="blue"
        />

        <StatCard
          title="Acceptance rate"
          value={loading ? "..." : `${stats?.acceptanceRate ?? 0}%`}
          description="Accepted submissions / total"
          icon={Target}
          color="purple"
        />

        <StatCard
          title="Your rank"
          value={loading ? "..." : stats?.rank ? `#${stats.rank}` : "Unranked"}
          description="All-time leaderboard position"
          icon={TrendingUp}
          color="orange"
        />
      </section>

      {error && (
        <div className="dashboard-error" role="alert">
          {error}
        </div>
      )}

      {/* Main Dashboard Content */}
      <section className="dashboard-grid">
        {/* Continue Practicing */}
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
                <div
                  className={`problem-status ${
                    solvedProblemSlugs.has(problem.slug)
                      ? "problem-solved"
                      : "problem-unsolved"
                  }`}
                  title={
                    solvedProblemSlugs.has(problem.slug)
                      ? "Problem solved"
                      : "Not solved yet"
                  }
                >
                  {solvedProblemSlugs.has(problem.slug) ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <Circle size={18} />
                  )}
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

        {/* Right Column */}
        <div className="right-column">
          {/* Real Weekly Activity */}
          <div className="panel progress-panel">
            <div className="panel-header">
              <div>
                <h2>Your progress</h2>
                <p>Weekly submission activity</p>
              </div>

              <TrendingUp size={19} className="muted-icon" />
            </div>

            <div className="progress-summary">
              <div>
                <span className="muted-label">Active days this week</span>

                <div className="progress-number">
                  {loading ? "..." : activeDaysThisWeek}
                  <span> / 7 days</span>
                </div>
              </div>

              <span className="progress-percent">
                {loading ? "..." : `${weeklyPercentage}%`}
              </span>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${weeklyPercentage}%` }}
              />
            </div>

            <div className="activity-chart">
              {weeklyActivity.map((day, index) => (
                <div className="activity-day" key={day.date}>
                  <div
                    className={`activity-bar activity-level-${day.level}`}
                    title={`${day.count} submissions`}
                  >
                    {day.level > 0 && <span />}
                  </div>

                  <span>{day.day}</span>
                </div>
              ))}

              {!loading && weeklyActivity.length === 0 && (
                <p>No weekly activity available yet.</p>
              )}
            </div>
          </div>

          {/* Daily Challenge */}
          <div className="panel daily-panel">
            <div className="daily-icon">
              <Clock3 size={21} />
            </div>

            <div>
              <h2>Daily challenge</h2>

              <p>
                Build consistency by solving at least one problem every day.
              </p>

              <Link to="/problems" className="text-link">
                Start challenge <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="dashboard-footer">
        <span>
          CodeArena <span className="footer-dot">•</span> Keep building. Keep
          solving.
        </span>

        <span>
          Made for developers <Code2 size={14} />
        </span>
      </footer>
    </div>
  );
}

export default Dashboard;
