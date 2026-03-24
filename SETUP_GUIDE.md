# SeeFood – Local Setup & Usage Guide

This guide walks you through **installing**, **configuring**, and **using** the SeeFood webapp on your own machine from scratch.

---

## Table of Contents

1. [What You'll Need](#1-what-youll-need)
2. [Get Your API Keys](#2-get-your-api-keys)
3. [Clone & Install](#3-clone--install)
4. [Configure Environment Variables](#4-configure-environment-variables)
5. [Start Every Service](#5-start-every-service)
6. [Using the Webapp](#6-using-the-webapp)
7. [Using the Telegram Bot](#7-using-the-telegram-bot)
8. [The Analysis Feature (Step by Step)](#8-the-analysis-feature-step-by-step)
9. [ArUco Marker – Better Accuracy](#9-aruco-marker--better-accuracy)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. What You'll Need

| Tool | Minimum version | Where to get it |
|------|----------------|-----------------|
| **Node.js** | 18 | https://nodejs.org |
| **npm** | 9 (bundled with Node 18) | comes with Node.js |
| **Python** | 3.9 | https://www.python.org/downloads |
| **pip** | any recent version | comes with Python |
| **Git** | any | https://git-scm.com |
| **MongoDB Atlas** (free tier) | — | https://www.mongodb.com/atlas |
| **Telegram** account + phone | — | https://telegram.org |

> **Windows users**: all commands below work in PowerShell, Git Bash, or Command Prompt.
> **Mac/Linux users**: use your regular terminal.

---

## 2. Get Your API Keys

You need **two** external API keys before starting.

### 2a – Google Gemini API Key (for AI analysis)

1. Go to **https://aistudio.google.com/app/apikey** (free account is fine).
2. Click **Create API Key**.
3. Copy the key – you'll paste it into `ai/.env` in step 4.

### 2b – Telegram Bot Token (for the Telegram integration)

1. Open Telegram and search for **@BotFather**.
2. Start a chat and send `/newbot`.
3. Follow the prompts – choose any name and username (username must end in `bot`, e.g. `myseefood_bot`).
4. BotFather will give you a token like `123456789:ABCdefGHI...`.  Copy it.

### 2c – MongoDB Connection String

1. Sign up / log in at **https://cloud.mongodb.com**.
2. Create a free **M0** cluster (any region).
3. In the cluster, click **Connect → Connect your application**.
4. Copy the connection string – it looks like:
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=DIP
   ```
5. Replace `<user>` and `<password>` with your Atlas credentials.

---

## 3. Clone & Install

### Clone the repository

```bash
git clone https://github.com/TarenceY/iemDIP.git
cd iemDIP
```

### Install all Node dependencies

Open **three terminal tabs** and run:

```bash
# Tab 1 – React webapp (root)
npm install

# Tab 2 – Express API
cd api/src
npm install

# Tab 3 – Telegram bot
cd bot
npm install
```

### Install Python dependencies (AI server)

```bash
# Tab 4 – AI server
cd ai
pip install -r requirements.txt
```

> This downloads OpenCV, YOLOv8, the Gemini SDK, FastAPI, and other libraries.
> It may take 2–5 minutes on the first run.

---

## 4. Configure Environment Variables

Each service needs a `.env` file. **Never commit these files** – they contain secrets.

### 4a – Express API  (`api/src/.env`)

```bash
cp api/src/.env.example api/src/.env
```

Open `api/src/.env` and fill in:

```env
# Your MongoDB Atlas connection string (from step 2c)
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=DIP

# Port the API listens on – leave as 3000
PORT=3000

# Your Telegram bot token (from step 2b)
TELEGRAM_TOKEN=123456789:ABCdefGHI...

# URL of the Python AI server – leave as default
AI_API_URL=http://localhost:8000

# Public URL of this API (used to build photo URLs locally)
PUBLIC_API_URL=http://localhost:3000

# URL of the React frontend (for CORS).
# React dev server uses port 3001 when port 3000 is already taken by this API.
FRONTEND_URL=http://localhost:3001

# AWS S3 – leave blank to use local filesystem for photo storage
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
```

### 4b – Python AI server  (`ai/.env`)

```bash
cp ai/.env.example ai/.env
```

Open `ai/.env` and fill in:

```env
# Your Google Gemini API key (from step 2a)
GEMINI_API_KEY=AIza...

# Gemini model (leave as default – gemini-2.0-flash is fast and accurate)
GEMINI_MODEL=gemini-2.0-flash
```

### 4c – React webapp  (`.env.local` in root)

```bash
cp .env.example .env.local
```

The default value already works for local development:

```env
# URL of the Express API (no trailing slash)
REACT_APP_API_URL=http://localhost:3000
```

### 4d – Telegram bot  (`bot/.env`)

```bash
cp bot/.env.example bot/.env
```

Open `bot/.env` and fill in:

```env
# Same bot token as in api/src/.env
TELEGRAM_TOKEN=123456789:ABCdefGHI...

# URL of the Express API
API_URL=http://localhost:3000
```

---

## 5. Start Every Service

You need **four terminal windows** running at the same time.

> Start them **in this order** so the API is ready before the bot and webapp try to reach it.

### Terminal 1 – Express API (port 3000)

```bash
cd api/src
npm start
```

Expected output:
```
Starting server...
Server running on port 3000
```

Verify: open **http://localhost:3000/health** – you should see `{ "status": "ok", "mongoDB": "connected" }`.

---

### Terminal 2 – Python AI server (port 8000)

```bash
cd ai
python main.py server
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

Verify: open **http://localhost:8000/** – you should see `{ "status": "healthy" }`.

> **If you see import errors** – make sure you ran `pip install -r requirements.txt` inside the `ai/` folder.

---

### Terminal 3 – Telegram bot

```bash
cd bot
npm run dev
```

Expected output:
```
Telegram bot running. Send /start in Telegram.
```

---

### Terminal 4 – React webapp (port 3001)

```bash
# Run from the repo root
npm start
```

React automatically uses **port 3001** when 3000 is already taken by the API.

Expected output:
```
Compiled successfully!
Local: http://localhost:3001
```

Your browser should open automatically. If not, go to **http://localhost:3001**.

---

## 6. Using the Webapp

### Pages overview

| URL | Page | What it does |
|-----|------|--------------|
| `/` | Welcome | Landing / intro screen |
| `/signup` | Sign Up | Create a new account |
| `/login` | Log In | Log in with email & password |
| `/home` | Home | Dashboard links |
| `/dashboard` | Dashboard | Overview of your nutrition stats |
| `/scan-meal` | **Scan Meal** | Upload a photo and get AI nutrition analysis |
| `/scan-ingredients` | Scan Ingredients | Scan individual ingredients |
| `/history` | History | View past meal analyses |
| `/profile` | Profile | Your account details |
| `/profile/edit` | Edit Profile | Update your info |
| `/learn-ready` | Learn (Prepared food) | Nutrition education |
| `/learn-raw` | Learn (Raw ingredients) | Nutrition education |

### Create an account and log in

1. Go to **http://localhost:3001**.
2. Click **Sign Up** and fill in your details (email, username, password).
3. After signing up you are redirected to **Log In**.
4. Enter your email and password → you are taken to the **Home** page.

---

## 7. Using the Telegram Bot

### Link your Telegram account to your SeeFood profile

Before using the Telegram photo upload you need to link your accounts once:

1. Open Telegram and find the bot you created (`@<yourbotname>`).
2. Send `/start` to begin.
3. Send `/login`.
4. The bot will ask for your **SeeFood username** and **password** – enter them.
5. On success the bot replies `✅ Logged in as <username>`.  Your Telegram `chatId` is now stored in your account.

### Bot commands

| Command | What it does |
|---------|-------------|
| `/start` | Welcome message / shows login status |
| `/login` | Start the login flow |
| `/logout` | Sign out from the bot |

---

## 8. The Analysis Feature (Step by Step)

The **Scan Meal** page (`/scan-meal`) is the core feature.

### Option A – Upload a photo from your device

1. Navigate to **Scan Meal**.
2. Click **Choose file** and pick a photo of your meal.
3. A preview appears.
4. Click **Analyze**.
5. Within a few seconds the result panel shows:
   - **Meal name** (detected food items)
   - **Calories**
   - **Macros** (protein / carbs / fats in grams)
   - **Highlights** (e.g. "High protein", "Low calorie")
   - **Suggestions** (from Gemini's analysis notes)

### Option B – Send a photo via Telegram

1. On the **Scan Meal** page, find the **"Upload from Telegram"** section.
2. Type your **Telegram username** (with or without `@`).
3. Click **Request photo**.
   - The API sends you a Telegram message: *"📸 SeeFood Webapp is requesting a meal photo!"*
4. In Telegram, **send a photo** of your meal in reply.
   - The bot detects the request and forwards the photo to the API.
   - The photo is saved in `api/src/uploads/`.
   - The bot replies: *"✅ Photo uploaded! Switch back to the webapp to see it."*
5. The webapp polls automatically – the photo preview appears within ~2 seconds.
6. Click **Analyze** to run the AI analysis.

### What happens behind the scenes

```
Browser (React)
    │  POST /analyze  { image: "<base64>" }   ← or { requestId: "<uuid>" }
    ▼
Node.js API  (port 3000)
    │  POST /api/analyze  multipart/form-data
    ▼
Python AI Server  (port 8000)
    ├─ CV Layer   → ArUco marker detection + YOLOv8 food detection
    └─ Gemini     → Google Gemini vision model → structured nutrition JSON
    ▼
Node.js transforms response into  { name, calories, macros, highlights, suggestions }
    ▼
React renders the result panel
```

---

## 9. ArUco Marker – Better Accuracy

The CV layer can measure the **real-world size** of your food if a printed ArUco marker is visible in the photo.

### Generate a marker

```bash
cd ai
python main.py aruco --id 0 --output aruco_marker.png
```

This creates `aruco_marker.png`.

### Print and use it

1. Print the marker at exactly **5 cm × 5 cm**.
2. Place it **flat on the table next to your food** when photographing.
3. The AI will detect it, calculate the scale factor (pixels per cm), and use it to estimate portion sizes more accurately.

> Without the marker the system still works – it just estimates sizes from context rather than measuring.

---

## 10. Troubleshooting

### Service issues

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `http://localhost:3000/health` shows an error | API not running | Run `npm start` in `api/src/` |
| `mongoDB: "disconnected"` in health check | Wrong `MONGO_URI` or IP not whitelisted | Check `MONGO_URI` in `api/src/.env`; in MongoDB Atlas go to **Network Access → Add IP Address** and add your current IP (or `0.0.0.0/0` for development) |
| `http://localhost:8000/` not reachable | AI server not running | Run `python main.py server` in `ai/` |
| React webapp shows a blank page | Build error or wrong port | Check Terminal 4 output; go to `http://localhost:3001` |
| Bot not responding | Bot not running or wrong token | Check Terminal 3; verify `TELEGRAM_TOKEN` in `bot/.env` |

### Analysis issues

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| "AI analysis service is unavailable" (502) | Python AI server not running | `cd ai && python main.py server` |
| Calories show 0 | `GEMINI_API_KEY` missing or invalid | Add/correct the key in `ai/.env` |
| "Is the API running?" message on login | Express API not started | Ensure `npm start` is running in `api/src/` and check `http://localhost:3000/health` |
| Login blocked by CORS error (browser console) | `FRONTEND_URL` mismatch in `api/src/.env` | Set `FRONTEND_URL=http://localhost:3001` in `api/src/.env` (React dev server uses 3001 when 3000 is taken) |
| Analysis takes a long time | Large photo or slow internet | Use a smaller image; Gemini API can be slow on first call |
| YOLO detects nothing | Low-quality or blurry photo | Use a well-lit, top-down photo against a plain background |
| ArUco marker not detected | Marker too small or at an angle | Print at 5 cm × 5 cm; place flat and fully visible |

### Account / authentication issues

| Symptom | Fix |
|---------|-----|
| Login fails | Ensure API is running; check `REACT_APP_API_URL` in `.env.local` |
| "Telegram upload fails with 404" | Run `/login` in the bot first to link your `chatId` |
| Can't receive Telegram messages from bot | Make sure `TELEGRAM_TOKEN` is the same in both `api/src/.env` and `bot/.env` |
| Sign-up email already taken | Use a different email or check your MongoDB Atlas data via the Atlas UI |

### Environment variable checklist

Run through this list whenever something isn't working:

- [ ] `api/src/.env` exists and has `MONGO_URI`, `TELEGRAM_TOKEN`, `PORT=3000`, `FRONTEND_URL=http://localhost:3001`
- [ ] `ai/.env` exists and has `GEMINI_API_KEY`
- [ ] `.env.local` exists at repo root with `REACT_APP_API_URL=http://localhost:3000`
- [ ] `bot/.env` exists and has `TELEGRAM_TOKEN` and `API_URL=http://localhost:3000`
- [ ] All four services are running simultaneously
- [ ] MongoDB Atlas → Network Access allows your current IP (or `0.0.0.0/0` for development)

---

*For more technical detail on how the AI pipeline works, see [`ai/README.md`](ai/README.md).*
