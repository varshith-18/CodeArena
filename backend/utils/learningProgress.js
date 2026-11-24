const mongoose = require("mongoose");
const Submission = require("../models/Submission");
const {
  knownProblemSlugSet,
  learningPaths,
  learningPathsBySlug,
} = require("../config/learningPaths");

async function getAcceptedProblemSlugs(userId) {
  const objectUserId =
    typeof userId === "string" && mongoose.isValidObjectId(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

  const accepted = await Submission.distinct("problemSlug", {
    user: objectUserId,
    verdict: "Accepted",
  });

  return new Set(accepted);
}

function topicIsComplete(topic, acceptedSlugs) {
  return (
    topic.problems.length > 0 &&
    topic.problems.every((slug) => acceptedSlugs.has(slug))
  );
}

function topicIsUnlocked(path, topic, acceptedSlugs) {
  const supportStatus =
    topic.supportStatus || (topic.problems.length > 0 ? path.supportStatus : path.supportStatus);
  if (
    supportStatus === "future-language-support" ||
    supportStatus === "future-problem-support"
  ) {
    return false;
  }

  if (!topic.prerequisites.every((slug) => {
    const prerequisite = path.topics.find((item) => item.slug === slug);
    return prerequisite && topicIsComplete(prerequisite, acceptedSlugs);
  })) {
    return false;
  }

  return path.prerequisites.every((prerequisiteSlug) => {
    const prerequisitePath = learningPathsBySlug[prerequisiteSlug];
    if (!prerequisitePath) return false;
    return pathIsComplete(prerequisitePath, acceptedSlugs);
  });
}

function pathIsComplete(path, acceptedSlugs) {
  const executableTopics = path.topics.filter(
    (topic) => topic.problems.length > 0,
  );
  return (
    executableTopics.length > 0 &&
    executableTopics.every((topic) => topicIsComplete(topic, acceptedSlugs))
  );
}

function buildPathProgress(path, acceptedSlugs) {
  const topics = path.topics.map((topic) => {
    const requiredCount = topic.problems.length;
    const completedCount = topic.problems.filter((slug) =>
      acceptedSlugs.has(slug),
    ).length;
    const complete = topicIsComplete(topic, acceptedSlugs);
    const unlocked =
      topic.supportStatus !== "future-language-support" &&
      topicIsUnlocked(path, topic, acceptedSlugs);

    return {
      slug: topic.slug,
      title: topic.slug,
      requiredProblemSlugs: topic.problems,
      requiredCount,
      completedCount,
      percent:
        requiredCount === 0
          ? 0
          : Math.round((completedCount / requiredCount) * 100),
      complete,
      unlocked,
      supportStatus: topic.supportStatus || path.supportStatus,
    };
  });

  const requiredCount = topics.reduce(
    (total, topic) => total + topic.requiredCount,
    0,
  );
  const completedCount = topics.reduce(
    (total, topic) => total + topic.completedCount,
    0,
  );

  return {
    slug: path.slug,
    title: path.title,
    supportStatus: path.supportStatus,
    prerequisites: path.prerequisites,
    requiredCount,
    completedCount,
    percent:
      requiredCount === 0
        ? 0
        : Math.round((completedCount / requiredCount) * 100),
    complete: pathIsComplete(path, acceptedSlugs),
    topics,
  };
}

function findContinueProblem(path, acceptedSlugs) {
  for (const topic of path.topics) {
    if (topic.problems.length === 0) continue;
    if (!topicIsUnlocked(path, topic, acceptedSlugs)) continue;

    for (const problemSlug of topic.problems) {
      if (!acceptedSlugs.has(problemSlug)) {
        return { topic, problemSlug };
      }
    }
  }
  return null;
}

module.exports = {
  knownProblemSlugSet,
  learningPaths,
  learningPathsBySlug,
  getAcceptedProblemSlugs,
  topicIsComplete,
  topicIsUnlocked,
  pathIsComplete,
  buildPathProgress,
  findContinueProblem,
};
