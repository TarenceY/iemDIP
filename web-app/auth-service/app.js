// app.js
require('dotenv').config();
console.log("Starting server...");

const express = require("express");
const app = express();
const User = require("./models/User"); // This connects your data structure

// Load MongoDB connection
const db = require("./database");

app.use(express.json());

const PORT = process.env.PORT || 3000;

// Test route
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// Health check
app.get("/health", (req, res) => {
  const mongoStatus = db.readyState === 1 ? "connected" : "disconnected";

  res.json({
    status: "ok",
    mongoDB: mongoStatus,
    timestamp: new Date(),
  });
});

// This is the actual "work" the backend does for Milestone 1
app.post("/api/profile", async (req, res) => {
  try {
    const profile = await User.findOneAndUpdate(
      { username: "demo_user" }, // As per charter 2.1
      req.body, 
      { upsert: true, new: true } 
    );
    res.status(200).json({ message: "Profile Saved!", profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
