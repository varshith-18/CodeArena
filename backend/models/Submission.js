const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    problemSlug: {
      type: String,
      required: true,
      index: true,
    },

    sourceCode: {
      type: String,
      required: true,
    },

    verdict: {
      type: String,
      enum: [
        "Pending",
        "Accepted",
        "Wrong Answer",
        "Runtime Error",
        "Runtime Error (NZEC)",
        "Compilation Error",
        "Time Limit Exceeded",
        "Memory Limit Exceeded",
        "Internal Error",
        "Error",
      ],
      required: true,
    },

    passed: {
      type: Number,
      required: true,
      min: 0,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    results: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    time: {
      type: Number,
      default: 0,
    },

    memory: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

submissionSchema.index({ user: 1, problemSlug: 1, createdAt: -1 });

module.exports = mongoose.model("Submission", submissionSchema);
