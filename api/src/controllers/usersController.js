const User = require("../models/User");
const bcrypt = require("bcrypt");

exports.register = async (req, res) => {
  try {
    const { username, email, password, age, gender, restrictions, dislikes, goals } = req.body;

    // Normalise email and username to avoid duplicates caused by case differences
    const normalisedEmail = typeof email === "string" ? email.trim().toLowerCase() : email;
    const normalisedUsername = typeof username === "string" ? username.trim() : username;

    // Check if email already exists
    const existingUser = await User.findOne({ email: normalisedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username: normalisedUsername });
    if (existingUsername) {
      return res.status(400).json({ message: "Username already taken" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = new User({
      username: normalisedUsername,
      email: normalisedEmail,
      password_hash,
      age,
      gender,
      restrictions,
      dislikes,
      goals
    });
    await user.save();

    res.status(201).json({
      message: "User registered successfully",
      userId: user._id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Allow login by username or email (normalise for consistent lookup)
    let user;
    if (email) {
      user = await User.findOne({ email: email.trim().toLowerCase() });
    } else if (username) {
      user = await User.findOne({ username: username.trim() });
    } else {
      return res.status(400).json({ message: "Username or email is required" });
    }

    if (!user) return res.status(404).json({ message: "User not found" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ message: "Invalid password" });

    res.json({ message: "Login successful", userId: user._id, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { age, gender, restrictions, dislikes, goals, telegramChatId, telegramUsername } = req.body;
    const userId = req.params.id;

    // Only include fields that were explicitly provided to avoid overwriting
    // existing profile data with undefined/null when only telegram fields are sent.
    const updates = {};
    if (age !== undefined) updates.age = age;
    if (gender !== undefined) updates.gender = gender;
    if (restrictions !== undefined) updates.restrictions = restrictions;
    if (dislikes !== undefined) updates.dislikes = dislikes;
    if (goals !== undefined) updates.goals = goals;
    if (telegramChatId !== undefined) updates.telegramChatId = telegramChatId;
    if (telegramUsername !== undefined) updates.telegramUsername = telegramUsername;

    const user = await User.findByIdAndUpdate(userId, updates, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Profile updated", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUserInfo = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password_hash");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.params.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(400).json({ message: "Current password is incorrect" });

    user.password_hash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.params.id;

    if (!password) {
      return res.status(400).json({ message: "Password is required to delete account" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ message: "Incorrect password" });

    await User.findByIdAndDelete(userId);
    res.json({ message: "Account deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
