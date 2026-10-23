
const problemTestCases = {
  "two-sum": {
    functionName: "twoSum",
    testCases: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { args: [[3, 2, 4], 6], expected: [1, 2] },
      { args: [[3, 3], 6], expected: [0, 1] },
    ],
  },

  "valid-parentheses": {
    functionName: "isValid",
    testCases: [
      { args: ["()"], expected: true },
      { args: ["()[]{}"], expected: true },
      { args: ["(]"], expected: false },
      { args: ["([)]"], expected: false },
      { args: ["{[]}"], expected: true },
      { args: [""], expected: true },
    ],
  },

  "longest-substring": {
    functionName: "lengthOfLongestSubstring",
    testCases: [
      { args: ["abcabcbb"], expected: 3 },
      { args: ["bbbbb"], expected: 1 },
      { args: ["pwwkew"], expected: 3 },
      { args: [""], expected: 0 },
      { args: ["au"], expected: 2 },
      { args: ["dvdf"], expected: 3 },
    ],
  },

  "median-two-sorted-arrays": {
    functionName: "findMedianSortedArrays",
    testCases: [
      { args: [[1, 3], [2]], expected: 2 },
      { args: [[1, 2], [3, 4]], expected: 2.5 },
      { args: [[0, 0], [0, 0]], expected: 0 },
      { args: [[], [1]], expected: 1 },
      { args: [[2], []], expected: 2 },
      { args: [[1, 3, 5], [2, 4, 6]], expected: 3.5 },
    ],
  },

  "best-time-to-buy-stock": {
    functionName: "maxProfit",
    testCases: [
      { args: [[7, 1, 5, 3, 6, 4]], expected: 5 },
      { args: [[7, 6, 4, 3, 1]], expected: 0 },
      { args: [[1, 2]], expected: 1 },
      { args: [[2, 4, 1]], expected: 2 },
      { args: [[3, 3, 3]], expected: 0 },
      { args: [[1]], expected: 0 },
    ],
  },
};

module.exports = problemTestCases;
