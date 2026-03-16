const https = require("https");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const User = require("../models/User");
const PhotoRequest = require("../models/PhotoRequest");

// ---------------------------------------------------------------------------
// S3 helper (only imported when AWS credentials are configured)
// ---------------------------------------------------------------------------
async function uploadToS3(imageBuffer, requestId) {
  const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

  const region = process.env.AWS_REGION || "ap-southeast-1";
  const bucket = process.env.AWS_S3_BUCKET;

  const client = new S3Client({ region });
  const key = `meal-photos/${requestId}.jpg`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: imageBuffer,
      ContentType: "image/jpeg",
    })
  );

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

// ---------------------------------------------------------------------------
// Local filesystem fallback (when AWS_S3_BUCKET is not set)
// ---------------------------------------------------------------------------
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function storeLocally(imageBuffer, requestId) {
  ensureUploadsDir();
  const filePath = path.join(UPLOADS_DIR, `${requestId}.jpg`);
  fs.writeFileSync(filePath, imageBuffer);
  // The URL is a relative API path; the webapp resolves it against API_URL
  const apiUrl = process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 3000}`;
  return `${apiUrl}/telegram/photo/${requestId}/image`;
}

// ---------------------------------------------------------------------------
// Send a Telegram message via the Bot API
// ---------------------------------------------------------------------------
function sendTelegramMessage(chatId, text) {
  return new Promise((resolve, reject) => {
    const token = process.env.TELEGRAM_TOKEN;
    if (!token) return reject(new Error("TELEGRAM_TOKEN not set"));

    const payload = JSON.stringify({ chat_id: chatId, text });
    const options = {
      hostname: "api.telegram.org",
      path: `/bot${token}/sendMessage`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.ok) resolve(parsed);
          else reject(new Error(parsed.description || "Telegram API error"));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// POST /telegram/request-photo
// Body: { telegramUsername: string }
// ---------------------------------------------------------------------------
exports.requestPhoto = async (req, res) => {
  try {
    const { telegramUsername } = req.body || {};
    if (!telegramUsername) {
      return res.status(400).json({ message: "telegramUsername is required" });
    }

    // Strip leading "@" if the user typed it
    const username = telegramUsername.replace(/^@/, "").trim();
    if (!username) {
      return res.status(400).json({ message: "Invalid Telegram username" });
    }

    // Look up the user's Telegram chat ID from their profile
    const user = await User.findOne({ telegramUsername: username }).select("telegramChatId telegramUsername");
    if (!user || !user.telegramChatId) {
      return res.status(404).json({
        message:
          `Telegram user "@${username}" not found. ` +
          "Please open the SeeFood bot on Telegram and log in with /login first.",
      });
    }

    const chatId = user.telegramChatId;

    // Create a photo request record
    const requestId = crypto.randomUUID();
    await PhotoRequest.create({ requestId, chatId, telegramUsername: username });

    // Prompt the user via Telegram
    await sendTelegramMessage(
      chatId,
      "📸 *SeeFood Webapp* is requesting a meal photo!\n\nPlease send a photo of your meal now and it will appear on the webapp.",
    );

    res.json({ requestId });
  } catch (err) {
    console.error("requestPhoto error:", err);
    res.status(500).json({ message: err.message || "Internal server error" });
  }
};

// ---------------------------------------------------------------------------
// GET /telegram/photo-status/pending-check?chatId=<chatId>
// Called by the Telegram bot to see if the webapp is waiting for a photo.
// ---------------------------------------------------------------------------
exports.checkPendingForChat = async (req, res) => {
  try {
    const { chatId } = req.query;
    if (!chatId) {
      return res.status(400).json({ message: "chatId query parameter is required" });
    }

    const pending = await PhotoRequest.findOne({ chatId, status: "pending" }).sort({ createdAt: -1 });
    res.json({ hasPending: !!pending });
  } catch (err) {
    console.error("checkPendingForChat error:", err);
    res.status(500).json({ message: err.message || "Internal server error" });
  }
};

// ---------------------------------------------------------------------------
// GET /telegram/photo-status/:requestId
// Webapp polls this endpoint until status === "completed"
// ---------------------------------------------------------------------------
exports.getPhotoStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const doc = await PhotoRequest.findOne({ requestId });

    if (!doc) {
      return res.status(404).json({ message: "Photo request not found or expired" });
    }

    res.json({ status: doc.status, photoUrl: doc.photoUrl || null });
  } catch (err) {
    console.error("getPhotoStatus error:", err);
    res.status(500).json({ message: err.message || "Internal server error" });
  }
};

// ---------------------------------------------------------------------------
// POST /telegram/photo-upload
// Called by the Telegram bot with raw image bytes.
// Header: X-Chat-Id: <chatId>
// Body:   application/octet-stream (image bytes)
// ---------------------------------------------------------------------------
exports.photoUpload = async (req, res) => {
  try {
    const chatId = req.headers["x-chat-id"];
    if (!chatId) {
      return res.status(400).json({ message: "Missing X-Chat-Id header" });
    }

    const imageBuffer = req.body; // populated by express.raw()
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
      return res.status(400).json({ message: "Missing or empty image body" });
    }

    // Find the most recent pending request for this chat
    const pending = await PhotoRequest.findOne({ chatId, status: "pending" }).sort({ createdAt: -1 });
    if (!pending) {
      return res.status(404).json({ message: "No pending photo request for this Telegram chat" });
    }

    // Upload to S3 or fall back to local filesystem
    let photoUrl;
    if (process.env.AWS_S3_BUCKET) {
      photoUrl = await uploadToS3(imageBuffer, pending.requestId);
    } else {
      photoUrl = storeLocally(imageBuffer, pending.requestId);
    }

    pending.status = "completed";
    pending.photoUrl = photoUrl;
    await pending.save();

    res.json({ message: "Photo uploaded successfully", photoUrl });
  } catch (err) {
    console.error("photoUpload error:", err);
    res.status(500).json({ message: err.message || "Internal server error" });
  }
};

// ---------------------------------------------------------------------------
// GET /telegram/photo/:requestId/image
// Serve locally stored images (fallback when AWS S3 is not configured)
// ---------------------------------------------------------------------------
exports.serveLocalPhoto = async (req, res) => {
  const { requestId } = req.params;
  // Sanitise requestId to prevent path traversal
  if (!/^[0-9a-fA-F-]{36}$/i.test(requestId)) {
    return res.status(400).json({ message: "Invalid requestId" });
  }

  // Confirm the request exists and is completed in the database
  const doc = await PhotoRequest.findOne({ requestId, status: "completed" }).catch(() => null);
  if (!doc) {
    return res.status(404).json({ message: "Photo not found or not yet available" });
  }

  const filePath = path.join(UPLOADS_DIR, `${requestId}.jpg`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "Image file not found on server" });
  }

  res.setHeader("Content-Type", "image/jpeg");
  fs.createReadStream(filePath).pipe(res);
};
