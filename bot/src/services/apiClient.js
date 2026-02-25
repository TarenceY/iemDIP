import axios from "axios";

// Download photo from Telegram and forward to your API
export async function sendPhotoToApi(bot, fileId, API_URL) {
  // 1) Get file path from Telegram
  const file = await bot.getFile(fileId); // { file_path: 'photos/file_123.jpg' }
  const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${file.file_path}`;

  // 2) Fetch the image bytes
  const imageResp = await axios.get(fileUrl, { responseType: "arraybuffer" });
  const imageBuffer = Buffer.from(imageResp.data);

  // 3) Send to your backend API (replace endpoint with your design)
  const resp = await axios.post(`${API_URL}/analyze`, imageBuffer, {
    headers: { "Content-Type": "application/octet-stream" }
  });

  return resp.data;
}

// Fetch pending photo requests from the API (for bot polling)
export async function getPendingRequests(API_URL) {
  const resp = await axios.get(`${API_URL}/telegram/pending-requests`);
  return resp.data.requests || [];
}

// Mark a request as notified so the API won't return it again
export async function markNotified(requestId, API_URL) {
  await axios.post(`${API_URL}/telegram/mark-notified`, { requestId });
}

// Download photo from Telegram and upload raw bytes to the API for S3 storage
export async function uploadPhotoToApi(bot, fileId, requestId, API_URL) {
  // 1) Get file path from Telegram
  const file = await bot.getFile(fileId);
  const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${file.file_path}`;

  // 2) Fetch the image bytes
  const imageResp = await axios.get(fileUrl, { responseType: "arraybuffer" });
  const imageBuffer = Buffer.from(imageResp.data);

  // 3) Upload to API which stores it in S3 (or base64 fallback)
  const resp = await axios.post(
    `${API_URL}/telegram/photo-upload?requestId=${encodeURIComponent(requestId)}`,
    imageBuffer,
    { headers: { "Content-Type": "application/octet-stream" } }
  );

  return resp.data;
}