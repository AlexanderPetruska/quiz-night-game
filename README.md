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
- **Choice and open questions** — multiple-choice questions with four options, or open-answer questions with a required correct answer shown on the reveal slide.
- **Video/image proof** — attach an optional video or image to any question that plays or displays full-screen right before the answer is revealed.
- **Per-question point values** — assign each question its own point value (with quick Easy/Medium/Hard presets), so harder questions can be worth more.
- **Teams** — set up any number of teams with member lists before presenting; scores are tracked live and autosaved throughout the game, and every team must be scored before the host can move on.
- **Custom jokers (power-ups)** — build a shared library of jokers (double points, risk it, 50/50, steal, freeze, safety net, hint, score swap, or fully custom rules), turn them on per-quiz, and let teams invoke them during presentation mode. The app automatically computes and applies the adjusted score — including cross-team effects like Steal, Freeze, and Score Swap, where the host just picks a target team and the math (and any point transfer) happens on its own. Only the fully open-ended "Custom Rule" joker is left to the host's judgment.
- **Full-screen presentation mode** — a host-controlled slideshow (keyboard, click, or tap to advance) that walks through intro → question → joker → proof → reveal → results, ending in a final leaderboard, with a persistent scoreboard sidebar (gold/silver/bronze standings) visible throughout except during proof playback.
- **Preview mode** — check exactly how a question will look on the big screen — including its proof and reveal — right from the quiz editor, before presenting it live.
- **Duplicate, export, and import quizzes** — clone a quiz as a starting template, export one as a `.zip` to share or back up, and import one back in.
- **Dark / light theme** — follows your system preference by default, with a toggle to override it.
- **Example quiz** — a starter quiz with sample questions, mock proof images, and mock teams is available on first run (or on demand via "+ Add Example Quiz") so there's something to explore immediately.
- **Interface localization** — the app's own UI (not quiz content) is available in English, Spanish, French, German, Portuguese, Italian, Slovak, and Czech, auto-detected from your browser on first load. The language switcher lets you curate which of those show up in your quick-switch menu, handy if you regularly host in just a few of them.
