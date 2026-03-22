# SeeFood – AI Meal Nutrition Analyser

**SeeFood** is a full-stack web + Telegram bot application that lets users photograph their meals and receive AI-powered nutritional analysis.

> 📖 **New to the project?** See the **[Setup & Usage Guide (SETUP_GUIDE.md)](SETUP_GUIDE.md)** for a step-by-step walkthrough from installation to your first meal analysis.

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

### Step 3b – Start the AI Analysis Server (Python)

The AI server powers the nutritional analysis. Open a **new terminal**:

```bash
cd ai

# First-time setup – install Python dependencies
pip install -r requirements.txt

# Configure the Gemini API key
cp .env.example .env
# Edit .env and set GEMINI_API_KEY=<your key from https://aistudio.google.com/app/apikey>

# Start the FastAPI server on port 8000
python main.py server
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

Verify it is running: `curl http://localhost:8000/`

> **Note:** The AI server is optional during development — if it is not running the Node.js API will return a 502 error when you click **Analyze**. Make sure `GEMINI_API_KEY` is set in `ai/.env` before starting.

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

## How the AI Analysis Works – Guidebook

This section traces the full journey of a meal photo from the browser through to a nutritional result, so you can understand (and debug) every step.

### Overview

```
Browser (React)
    │  POST /analyze  { image: "<base64>" }
    ▼
Node.js API  (api/src/app.js  – port 3000)
    │  POST /api/analyze  multipart/form-data
    ▼
Python AI Server  (ai/  – port 8000)
    ├─ CV Layer   → ArUco marker detection + YOLOv8 food detection
    └─ Gemini Layer → Google Gemini vision model → structured JSON
    │
    ▼  { nutrition: { food_items, totals, analysis_notes }, cv_analysis: … }
    │
Node.js API transforms the response into frontend-friendly shape
    │
    ▼
Browser renders calories, macros, highlights, suggestions
```

### Step-by-step Walkthrough

#### 1 – User picks or receives a photo (React – `src/pages/ScanMeal.js`)

| Upload method | What happens |
|---|---|
| **Choose file** | File is read with `FileReader`, converted to a Base64 string |
| **Telegram upload** | Webapp calls `POST /telegram/request-photo`; bot prompts user; photo is stored in `api/src/uploads/` (or S3); webapp polls `GET /telegram/photo-status/:requestId` every 2 s |

#### 2 – Analyze button clicked (`analyze()` in `ScanMeal.js`)

The webapp calls:
```
POST http://localhost:3000/analyze
Content-Type: application/json

{ "image": "<base64>", "userId": "..." }        ← direct upload
   OR
{ "requestId": "<uuid>", "userId": "..." }      ← Telegram upload
```

#### 3 – Node.js API receives the request (`/analyze` in `api/src/app.js`)

1. Decodes the Base64 string to a raw `Buffer` (or fetches the stored Telegram photo).
2. Builds a `multipart/form-data` request and calls:
   ```
   POST http://localhost:8000/api/analyze
   form field: image = <raw bytes>
   ```
3. If the AI server is unreachable → responds `502 AI analysis service is unavailable`.

#### 4 – Python AI server processes the image (`ai/src/api/routes.py`)

The FastAPI handler saves the upload to a temp file and calls `FoodNutritionPipeline.analyze()`.

#### 5 – Computer Vision layer (`ai/src/cv_layer/`)

| Module | What it does |
|---|---|
| `aruco_detector.py` | Detects a printed ArUco marker in the photo. If found, computes **pixels-per-cm** for real-world size estimation. |
| `food_detector.py` | Runs **YOLOv8** (`yolov8n.pt`) to locate food items and their bounding boxes. |
| `cv_pipeline.py` | Orchestrates the two steps above and returns a `cv_data` dict. |

Example `cv_data`:
```json
{
  "has_scale_reference": false,
  "pixels_per_cm": null,
  "food_items": [
    { "name": "apple", "confidence": 0.91, "bbox": { "x1": 40, "y1": 60, "x2": 180, "y2": 210 } }
  ]
}
```

#### 6 – Gemini layer (`ai/src/gemini_layer/gemini_client.py`)

1. Builds a structured prompt that includes the `cv_data` as context.
2. Sends the **original image** + the prompt to **Google Gemini** (`gemini-2.0-flash` by default, configurable via `GEMINI_MODEL` in `ai/.env`).
3. Gemini returns a JSON block with `food_items`, `totals`, and `analysis_notes`.
4. The client parses and validates the response, with a graceful fallback when the API is unreachable.

#### 7 – Python response travels back to Node.js

```json
{
  "nutrition": {
    "food_items": [
      {
        "food_name": "Red Apple",
        "serving_size": "1 medium apple (182 g)",
        "calories": 95,
        "protein_g": 0.5,
        "carbohydrates_g": 25,
        "fat_g": 0.3,
        "fiber_g": 4.4,
        "sugar_g": 19,
        "confidence": "high"
      }
    ],
    "totals": { "calories": 95, "protein_g": 0.5, "carbohydrates_g": 25, "fat_g": 0.3 },
    "analysis_notes": "This is a healthy, low-calorie snack rich in dietary fibre…"
  },
  "cv_analysis": { "has_scale_reference": false, "pixels_per_cm": null, "food_items": […] }
}
```

#### 8 – Node.js transforms the response (`transformAIResponse()` in `app.js`)

Maps the Python response to the shape expected by the React frontend:
```json
{
  "name": "Red Apple",
  "calories": 95,
  "macros": { "protein": 1, "carbs": 25, "fats": 0 },
  "highlights": ["Low fat", "Low calorie"],
  "suggestions": ["This is a healthy, low-calorie snack rich in dietary fibre"]
}
```

#### 9 – React renders the result (`ScanMeal.js`)

The result panel displays the meal name, calorie count, macro grid (protein / carbs / fats), highlight chips, and suggestions.

### Quick Steps to Reach the Analysis Part

1. Start all four services (API, AI server, Telegram bot, React webapp — see setup steps above).
2. Open `http://localhost:3001` and log in.
3. Navigate to **Scan Meal** (`http://localhost:3001/scan-meal`).
4. Upload a meal photo (choose file **or** use the Telegram upload flow).
5. Click **Analyze** — the result appears within a few seconds.

### Troubleshooting the AI Analysis

| Symptom | Likely cause | Fix |
|---|---|---|
| "AI analysis service is unavailable" (502) | Python AI server not running | `cd ai && python main.py server` |
| Calories show 0 / "AI analysis currently unavailable" | `GEMINI_API_KEY` missing | Add key to `ai/.env` |
| Analysis is slow | Large image / slow network | Use a smaller photo or wait |
| YOLO finds no food items | Low-quality or blurry photo | Use a well-lit, top-down photo |
| ArUco marker not detected | No marker in photo, or too small | Place a printed 5 cm ArUco marker next to the food |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Missing TELEGRAM_TOKEN in .env` | Make sure `bot/.env` exists and contains your token from BotFather. |
| Bot is not responding | Ensure `npm run dev` is running in `bot/` and shows no errors. |
| Login fails on webapp | Check the API server is running at `http://localhost:3000` and `REACT_APP_API_URL` in `.env.local` is correct. |
| Webapp Analyze shows "Is the API running?" | Start the API server (`npm start` in `api/src/`) and verify `REACT_APP_API_URL=http://localhost:3000` in `.env.local`. |
| Webapp Analyze shows "AI analysis service is unavailable" | Start the Python AI server (`cd ai && python main.py server`) on port 8000. |
| Nutrition values all show 0 | Ensure `GEMINI_API_KEY` is set in `ai/.env` and the `google-generativeai` package is installed. |
| Telegram upload fails with 404 | Make sure you logged into the bot (`/login`) first so your chatId is linked to your account. |
| MongoDB connection error | Verify `MONGO_URI` in `api/src/.env` and that your Atlas cluster allows connections from your IP. |
| Photo not appearing in webapp | Check the `api/src/uploads/` directory exists and the API server has write permissions. |
