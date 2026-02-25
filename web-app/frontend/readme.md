# SeeFood — Frontend

This is the React-based frontend for the **SeeFood** application (IM3180 — Design & Innovation Project, Group IE01).

## Prerequisites

- [Node.js](https://nodejs.org/) v16 or later
- npm (bundled with Node.js)

## Getting Started

The frontend source lives at the **root** of the repository (alongside `package.json`, `src/`, and `public/`).

### 1. Install dependencies

From the repository root, run:

```bash
npm install
```

### 2. Start the development server

```bash
npm start
```

The app will open in your browser at [http://localhost:3000](http://localhost:3000).

### Demo login credentials

| Field    | Value               |
|----------|---------------------|
| Email    | test@seefood.com    |
| Password | 12345678            |

## Available Scripts

| Command           | Description                              |
|-------------------|------------------------------------------|
| `npm start`       | Start the development server             |
| `npm run build`   | Build for production (outputs to `build/`) |
| `npm test`        | Run the test suite                       |

## Pages

| Route                | Page               |
|----------------------|--------------------|
| `/`                  | Welcome / Landing  |
| `/login`             | Login              |
| `/signup`            | Sign Up            |
| `/home`              | Home (post-login)  |
| `/dashboard`         | Dashboard          |
| `/history`           | History            |
| `/profile`           | Profile            |
| `/scan-meal`         | Scan a Meal        |
| `/scan-ingredients`  | Scan Ingredients   |
| `/learn-ready`       | Learn — Ready Meals|
| `/learn-raw`         | Learn — Raw Ingredients |
