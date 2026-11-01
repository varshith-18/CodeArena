import "./Problems.css";
import { useEffect, useState } from "react";
import { getDashboardStats } from "../api/dashboardApi";
import { Link } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  ArrowUpRight,
  Circle,
  CheckCircle2,
  Code2,
  X,
} from "lucide-react";
import { problems } from "../data/problems";

export default function Problems() {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("All");
  const [topic, setTopic] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [solvedProblemSlugs, setSolvedProblemSlugs] = useState([]);

  useEffect(() => {
    async function fetchSolvedProblems() {
      try {
        const token = sessionStorage.getItem("codearena_token");

        if (!token) return;

        const stats = await getDashboardStats(token);

        setSolvedProblemSlugs(stats.solvedProblemSlugs || []);
      } catch (error) {
        console.error("Failed to fetch solved problems:", error);
      }
    }

    fetchSolvedProblems();
  }, []);
  const updatedProblems = problems.map((problem) => ({
    ...problem,
    solved: solvedProblemSlugs.includes(problem.slug),
  }));
  const topics = [
    "All",
    ...new Set(problems.flatMap((problem) => problem.topics)),
  ];

  const filteredProblems = updatedProblems.filter((problem) => {
    const matchesSearch =
      problem.title.toLowerCase().includes(search.toLowerCase()) ||
      problem.topics.some((item) =>
        item.toLowerCase().includes(search.toLowerCase()),
      );

    const matchesDifficulty =
      difficulty === "All" || problem.difficulty === difficulty;

    const matchesTopic = topic === "All" || problem.topics.includes(topic);

    return matchesSearch && matchesDifficulty && matchesTopic;
  });

  function resetFilters() {
    setSearch("");
    setDifficulty("All");
    setTopic("All");
  }

  return (
    <div className="page-content">
      <section className="problems-heading">
        <div>
          <div className="eyebrow">
            <Code2 size={14} /> PRACTICE ARENA
          </div>
          <h1>Problem Set</h1>
          <p>
            Sharpen your skills with coding challenges, from beginner to
            advanced.
          </p>
        </div>

        <div className="problems-total">
          <strong>{problems.length}</strong>
          <span>total problems</span>
        </div>
      </section>

      <section className="problem-stats">
        <div className="problem-stat">
          <span className="difficulty-dot dot-easy" />
          <span>Easy</span>
          <strong>
            {problems.filter((problem) => problem.difficulty === "Easy").length}
          </strong>
        </div>

        <div className="problem-stat">
          <span className="difficulty-dot dot-medium" />
          <span>Medium</span>
          <strong>
            {
              problems.filter((problem) => problem.difficulty === "Medium")
                .length
            }
          </strong>
        </div>

        <div className="problem-stat">
          <span className="difficulty-dot dot-hard" />
          <span>Hard</span>
          <strong>
            {problems.filter((problem) => problem.difficulty === "Hard").length}
          </strong>
        </div>
      </section>

      <section className="panel problems-panel">
        <div className="problems-toolbar">
          <div className="problems-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search problems or topics..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search problems"
            />
            {search && (
              <button
                className="clear-search"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <button
            className={`filter-button ${showFilters ? "filter-button-active" : ""}`}
            onClick={() => setShowFilters((current) => !current)}
          >
            <SlidersHorizontal size={17} />
            Filters
          </button>
        </div>

        <div className="difficulty-filters">
          {["All", "Easy", "Medium", "Hard"].map((item) => (
            <button
              key={item}
              onClick={() => setDifficulty(item)}
              className={`filter-chip ${
                difficulty === item ? "filter-chip-active" : ""
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {showFilters && (
          <div className="advanced-filters">
            <label htmlFor="topic-filter">Topic</label>
            <select
              id="topic-filter"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
            >
              {topics.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <button className="reset-filters" onClick={resetFilters}>
              Reset filters
            </button>
          </div>
        )}

        <div className="table-summary">
          <span>
            Showing <strong>{filteredProblems.length}</strong> of{" "}
            <strong>{problems.length}</strong> problems
          </span>
          {(search || difficulty !== "All" || topic !== "All") && (
            <button className="reset-filters" onClick={resetFilters}>
              Clear all
            </button>
          )}
        </div>

        <div className="problems-table-wrap">
          <table className="problems-table">
            <thead>
              <tr>
                <th className="status-column">Status</th>
                <th>Title</th>
                <th>Difficulty</th>
                <th>Acceptance</th>
                <th className="action-column">Open</th>
              </tr>
            </thead>

            <tbody>
              {filteredProblems.map((problem) => (
                <tr key={problem.id}>
                  <td className="status-column">
                    {problem.solved ? (
                      <CheckCircle2 className="solved-icon" size={18} />
                    ) : (
                      <Circle className="unsolved-icon" size={18} />
                    )}
                  </td>

                  <td>
                    <Link
                      className="problem-title-link"
                      to={`/problems/${problem.slug}`}
                    >
                      <span>{problem.id}.</span> {problem.title}
                    </Link>
                    <div className="table-topics">
                      {problem.topics.map((item) => (
                        <button
                          key={item}
                          className="topic-tag"
                          onClick={() => {
                            setTopic(item);
                            setShowFilters(true);
                          }}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </td>

                  <td>
                    <span
                      className={`difficulty difficulty-${problem.difficulty.toLowerCase()}`}
                    >
                      {problem.difficulty}
                    </span>
                  </td>

                  <td className="acceptance-cell">{problem.acceptance}</td>

                  <td className="action-column">
                    <Link
                      to={`/problems/${problem.slug}`}
                      className="open-problem"
                      aria-label={`Open ${problem.title}`}
                    >
                      <ArrowUpRight size={17} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProblems.length === 0 && (
          <div className="empty-problems">
            <Search size={28} />
            <h3>No problems found</h3>
            <p>Try another search term or change your filters.</p>
            <button className="secondary-button" onClick={resetFilters}>
              Reset filters
            </button>
          </div>
        )}

        <div className="problems-footer">
          <span>More coding challenges will be added soon.</span>
          <span>
            <Code2 size={14} /> CodeArena
          </span>
        </div>
      </section>
    </div>
  );
}
