
import { useEffect, useState } from "react";
import {
  getLeaderboard,
  getMyLeaderboardStats,
} from "../api/leaderboardApi";
import "./Leaderboard.css";

function getRankIcon(rank) {
  if (rank === 1) return "🏆";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [myStats, setMyStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");

  // Load the leaderboard.
  useEffect(() => {
    let cancelled = false;

    async function loadLeaderboard() {
      try {
        setLoading(true);
        setError("");

        const data = await getLeaderboard(50);

        if (!cancelled) {
          setUsers(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load leaderboard.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadLeaderboard();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load the logged-in user's statistics.
  useEffect(() => {
    let cancelled = false;

    async function loadMyStats() {
      try {
        setStatsLoading(true);
        setStatsError("");

        // Change this if your AuthContext stores the token elsewhere.
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Please log in to view your personal stats.");
        }

        const stats = await getMyLeaderboardStats(token);

        if (!cancelled) {
          setMyStats(stats);
        }
      } catch (err) {
        if (!cancelled) {
          setStatsError(
            err.message || "Unable to load your coding statistics."
          );
        }
      } finally {
        if (!cancelled) {
          setStatsLoading(false);
        }
      }
    }

    loadMyStats();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="leaderboard-page">
      <header className="leaderboard-header">
        <p className="leaderboard-eyebrow">CODEARENA / RANKINGS</p>
        <h1>Leaderboard</h1>
        <p className="leaderboard-subtitle">
          Solve problems. Earn your place. Climb the ranks.
        </p>
      </header>

      {/* Personal coding statistics */}
      <section className="my-stats">
        <div className="my-stats-heading">
          <div>
            <p className="leaderboard-eyebrow">YOUR PROGRESS</p>
            <h2>My coding stats</h2>
          </div>

          {!statsLoading && !statsError && myStats?.rank != null && (
            <div className="my-rank">
              <span>Global Rank</span>
              <strong>#{myStats.rank}</strong>
            </div>
          )}
        </div>

        {statsLoading && (
          <p role="status">Loading your statistics...</p>
        )}

        {!statsLoading && statsError && (
          <p className="stats-error" role="alert">
            {statsError}
          </p>
        )}

        {!statsLoading && !statsError && myStats && (
          <>
            <p className="stats-greeting">
              Keep going, {myStats.username}!
            </p>

            <div className="stats-grid">
              <div className="stat-card">
                <span>Problems solved</span>
                <strong>{myStats.problemsSolved}</strong>
              </div>

              <div className="stat-card">
                <span>Accepted submissions</span>
                <strong>{myStats.acceptedSubmissions}</strong>
              </div>

              <div className="stat-card">
                <span>Total submissions</span>
                <strong>{myStats.totalSubmissions}</strong>
              </div>

              <div className="stat-card">
                <span>Acceptance rate</span>
                <strong>{myStats.acceptanceRate}%</strong>
              </div>
            </div>

            {myStats.rank == null && (
              <p className="stats-note">
                Solve your first problem to enter the leaderboard.
              </p>
            )}
          </>
        )}
      </section>

      {/* Existing leaderboard */}
      <section className="leaderboard-panel">
        <div className="leaderboard-panel-heading">
          <div>
            <h2>All-time rankings</h2>
            <p>Ranked by problems solved, then accepted submissions.</p>
          </div>

          <span className="leaderboard-count">
            {users.length} coders
          </span>
        </div>

        {loading && (
          <p className="leaderboard-state" role="status">
            Loading leaderboard...
          </p>
        )}

        {!loading && error && (
          <div className="leaderboard-state leaderboard-error">
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && users.length === 0 && (
          <p className="leaderboard-state">
            No accepted submissions yet. Be the first to solve a problem!
          </p>
        )}

        {!loading && !error && users.length > 0 && (
          <div className="leaderboard-table-wrapper">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Coder</th>
                  <th scope="col">Problems solved</th>
                  <th scope="col">Accepted submissions</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.userId}
                    className={
                      myStats?.userId === user.userId
                        ? "my-leaderboard-row"
                        : ""
                    }
                  >
                    <td>
                      <span
                        className={`leaderboard-rank ${
                          user.rank <= 3 ? "top-rank" : ""
                        }`}
                      >
                        {getRankIcon(user.rank)}
                      </span>
                    </td>

                    <td>
                      <span className="leaderboard-username">
                        {user.username}
                        {myStats?.userId === user.userId && (
                          <span className="you-label">You</span>
                        )}
                      </span>
                    </td>

                    <td>
                      <span className="leaderboard-stat">
                        {user.problemsSolved}
                      </span>
                    </td>

                    <td>
                      <span className="leaderboard-stat">
                        {user.acceptedSubmissions}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
