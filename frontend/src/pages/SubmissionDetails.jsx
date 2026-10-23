
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSubmissionDetails } from "../api/submissionApi";
import "./SubmissionDetails.css";

export default function SubmissionDetails() {
  const { submissionId } = useParams();

  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDetails() {
      setLoading(true);
      setError("");
      setSubmission(null);

      try {
        const data = await getSubmissionDetails(submissionId);

        if (!cancelled) {
          setSubmission(data.submission);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load submission.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDetails();

    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  if (loading) return <p>Loading submission details...</p>;

  if (error) {
    return (
      <main className="submission-details">
        <Link to="/submissions">← Back to submissions</Link>
        <h1>Unable to load submission</h1>
        <p role="alert" className="submission-error">
          {error}
        </p>
      </main>
    );
  }

  if (!submission) return <p>Submission not found.</p>;

  return (
    <main className="submission-details">
      <Link to="/submissions">← Back to submissions</Link>

      <h1>Submission Details</h1>

      <section className="submission-summary">
        <p>
          <strong>Problem:</strong> {submission.problemSlug}
        </p>
        <p>
          <strong>Verdict:</strong>{" "}
          <span
            className={
              submission.verdict === "Accepted"
                ? "verdict-accepted"
                : "verdict-failed"
            }
          >
            {submission.verdict}
          </span>
        </p>
        <p>
          <strong>Test cases:</strong> {submission.passed}/
          {submission.total}
        </p>
        <p>
          <strong>Runtime:</strong>{" "}
          {submission.time != null ? `${submission.time}s` : "—"}
        </p>
        <p>
          <strong>Memory:</strong>{" "}
          {submission.memory != null
            ? `${submission.memory} KB`
            : "—"}
        </p>
        <p>
          <strong>Submitted:</strong>{" "}
          {submission.createdAt
            ? new Date(submission.createdAt).toLocaleString()
            : "—"}
        </p>
      </section>

      <h2>Test Case Results</h2>

      <div className="test-results">
        {(submission.results || []).map((result) => (
          <section
            className="test-result"
            key={result.testCase}
          >
            <h3>
              Test Case {result.testCase}: {result.status}
            </h3>

            {result.expected !== undefined && (
              <p>
                <strong>Expected:</strong>{" "}
                <code>{JSON.stringify(result.expected)}</code>
              </p>
            )}

            {result.actual !== undefined && (
              <p>
                <strong>Actual:</strong>{" "}
                <code>{JSON.stringify(result.actual)}</code>
              </p>
            )}

            {result.stderr && (
              <p>
                <strong>Error:</strong> {result.stderr}
              </p>
            )}

            {result.compileOutput && (
              <pre>{result.compileOutput}</pre>
            )}
          </section>
        ))}
      </div>

      <h2>Submitted Code</h2>
      <pre className="submitted-code">
        <code>{submission.sourceCode}</code>
      </pre>
    </main>
  );
}
