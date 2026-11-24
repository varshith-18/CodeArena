/**
 * Static learning-path catalog.
 *
 * Problem entries contain only slugs from frontend/src/data/problems.js.
 * UI and API consumers should resolve metadata from the existing problem catalog.
 */

export const learningPaths = [
  {
    slug: "dsa",
    title: "Data Structures & Algorithms",
    description:
      "Build a structured foundation in core data structures, algorithms, and problem-solving patterns.",
    estimatedMinutes: 1200,
    difficultyProgression: ["Easy", "Medium", "Hard"],
    prerequisites: [],
    supportStatus: "available",
    supportMessage: null,
    topics: [
      {
        slug: "arrays-and-hash-maps",
        title: "Arrays & Hash Maps",
        description: "Practice lookup, frequency counting, and array transformations.",
        estimatedMinutes: 180,
        prerequisites: [],
        difficultyProgression: ["Easy", "Medium"],
        supportStatus: "available",
        supportMessage: null,
        problems: [
          { slug: "two-sum", difficulty: "Easy", order: 1 },
          { slug: "contains-duplicate", difficulty: "Easy", order: 2 },
          { slug: "missing-number", difficulty: "Easy", order: 3 },
          { slug: "maximum-subarray", difficulty: "Medium", order: 4 },
          { slug: "product-except-self", difficulty: "Medium", order: 5 },
          { slug: "longest-consecutive-sequence", difficulty: "Medium", order: 6 },
        ],
      },
      {
        slug: "strings-and-two-pointers",
        title: "Strings & Two Pointers",
        description: "Work through string validation, palindrome, and pointer patterns.",
        estimatedMinutes: 180,
        prerequisites: ["arrays-and-hash-maps"],
        difficultyProgression: ["Easy", "Medium", "Hard"],
        supportStatus: "available",
        supportMessage: null,
        problems: [
          { slug: "valid-anagram", difficulty: "Easy", order: 1 },
          { slug: "move-zeroes", difficulty: "Easy", order: 2 },
          { slug: "longest-substring", difficulty: "Medium", order: 3 },
          { slug: "group-anagrams", difficulty: "Medium", order: 4 },
          { slug: "longest-palindromic-substring", difficulty: "Medium", order: 5 },
          { slug: "trapping-rain-water", difficulty: "Hard", order: 6 },
        ],
      },
      {
        slug: "linked-lists",
        title: "Linked Lists",
        description: "Learn pointer traversal and linked-list construction.",
        estimatedMinutes: 120,
        prerequisites: ["arrays-and-hash-maps"],
        difficultyProgression: ["Easy"],
        supportStatus: "available",
        supportMessage: null,
        problems: [
          { slug: "reverse-linked-list", difficulty: "Easy", order: 1 },
          { slug: "merge-two-sorted-lists", difficulty: "Easy", order: 2 },
        ],
      },
      {
        slug: "binary-search",
        title: "Binary Search",
        description: "Apply divide-and-conquer search to sorted and rotated arrays.",
        estimatedMinutes: 150,
        prerequisites: ["arrays-and-hash-maps"],
        difficultyProgression: ["Easy", "Medium", "Hard"],
        supportStatus: "available",
        supportMessage: null,
        problems: [
          { slug: "binary-search", difficulty: "Easy", order: 1 },
          { slug: "find-minimum-rotated-array", difficulty: "Medium", order: 2 },
          { slug: "search-rotated-array", difficulty: "Medium", order: 3 },
          { slug: "median-two-sorted-arrays", difficulty: "Hard", order: 4 },
        ],
      },
      {
        slug: "stacks-and-queues",
        title: "Stacks & Queues",
        description: "Practice ordered processing, monotonic stacks, and LIFO patterns.",
        estimatedMinutes: 150,
        prerequisites: ["strings-and-two-pointers"],
        difficultyProgression: ["Easy", "Medium", "Hard"],
        supportStatus: "available",
        supportMessage: null,
        problems: [
          { slug: "valid-parentheses", difficulty: "Easy", order: 1 },
          { slug: "daily-temperatures", difficulty: "Medium", order: 2 },
          { slug: "min-stack", difficulty: "Medium", order: 3 },
          { slug: "evaluate-rpn", difficulty: "Medium", order: 4 },
        ],
      },
      {
        slug: "trees",
        title: "Trees",
        description: "Explore traversal, depth, breadth, and binary search tree rules.",
        estimatedMinutes: 180,
        prerequisites: ["binary-search", "linked-lists"],
        difficultyProgression: ["Easy", "Medium"],
        supportStatus: "available",
        supportMessage: null,
        problems: [
          { slug: "maximum-depth-binary-tree", difficulty: "Easy", order: 1 },
          { slug: "invert-binary-tree", difficulty: "Easy", order: 2 },
          { slug: "binary-tree-level-order", difficulty: "Medium", order: 3 },
          { slug: "validate-bst", difficulty: "Medium", order: 4 },
        ],
      },
      {
        slug: "graphs",
        title: "Graphs",
        description: "Study graph traversal and dependency scheduling.",
        estimatedMinutes: 180,
        prerequisites: ["trees"],
        difficultyProgression: ["Medium"],
        supportStatus: "available",
        supportMessage: null,
        problems: [
          { slug: "number-of-islands", difficulty: "Medium", order: 1 },
          { slug: "clone-graph", difficulty: "Medium", order: 2 },
          { slug: "course-schedule", difficulty: "Medium", order: 3 },
        ],
      },
      {
        slug: "dynamic-programming",
        title: "Dynamic Programming",
        description: "Progress from sequence and state transitions to optimization.",
        estimatedMinutes: 210,
        prerequisites: ["stacks-and-queues", "trees"],
        difficultyProgression: ["Easy", "Medium"],
        supportStatus: "available",
        supportMessage: null,
        problems: [
          { slug: "climbing-stairs", difficulty: "Easy", order: 1 },
          { slug: "best-time-to-buy-stock", difficulty: "Easy", order: 2 },
          { slug: "house-robber", difficulty: "Medium", order: 3 },
          { slug: "coin-change", difficulty: "Medium", order: 4 },
          { slug: "longest-increasing-subsequence", difficulty: "Medium", order: 5 },
        ],
      },
      {
        slug: "backtracking",
        title: "Backtracking",
        description: "Explore exhaustive search, combinations, permutations, and constraint solving.",
        estimatedMinutes: 180,
        prerequisites: ["dynamic-programming", "graphs"],
        difficultyProgression: ["Medium", "Hard"],
        supportStatus: "available",
        supportMessage: null,
        problems: [
          { slug: "combinations", difficulty: "Medium", order: 1 },
          { slug: "permutations", difficulty: "Medium", order: 2 },
          { slug: "subsets", difficulty: "Medium", order: 3 },
          { slug: "word-search", difficulty: "Medium", order: 4 },
          { slug: "n-queens", difficulty: "Hard", order: 5 },
        ],
      },
    ],
  },

  {
    slug: "javascript",
    title: "JavaScript Fundamentals",
    description:
      "Build JavaScript problem-solving fundamentals using the CodeArena JavaScript execution environment.",
    estimatedMinutes: 600,
    difficultyProgression: ["Easy", "Medium", "Hard"],
    prerequisites: [],
    supportStatus: "partial",
    supportMessage:
      "JavaScript execution is available; advanced language-specific topics may require additional problem harnesses.",
    topics: [
      {
        slug: "javascript-basics",
        title: "JavaScript Basics",
        description: "Practice loops, conditions, numbers, strings, and function return values.",
        estimatedMinutes: 120,
        prerequisites: [],
        difficultyProgression: ["Easy"],
        supportStatus: "available",
        supportMessage: null,
        problems: [
          { slug: "fizz-buzz", difficulty: "Easy", order: 1 },
          { slug: "palindrome-number", difficulty: "Easy", order: 2 },
          { slug: "valid-anagram", difficulty: "Easy", order: 3 },
        ],
      },
      {
        slug: "javascript-arrays",
        title: "Arrays & Object Patterns",
        description: "Apply JavaScript array operations and object-based lookup patterns.",
        estimatedMinutes: 180,
        prerequisites: ["javascript-basics"],
        difficultyProgression: ["Easy", "Medium"],
        supportStatus: "available",
        supportMessage: null,
        problems: [
          { slug: "two-sum", difficulty: "Easy", order: 1 },
          { slug: "missing-number", difficulty: "Easy", order: 2 },
          { slug: "maximum-subarray", difficulty: "Medium", order: 3 },
          { slug: "group-anagrams", difficulty: "Medium", order: 4 },
        ],
      },
      {
        slug: "javascript-strings",
        title: "Strings & Data Structures",
        description: "Work with string traversal, stacks, and hash-based solutions.",
        estimatedMinutes: 180,
        prerequisites: ["javascript-arrays"],
        difficultyProgression: ["Easy", "Medium"],
        supportStatus: "available",
        supportMessage: null,
        problems: [
          { slug: "valid-parentheses", difficulty: "Easy", order: 1 },
          { slug: "longest-substring", difficulty: "Medium", order: 2 },
          { slug: "daily-temperatures", difficulty: "Medium", order: 3 },
        ],
      },
      {
        slug: "javascript-advanced",
        title: "Advanced JavaScript Problem Solving",
        description:
          "Future JavaScript-specific modules for closures, async behavior, functional patterns, and DOM-independent runtime concepts.",
        estimatedMinutes: 120,
        prerequisites: ["javascript-strings"],
        difficultyProgression: ["Medium", "Hard"],
        supportStatus: "future-problem-support",
        supportMessage:
          "Existing slugs are algorithm exercises; JavaScript-specific executable topics and problem harnesses are not implemented yet.",
        problems: [
          { slug: "lru-cache", difficulty: "Medium", order: 1 },
          { slug: "trapping-rain-water", difficulty: "Hard", order: 2 },
        ],
      },
    ],
  },

  {
    slug: "react",
    title: "React",
    description:
      "A future React learning path planned around components, state, hooks, and rendering concepts.",
    estimatedMinutes: null,
    difficultyProgression: ["Easy", "Medium", "Hard"],
    prerequisites: ["javascript"],
    supportStatus: "future-language-support",
    supportMessage:
      "React problem execution is not implemented. CodeArena currently evaluates JavaScript solutions through algorithm harnesses.",
    topics: [
      {
        slug: "react-components-and-props",
        title: "Components & Props",
        description: "Future React fundamentals for component composition and prop flow.",
        estimatedMinutes: null,
        prerequisites: [],
        difficultyProgression: ["Easy"],
        supportStatus: "future-language-support",
        supportMessage: "Requires React render and assertion support.",
        problems: [],
      },
      {
        slug: "react-state-and-hooks",
        title: "State & Hooks",
        description: "Future exercises for state updates, derived state, and effect behavior.",
        estimatedMinutes: null,
        prerequisites: ["react-components-and-props"],
        difficultyProgression: ["Easy", "Medium"],
        supportStatus: "future-language-support",
        supportMessage: "Requires a React test runtime and problem catalog.",
        problems: [],
      },
      {
        slug: "react-routing-and-performance",
        title: "Routing & Performance",
        description: "Future exercises for routing, memoization, and rendering optimization.",
        estimatedMinutes: null,
        prerequisites: ["react-state-and-hooks"],
        difficultyProgression: ["Medium", "Hard"],
        supportStatus: "future-language-support",
        supportMessage: "Requires React Router and browser/component test support.",
        problems: [],
      },
    ],
  },

  {
    slug: "python",
    title: "Python",
    description:
      "A future Python learning path for language fundamentals and algorithm implementation.",
    estimatedMinutes: null,
    difficultyProgression: ["Easy", "Medium", "Hard"],
    prerequisites: [],
    supportStatus: "future-language-support",
    supportMessage:
      "Python execution and Python-specific problem definitions are not implemented. Judge0 is currently configured for JavaScript.",
    topics: [
      {
        slug: "python-basics",
        title: "Python Basics",
        description: "Future Python fundamentals for syntax, collections, control flow, and functions.",
        estimatedMinutes: null,
        prerequisites: [],
        difficultyProgression: ["Easy"],
        supportStatus: "future-language-support",
        supportMessage: "Requires Python Judge0 language support and Python harnesses.",
        problems: [],
      },
      {
        slug: "python-arrays-and-strings",
        title: "Arrays & Strings",
        description: "Future Python exercises for slices, comprehensions, lookup, and string processing.",
        estimatedMinutes: null,
        prerequisites: ["python-basics"],
        difficultyProgression: ["Easy", "Medium"],
        supportStatus: "future-language-support",
        supportMessage: "Requires Python-specific problem definitions.",
        problems: [],
      },
      {
        slug: "python-algorithms",
        title: "Algorithms",
        description: "Future Python exercises for search, graphs, recursion, and dynamic programming.",
        estimatedMinutes: null,
        prerequisites: ["python-arrays-and-strings"],
        difficultyProgression: ["Medium", "Hard"],
        supportStatus: "future-language-support",
        supportMessage: "Requires Python Judge0 support and mapped executable problems.",
        problems: [],
      },
    ],
  },

  {
    slug: "problem-solving",
    title: "Problem Solving",
    description:
      "Build reusable reasoning patterns through ordered easy, medium, and hard challenges.",
    estimatedMinutes: 900,
    difficultyProgression: ["Easy", "Medium", "Hard"],
    prerequisites: [],
    supportStatus: "available",
    supportMessage: null,
    topics: [
      {
        slug: "logic-and-number-patterns",
        title: "Logic & Number Patterns",
        description: "Start with direct reasoning and mathematical edge cases.",
        estimatedMinutes: 150,
        prerequisites: [],
        difficultyProgression: ["Easy"],
        supportStatus: "available",
        supportMessage: null,
        problems: [
          { slug: "fizz-buzz", difficulty: "Easy", order: 1 },
          { slug: "palindrome-number", difficulty: "Easy", order: 2 },
          { slug: "climbing-stairs", difficulty: "Easy", order: 3 },
        ],
      },
      {
        slug: "patterns-and-traversal",
        title: "Patterns & Traversal",
        description: "Recognize sliding windows, pointer movement, and traversal patterns.",
        estimatedMinutes: 240,
        prerequisites: ["logic-and-number-patterns"],
        difficultyProgression: ["Easy", "Medium"],
        supportStatus: "available",
        supportMessage: null,
        problems: [
          { slug: "valid-anagram", difficulty: "Easy", order: 1 },
          { slug: "valid-parentheses", difficulty: "Easy", order: 2 },
          { slug: "longest-substring", difficulty: "Medium", order: 3 },
          { slug: "number-of-islands", difficulty: "Medium", order: 4 },
        ],
      },
      {
        slug: "optimization-and-design",
        title: "Optimization & Design",
        description: "Use state, intervals, heaps, and cache design to improve solutions.",
        estimatedMinutes: 270,
        prerequisites: ["patterns-and-traversal"],
        difficultyProgression: ["Medium", "Hard"],
        supportStatus: "available",
        supportMessage: null,
        problems: [
          { slug: "merge-intervals", difficulty: "Medium", order: 1 },
          { slug: "insert-interval", difficulty: "Medium", order: 2 },
          { slug: "kth-largest-element", difficulty: "Medium", order: 3 },
          { slug: "lru-cache", difficulty: "Medium", order: 4 },
          { slug: "trapping-rain-water", difficulty: "Hard", order: 5 },
        ],
      },
      {
        slug: "advanced-reasoning",
        title: "Advanced Reasoning",
        description: "Combine search, constraints, graph structure, and dynamic planning.",
        estimatedMinutes: 240,
        prerequisites: ["optimization-and-design"],
        difficultyProgression: ["Medium", "Hard"],
        supportStatus: "available",
        supportMessage: null,
        problems: [
          { slug: "course-schedule", difficulty: "Medium", order: 1 },
          { slug: "n-queens", difficulty: "Hard", order: 2 },
          { slug: "regular-expression-matching", difficulty: "Hard", order: 3 },
        ],
      },
    ],
  },
];

export const learningPathsBySlug = Object.fromEntries(
  learningPaths.map((path) => [path.slug, path]),
);

export function validateLearningPathProblemSlugs(knownProblemSlugs) {
  const knownSlugs = new Set(knownProblemSlugs);
  const invalidReferences = [];

  for (const path of learningPaths) {
    for (const topic of path.topics) {
      for (const problem of topic.problems) {
        if (!knownSlugs.has(problem.slug)) {
          invalidReferences.push({
            pathSlug: path.slug,
            topicSlug: topic.slug,
            problemSlug: problem.slug,
          });
        }
      }
    }
  }

  return invalidReferences;
}
