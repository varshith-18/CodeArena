import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Info,
  Layers3,
  LockKeyhole,
} from "lucide-react";
import { learningPathsBySlug } from "../data/learningPaths";
import { problems } from "../data/problems";
import {
  getContinueLearning,
  getLearningPathProgress,
} from "../services/learningService";
import "./LearningPaths.css";

const problemMap = new Map(problems.map((problem) => [problem.slug, problem]));

function formatEstimatedTime(minutes) {
  if (!minutes) return "To be scheduled";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder} min`;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export default function LearningPathDetail() {
  const { pathSlug } = useParams();
  const path = learningPathsBySlug[pathSlug];
  const [progress, setProgress] = useState(null);
  const [continueLearning, setContinueLearning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProgress = useCallback(async () => {
    if (!path) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [progressData, continueData] = await Promise.all([
        getLearningPathProgress(pathSlug),
        getContinueLearning(),
      ]);
      setProgress(progressData.path || null);
      setContinueLearning(continueData.continueLearning || null);
    } catch (requestError) {
      setProgress(null);
      setContinueLearning(null);
      setError(requestError.message || "Unable to load path progress.");
    } finally {
      setLoading(false);
    }
  }, [path, pathSlug]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  if (!path) {
    return (
      <main className="learning-page">
        <section className="learning-empty learning-detail-empty">
          <Layers3 size={28} />
          <h1>Learning path not found</h1>
          <p>This path is not part of the current CodeArena catalog.</p>
          <Link to="/learn" className="secondary-button">
            <ArrowLeft size={16} /> Back to learning paths
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="learning-page learning-detail-page">
      <Link to="/learn" className="learning-back">
        <ArrowLeft size={16} /> All learning paths
      </Link>

      <header className="learning-detail-header">
        <div>
          <span className="learning-eyebrow">LEARNING PATH</span>
          <h1>{path.title}</h1>
          <p>{path.description}</p>
        </div>

        <dl className="learning-detail-stats">
          <div>
            <dt>Topics</dt>
            <dd>{path.topics.length}</dd>
          </div>
          <div>
            <dt>Estimated time</dt>
            <dd>{formatEstimatedTime(path.estimatedMinutes)}</dd>
          </div>
          {!loading && progress && (
            <div>
              <dt>Progress</dt>
              <dd>{progress.percent}%</dd>
            </div>
          )}
        </dl>
      </header>

      {loading && (
        <section className="learning-loading" role="status">
          Loading topic progress...
        </section>
      )}

      {!loading && error && (
        <section className="learning-error" role="alert">
          <div>
            <strong>Progress unavailable</strong>
            <p>{error}</p>
          </div>
          <button type="button" onClick={loadProgress}>
            Try again
          </button>
        </section>
      )}

      {!loading && progress && (
        <>
          <div
            className="learning-detail-progress"
            role="progressbar"
            aria-label={`${path.title} completion`}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={progress.percent}
          >
            <span style={{ width: `${progress.percent}%` }} />
          </div>
          {continueLearning?.pathSlug === pathSlug && (
            <Link
              className="learning-open learning-detail-continue"
              to={`/problems/${continueLearning.problemSlug}?path=${encodeURIComponent(pathSlug)}&topic=${encodeURIComponent(continueLearning.topicSlug)}`}
            >
              Continue from this path <ArrowRight size={16} />
            </Link>
          )}
        </>
      )}

      {path.supportMessage && (
        <aside className="learning-support-note" role="note">
          <Info size={18} />
          <div>
            <strong>Future support</strong>
            <p>{path.supportMessage}</p>
          </div>
        </aside>
      )}

      <section className="learning-topic-list" aria-label={`${path.title} topics`}>
        {path.topics.map((topic, index) => (
          (() => {
            const topicProgress = progress?.topics?.find(
              (item) => item.slug === topic.slug,
            );
            const unlocked = topicProgress?.unlocked ?? false;
            const completed = topicProgress?.complete ?? false;
            const stateClass = completed
              ? "learning-topic-completed"
              : unlocked
                ? "learning-topic-available"
                : "learning-topic-locked";

            return (
          <article
            className={`learning-topic ${stateClass}`}
            key={topic.slug}
          >
            <div className="learning-topic-index" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </div>

            <div className="learning-topic-main">
              <div className="learning-topic-heading">
                <div>
                  <h2>{topic.title}</h2>
                  <p>{topic.description}</p>
                </div>
                <div className="learning-topic-status-wrap">
                  <span className="learning-topic-time">
                    <Clock3 size={14} />
                    {formatEstimatedTime(topic.estimatedMinutes)}
                  </span>
                  {!loading && progress && (
                    <span className={`learning-topic-state ${stateClass}`}>
                      {completed
                        ? "Completed"
                        : unlocked
                          ? "Available"
                          : "Locked"}
                    </span>
                  )}
                </div>
              </div>

              {topic.prerequisites.length > 0 && (
                <div className="learning-prerequisites">
                  <LockKeyhole size={14} />
                  <span>
                    Prerequisite:{" "}
                    {topic.prerequisites
                      .map(
                        (slug) =>
                          path.topics.find((item) => item.slug === slug)?.title ||
                          slug,
                      )
                      .join(", ")}
                  </span>
                </div>
              )}

              {topic.supportMessage && (
                <p className="learning-topic-support">{topic.supportMessage}</p>
              )}

              {topic.problems.length > 0 ? (
                <div className="learning-problem-list">
                  {topic.problems
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((entry) => {
                      const problem = problemMap.get(entry.slug);
                      if (!problem) return null;

                      return (
                        unlocked ? (
                          <Link
                            className="learning-problem-row"
                            to={`/problems/${problem.slug}?path=${encodeURIComponent(pathSlug)}&topic=${encodeURIComponent(topic.slug)}`}
                            key={entry.slug}
                          >
                          <span className="learning-problem-order">
                            {entry.order}
                          </span>
                          <span className="learning-problem-name">
                            <strong>{problem.title}</strong>
                            <span>{problem.topics.slice(0, 2).join(" · ")}</span>
                          </span>
                          <span
                            className={`difficulty difficulty-${entry.difficulty.toLowerCase()}`}
                          >
                            {entry.difficulty}
                          </span>
                          <ArrowRight size={16} />
                          </Link>
                        ) : (
                          <div
                            className="learning-problem-row learning-problem-row-locked"
                            key={entry.slug}
                            aria-disabled="true"
                          >
                            <span className="learning-problem-order">
                              {entry.order}
                            </span>
                            <span className="learning-problem-name">
                              <strong>{problem.title}</strong>
                              <span>{problem.topics.slice(0, 2).join(" · ")}</span>
                            </span>
                            <span
                              className={`difficulty difficulty-${entry.difficulty.toLowerCase()}`}
                            >
                              {entry.difficulty}
                            </span>
                            <LockKeyhole size={15} />
                          </div>
                        )
                      );
                    })}
                </div>
              ) : (
                <div className="learning-topic-empty">
                  <LockKeyhole size={18} />
                  <div>
                    <strong>Problems coming later</strong>
                    <p>Exercises for this topic are not available yet.</p>
                  </div>
                </div>
              )}
            </div>
          </article>
            );
          })()
        ))}
      </section>
    </main>
  );
}
