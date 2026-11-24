const mongoose = require("mongoose");

const learningProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    activePathSlug: {
      type: String,
      default: null,
    },
    activeTopicSlug: {
      type: String,
      default: null,
    },
    activeProblemSlug: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("LearningProgress", learningProgressSchema);
