# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
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

## 5 – Test the Telegram → Webapp Photo Upload Flow

This is the **new** flow where the webapp requests a photo via Telegram and shows it in the browser.

### Prerequisites

Make sure you have completed steps 1–4 and:
- The API server is running (`node app.js` in `api/src/`)
- The Telegram bot is running (`npm run dev` in `bot/`)
- The React webapp is running (`npm start` in the repo root)

### Step-by-step

1. **Log in to the bot on your phone first** (this links your Telegram account to your SeeFood profile):
   - Open Telegram → search for your bot → send `/login`
   - Enter your SeeFood username/email and password
   - You should see "✅ Login successful!"

2. **Open the Scan Meal page** in your browser at `http://localhost:3001` (the React app runs on 3001 when the API is already on 3000).

3. In the **"Upload from Telegram"** section, type your **Telegram username** (with or without the `@`).

4. Click **"Request photo"**.
   - The webapp tells the API to send you a Telegram message.
   - Your phone receives a Telegram message: *"📸 SeeFood Webapp is requesting a meal photo! Please send a photo of your meal now…"*

5. **Send a photo of your meal** in the Telegram chat.
   - The bot detects the pending request, uploads the photo to the API (stored locally in `api/src/uploads/` when S3 is not configured).
   - The bot replies: *"✅ Photo uploaded! Switch back to the webapp to see it."*

6. The webapp is polling in the background and **automatically shows the uploaded photo** in the preview area within a couple of seconds.

7. Click **"Analyze"** to run the nutritional analysis on the uploaded photo.

> **Tip:** By default, photos are stored on the local filesystem (`api/src/uploads/`).  
> To use **AWS S3** instead, add your credentials to `api/src/.env`:
> ```env
> AWS_REGION=ap-southeast-1
> AWS_ACCESS_KEY_ID=AKIA...
> AWS_SECRET_ACCESS_KEY=...
> AWS_S3_BUCKET=your-bucket-name
> ```

---

## 5b – Test the Webapp → Bot Integration (classic flow)

The **Scan Meal** page also supports the classic flow where you upload a photo directly from your device:

1. Start both the API server and the Telegram bot (steps 2 & 3 above).
2. Start the React webapp:

   ```bash
   cd <repo-root>
   npm start
   ```

3. Open `http://localhost:3000` in your browser and navigate to **Scan Meal**.
4. Find your **Telegram Chat ID** by messaging [@userinfobot](https://t.me/userinfobot) in Telegram.
5. Enter your Chat ID in the **Telegram Chat ID** field on the Scan Meal page.
6. Upload a meal photo and click **Analyze**.
7. The nutritional result will appear on the page **and** be sent to you via the Telegram bot.

> **Tip:** If you previously logged into the bot (`/login`), your Telegram Chat ID is automatically linked to your account. In that case, enter your `userId` (returned from `/users/login`) in the webapp to receive notifications without filling in the Chat ID field.

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
| Webapp Analyze button shows "Is the API running?" | Start the API server (`node app.js` in `api/src/`) and ensure `REACT_APP_API_URL` points to it (default: `http://localhost:3000`). |
| No Telegram notification from webapp | Ensure `TELEGRAM_TOKEN` is set in `api/src/.env` and the Chat ID field is filled in on the Scan Meal page. |
| MongoDB connection error | Verify your `MONGO_URI` in `api/src/.env` and that your Atlas cluster allows connections from your IP. |
