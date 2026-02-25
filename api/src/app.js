// app.js
require("dotenv").config();
console.log("Starting server...");

const express = require("express");
const cors = require("cors");
const app = express();

// Load MongoDB connection
const db = require("./database");

app.use(cors());
app.use(express.json());

const usersRoutes = require("./routes/users");
app.use("/users", usersRoutes);

const telegramRoutes = require("./routes/telegram");
app.use("/telegram", telegramRoutes);

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
