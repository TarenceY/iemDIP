const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const UsersController = require("../controllers/usersController");

// Limit repeated login attempts to prevent brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: "Too many login attempts. Please try again in 15 minutes." }
});

// General limiter for other user endpoints
const userLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { message: "Too many requests. Please try again shortly." },
});

router.post("/register", userLimiter, UsersController.register);
router.post("/login", loginLimiter, UsersController.login);
router.put("/profile/:id", userLimiter, UsersController.updateProfile);
router.get("/:id", userLimiter, UsersController.getUserInfo);

module.exports = router;
