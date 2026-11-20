import { Circle, Clock3, MemoryStick } from "lucide-react";

export default function SubmissionResult({ result }) {
  if (!result) return null;

  return (
    <>
      {result.submissionResults && (
        <div className="submission-test-results">
          {result.submissionResults.map((test) => (
            <div key={test.testCase} className="test-input-group">
              <label>
                Test Case {test.testCase} — {test.status}
              </label>
              {test.expected !== undefined && (
                <p>Expected: {JSON.stringify(test.expected)}</p>
              )}
              {test.actual !== undefined && (
                <p>Actual: {JSON.stringify(test.actual)}</p>
              )}
              {test.stderr && (
                <pre className="execution-error">{test.stderr}</pre>
              )}
              {test.compileOutput && (
                <pre className="execution-error">{test.compileOutput}</pre>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="result-heading">
        <Circle size={15} />
        <strong>Execution — {result.status}</strong>
      </div>
      {result.message && <p>{result.message}</p>}
      {result.stdout && (
        <div className="test-input-group">
          <label>Output</label>
          <pre className="execution-output">{result.stdout}</pre>
        </div>
      )}
      {result.stderr && (
        <div className="test-input-group">
          <label>Error</label>
          <pre className="execution-error">{result.stderr}</pre>
        </div>
      )}
      {result.compileOutput && (
        <div className="test-input-group">
          <label>Compilation output</label>
          <pre className="execution-error">{result.compileOutput}</pre>
        </div>
      )}
      {result.time != null && (
        <div className="execution-stats">
          <span>
            <Clock3 size={14} /> {result.time} s
          </span>
          {result.memory != null && (
            <span>
              <MemoryStick size={14} /> {result.memory} KB
            </span>
          )}
        </div>
      )}
    </>
  );
}
