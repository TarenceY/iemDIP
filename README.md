# SeeFood – AI Meal Nutrition Analyser

**SeeFood** is a full-stack web + Telegram bot application that lets users photograph their meals and receive AI-powered nutritional analysis.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend (webapp)** | React (Create React App) |
| **API Backend** | Node.js + Express + MongoDB (Mongoose) |
| **Telegram Bot** | Node.js (`node-telegram-bot-api`) |
| **AI Pipeline** | Python (FastAPI + YOLOv8 + Google Gemini) |
| **Photo Storage** | AWS S3 (or local filesystem fallback) |

## Project Structure

```
iemDIP/
├── src/              # React frontend (webapp)
├── api/src/          # Express REST API + MongoDB models
├── bot/src/          # Telegram bot
└── ai/               # Python AI pipeline (FastAPI + YOLOv8 + Gemini)
```

---

## Local Development Setup

You will need **three terminal windows** running simultaneously: the API server, the Telegram bot, and the React webapp.

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [Python](https://www.python.org/) 3.9+ (for the AI pipeline, optional for basic testing)
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster **or** a local MongoDB instance
- A Telegram account and phone with the Telegram app

---

### Step 1 – Create a Telegram Bot Token

1. Open Telegram, search for **@BotFather**, and start a chat.
2. Send `/newbot` and follow the prompts to pick a name and username.
3. Copy the **bot token** that BotFather gives you (format: `123456789:ABCdef...`).

---

### Step 2 – Configure Environment Variables

**API backend (`api/src/.env`)**

```bash
cp api/src/.env.example api/src/.env
```

Edit `api/src/.env`:

```env
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=DIP
PORT=3000
TELEGRAM_TOKEN=<your-bot-token>

# Optional – AWS S3 for photo storage (leave blank to use local filesystem)
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=

# Public URL of this API (used when building local photo URLs)
PUBLIC_API_URL=http://localhost:3000
```

**React webapp (`.env.local` in the repo root)**

```bash
cp .env.example .env.local
```

The default is already correct for local development:

```env
REACT_APP_API_URL=http://localhost:3000
```

**Telegram bot (`bot/.env`)**

```bash
cp bot/.env.example bot/.env
```

Edit `bot/.env`:

```env
TELEGRAM_TOKEN=<your-bot-token>
API_URL=http://localhost:3000
```

---

### Step 3 – Start the API Server

```bash
cd api/src
npm install
npm start          # or: node app.js
```

Open `http://localhost:3000/health` to verify the API is running and MongoDB is connected.

---

### Step 4 – Start the Telegram Bot

Open a **new terminal**:

```bash
cd bot
npm install
npm run dev
```

You should see:

```
Telegram bot running. Send /start in Telegram.
```

---

### Step 5 – Start the React Webapp

Open a **new terminal** in the repo root:

```bash
npm install
npm start
```

> React's dev server automatically uses port **3001** when port 3000 is already taken by the API.

Open `http://localhost:3001` in your browser.

---

## Testing the Full Flow

### A – Register & Log In via the Webapp

1. Browse to `http://localhost:3001`.
2. Click **Sign Up** and create an account (email, username, password, etc.).
3. After registration you are redirected to **Log In**.
4. Enter your email and password – on success the app stores your `userId` in `localStorage` and redirects to the Home page.

---

### B – Link Your Telegram Account

Before using the Telegram upload feature, your Telegram account must be linked to your SeeFood profile.

1. Open **Telegram** on your phone and find your bot (the username you chose in Step 1).
2. Send `/start`, then `/login`.
3. Enter your SeeFood username (or email) and password.
4. On success the bot stores your Telegram `chatId` against your account in MongoDB.

---

### C – Upload a Meal Photo via Telegram (New Flow)

1. Open the webapp and navigate to **Scan Meal**.
2. In the **"Upload from Telegram"** section, type your **Telegram username** (with or without the `@`).
3. Click **"Request photo"**.
   - The webapp calls the API, which sends you a Telegram message: *"📸 SeeFood Webapp is requesting a meal photo!"*
4. **Send a photo of your meal** in the Telegram chat.
   - The bot detects the pending request and forwards the photo to the API.
   - The photo is stored in `api/src/uploads/` (or AWS S3 if configured).
   - The bot replies: *"✅ Photo uploaded! Switch back to the webapp to see it."*
5. The webapp polls in the background and **automatically shows the photo** in the preview area within ~2 seconds.
6. Click **"Analyze"** to run the AI nutritional analysis.

---

### D – Upload a Meal Photo Directly from Your Device

1. On the **Scan Meal** page, use the **"Choose file"** button to pick a photo from your computer.
2. Click **"Analyze"**.
3. The result panel shows calories, macros, highlights, and suggestions.

---

## Available Telegram Bot Commands

| Command   | Description                          |
|-----------|--------------------------------------|
| `/start`  | Welcome message / check login status |
| `/login`  | Start the login flow                 |
| `/logout` | Sign out of your account             |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Missing TELEGRAM_TOKEN in .env` | Make sure `bot/.env` exists and contains your token from BotFather. |
| Bot is not responding | Ensure `npm run dev` is running in `bot/` and shows no errors. |
| Login fails on webapp | Check the API server is running at `http://localhost:3000` and `REACT_APP_API_URL` in `.env.local` is correct. |
| Webapp Analyze shows "Is the API running?" | Start the API server (`npm start` in `api/src/`) and verify `REACT_APP_API_URL=http://localhost:3000` in `.env.local`. |
| Telegram upload fails with 404 | Make sure you logged into the bot (`/login`) first so your chatId is linked to your account. |
| MongoDB connection error | Verify `MONGO_URI` in `api/src/.env` and that your Atlas cluster allows connections from your IP. |
| Photo not appearing in webapp | Check the `api/src/uploads/` directory exists and the API server has write permissions. |
