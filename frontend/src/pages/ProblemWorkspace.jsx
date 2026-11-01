import { useEffect, useState } from "react";
import "./ProblemWorkspace.css";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import {
  ArrowLeft,
  Play,
  Send,
  RotateCcw,
  Settings2,
  Terminal,
  FileCode2,
  BookOpen,
  CheckCircle2,
  Circle,
  ChevronDown,
  Clock3,
  MemoryStick,
} from "lucide-react";
import { problems } from "../data/problems";

// Set VITE_API_BASE_URL=http://localhost:5000 if you are not using a Vite proxy.
const configuredApiUrl = import.meta.env.VITE_API_BASE_URL || "";
const API_BASE_URL = configuredApiUrl.replace(/\/+$/, "").replace(/\/api$/, "");

function getAuthToken() {
  return (
    sessionStorage.getItem("codearena_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken")
  );
}

async function readApiResponse(response) {
  const rawText = await response.text();
  let data = {};

  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(
        `The server returned an invalid response (HTTP ${response.status}).`,
      );
    }
  }

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message || `Request failed (HTTP ${response.status}).`,
    );
  }

  return data;
}

const problemDetails = {
  "two-sum": {
    description:
      "Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target.",
    examples: [
      {
        input: "nums = [2, 7, 11, 15], target = 9",
        output: "[0, 1]",
        explanation: "nums[0] + nums[1] = 2 + 7 = 9.",
      },
      {
        input: "nums = [3, 2, 4], target = 6",
        output: "[1, 2]",
        explanation: "nums[1] + nums[2] = 2 + 4 = 6.",
      },
    ],
    constraints: [
      "2 <= nums.length <= 10⁴",
      "-10⁹ <= nums[i] <= 10⁹",
      "-10⁹ <= target <= 10⁹",
      "Exactly one valid answer exists.",
    ],
    starterCode:
      "function twoSum(nums, target) {\n  // Write your solution here\n  \n}\n\nconsole.log(twoSum([2, 7, 11, 15], 9));",
    testCases: [
      { input: "[2, 7, 11, 15], 9", expected: "[0,1]" },
      { input: "[3, 2, 4], 6", expected: "[1,2]" },
      { input: "[3, 3], 6", expected: "[0,1]" },
    ],
  },
  "valid-parentheses": {
    description:
      "Given a string s containing only '(', ')', '{', '}', '[' and ']', determine whether the input string has valid brackets.",
    examples: [
      {
        input: 's = "()"',
        output: "true",
        explanation: "Every opening bracket is closed in the correct order.",
      },
      {
        input: 's = "([)]"',
        output: "false",
        explanation: "The brackets close in the wrong order.",
      },
    ],
    constraints: [
      "1 <= s.length <= 10⁴",
      "s consists only of brackets: ()[]{}.",
    ],
    starterCode:
      "function isValid(s) {\n  // Write your solution here\n  \n}\n\nconsole.log(isValid('()'));",
    testCases: [
      { input: '"()"', expected: "true" },
      { input: '"()[]{}"', expected: "true" },
      { input: '"([)]"', expected: "false" },
    ],
  },
  "longest-substring": {
    description:
      "Given a string s, find the length of the longest substring without repeating characters.",
    examples: [
      {
        input: 's = "abcabcbb"',
        output: "3",
        explanation: 'The answer is "abc", with length 3.',
      },
      {
        input: 's = "bbbbb"',
        output: "1",
        explanation: 'The answer is "b", with length 1.',
      },
    ],
    constraints: [
      "0 <= s.length <= 5 × 10⁴",
      "s consists of English letters, digits, symbols and spaces.",
    ],
    starterCode:
      "function lengthOfLongestSubstring(s) {\n  // Write your solution here\n  \n}\n\nconsole.log(lengthOfLongestSubstring('abcabcbb'));",
    testCases: [
      { input: '"abcabcbb"', expected: "3" },
      { input: '"bbbbb"', expected: "1" },
      { input: '""', expected: "0" },
    ],
  },
  "median-two-sorted-arrays": {
    description:
      "Given two sorted arrays nums1 and nums2, return the median of the two sorted arrays. Aim for O(log(m+n)) time complexity.",
    examples: [
      {
        input: "nums1 = [1, 3], nums2 = [2]",
        output: "2",
        explanation: "The merged array is [1, 2, 3], whose median is 2.",
      },
      {
        input: "nums1 = [1, 2], nums2 = [3, 4]",
        output: "2.5",
        explanation: "The merged array is [1, 2, 3, 4].",
      },
    ],
    constraints: [
      "0 <= nums1.length, nums2.length <= 1000",
      "1 <= nums1.length + nums2.length <= 2000",
      "Both arrays are sorted in non-decreasing order.",
    ],
    starterCode:
      "function findMedianSortedArrays(nums1, nums2) {\n  // Write your solution here\n  \n}\n\nconsole.log(findMedianSortedArrays([1, 3], [2]));",
    testCases: [
      { input: "[1, 3], [2]", expected: "2" },
      { input: "[1, 2], [3, 4]", expected: "2.5" },
    ],
  },
  "best-time-to-buy-stock": {
    description:
      "You are given an array prices where prices[i] is the price of a stock on the ith day. Choose one day to buy and a later day to sell to maximize profit.",
    examples: [
      {
        input: "prices = [7, 1, 5, 3, 6, 4]",
        output: "5",
        explanation: "Buy at 1 and sell at 6 for a profit of 5.",
      },
      {
        input: "prices = [7, 6, 4, 3, 1]",
        output: "0",
        explanation: "No profitable transaction is possible.",
      },
    ],
    constraints: ["1 <= prices.length <= 10⁵", "0 <= prices[i] <= 10⁴"],
    starterCode:
      "function maxProfit(prices) {\n  // Write your solution here\n  \n}\n\nconsole.log(maxProfit([7, 1, 5, 3, 6, 4]));",
    testCases: [
      { input: "[7, 1, 5, 3, 6, 4]", expected: "5" },
      { input: "[7, 6, 4, 3, 1]", expected: "0" },
    ],
  },
};

function createProblemDetails(problem) {
  const starterCode =
    "function solve(input) {\n  // Write your solution here\n  return input;\n}\n\nconsole.log(solve(1));";

  return {
    description: `Solve ${problem.title} using an efficient ${problem.topics.join(
      " and ",
    )} approach.`,
    examples: [
      {
        input: "input = 1",
        output: "1",
        explanation: "Use the required algorithm to transform the input.",
      },
      {
        input: "input = 2",
        output: "2",
        explanation: "Handle a second valid input correctly.",
      },
    ],
    constraints: [
      "Return the expected result for every valid input.",
      "Choose an algorithm appropriate for the problem constraints.",
    ],
    starterCode,
    testCases: [
      { input: "1", expected: "1" },
      { input: "2", expected: "2" },
      { input: "3", expected: "3" },
    ],
  };
}

export default function ProblemWorkspace() {
  const { slug } = useParams();
    const [searchParams] = useSearchParams();
  const problem = problems.find((item) => item.slug === slug);
  const details = problem
    ? problemDetails[slug] || createProblemDetails(problem)
    : null;
  const [submissions, setSubmissions] = useState([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const submissionId = searchParams.get("submissionId");
  const [code, setCode] = useState(
    details?.starterCode || "// Write your JavaScript solution here\n",
  );
  const [activeTab, setActiveTab] = useState("description");
  const [bottomTab, setBottomTab] = useState("testcases");
  const [selectedTest, setSelectedTest] = useState(0);
  const [fontSize, setFontSize] = useState(14);
  const [result, setResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  // Reset the workspace when the route changes to another problem.
  useEffect(() => {
    setCode(
      details?.starterCode || "// Write your JavaScript solution here\\n",
    );
    setResult(null);
    setBottomTab("testcases");
    setSelectedTest(0);
    setActiveTab("description");
    setSubmissions([]);
    setSubmissionError("");
  }, [slug, details]);
  // Load a previously submitted solution into Monaco Editor
  useEffect(() => {
    if (!submissionId) return;

    async function loadSubmittedCode() {
      try {
        const token = getAuthToken();

        if (!token) {
          throw new Error("Please log in to view submitted code.");
        }

        const response = await fetch(
          `${API_BASE_URL}/api/submissions/${submissionId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await readApiResponse(response);

        if (!data.submission?.sourceCode) {
          throw new Error("Submitted source code was not found.");
        }

        // Load the original submitted code into Monaco
        setCode(data.submission.sourceCode);

        // Show the problem description and editor
        setActiveTab("description");
        setBottomTab("testcases");
        setResult(null);
      } catch (error) {
        console.error("Failed to load submitted code:", error);
        setSubmissionError(error.message || "Unable to load submitted code.");
      }
    }

    loadSubmittedCode();
  }, [submissionId, slug]);

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

  async function runCode() {
    if (!code.trim()) {
      setBottomTab("result");
      setResult({
        status: "Error",
        message: "Please write some JavaScript code first.",
      });
      return;
    }

    const token = getAuthToken();

    if (!token) {
      setBottomTab("result");
      setResult({
        status: "Error",
        message: "Please log in again before running code.",
      });
      return;
    }

    setIsRunning(true);
    setBottomTab("result");
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/submissions/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          problemSlug: slug,
          sourceCode: code,
        }),
      });

      const data = await readApiResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to run test cases.");
      }

      setResult({
        status: data.verdict || "Unknown",
        message: `${data.passed ?? 0}/${data.total ?? data.results?.length ?? 0} test cases passed.`,
        submissionResults: data.results || [],
        time: data.time,
        memory: data.memory,
      });
    } catch (error) {
      setResult({
        status: "Error",
        message: error.message || "Could not connect to the CodeArena backend.",
      });
    } finally {
      setIsRunning(false);
    }
  }

  async function submitCode() {
    if (!code.trim()) {
      setBottomTab("result");
      setResult({
        status: "Error",
        message: "Please write some JavaScript code first.",
      });
      return;
    }

    const token = getAuthToken();

    if (!token) {
      setBottomTab("result");
      setResult({
        status: "Error",
        message: "Please log in again before submitting.",
      });
      return;
    }

    setIsRunning(true);
    setBottomTab("result");
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/submissions/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          problemSlug: slug,
          sourceCode: code,
        }),
      });

      const data = await readApiResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to submit your solution.");
      }

      setResult({
        status: data.verdict || "Unknown",
        message: `${data.passed ?? 0}/${data.total ?? data.results?.length ?? 0} test cases passed.`,
        stdout: "",
        stderr: "",
        compileOutput: "",
        time: data.time,
        memory: data.memory,
        submissionResults: data.results || [],
      });
    } catch (error) {
      setResult({
        status: "Error",
        message: error.message || "Could not connect to the CodeArena backend.",
      });
    } finally {
      setIsRunning(false);
    }
  }

  function resetCode() {
    setCode(details.starterCode);
    setResult(null);
  }

  async function fetchSubmissions() {
    const token = getAuthToken();

    if (!token) {
      setSubmissionError("Please log in to view submissions.");
      return;
    }

    setIsLoadingSubmissions(true);
    setSubmissionError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/submissions/history?problemSlug=${encodeURIComponent(slug)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await readApiResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load submissions.");
      }

      setSubmissions(data.submissions || []);
    } catch (error) {
      setSubmissionError(error.message || "Could not load submission history.");
    } finally {
      setIsLoadingSubmissions(false);
    }
  }

  return (
    <div className="workspace-page">
      <header className="workspace-topbar">
        <Link to="/problems" className="back-to-problems">
          <ArrowLeft size={17} />
          <span>Problems</span>
        </Link>

        <div className="workspace-breadcrumb">
          <span>/</span>
          <strong>{problem.title}</strong>
        </div>

        <div className="workspace-top-actions">
          <span className="workspace-language-label">
            <FileCode2 size={15} /> JavaScript
          </span>
          <Link to="/" className="workspace-home-link">
            Dashboard
          </Link>
        </div>
      </header>

      <div className="workspace-body">
        <section className="description-pane">
          <div className="workspace-tabs">
            <button
              className={activeTab === "description" ? "active" : ""}
              onClick={() => setActiveTab("description")}
            >
              <BookOpen size={16} /> Description
            </button>
            <button
              className={activeTab === "submissions" ? "active" : ""}
              onClick={() => {
                setActiveTab("submissions");
                fetchSubmissions();
              }}
            >
              <Clock3 size={16} /> Submissions
            </button>
          </div>

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
                          {submission.passed}/{submission.total} test cases
                          passed
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

        <section className="editor-pane">
          <div className="editor-toolbar">
            <div className="editor-toolbar-left">
              <span className="editor-file-icon">
                <FileCode2 size={15} />
              </span>
              <span>solution.js</span>
              <span className="editor-language-badge">JavaScript</span>
            </div>

            <div className="editor-toolbar-actions">
              <button
                title="Decrease font size"
                onClick={() => setFontSize((size) => Math.max(11, size - 1))}
              >
                A−
              </button>
              <button
                title="Increase font size"
                onClick={() => setFontSize((size) => Math.min(20, size + 1))}
              >
                A+
              </button>
              <button title="Reset code" onClick={resetCode}>
                <RotateCcw size={15} />
              </button>
              <button title="Editor settings" onClick={() => setFontSize(14)}>
                <Settings2 size={15} />
              </button>
            </div>
          </div>

          <div className="monaco-container">
            <Editor
              height="100%"
              language="javascript"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value ?? "")}
              options={{
                fontSize,
                minimap: { enabled: false },
                automaticLayout: true,
                scrollBeyondLastLine: false,
                padding: { top: 18, bottom: 18 },
                wordWrap: "on",
                tabSize: 2,
                lineNumbers: "on",
                renderLineHighlight: "all",
                roundedSelection: false,
                contextmenu: true,
                suggestOnTriggerCharacters: true,
              }}
            />
          </div>

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
              <div className="test-cases-content">
                <div className="test-case-selector">
                  {details.testCases.map((testCase, index) => (
                    <button
                      key={index}
                      className={selectedTest === index ? "selected-test" : ""}
                      onClick={() => setSelectedTest(index)}
                    >
                      {`Case ${index + 1}`}
                    </button>
                  ))}
                </div>

                <div className="test-input-group">
                  <label>Input</label>
                  <div className="test-input-value">
                    {details.testCases[selectedTest]?.input}
                  </div>
                </div>

                <div className="test-input-group">
                  <label>Expected output</label>
                  <div className="test-input-value">
                    {details.testCases[selectedTest]?.expected}
                  </div>
                </div>
              </div>
            ) : (
              <div className="result-content">
                {result ? (
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
                              <pre className="execution-error">
                                {test.stderr}
                              </pre>
                            )}

                            {test.compileOutput && (
                              <pre className="execution-error">
                                {test.compileOutput}
                              </pre>
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
                        <pre className="execution-error">
                          {result.compileOutput}
                        </pre>
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
