import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { problems } from "../../data/problems";

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
      "Given two sorted arrays nums1 and nums2, return the median of the two sorted arrays.",
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
      "You are given an array prices where prices[i] is the price of a stock on the ith day.",
    examples: [
      {
        input: "prices = [7, 1, 5, 3, 6, 4]",
        output: "5",
        explanation: "Buy at 1 and sell at 6 for a profit of 5.",
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
  return {
    description: `Solve ${problem.title} using an efficient ${problem.topics.join(" and ")} approach.`,
    examples: [
      {
        input: "input = 1",
        output: "1",
        explanation: "Use the required algorithm to transform the input.",
      },
    ],
    constraints: [
      "Return the expected result for every valid input.",
      "Choose an algorithm appropriate for the problem constraints.",
    ],
    starterCode:
      "function solve(input) {\n  // Write your solution here\n  return input;\n}\n\nconsole.log(solve(1));",
    testCases: [
      { input: "1", expected: "1" },
      { input: "2", expected: "2" },
      { input: "3", expected: "3" },
    ],
  };
}

export default function useProblemWorkspace() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const problem = problems.find((item) => item.slug === slug);
  const details = problem
    ? problemDetails[slug] || createProblemDetails(problem)
    : null;
  const submissionId = searchParams.get("submissionId");

  const [code, setCode] = useState(
    details?.starterCode || "// Write your JavaScript solution here\n",
  );
  const [activeTab, setActiveTab] = useState("description");
  const [bottomTab, setBottomTab] = useState("testcases");
  const [selectedTest, setSelectedTest] = useState(0);
  const [fontSize, setFontSize] = useState(14);

  useEffect(() => {
    setCode(details?.starterCode || "// Write your JavaScript solution here\n");
    setBottomTab("testcases");
    setSelectedTest(0);
    setActiveTab("description");
  }, [slug, details?.starterCode]);

  function resetCode() {
    if (details) setCode(details.starterCode);
  }

  return {
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
  };
}
