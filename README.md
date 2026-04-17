# SeeFood – AI Meal Nutrition Analyser

**SeeFood** is a full-stack web and Telegram bot application that lets users photograph their meals and receive AI-powered nutritional analysis. It combines computer vision (YOLOv8 + ArUco markers) with Google Gemini to detect food items, estimate portions, and break down calories and macros.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 (Create React App) |
| **API Backend** | Node.js + Express + MongoDB (Mongoose) |
| **Telegram Bot** | Node.js (`node-telegram-bot-api`) |
| **AI Pipeline** | Python — FastAPI + YOLOv8 + OpenCV + Google Gemini |
| **Photo Storage** | Local filesystem (`api/src/uploads/`) |

---

## Project Structure

```
iemDIP/
├── src/              # React frontend (webapp)
├── api/src/          # Express REST API + MongoDB models
├── bot/src/          # Telegram bot
├── ai/               # Python AI pipeline (FastAPI + YOLOv8 + Gemini)
└── config/           # Shared configuration (config.yaml)
```

---

## Prerequisites

- Node.js v18+
- Python 3.9+
- MongoDB Atlas cluster (or local MongoDB)
- Google Gemini API key — [get one here](https://aistudio.google.com/app/apikey)
- Telegram bot token — create one via [@BotFather](https://t.me/BotFather)

---

## Setup

### 1 – Create a Telegram Bot

1. Open Telegram and search for **@BotFather**.
2. Send `/newbot` and follow the prompts.
3. Copy the bot token (format: `123456789:ABCdef...`).

---

### 2 – Configure Environment Variables

**React webapp** (repo root):
```bash
cp .env.example .env.local
```
`.env.local`:
```env
REACT_APP_API_URL=http://localhost:3000
```

**API backend** — create `api/src/.env`:
```env
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=DIP
PORT=3000
TELEGRAM_TOKEN=<your-bot-token>
AI_API_URL=http://localhost:8000
PUBLIC_API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001
```

**AI pipeline** — create `ai/.env`:
```env
GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODEL=gemini-2.0-flash
```

**Telegram bot** — create `bot/.env`:
```env
TELEGRAM_TOKEN=<your-bot-token>
API_URL=http://localhost:3000
```

---

### 3 – Start All Services

Open four terminal windows:

```bash
# Terminal 1 – API server (port 3000)
cd api/src && npm install && npm start

# Terminal 2 – AI server (port 8000)
cd ai && pip install -r requirements.txt && python main.py server

# Terminal 3 – Telegram bot
cd bot && npm install && npm run dev

# Terminal 4 – React webapp (port 3001)
npm install && npm start
```

Verify:
- API: `http://localhost:3000/health`
- AI: `http://localhost:8000/`
- Webapp: `http://localhost:3001`

---

## Using the App

### Register & Log In
1. Go to `http://localhost:3001` and click **Sign Up**.
2. Fill in your details and log in.

### Link Your Telegram Account
1. Find your bot on Telegram and send `/start`, then `/login`.
2. Enter your SeeFood username and password.
3. Your Telegram account is now linked.

### Scan a Meal

**Option A – Direct upload:**
1. Go to **Scan Meal** and click **Choose file**.
2. Pick a photo and click **Analyze**.

**Option B – Telegram upload:**
1. On **Scan Meal**, enter your Telegram username and click **Request photo**.
2. Send a photo to your bot in Telegram.
3. The webapp picks it up automatically — click **Analyze**.

The result shows calories, macros (protein / carbs / fats), highlights, and suggestions.

---

## Telegram Bot Commands

| Command   | Description              |
|-----------|--------------------------|
| `/start`  | Welcome / check login    |
| `/login`  | Log in to your account   |
| `/logout` | Log out                  |

---

## How the AI Analysis Works

```
Browser (React)
    │  POST /analyze  { image: "<base64>" }
    ▼
Node.js API  (port 3000)
    │  POST /api/analyze  multipart/form-data
    ▼
Python AI Server  (port 8000)
    ├── CV Layer    → ArUco marker detection + YOLOv8 food detection
    └── Gemini Layer → Google Gemini vision → structured JSON
    ▼
Node.js transforms response → Browser renders result
```

1. **CV Layer** — YOLOv8 detects food items and bounding boxes. If an ArUco marker is present in the photo, it computes pixels-per-cm for accurate portion sizing.
2. **Gemini Layer** — The image and CV context are sent to Google Gemini, which returns food names, serving sizes, calories, and macros as structured JSON.
3. **Node.js** transforms the response into the shape the React frontend expects.

> **Tip:** Print a 5 cm ArUco marker and place it next to your food for more accurate portion estimates. Generate one with `python main.py aruco --id 0`.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "AI analysis service is unavailable" (502) | Start the AI server: `cd ai && python main.py server` |
| Calories show 0 | Add `GEMINI_API_KEY` to `ai/.env` |
| Login fails on webapp | Confirm API is running at port 3000 and `REACT_APP_API_URL` is set |
| Telegram upload fails with 404 | Log into the bot first with `/login` |
| MongoDB connection error | Check `MONGO_URI` in `api/src/.env` and Atlas IP whitelist |
| Photo not appearing after Telegram upload | Ensure `api/src/uploads/` exists and API has write permissions |
