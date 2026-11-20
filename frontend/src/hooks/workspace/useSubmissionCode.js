import { useEffect, useState } from "react";
import {
  getSubmissionDetails,
  getSubmissionHistory,
} from "../../api/submissionApi";

export default function useSubmissionCode({
  slug,
  submissionId,
  setCode,
  setActiveTab,
  setBottomTab,
  clearResult,
}) {
  const [submissions, setSubmissions] = useState([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [submissionError, setSubmissionError] = useState("");

  useEffect(() => {
    setSubmissions([]);
    setSubmissionError("");
  }, [slug]);

  useEffect(() => {
    if (!submissionId) return;

    let cancelled = false;

    async function loadSubmittedCode() {
      try {
        const data = await getSubmissionDetails(submissionId);
        if (!data.submission?.sourceCode) {
          throw new Error("Submitted source code was not found.");
        }
        if (!cancelled) {
          setCode(data.submission.sourceCode);
          setActiveTab("description");
          setBottomTab("testcases");
          clearResult();
        }
      } catch (error) {
        if (!cancelled) {
          setSubmissionError(error.message || "Unable to load submitted code.");
        }
      }
    }

    loadSubmittedCode();
    return () => {
      cancelled = true;
    };
  }, [
    submissionId,
    slug,
    setCode,
    setActiveTab,
    setBottomTab,
    clearResult,
  ]);

  async function fetchSubmissions() {
    setIsLoadingSubmissions(true);
    setSubmissionError("");

    try {
      const data = await getSubmissionHistory(slug);
      setSubmissions(data.submissions || []);
    } catch (error) {
      setSubmissionError(error.message || "Could not load submission history.");
    } finally {
      setIsLoadingSubmissions(false);
    }
  }

  return {
    submissions,
    isLoadingSubmissions,
    submissionError,
    fetchSubmissions,
  };
}
