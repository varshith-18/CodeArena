const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const { protect } = require("../middleware/auth");
const problemTestCases = require("../config/problemTestCases");
const router = express.Router();
const Submission = require("../models/Submission");

const JUDGE0_URL = process.env.JUDGE0_URL || "http://localhost:2358";
const JAVASCRIPT_LANGUAGE_ID = 63;

function getJudge0Verdict(execution) {
  const statusId = execution.status?.id;
  const description = execution.status?.description || "";
  const errorText = [
    execution.stderr || "",
    execution.compile_output || "",
    execution.message || "",
  ].join("\n");

  // JavaScript syntax errors can be reported as a nonzero exit code.
  if (
    /SyntaxError|Unexpected token|Invalid or unexpected token/i.test(errorText)
  ) {
    return "Compilation Error";
  }

  switch (statusId) {
    case 3:
      return "Accepted";
    case 4:
      return "Wrong Answer";
    case 5:
      return "Time Limit Exceeded";
    case 6:
      return "Compilation Error";
    case 11:
      return "Runtime Error (NZEC)";
    case 7:
    case 8:
    case 9:
    case 10:
    case 12:
      return "Runtime Error";
    default:
      if (/time limit exceeded/i.test(description)) {
        return "Time Limit Exceeded";
      }
      if (/compilation error/i.test(description)) {
        return "Compilation Error";
      }
      if (/wrong answer/i.test(description)) {
        return "Wrong Answer";
      }
      return "Runtime Error";
  }
}

router.post("/run", protect, async (req, res) => {
  try {
    const { sourceCode, problemSlug } = req.body;

    if (typeof sourceCode !== "string" || !sourceCode.trim()) {
      return res.status(400).json({
        success: false,
        message: "Source code is required",
      });
    }

    if (sourceCode.length > 20000) {
      return res.status(413).json({
        success: false,
        message: "Source code must be 20,000 characters or fewer",
      });
    }

    if (typeof problemSlug !== "string" || !problemSlug.trim()) {
      return res.status(400).json({
        success: false,
        message: "Problem slug is required",
      });
    }

    const problem = problemTestCases[problemSlug] || {
      functionName: "solve",
      testCases: [
        { args: [1], expected: 1 },
        { args: [2], expected: 2 },
        { args: [3], expected: 3 },
      ],
    };

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Sample test cases were not found for this problem",
      });
    }

    const results = [];
    let totalTime = 0;
    let totalMemory = 0;

    for (let i = 0; i < problem.testCases.length; i++) {
      const testCase = problem.testCases[i];

      const harness = `
console.log = () => {};

try {
  const __result = ${problem.functionName}(...${JSON.stringify(testCase.args)});

  process.stdout.write(JSON.stringify(__result) + "\\n");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
`;

      const response = await axios.post(
        `${JUDGE0_URL}/submissions`,
        {
          language_id: JAVASCRIPT_LANGUAGE_ID,
          source_code: `${sourceCode}\n${harness}`,
          stdin: "",
          cpu_time_limit: 2,
          cpu_extra_time: 0.5,
          wall_time_limit: 5,
          memory_limit: 128000,
        },
        {
          params: {
            base64_encoded: false,
            wait: true,
          },
          timeout: 10000,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const execution = response.data;
      const statusId = execution.status?.id;

      if (statusId !== 3) {
        results.push({
          testCase: i + 1,
          passed: false,
          status: execution.status?.description || "Execution Error",
          stderr: execution.stderr || null,
          compileOutput: execution.compile_output || null,
          message: execution.message || null,
          expected: testCase.expected,
        });

        // Stop on compilation or runtime errors.
        break;
      }

      const outputLines = (execution.stdout || "").trim().split(/\r?\n/);

      const actualOutput = outputLines[outputLines.length - 1];

      let actual;

      try {
        actual = JSON.parse(actualOutput);
      } catch {
        results.push({
          testCase: i + 1,
          passed: false,
          status: "Invalid Output",
          actual: actualOutput,
          expected: testCase.expected,
        });

        continue;
      }

      const passed =
        JSON.stringify(actual) === JSON.stringify(testCase.expected);

      totalTime += Number(execution.time || 0);
      totalMemory = Math.max(totalMemory, Number(execution.memory || 0));

      results.push({
        testCase: i + 1,
        passed,
        status: passed ? "Passed" : "Wrong Answer",
        actual,
        expected: testCase.expected,
      });
    }

    const passedCount = results.filter((item) => item.passed).length;

    const allPassed =
      passedCount === problem.testCases.length &&
      results.length === problem.testCases.length;

    const verdict = allPassed
      ? "Accepted"
      : results.find((item) => !item.passed)?.status || "Wrong Answer";

    return res.status(200).json({
      success: true,
      verdict,
      passed: passedCount,
      total: problem.testCases.length,
      results,
      time: totalTime.toFixed(3),
      memory: totalMemory,
    });
  } catch (error) {
    console.error(
      "Run test cases error:",
      error.response?.data || error.message,
    );

    if (error.code === "ECONNABORTED") {
      return res.status(504).json({
        success: false,
        message: "Code execution timed out. Please try again.",
      });
    }

    return res.status(502).json({
      success: false,
      message: "Could not execute code. Check that Judge0 is running.",
    });
  }
});

router.post("/submit", protect, async (req, res) => {
  console.log("Authenticated user during submit:", req.user);
  console.log("User ID being saved:", req.user.id);
  try {
    const { problemSlug, sourceCode } = req.body;

    if (
      typeof problemSlug !== "string" ||
      typeof sourceCode !== "string" ||
      !sourceCode.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "problemSlug and sourceCode are required",
      });
    }

    if (sourceCode.length > 20000) {
      return res.status(413).json({
        success: false,
        message: "Source code is too long",
      });
    }

    const problem = problemTestCases[problemSlug] || {
      functionName: "solve",
      testCases: [
        { args: [1], expected: 1 },
        { args: [2], expected: 2 },
        { args: [3], expected: 3 },
      ],
    };

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Problem test cases were not found",
      });
    }

    const results = [];
    let totalTime = 0;
    let totalMemory = 0;

    for (let i = 0; i < problem.testCases.length; i++) {
      const testCase = problem.testCases[i];

      const harness = `
const __originalLog = console.log;
console.log = () => {};

try {
  const __result = ${problem.functionName}(...${JSON.stringify(testCase.args)});

  process.stdout.write(JSON.stringify(__result) + "\\n");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
`;

      const response = await axios.post(
        `${
          process.env.JUDGE0_URL || "http://127.0.0.1:2358"
        }/submissions?base64_encoded=false&wait=true`,
        {
          source_code: `${sourceCode}\n${harness}`,
          language_id: 63,
          stdin: "",
          cpu_time_limit: 2,
          wall_time_limit: 5,
        },
        {
          timeout: 15000,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const execution = response.data;
      const statusId = execution.status?.id;
      const stdout = execution.stdout || "";

      if (statusId !== 3) {
        const status = getJudge0Verdict(execution);

        results.push({
          testCase: i + 1,
          passed: false,
          status,
          stderr: execution.stderr || null,
          compileOutput: execution.compile_output || null,
          message: execution.message || null,
        });

        break;
      }

      const outputLines = stdout.trim().split(/\r?\n/);
      const actualOutput = outputLines[outputLines.length - 1];

      let actual;

      try {
        actual = JSON.parse(actualOutput);
      } catch {
        results.push({
          testCase: i + 1,
          passed: false,
          status: "Invalid Output",
          actual: actualOutput,
          expected: testCase.expected,
        });

        break;
      }

      const passed =
        JSON.stringify(actual) === JSON.stringify(testCase.expected);

      totalTime += Number(execution.time || 0);
      totalMemory = Math.max(totalMemory, Number(execution.memory || 0));

      results.push({
        testCase: i + 1,
        passed,
        status: passed ? "Passed" : "Wrong Answer",
        actual,
        expected: testCase.expected,
      });
    }

    const passedCount = results.filter((item) => item.passed).length;

    const allPassed =
      passedCount === problem.testCases.length &&
      results.length === problem.testCases.length;

    const verdict = allPassed
      ? "Accepted"
      : results.find((item) => !item.passed)?.status || "Wrong Answer";

    const time = Number(totalTime.toFixed(3));

    const submission = await Submission.create({
      user: req.user.id,
      problemSlug,
      sourceCode,
      verdict,
      passed: passedCount,
      total: problem.testCases.length,
      results,
      time,
      memory: totalMemory,
    });

    return res.status(200).json({
      success: true,
      submissionId: submission._id,
      verdict,
      passed: passedCount,
      total: problem.testCases.length,
      results,
      time: time.toFixed(3),
      memory: totalMemory,
    });
  } catch (error) {
    console.error("Submission error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to evaluate submission",
    });
  }
});

async function getSubmissionHistory(req, res) {
  try {
    const filter = {
      user: req.user.id,
    };

    // If a problem slug is supplied, show only that problem's history.
    if (req.query.problemSlug) {
      filter.problemSlug = req.query.problemSlug;
    }

    const submissions = await Submission.find(filter)
      .select("-sourceCode -results")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    console.error("Submission history error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch submission history",
    });
  }
}

router.get("/", protect, getSubmissionHistory);
router.get("/history", protect, getSubmissionHistory);

router.get("/:submissionId", protect, async (req, res) => {
  try {
    const { submissionId } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.isValidObjectId(submissionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID",
      });
    }

    // Find submission by ID
    const submission = await Submission.findById(submissionId).lean();

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission does not exist",
      });
    }

    // Compare authenticated user with submission owner
    const currentUserId = String(req.user.id || "");
    const submissionUserId = String(submission.user);

    // Temporary debugging logs
    console.log("Authenticated user ID:", currentUserId);
    console.log("Submission owner ID:", submissionUserId);

    // Never allow another user to view this submission
    if (currentUserId !== submissionUserId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this submission",
      });
    }

    return res.status(200).json({
      success: true,
      submission,
    });
  } catch (error) {
    console.error("Fetch submission details error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch submission details",
      error: error.message,
    });
  }
});

module.exports = router;
