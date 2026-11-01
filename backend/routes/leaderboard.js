const express = require("express");
const mongoose = require("mongoose");

const Submission = require("../models/Submission");
const User = require("../models/User");

const { protect } = require("../middleware/auth");

const router = express.Router();

function getLimit(value) {
  const parsed = Number.parseInt(value, 10) || 50;
  return Math.min(Math.max(parsed, 1), 100);
}

// Shared aggregation: one entry per user with accepted submissions.
async function getRankedLeaderboard(limit = 100000) {
  const results = await Submission.aggregate([
    {
      $match: {
        verdict: "Accepted",
        user: { $ne: null },
        problemSlug: { $type: "string", $ne: "" },
      },
    },
    {
      $group: {
        _id: "$user",
        acceptedSubmissions: { $sum: 1 },
        solvedProblems: { $addToSet: "$problemSlug" },
      },
    },
    {
      $project: {
        _id: 0,
        userId: "$_id",
        acceptedSubmissions: 1,
        problemsSolved: { $size: "$solvedProblems" },
      },
    },
    {
      $lookup: {
        from: User.collection.name,
        localField: "userId",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1 } }],
        as: "profile",
      },
    },
    {
      $unwind: {
        path: "$profile",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        userId: 1,
        problemsSolved: 1,
        acceptedSubmissions: 1,
        username: { $ifNull: ["$profile.name", "Coder"] },
      },
    },
    {
      $sort: {
        problemsSolved: -1,
        acceptedSubmissions: -1,
        username: 1,
        userId: 1,
      },
    },
    { $limit: limit },
  ]);

  return results.map((entry, index) => ({
    rank: index + 1,
    userId: String(entry.userId),
    username: entry.username,
    problemsSolved: entry.problemsSolved,
    acceptedSubmissions: entry.acceptedSubmissions,
  }));
}

// GET /api/leaderboard
router.get("/", async (req, res) => {
  try {
    const limit = getLimit(req.query.limit);
    const leaderboard = await getRankedLeaderboard(limit);

    return res.status(200).json({
      success: true,
      count: leaderboard.length,
      leaderboard,
    });
  } catch (error) {
    console.error("Leaderboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load leaderboard",
    });
  }
});

// GET /api/leaderboard/me
router.get("/me", protect, async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: "Please log in to view your statistics.",
      });
    }

    const objectUserId = new mongoose.Types.ObjectId(String(userId));

    // Count all attempts and accepted attempts for this user.
    const [stats] = await Submission.aggregate([
      { $match: { user: objectUserId } },
      {
        $group: {
          _id: "$user",
          totalSubmissions: { $sum: 1 },
          acceptedSubmissions: {
            $sum: {
              $cond: [{ $eq: ["$verdict", "Accepted"] }, 1, 0],
            },
          },
          solvedProblems: {
            $addToSet: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$verdict", "Accepted"] },
                    { $eq: [{ $type: "$problemSlug" }, "string"] },
                    { $ne: ["$problemSlug", ""] },
                  ],
                },
                "$problemSlug",
                null,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalSubmissions: 1,
          acceptedSubmissions: 1,

          solvedProblemSlugs: {
            $filter: {
              input: "$solvedProblems",
              as: "problem",
              cond: { $ne: ["$$problem", null] },
            },
          },

          problemsSolved: {
            $size: {
              $filter: {
                input: "$solvedProblems",
                as: "problem",
                cond: { $ne: ["$$problem", null] },
              },
            },
          },
        },
      },
    ]);

    const totalSubmissions = stats?.totalSubmissions || 0;
    const acceptedSubmissions = stats?.acceptedSubmissions || 0;
    const problemsSolved = stats?.problemsSolved || 0;

    const solvedProblemSlugs = stats?.solvedProblemSlugs || [];

    const acceptanceRate = totalSubmissions
      ? Number(((acceptedSubmissions / totalSubmissions) * 100).toFixed(1))
      : 0;

    // Rank against the entire leaderboard, not just the displayed page.
    const rankedUsers = await getRankedLeaderboard();

    const rankIndex = rankedUsers.findIndex(
      (entry) => entry.userId === String(objectUserId),
    );

    const me = await User.findById(objectUserId).select("name").lean();

    return res.status(200).json({
      success: true,
      stats: {
        rank: rankIndex === -1 ? null : rankIndex + 1,
        username: me?.name || "Coder",
        problemsSolved,
        solvedProblemSlugs,
        acceptedSubmissions,
        totalSubmissions,
        acceptanceRate,
      },
    });
  } catch (error) {
    console.error("Personal leaderboard stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load your coding statistics",
    });
  }
});

module.exports = router;
