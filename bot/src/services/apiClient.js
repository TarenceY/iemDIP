import axios from "axios";

// Download photo from Telegram and forward to your API
export async function sendPhotoToApi(bot, fileId, API_URL) {
  // 1) Get file path from Telegram
  const file = await bot.getFile(fileId); // { file_path: 'photos/file_123.jpg' }
  const fileUrl = `https://api.telegram.org/file/bot${"8421621532:AAGs1TrYzS6BqQSe4E_qnM8W64Pi7N-mnOU"}/${file.file_path}`;

  // 2) Fetch the image bytes
  const imageResp = await axios.get(fileUrl, { responseType: "arraybuffer" });
  const imageBuffer = Buffer.from(imageResp.data);

  // 3) Send to your backend API (replace endpoint with your design)
  const resp = await axios.post(`${API_URL}/analyze`, imageBuffer, {
    headers: { "Content-Type": "application/octet-stream" }
  });

  return resp.data;
}