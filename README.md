# Quiz Night

A local, no-backend web app for running a quiz night presentation with your friends — question slides, video/image proof reveals, teams, scoring, and custom joker power-ups.

## Setup

```bash
npm install
npm run dev
```

For real use, build and preview the app instead of using the dev server:

```bash
npm run build && npm run preview
```

The app needs to be served over `localhost` (not opened as a raw `file://` document) because it relies on the browser's File System Access API, which is only available in a secure context.

## Features

- **Multiple quizzes** — create and manage any number of self-contained quizzes, each with its own questions, proof files, and teams, stored in a folder you pick once on your own disk (no cloud, no account, no internet required).
- **Choice and open questions** — multiple-choice questions with four options, or open-answer questions with an optional written correct answer shown on the reveal slide.
- **Video/image proof** — attach an optional video or image to any question that plays or displays full-screen right before the answer is revealed.
- **Per-question point values** — assign each question its own point value (with quick Easy/Medium/Hard presets), so harder questions can be worth more.
- **Teams** — set up any number of teams with member lists before presenting; scores are tracked live and autosaved throughout the game.
- **Custom jokers (power-ups)** — build a shared library of jokers (double points, risk it, 50/50, steal, freeze, safety net, hint, score swap, or fully custom rules), turn them on per-quiz, and let teams invoke them during presentation mode — the app computes the adjusted point award automatically wherever the math is well-defined.
- **Full-screen presentation mode** — a host-controlled slideshow (keyboard, click, or tap to advance) that walks through intro → question → joker → proof → reveal → results, ending in a final leaderboard.
