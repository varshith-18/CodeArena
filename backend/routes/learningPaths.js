const express = require("express");
const LearningProgress = require("../models/LearningProgress");
const { protect } = require("../middleware/auth");
const {
  learningPaths,
  learningPathsBySlug,
  getAcceptedProblemSlugs,
  buildPathProgress,
  findContinueProblem,
  topicIsUnlocked,
  pathIsComplete,
} = require("../utils/learningProgress");

const router = express.Router();

router.use(protect);

router.get("/me", async (req, res, next) => {
  try {
    const acceptedSlugs = await getAcceptedProblemSlugs(req.user.id);
    const preferences = await LearningProgress.findOne({
      user: req.user.id,
    }).lean();

    return res.json({
      success: true,
      paths: learningPaths.map((path) =>
        buildPathProgress(path, acceptedSlugs),
      ),
      preferences: preferences
        ? {
            activePathSlug: preferences.activePathSlug,
            activeTopicSlug: preferences.activeTopicSlug,
            activeProblemSlug: preferences.activeProblemSlug,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me/continue", async (req, res, next) => {
  try {
    const acceptedSlugs = await getAcceptedProblemSlugs(req.user.id);
    const preferences = await LearningProgress.findOne({
      user: req.user.id,
    }).lean();

    if (preferences?.activePathSlug) {
      const activePath = learningPathsBySlug[preferences.activePathSlug];

      if (activePath) {
        const activeTopic = activePath.topics.find(
          (topic) => topic.slug === preferences.activeTopicSlug,
        );

        if (
          activeTopic &&
          topicIsUnlocked(activePath, activeTopic, acceptedSlugs) &&
          preferences.activeProblemSlug &&
          activeTopic.problems.includes(preferences.activeProblemSlug) &&
          !acceptedSlugs.has(preferences.activeProblemSlug)
        ) {
          return res.json({
            success: true,
            continueLearning: {
              pathSlug: activePath.slug,
              topicSlug: activeTopic.slug,
              problemSlug: preferences.activeProblemSlug,
            },
          });
        }
      }
    }

    for (const path of learningPaths) {
      if (!path.prerequisites.every((slug) => {
        const prerequisite = learningPathsBySlug[slug];
        return prerequisite && pathIsComplete(prerequisite, acceptedSlugs);
      })) {
        continue;
      }

      const nextProblem = findContinueProblem(path, acceptedSlugs);
      if (!nextProblem) continue;

      await LearningProgress.findOneAndUpdate(
        { user: req.user.id },
        {
          $set: {
            activePathSlug: path.slug,
            activeTopicSlug: nextProblem.topic.slug,
            activeProblemSlug: nextProblem.problemSlug,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      return res.json({
        success: true,
        continueLearning: {
          pathSlug: path.slug,
          topicSlug: nextProblem.topic.slug,
          problemSlug: nextProblem.problemSlug,
        },
      });
    }

    return res.json({
      success: true,
      continueLearning: null,
      message: "No unlocked, unfinished learning path is available.",
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:pathSlug/me", async (req, res, next) => {
  try {
    const path = learningPathsBySlug[req.params.pathSlug];
    if (!path) {
      return res.status(404).json({
        success: false,
        message: "Unknown learning path.",
      });
    }

    const acceptedSlugs = await getAcceptedProblemSlugs(req.user.id);
    const progress = buildPathProgress(path, acceptedSlugs);

    const preferences = await LearningProgress.findOne({
      user: req.user.id,
    }).lean();

    return res.json({
      success: true,
      path: progress,
      preferences: preferences
        ? {
            activePathSlug: preferences.activePathSlug,
            activeTopicSlug: preferences.activeTopicSlug,
            activeProblemSlug: preferences.activeProblemSlug,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
});

router.use((error, req, res, next) => {
  console.error("Learning paths error:", error);
  return res.status(500).json({
    success: false,
    message: "Failed to load learning path progress.",
  });
});

module.exports = router;
