const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Team = require("../models/Team");
const User = require("../models/User");
const requireAuth = require("../middleware/auth");

const router = express.Router();

function teamSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    team: user.team,
  };
}

function issueToken(user) {
  return jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

router.post("/register", async (request, response, next) => {
  try {
    const { name, email, password, role = "member", teamName } = request.body;
    if (!name?.trim() || !email?.trim() || !teamName?.trim()) {
      return response.status(400).json({ message: "Name, email, and team are required." });
    }
    if (!password || password.length < 8) {
      return response.status(400).json({ message: "Password must be at least 8 characters." });
    }
    if (!["member", "team-lead", "manager"].includes(role)) {
      return response.status(400).json({ message: "Choose a valid role." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (await User.exists({ email: normalizedEmail })) {
      return response.status(409).json({ message: "An account already uses that email." });
    }

    const slug = teamSlug(teamName);
    if (!slug) {
      return response.status(400).json({ message: "Enter a valid team name." });
    }

    const team = await Team.findOneAndUpdate(
      { slug },
      { $setOnInsert: { name: teamName.trim(), slug } },
      { upsert: true, returnDocument: "after" },
    );
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role,
      team: team._id,
    });
    await user.populate("team", "name slug");

    response.status(201).json({ token: issueToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (request, response, next) => {
  try {
    const email = request.body.email?.trim().toLowerCase();
    const user = await User.findOne({ email }).select("+passwordHash").populate("team", "name slug");
    if (!user || !(await bcrypt.compare(request.body.password || "", user.passwordHash))) {
      return response.status(401).json({ message: "Email or password is incorrect." });
    }

    response.json({ token: issueToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, (request, response) => {
  response.json({ user: publicUser(request.user) });
});

module.exports = router;
