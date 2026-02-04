const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true }, // match ERD name
    health_conditions: { type: String, default: "" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } } // match ERD created_at
);

module.exports = mongoose.model("users", userSchema);