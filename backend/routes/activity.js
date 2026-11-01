
const express = require("express");
const mongoose = require("mongoose");

const { protect } = require("../middleware/auth");
const Submission = require("../models/Submission");

const router = express.Router();

const DEFAULT_TIMEZONE = "Asia/Kolkata";
const CALENDAR_DAYS = 365;

// Get YYYY-MM-DD in the requested timezone.
function getTodayKey(timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = {};

  for (const part of parts) {
    values[part.type] = part.value;
  }

  return `${values.year}-${values.month}-${values.day}`;
}

// Shift a YYYY-MM-DD date by a number of calendar days.
function shiftDateKey(dateKey, amount) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);

  date.setUTCDate(date.getUTCDate() + amount);

  return date.toISOString().slice(0, 10);
}

// GET /api/activity/me
router.get("/me", protect, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: "Please log in to view your coding activity.",
      });
    }

    // Allow a custom timezone, defaulting to India.
    const timeZone =
      req.query.timezone || DEFAULT_TIMEZONE;

    // Validate timezone.
    try {
      new Intl.DateTimeFormat("en-US", {
        timeZone,
      });
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid timezone.",
      });
    }

    const today = getTodayKey(timeZone);
    const yesterday = shiftDateKey(today, -1);
    const startDate = shiftDateKey(
      today,
      -(CALENDAR_DAYS - 1)
    );

    const objectUserId = new mongoose.Types.ObjectId(
      String(userId)
    );

    // Count submissions grouped by calendar date.
    const dailyResults = await Submission.aggregate([
      {
        $match: {
          user: objectUserId,
          createdAt: { $lte: new Date() },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: timeZone,
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Convert aggregation results into a date -> count map.
    const activityMap = new Map(
      dailyResults.map((item) => [
        item._id,
        item.count,
      ])
    );

    // Calculate total submissions and active days.
    const totalSubmissions = dailyResults.reduce(
      (sum, item) => sum + item.count,
      0
    );

    const totalActiveDays = dailyResults.length;

    // Calculate longest streak across all recorded history.
    let longestStreak = 0;
    let runningStreak = 0;
    let previousDate = null;

    for (const item of dailyResults) {
      if (
        previousDate &&
        shiftDateKey(previousDate, 1) === item._id
      ) {
        runningStreak += 1;
      } else {
        runningStreak = 1;
      }

      longestStreak = Math.max(
        longestStreak,
        runningStreak
      );

      previousDate = item._id;
    }

    // Current streak can start today or yesterday.
    let currentStreak = 0;

    let streakDate = activityMap.has(today)
      ? today
      : activityMap.has(yesterday)
        ? yesterday
        : null;

    while (
      streakDate &&
      activityMap.has(streakDate)
    ) {
      currentStreak += 1;
      streakDate = shiftDateKey(streakDate, -1);
    }

    // Generate all 365 calendar dates, including zero-activity days.
    const dailyActivity = [];

    for (let i = 0; i < CALENDAR_DAYS; i++) {
      const date = shiftDateKey(
        startDate,
        i
      );

      dailyActivity.push({
        date,
        count: activityMap.get(date) || 0,
      });
    }

    return res.status(200).json({
      success: true,
      activity: {
        currentStreak,
        longestStreak,
        totalActiveDays,
        totalSubmissions,
        timezone: timeZone,
        startDate,
        endDate: today,
        dailyActivity,
      },
    });
  } catch (error) {
    console.error("Activity calendar error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load coding activity.",
    });
  }
});

module.exports = router;
