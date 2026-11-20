import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Circle,
  Clock3,
} from "lucide-react";
import WorkspaceTabs from "./WorkspaceTabs";

export default function ProblemDescription({
  slug,
  problem,
  details,
  activeTab,
  setActiveTab,
  fetchSubmissions,
  submissions,
  isLoadingSubmissions,
  submissionError,
  setSelectedTest,
  setBottomTab,
}) {
  return (
    <section className="description-pane">
      <WorkspaceTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        fetchSubmissions={fetchSubmissions}
      />

      {activeTab === "description" ? (
        <div className="description-content">
          <div className="problem-title-row">
            <h1>
              {problem.id}. {problem.title}
            </h1>
            <Circle size={19} className="unsolved-icon" />
          </div>

          <div className="workspace-problem-meta">
            <span
              className={`difficulty difficulty-${problem.difficulty.toLowerCase()}`}
            >
              {problem.difficulty}
            </span>
            <span className="workspace-meta-item">
              <CheckCircle2 size={14} /> {problem.acceptance} acceptance
            </span>
          </div>

          <div className="description-text">
            <p>{details.description}</p>
          </div>

          <h3 className="section-label">Examples</h3>
          {details.examples.map((example, index) => (
            <div className="example-card" key={index}>
              <div className="example-heading">
                <strong>Example {index + 1}</strong>
                <button
                  onClick={() => {
                    setSelectedTest(
                      Math.min(index, details.testCases.length - 1),
                    );
                    setBottomTab("testcases");
                  }}
                >
                  Use test case
                </button>
              </div>
              <div className="example-field">
                <strong>Input:</strong>
                <code>{example.input}</code>
              </div>
              <div className="example-field">
                <strong>Output:</strong>
                <code>{example.output}</code>
              </div>
              <div className="example-explanation">
                <strong>Explanation:</strong> {example.explanation}
              </div>
            </div>
          ))}

          <h3 className="section-label">Constraints</h3>
          <ul className="constraints-list">
            {details.constraints.map((constraint) => (
              <li key={constraint}>
                <code>{constraint}</code>
              </li>
            ))}
          </ul>

          <div className="topic-list">
            {problem.topics.map((item) => (
              <span key={item} className="topic-tag">
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="submissions-content">
          {isLoadingSubmissions ? (
            <p>Loading submissions...</p>
          ) : submissionError ? (
            <p className="execution-error">{submissionError}</p>
          ) : submissions.length === 0 ? (
            <div className="submissions-empty">
              <Clock3 size={28} />
              <h3>No submissions yet</h3>
              <p>Your submissions for this problem will appear here.</p>
            </div>
          ) : (
            <div className="submission-history-list">
              {submissions.map((submission) => (
                <div
                  key={submission._id}
                  className="submission-history-item"
                >
                  <div>
                    <strong>{submission.verdict}</strong>
                    <p>
                      {submission.passed}/{submission.total} test cases passed
                    </p>
                  </div>
                  <div className="submission-history-meta">
                    <span>
                      {new Date(submission.createdAt).toLocaleString()}
                    </span>
                    <span>{submission.time}s</span>
                    <Link
                      to={`/problems/${slug}?submissionId=${submission._id}`}
                      className="submission-view-code"
                    >
                      View in Editor →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
