# SeeFood

**SeeFood** is an AI-powered healthy-living web app that lets users track nutrition from photos of ready meals and plan what to cook from ingredients they already have.

IM3180 — Design & Innovation Project | Group IE01

---

## Opening the Frontend

### Prerequisites

- [Node.js](https://nodejs.org/) v16 or later (npm is included)

### 1. Install dependencies

```bash
npm install
```

### 2. Start the development server

```bash
npm start
```

The app opens automatically at [http://localhost:3000](http://localhost:3000).

### Demo login credentials

| Field    | Value               |
|----------|---------------------|
| Email    | test@seefood.com    |
| Password | 12345678            |

---

## Available Scripts

| Command           | Description                                     |
|-------------------|-------------------------------------------------|
| `npm start`       | Run the app in development mode                 |
| `npm run build`   | Build for production (output in `build/`)       |
| `npm test`        | Launch the test runner                          |

---

## Repository Structure

```
iemDIP/
├── public/               # Static assets & HTML template
├── src/                  # React source code
│   ├── App.js            # Route definitions
│   ├── pages/            # Page components
│   ├── styles/           # CSS files
│   └── assets/           # Images
├── web-app/
│   ├── frontend/         # Frontend notes & docs
│   ├── auth-service/     # Authentication service
│   └── ml-ai/            # ML / AI service
└── package.json
```

---

## Pages

| Route                | Page                    |
|----------------------|-------------------------|
| `/`                  | Welcome / Landing       |
| `/login`             | Login                   |
| `/signup`            | Sign Up                 |
| `/home`              | Home (post-login)       |
| `/dashboard`         | Dashboard               |
| `/history`           | History                 |
| `/profile`           | Profile                 |
| `/scan-meal`         | Scan a Meal             |
| `/scan-ingredients`  | Scan Ingredients        |
| `/learn-ready`       | Learn — Ready Meals     |
| `/learn-raw`         | Learn — Raw Ingredients |
