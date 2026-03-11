// app.js
require("dotenv").config();
console.log("Starting server...");

const express = require("express");
const app = express();

// Load MongoDB connection
const db = require("./database");

// Allow cross-origin requests (e.g. React webapp on localhost:3000)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: "10mb" }));

// Routes
const usersRoutes = require("./routes/users");
app.use("/users", usersRoutes);

const recipesRoutes = require("./routes/recipes");
app.use("/recipes", recipesRoutes);

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

module.exports = app;
