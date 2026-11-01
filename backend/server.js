
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const leaderboardRoutes = require("./routes/leaderboard");
const submissionRoutes = require("./routes/submissions");
const activityRoutes = require("./routes/activity");

const app = express();

app.use(cors());
app.use(express.json({ limit: "64kb" }));


app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "CodeArena API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

async function startServer() {
  await connectDB();

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`CodeArena API running on http://localhost:${PORT}`);
  });
}

startServer();
