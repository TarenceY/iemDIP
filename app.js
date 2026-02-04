console.log("Starting server...");
require("./database"); // connect to MongoDB

const express = require("express");
const mongoose = require("mongoose");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Backend is running!");
});

app.get("/health", (req, res) => {
  const state = mongoose.connection.readyState; // 0/1/2/3

  res.json({
    status: "ok",
    dbReadyState: state,
    db:
      state === 1 ? "connected"
      : state === 2 ? "connecting"
      : state === 0 ? "disconnected"
      : "disconnecting",
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));