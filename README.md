# 🎓 CampusMind Pro
> One Platform. Five AI Superpowers. Free. Offline. Private.
Built for **Godavari Global University × TechWing** — no subscriptions, no cloud uploads, no per-seat fees.

---

## 📦 Project Structure
```
CampusMind-Pro/
├── index.html          ← Main app (all 5 modules)
├── styles.css          ← Peach × Brown × Neon theme
├── app.js              ← All module logic
├── favicon.svg         ← App icon
├── config.example.js   ← API key template (safe to push)
├── config.js           ← YOUR actual API key (never pushed — gitignored)
├── .gitignore
└── README.md
```

---

## ⚙️ Setup (First Time)
### Step 1 — Add your API Key (important)
1. Duplicate `config.example.js` and rename the copy to **`config.js`**
2. Open `config.js` and replace `PASTE_YOUR_GEMINI_API_KEY_HERE` with your real key
3. Get a free key at → https://aistudio.google.com/app/apikey

> `config.js` is listed in `.gitignore` — it will **never** be accidentally pushed to GitHub.

### Step 2 — Link config.js in index.html
Add this line inside `<head>` in `index.html`, **before** `app.js`:
```html
<script src="config.js"></script>
```
Then in `app.js`, change the API key line from:
```js
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE';
```

to:

```js
const GEMINI_API_KEY = CONFIG.GEMINI_API_KEY;
```

---

## ▶️ Running the App
**Option A — VS Code (recommended)**
1. Install the **Live Server** extension in VS Code
2. Right-click `index.html` → **Open with Live Server**
3. Opens at `http://127.0.0.1:5500`

**Option B — Python (no install needed)**
```bash
cd CampusMind-Pro
python -m http.server 8000
```
Then open → `http://localhost:8000`
> ⚠️ Camera, microphone, and Speech Recognition require `localhost` or `https://`.  
> They will **not** work if you open `index.html` directly as a `file://` URL.

---

## 🧠 Modules
| # | Module | What it does |
|---|--------|-------------|
| 1 | 📚 Study Companion | PDF chat, quiz generator, flashcards, summariser, voice Q&A |
| 2 | 🔍 Code Reviewer | Bug detection, security scan, style check, fix suggestions |
| 3 | 🎤 Mock Interviewer | Voice-based technical & HR prep with posture + filler feedback |
| 4 | 🛡️ Exam Proctoring | Face & phone detection, gaze logs, privacy-first CSV export |
| 5 | 🎯 Presentation Coach | Eye contact, pace, gestures, filler buzzer, A–F scorecard |

---

## 🛠️ Tech Stack
| Tool | Purpose |
|------|---------|
| Gemini API (free tier) | AI brain for all text tasks |
| Web Speech API | Voice recognition (built into Chrome) |
| MediaPipe (simulated) | Posture & gaze tracking |
| YOLO (simulated) | Phone detection in proctoring |
| Vanilla JS + Gradio-style UI | Zero framework, zero build step |

---

## 🔑 Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+1` | Dashboard |
| `Ctrl+2` | Study Companion |
| `Ctrl+3` | Code Reviewer |
| `Ctrl+4` | Mock Interviewer |
| `Ctrl+5` | Exam Proctoring |
| `Ctrl+6` | Presentation Coach |

---

## 🚀 Deploying to GitHub Pages (optional)
Once your code is on GitHub, you can host it free:
1. Go to your repo → **Settings** → **Pages**
2. Source: **Deploy from a branch** → `main` → `/ (root)`
3. Click **Save** — your site will be live at `https://yourusername.github.io/CampusMind-Pro`

> ⚠️ Never push `config.js`. If you deploy to GitHub Pages, use the browser's `prompt()` fallback or set up a backend proxy for the API key.
---

## 📄 License
MIT — free to use, modify, and distribute for educational purposes.

---

*Powered by CampusMind Pro . Built by Campus Coders Team· GGU × TechWing · Built with Passion*