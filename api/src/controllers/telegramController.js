const crypto = require("crypto");

let S3Client, PutObjectCommand;
try {
  const s3Module = require("@aws-sdk/client-s3");
  S3Client = s3Module.S3Client;
  PutObjectCommand = s3Module.PutObjectCommand;
} catch (_) {
  // S3 SDK not available – will use base64 fallback
}

// In-memory store: requestId -> { telegramUsername, status, imageUrl }
const pendingRequests = new Map();

// Track requests the bot has already been notified about
const notifiedRequests = new Set();

let s3Client = null;
function getS3Client() {
  if (!s3Client && S3Client && process.env.AWS_REGION && process.env.AWS_S3_BUCKET) {
    s3Client = new S3Client({ region: process.env.AWS_REGION });
  }
  return s3Client;
}

// POST /telegram/request-photo
// Body: { telegramUsername }
exports.requestPhoto = (req, res) => {
  const { telegramUsername } = req.body;
  if (!telegramUsername) {
    return res.status(400).json({ message: "telegramUsername is required" });
  }

  const username = telegramUsername.replace(/^@/, "").trim().toLowerCase();
  if (!username) {
    return res.status(400).json({ message: "Invalid telegramUsername" });
  }

  const requestId = crypto.randomUUID();
  pendingRequests.set(requestId, { telegramUsername: username, status: "pending" });

  res.status(201).json({ requestId });
};

// GET /telegram/pending-requests
// Returns requests not yet sent to the bot
exports.getPendingRequests = (req, res) => {
  const requests = [];
  for (const [requestId, data] of pendingRequests.entries()) {
    if (data.status === "pending" && !notifiedRequests.has(requestId)) {
      requests.push({ requestId, telegramUsername: data.telegramUsername });
    }
  }
  res.json({ requests });
};

// POST /telegram/mark-notified
// Body: { requestId }
exports.markNotified = (req, res) => {
  const { requestId } = req.body;
  if (requestId) notifiedRequests.add(requestId);
  res.json({ ok: true });
};

// POST /telegram/photo-upload?requestId=xxx
// Body: raw image bytes (application/octet-stream)
exports.uploadPhoto = async (req, res) => {
  const { requestId } = req.query;
  if (!requestId || !pendingRequests.has(requestId)) {
    return res.status(404).json({ message: "Request not found" });
  }

  const imageBuffer = req.body;
  let imageUrl;

  const s3 = getS3Client();
  if (s3 && process.env.AWS_S3_BUCKET) {
    try {
      const key = `telegram-photos/${requestId}-${Date.now()}.jpg`;
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key,
          Body: imageBuffer,
          ContentType: "image/jpeg",
        })
      );
      imageUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    } catch (err) {
      console.error("S3 upload failed:", err.message);
      return res.status(500).json({ message: "S3 upload failed" });
    }
  } else {
    // Fallback: encode as data URL (dev/demo mode)
    imageUrl = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;
  }

  const data = pendingRequests.get(requestId);
  data.status = "ready";
  data.imageUrl = imageUrl;

  res.json({ ok: true, imageUrl });
};

// GET /telegram/photo-status/:requestId
exports.getPhotoStatus = (req, res) => {
  const { requestId } = req.params;
  const data = pendingRequests.get(requestId);
  if (!data) {
    return res.status(404).json({ message: "Request not found" });
  }
  res.json({ status: data.status, imageUrl: data.imageUrl || null });
};
