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

## 5 – Test the Webapp → Bot Integration

The **Scan Meal** page in the web app calls the same `/analyze` API endpoint used by the bot. You can receive the analysis result in Telegram directly from the webapp button:

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
