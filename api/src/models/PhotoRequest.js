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
  expiresAt:        { type: Date, default: () => new Date(Date.now() + 10 * 60 * 1000) },
});

function getPendingExpiryDate() {
  return new Date(Date.now() + 10 * 60 * 1000);
}

photoRequestSchema.pre("save", function(next) {
  if (this.status === "pending") {
    this.expiresAt = this.expiresAt || getPendingExpiryDate();
  } else {
    this.expiresAt = undefined;
  }

  next();
});

function syncExpiresAtOnUpdate(next) {
  const update = this.getUpdate() || {};
  const nextStatus = update.status || (update.$set && update.$set.status);

  if (!nextStatus) {
    return next();
  }

  if (!update.$set) {
    update.$set = {};
  }

  if (nextStatus === "pending") {
    update.$set.expiresAt = update.$set.expiresAt || getPendingExpiryDate();
  } else {
    update.$unset = { ...(update.$unset || {}), expiresAt: 1 };
    delete update.$set.expiresAt;
  }

  this.setUpdate(update);
  next();
}

photoRequestSchema.pre("findOneAndUpdate", syncExpiresAtOnUpdate);
photoRequestSchema.pre("updateOne", syncExpiresAtOnUpdate);
photoRequestSchema.pre("updateMany", syncExpiresAtOnUpdate);

// Automatically expire only pending documents when their per-document expiry time is reached.
photoRequestSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { status: "pending" } }
);
module.exports = mongoose.model("PhotoRequest", photoRequestSchema);
