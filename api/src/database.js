// database.js
require("dotenv").config({ quiet: true });  // must be first line
const mongoose = require("mongoose");

const uri = process.env.MONGO_URI;

if (!uri) {
  console.error("MONGO_URI is missing in .env");
  process.exit(1);
}

mongoose.connect(uri);

const db = mongoose.connection;

db.on("connected", () => console.log("MongoDB connected"));
db.on("error", (err) => console.error("MongoDB error:", err));
db.on("disconnected", () => console.log("MongoDB disconnected"));

module.exports = db;
