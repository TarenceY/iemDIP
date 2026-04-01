const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const telegramController = require("../controllers/telegramController");

// Limit photo requests to prevent abuse (5 per minute per IP)
const requestPhotoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { message: "Too many photo requests. Please wait a minute and try again." },
});

// Limit polling to avoid hammering the database
const pollLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120, // ~2 polls/second for up to 1 minute
  message: { message: "Too many status requests. Please slow down." },
});

// Limit bot photo uploads (one per pending request, capped conservatively)
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { message: "Too many upload requests." },
});

// Webapp requests a photo upload via Telegram
// Body: { telegramUsername: string }
router.post("/request-photo", requestPhotoLimiter, telegramController.requestPhoto);

// Bot checks whether the webapp is currently waiting for a photo from this chatId
// Query: ?chatId=<chatId>
// NOTE: this must be defined BEFORE /photo-status/:requestId to avoid route conflict
router.get("/photo-status/pending-check", pollLimiter, telegramController.checkPendingForChat);

// Webapp polls for photo status
// Returns: { status: "pending" | "completed", photoUrl: string | null }
router.get("/photo-status/:requestId", pollLimiter, telegramController.getPhotoStatus);

// Telegram bot uploads the photo (application/octet-stream + X-Chat-Id header)
router.post("/photo-upload", uploadLimiter, telegramController.photoUpload);

// Serve locally stored photos (fallback when AWS S3 is not configured)
router.get("/photo/:requestId/image", pollLimiter, telegramController.serveLocalPhoto);

module.exports = router;
