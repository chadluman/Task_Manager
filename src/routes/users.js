const express = require("express");

const Team = require("../models/Team");
const User = require("../models/User");
const requireAuth = require("../middleware/auth");

const router = express.Router();

router.get("/teams", async (_request, response, next) => {
  try {
    const teams = await Team.find().sort({ name: 1 }).select("name slug");
    response.json({ teams });
  } catch (error) {
    next(error);
  }
});

router.get("/users", requireAuth, async (request, response, next) => {
  try {
    const users = await User.find({ team: request.user.team._id })
      .sort({ name: 1 })
      .populate("team", "name")
      .select("name email role team");
    response.json({ users });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
