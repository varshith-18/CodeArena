import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSubmissionHistory } from "../api/submissionApi";
import "./SubmissionHistory.css";

export default function SubmissionHistory() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getSubmissionHistory();
      setSubmissions(data.submissions || []);
    } catch (err) {
      setError(err.message || "Failed to load submission history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  if (loading) {
    return (
      <main className="submissions-page">
        <p>Loading submission history...</p>
      </main>
    );
  }

  return (
    <main className="submissions-page">
      <div className="submissions-heading">
        <div>
          <h1>My Submissions</h1>
          <p>Review your recent coding attempts.</p>
        </div>

        <button onClick={loadHistory}>Refresh</button>
      </div>

      {error && (
        <div role="alert" className="submission-error">
          {error}
        </div>
      )}

      {!error && submissions.length === 0 && (
        <p>
          No submissions yet. Solve a problem and submit your code to see it
          here.
        </p>
      )}

      {submissions.length > 0 && (
        <div className="submission-table-wrapper">
          <table className="submission-table">
            <thead>
              <tr>
                <th>Problem</th>
                <th>Verdict</th>
                <th>Tests</th>
                <th>Runtime</th>
                <th>Submitted</th>
                <th>Details</th>
              </tr>
            </thead>

            <tbody>
              {submissions.map((submission) => (
                <tr key={submission._id}>
                  <td>{submission.problemSlug}</td>

                  <td>
                    <span
                      className={
                        submission.verdict === "Accepted"
                          ? "verdict-accepted"
                          : "verdict-failed"
                      }
                    >
                      {submission.verdict}
                    </span>
                  </td>

                  <td>
                    {submission.passed}/{submission.total}
                  </td>

                  <td>
                    {submission.time != null ? `${submission.time}s` : "—"}
                  </td>

                  <td>
                    {submission.createdAt
                      ? new Date(submission.createdAt).toLocaleString()
                      : "—"}
                  </td>

                  <td className="submission-details-cell">
                    <Link
                      to={`/submissions/${submission._id}`}
                      className="view-submission-link"
                    >
                      View Details →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
