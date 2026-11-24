import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Braces,
  Clock3,
  Code2,
  LayoutGrid,
  Search,
  Shapes,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { learningPaths } from "../data/learningPaths";
import {
  getContinueLearning,
  getLearningPathsProgress,
} from "../services/learningService";
import "./LearningPaths.css";

const categories = [
  { slug: "all", label: "All paths" },
  { slug: "algorithms", label: "Algorithms" },
  { slug: "languages", label: "Languages" },
  { slug: "problem-solving", label: "Problem solving" },
];

const categoryByPath = {
  dsa: "algorithms",
  javascript: "languages",
  react: "languages",
  python: "languages",
  "problem-solving": "problem-solving",
};

const pathIcons = {
  dsa: Shapes,
  javascript: Braces,
  react: LayoutGrid,
  python: Code2,
  "problem-solving": Target,
};

function formatEstimatedTime(minutes) {
  if (!minutes) return "Future support";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export default function LearningPaths() {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [progressBySlug, setProgressBySlug] = useState({});
  const [continueLearning, setContinueLearning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLearningProgress = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [progressData, continueData] = await Promise.all([
        getLearningPathsProgress(),
        getContinueLearning(),
      ]);

      setProgressBySlug(
        Object.fromEntries(
          (progressData.paths || []).map((path) => [path.slug, path]),
        ),
      );
      setContinueLearning(continueData.continueLearning || null);
    } catch (requestError) {
      setError(
        requestError.message || "Unable to load learning path progress.",
      );
      setProgressBySlug({});
      setContinueLearning(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLearningProgress();
  }, [loadLearningProgress]);

  const filteredPaths = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return learningPaths.filter((path) => {
      const matchesCategory =
        category === "all" || categoryByPath[path.slug] === category;
      const matchesSearch =
        !normalizedQuery ||
        path.title.toLowerCase().includes(normalizedQuery) ||
        path.description.toLowerCase().includes(normalizedQuery) ||
        path.topics.some((topic) =>
          topic.title.toLowerCase().includes(normalizedQuery),
        );

      return matchesCategory && matchesSearch;
    });
  }, [category, query]);

  function resetFilters() {
    setCategory("all");
    setQuery("");
  }

  return (
    <main className="learning-page">
      <header className="learning-heading">
        <div>
          <span className="learning-eyebrow">
            <Sparkles size={14} /> CODEARENA LEARNING
          </span>
          <h1>Choose a path. Build depth.</h1>
          <p>
            Follow a structured route through topics and challenges selected
            from the CodeArena problem set.
          </p>
        </div>

        <div className="learning-summary" aria-label="Learning catalog summary">
          <strong>{learningPaths.length}</strong>
          <span>guided paths</span>
        </div>
      </header>

      {loading && (
        <section className="learning-loading" role="status">
          Loading learning progress...
        </section>
      )}

      {!loading && error && (
        <section className="learning-error" role="alert">
          <div>
            <strong>Progress unavailable</strong>
            <p>{error}</p>
          </div>
          <button type="button" onClick={loadLearningProgress}>
            Try again
          </button>
        </section>
      )}

      {!loading && !error && continueLearning && (
        <section className="learning-continue" aria-label="Continue learning">
          <div>
            <span>Continue learning</span>
            <strong>
              {continueLearning.pathSlug.replaceAll("-", " ")}
            </strong>
          </div>
          <Link
            className="learning-open"
            to={`/problems/${continueLearning.problemSlug}?path=${encodeURIComponent(continueLearning.pathSlug)}&topic=${encodeURIComponent(continueLearning.topicSlug)}`}
          >
            Continue problem <ArrowRight size={16} />
          </Link>
        </section>
      )}

      <section className="learning-toolbar" aria-label="Learning path filters">
        <div className="learning-search">
          <Search size={17} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search paths or topics"
            aria-label="Search learning paths"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear learning path search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="learning-filter-list" aria-label="Learning path categories">
          {categories.map((item) => (
            <button
              key={item.slug}
              type="button"
              className={category === item.slug ? "active" : ""}
              aria-pressed={category === item.slug}
              onClick={() => setCategory(item.slug)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {filteredPaths.length > 0 ? (
        <section className="learning-grid" aria-label="Learning paths">
          {filteredPaths.map((path) => {
            const Icon = pathIcons[path.slug] || Code2;
            const progress = progressBySlug[path.slug];
            const completedTopics =
              progress?.topics?.filter((topic) => topic.complete).length || 0;
            const percent = progress?.percent || 0;
            const pathComplete = progress?.complete || false;
            const problemCount = path.topics.reduce(
              (total, topic) => total + topic.problems.length,
              0,
            );
            const needsSupport =
              path.supportStatus !== "available";

            return (
              <article className="learning-card" key={path.slug}>
                <div className="learning-card-header">
                  <span className="learning-path-icon">
                    <Icon size={21} />
                  </span>
                  {needsSupport && (
                    <span className="learning-support-badge">
                      Future support
                    </span>
                  )}
                  {!needsSupport && pathComplete && (
                    <span className="learning-complete-badge">Completed</span>
                  )}
                </div>

                <div className="learning-card-copy">
                  <span className="learning-category">
                    {categoryByPath[path.slug] === "languages"
                      ? "Language track"
                      : categoryByPath[path.slug] === "problem-solving"
                        ? "Practice track"
                        : "Core curriculum"}
                  </span>
                  <h2>{path.title}</h2>
                  <p>{path.description}</p>
                </div>

                <dl className="learning-card-stats">
                  <div>
                    <dt>Topics</dt>
                    <dd>{path.topics.length}</dd>
                  </div>
                  <div>
                    <dt>Problems</dt>
                    <dd>{problemCount}</dd>
                  </div>
                  <div>
                    <dt>Time</dt>
                    <dd>{formatEstimatedTime(path.estimatedMinutes)}</dd>
                  </div>
                </dl>

                {!loading && !error && progress && (
                  <div className="learning-card-progress">
                    <div>
                      <span>Path progress</span>
                      <strong>{percent}%</strong>
                    </div>
                    <div
                      className="learning-progress-track"
                      role="progressbar"
                      aria-label={`${path.title} completion`}
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-valuenow={percent}
                    >
                      <span style={{ width: `${percent}%` }} />
                    </div>
                    <p>
                      {completedTopics} of {path.topics.length} topics completed
                    </p>
                  </div>
                )}

                <div className="learning-difficulty">
                  <span>Difficulty</span>
                  <div>
                    {path.difficultyProgression.map((difficulty) => (
                      <span
                        key={difficulty}
                        className={`difficulty difficulty-${difficulty.toLowerCase()}`}
                      >
                        {difficulty}
                      </span>
                    ))}
                  </div>
                </div>

                <Link
                  className="learning-open"
                  to={`/learn/${path.slug}`}
                  aria-label={`Open ${path.title} learning path`}
                >
                  View path <ArrowRight size={16} />
                </Link>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="learning-empty" role="status">
          <Search size={28} />
          <h2>No learning paths found</h2>
          <p>Try another search or return to the complete catalog.</p>
          <button type="button" className="secondary-button" onClick={resetFilters}>
            Clear filters
          </button>
        </section>
      )}
    </main>
  );
}
