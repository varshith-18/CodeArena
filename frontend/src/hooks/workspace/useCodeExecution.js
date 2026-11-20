import { useCallback, useState } from "react";
import {
  runCode as runSubmissionCode,
  submitCode as submitSubmissionCode,
} from "../../api/submissionApi";

export default function useCodeExecution(slug, code, setBottomTab) {
  const [result, setResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  function validateCode(message) {
    if (code.trim()) return true;
    setBottomTab("result");
    setResult({ status: "Error", message });
    return false;
  }

  async function runCode() {
    if (!validateCode("Please write some JavaScript code first.")) return;

    setIsRunning(true);
    setBottomTab("result");
    setResult(null);

    try {
      const data = await runSubmissionCode({ problemSlug: slug, sourceCode: code });
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
    if (!validateCode("Please write some JavaScript code first.")) return;

    setIsRunning(true);
    setBottomTab("result");
    setResult(null);

    try {
      const data = await submitSubmissionCode({ problemSlug: slug, sourceCode: code });
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

  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  return { result, isRunning, runCode, submitCode, clearResult };
}
