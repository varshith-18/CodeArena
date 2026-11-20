import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Play,
  Send,
  Terminal,
} from "lucide-react";
import "./ProblemWorkspace.css";
import useProblemWorkspace from "../hooks/workspace/useProblemWorkspace";
import useCodeExecution from "../hooks/workspace/useCodeExecution";
import useSubmissionCode from "../hooks/workspace/useSubmissionCode";
import WorkspaceHeader from "../components/workspace/WorkspaceHeader";
import ProblemDescription from "../components/workspace/ProblemDescription";
import EditorToolbar from "../components/workspace/EditorToolbar";
import CodeEditor from "../components/workspace/CodeEditor";
import TestCasesPanel from "../components/workspace/TestCasesPanel";
import SubmissionResult from "../components/workspace/SubmissionResult";

export default function ProblemWorkspace() {
  const workspace = useProblemWorkspace();
  const {
    slug,
    problem,
    details,
    submissionId,
    code,
    setCode,
    activeTab,
    setActiveTab,
    bottomTab,
    setBottomTab,
    selectedTest,
    setSelectedTest,
    fontSize,
    setFontSize,
    resetCode,
  } = workspace;

  const execution = useCodeExecution(slug, code, setBottomTab);
  const { result, isRunning, runCode, submitCode, clearResult } = execution;
  const submission = useSubmissionCode({
    slug,
    submissionId,
    setCode,
    setActiveTab,
    setBottomTab,
    clearResult,
  });

  if (!problem || !details) {
    return (
      <div className="workspace-not-found">
        <h2>Problem not found</h2>
        <p>Choose a problem from the problem set to continue.</p>
        <Link to="/problems" className="primary-button">
          <ArrowLeft size={17} /> Back to problems
        </Link>
      </div>
    );
  }

  function handleReset() {
    resetCode();
    clearResult();
  }

  return (
    <div className="workspace-page">
      <WorkspaceHeader problem={problem} />

      <div className="workspace-body">
        <ProblemDescription
          slug={slug}
          problem={problem}
          details={details}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          fetchSubmissions={submission.fetchSubmissions}
          submissions={submission.submissions}
          isLoadingSubmissions={submission.isLoadingSubmissions}
          submissionError={submission.submissionError}
          setSelectedTest={setSelectedTest}
          setBottomTab={setBottomTab}
        />

        <section className="editor-pane">
          <EditorToolbar
            fontSize={fontSize}
            setFontSize={setFontSize}
            resetCode={handleReset}
          />

          <CodeEditor code={code} setCode={setCode} fontSize={fontSize} />

          <div className="editor-bottom">
            <div className="editor-bottom-status">
              <span>
                <Circle size={10} /> JavaScript
              </span>
              <span>UTF-8</span>
              <span>LF</span>
            </div>

            <div className="editor-bottom-actions">
              <button
                className="run-button"
                onClick={runCode}
                disabled={isRunning}
              >
                <Play size={15} fill="currentColor" />
                {isRunning ? "Running..." : "Run"}
              </button>
              <button
                className="submit-button"
                onClick={submitCode}
                disabled={isRunning}
              >
                <Send size={15} />
                {isRunning ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>

          <div className="test-panel">
            <div className="test-panel-tabs">
              <button
                className={bottomTab === "testcases" ? "active" : ""}
                onClick={() => setBottomTab("testcases")}
              >
                <Terminal size={15} /> Test cases
              </button>
              <button
                className={bottomTab === "result" ? "active" : ""}
                onClick={() => setBottomTab("result")}
              >
                <CheckCircle2 size={15} /> Result
              </button>
            </div>

            {bottomTab === "testcases" ? (
              <TestCasesPanel
                testCases={details.testCases}
                selectedTest={selectedTest}
                setSelectedTest={setSelectedTest}
              />
            ) : (
              <div className="result-content">
                {result ? (
                  <SubmissionResult result={result} />
                ) : (
                  <div className="result-placeholder">
                    <Terminal size={23} />
                    <p>Run your code to view the result panel.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
