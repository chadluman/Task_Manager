const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function requireAuth(request, response, next) {
  try {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) {
      return response.status(401).json({ message: "Sign in to continue." });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId).populate("team", "name slug");
    if (!user) {
      return response.status(401).json({ message: "Your session is no longer valid." });
    }

    request.user = user;
    next();
  } catch {
    response.status(401).json({ message: "Your session has expired. Please sign in again." });
  }
}

module.exports = requireAuth;
