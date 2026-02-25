# iemDIP – SeeFood: Meal Analysis App

SeeFood is an AI-powered web app and Telegram bot that helps you understand what you eat and plan meals using ingredients you already have.

---

## Project Structure

```
iemDIP/
├── src/          # React web frontend
├── bot/          # Telegram bot (Node.js, ESM)
└── api/src/      # REST API backend (Express + MongoDB)
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (or local MongoDB instance) — required only for the API backend
- A Telegram account — required only for the bot and Telegram photo-upload feature

---

## 1 – Test the Website (React Frontend)

This is the quickest way to explore SeeFood without any backend setup.

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm start
```

The app opens automatically at **[http://localhost:3000](http://localhost:3000)** (or `http://localhost:3001` if port 3000 is already in use by the API server).

### Log in with the demo account

On the **Login** page, use the pre-set demo credentials:

| Field    | Value               |
|----------|---------------------|
| Email    | `test@seefood.com`  |
| Password | `12345678`          |

These credentials are shown on the Login page itself as a hint.

### Pages you can explore

| Page | URL | Notes |
|------|-----|-------|
| Welcome / Landing | `/` | Marketing page with feature overview |
| Login | `/login` | Use the demo credentials above |
| Sign Up | `/signup` | Form UI demo — does not write to a database |
| Home | `/home` | Dashboard overview with placeholder macro data |
| Scan Meal | `/scan-meal` | Upload a meal photo (or use Telegram) → see mock nutrition analysis |
| Scan Ingredients | `/scan-ingredients` | Pick a local photo of your fridge → see mock recipe suggestions |
| Dashboard | `/dashboard` | Nutrition summary charts |
| History | `/history` | Meal history log |
| Profile | `/profile` | User profile view |
| Edit Profile | `/profile/edit` | Profile editing form |

> **Note:** Scan Meal and Scan Ingredients return **mock / sample results** in the demo. Real AI analysis requires the API backend and (for Telegram photo upload) the bot to be running.

### Scan Meal – quick demo steps

1. Navigate to **Scan Meal** (`/scan-meal`).
2. Click **"Choose file"** and pick any image from your computer, or use **"📱 Upload from Telegram"** if the bot is running.
3. Click **Analyze** — the result panel shows a sample nutritional breakdown (Chicken quinoa bowl, 520 kcal).

### Scan Ingredients – quick demo steps

1. Navigate to **Scan Ingredients** (`/scan-ingredients`).
2. Click **"Choose File"** and pick any image from your computer.
3. Click **Analyze** — the result panel shows detected ingredients and three sample recipe suggestions.

---

## 2 – Set Up the API Backend

```bash
cd api/src
npm install
```

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `api/src/.env`:

```env
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=DIP
PORT=3000
```

Start the API server:

```bash
node app.js
```

The server will start on `http://localhost:3000`. You can verify it is running by visiting `http://localhost:3000/health` in your browser.

> **Tip:** If you run the API on port 3000 and then start the React dev server with `npm start`, React will automatically use port 3001 to avoid the conflict.

---

## 3 – Create a Telegram Bot and Get Your Token

1. Open **Telegram** on your phone (or desktop) and search for **@BotFather**.
2. Start a chat and send `/newbot`.
3. Follow the prompts to choose a name and username for your bot.
4. BotFather will reply with a **bot token** that looks like `123456789:ABCdef...`. Copy it.

---

## 4 – Set Up the Telegram Bot

Open a new terminal window:

```bash
cd bot
npm install
```

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `bot/.env` and paste the token you received from BotFather:

```env
TELEGRAM_TOKEN=123456789:ABCdef...
API_URL=http://localhost:3000
```

> **Note:** If your API server is running on a different host or port, update `API_URL` accordingly.

Start the bot:

```bash
npm run dev
```

You should see:

```
Telegram bot running. Send /start in Telegram.
```

---

## 5 – Test the Bot on Your Phone

1. Open the **Telegram** app on your phone.
2. Search for your bot by the username you chose in Step 3 (e.g. `@MyMealBot`).
3. Tap **Start** or send the `/start` command.
4. Follow the prompts:
   - Send `/login` and enter your registered username/email and password.
   - Once logged in, send a photo of your meal with the calibration card.
   - The bot will reply with the nutritional analysis.

### Register an Account First

Before logging in through the bot, you need a user account. You can create one by sending a `POST` request to the API:

```bash
curl -X POST http://localhost:3000/users/register \
  -H "Content-Type: application/json" \
  -d '{"username": "yourname", "email": "you@example.com", "password": "yourpassword"}'
```

---

## Available Bot Commands

| Command   | Description                          |
|-----------|--------------------------------------|
| `/start`  | Welcome message / check login status |
| `/login`  | Start the login flow                 |
| `/logout` | Sign out of your account             |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Website won't start | Run `npm install` from the project root first, then `npm start`. |
| Port 3000 already in use | The API server occupies port 3000. The React app will auto-switch to port 3001 — just follow the URL shown in your terminal. |
| Demo login fails | Make sure you are using `test@seefood.com` and `12345678` exactly (no extra spaces). |
| `Missing TELEGRAM_TOKEN in .env` | Make sure `bot/.env` exists and contains your token from BotFather. |
| Bot is not responding | Ensure `npm run dev` is running in the `bot/` directory and shows no errors. |
| Login fails on bot | Check that the API server is running and `API_URL` in `bot/.env` points to it correctly. |
| MongoDB connection error | Verify your `MONGO_URI` in `api/src/.env` and that your Atlas cluster allows connections from your IP. |
