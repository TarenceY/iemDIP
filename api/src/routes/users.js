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

router.post("/register", UsersController.register);
router.post("/login", loginLimiter, UsersController.login);
router.put("/profile/:id", UsersController.updateProfile);
router.get("/:id", UsersController.getUserInfo);

module.exports = router;
