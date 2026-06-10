require("dotenv").config({ quiet: true });

const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./src/routes/auth");
const taskRoutes = require("./src/routes/tasks");
const userRoutes = require("./src/routes/users");

const app = express();
const PORT = process.env.PORT || 5500;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin is not allowed."));
    },
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api", userRoutes);
app.use(express.static(__dirname));

app.use("/api", (_request, response) => {
  response.status(404).json({ message: "API route not found." });
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(error.status || 500).json({
    message: error.status ? error.message : "Something went wrong on the server.",
  });
});

async function start() {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    console.error("MONGODB_URI and JWT_SECRET must be set. Copy .env.example to .env.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  app.listen(PORT, () => {
    console.log(`Task Manager running at http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error("Unable to start Task Manager:", error.message);
  process.exit(1);
});
