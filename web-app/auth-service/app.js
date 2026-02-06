// app.js
console.log("Starting server...");

const express = require("express");
const app = express();

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
