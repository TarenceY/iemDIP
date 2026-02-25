const express = require("express");
const router = express.Router();
const TelegramController = require("../controllers/telegramController");

// Frontend: request a photo via Telegram
router.post("/request-photo", TelegramController.requestPhoto);

// Bot: get pending photo requests (not yet delivered to the bot)
router.get("/pending-requests", TelegramController.getPendingRequests);

// Bot: mark a request as notified (so it is not re-delivered)
router.post("/mark-notified", TelegramController.markNotified);

// Bot: upload the photo as raw bytes
router.post(
  "/photo-upload",
  express.raw({ type: "application/octet-stream", limit: "10mb" }),
  TelegramController.uploadPhoto
);

// Frontend: poll for photo status
router.get("/photo-status/:requestId", TelegramController.getPhotoStatus);

module.exports = router;
