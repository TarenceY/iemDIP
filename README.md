# iemDIP – Meal Analysis Telegram Bot

A Telegram bot that lets users photograph their meals (with a calibration card) and receive nutritional analysis via a Node.js/Express backend.

---

## Project Structure

```
iemDIP/
├── bot/          # Telegram bot (Node.js, ESM)
└── api/src/      # REST API backend (Express + MongoDB)
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (or local MongoDB instance)
- A Telegram account and the **Telegram** app on your phone

---

## 1 – Create a Telegram Bot and Get Your Token

1. Open **Telegram** on your phone (or desktop) and search for **@BotFather**.
2. Start a chat and send `/newbot`.
3. Follow the prompts to choose a name and username for your bot.
4. BotFather will reply with a **bot token** that looks like `123456789:ABCdef...`. Copy it.

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

---

## 3 – Set Up the Telegram Bot

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

## 4 – Test the Bot on Your Phone

1. Open the **Telegram** app on your phone.
2. Search for your bot by the username you chose in Step 1 (e.g. `@MyMealBot`).
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
| `Missing TELEGRAM_TOKEN in .env` | Make sure `bot/.env` exists and contains your token from BotFather. |
| Bot is not responding | Ensure `npm run dev` is running in the `bot/` directory and shows no errors. |
| Login fails | Check that the API server is running and `API_URL` in `bot/.env` points to it correctly. |
| MongoDB connection error | Verify your `MONGO_URI` in `api/src/.env` and that your Atlas cluster allows connections from your IP. |
