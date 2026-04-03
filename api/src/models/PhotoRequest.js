const mongoose = require("mongoose");

/**
 * Represents a pending or completed Telegram photo upload request.
 *
 * Lifecycle:
 *   1. Webapp POSTs /telegram/request-photo → doc created with status "pending"
 *   2. Bot receives photo from user, POSTs /telegram/photo-upload → status → "completed"
 *   3. Webapp polls /telegram/photo-status/:requestId, gets photoUrl when done
 *
 * Expired requests (older than 10 min and still pending) should be ignored.
 */
const photoRequestSchema = new mongoose.Schema({
  requestId:        { type: String, required: true, unique: true },
  chatId:           { type: String, required: true },
  telegramUsername: { type: String },
  status:           { type: String, enum: ["pending", "completed", "expired"], default: "pending" },
  photoUrl:         { type: String },   // S3 URL or local API endpoint
  createdAt:        { type: Date, default: Date.now },
});

// Automatically expire documents after 10 minutes (MongoDB TTL index)
photoRequestSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });

module.exports = mongoose.model("PhotoRequest", photoRequestSchema);
