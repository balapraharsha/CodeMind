# CODEMIND — AI Coding Mentor

> **Train Smarter. Memory Enhanced.**
> An AI-powered coding platform that remembers every mistake and crafts personalised hints, feedback, and problems tailored to your weak areas.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-codemind--tau.vercel.app-00E5FF?style=for-the-badge)](https://codemind-tau.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-CodeMind-8B5CF6?style=for-the-badge&logo=github)](https://github.com/balapraharsha/CodeMind)

---

## What is CodeMind?

Most coding platforms treat every session as isolated — they forget you the moment you close the tab. **CodeMind is different.** It builds a persistent memory profile using the [Hindsight](https://hindsight.vectorize.io) vector memory engine and uses that history to power every hint, feedback, and AI-generated problem you receive.

The result: an AI mentor that genuinely gets smarter the more you use it.

---

## Features

### AI Problem Generator
- Generates unique coding problems tailored to your weak areas
- Powered by **AWS Bedrock — Claude Haiku**
- Select topic (Arrays, Strings, Loops, Linked Lists, Dynamic Programming, Stacks)
- Select difficulty (Easy / Medium / Hard)
- Includes title, description, examples, test cases, and starter code in Python, JavaScript & Java

### Memory-Powered Hints
- **Before/After Memory toggle** — compare personalised vs generic AI responses side-by-side
- Memory ON: Hindsight recalls past mistakes relevant to the current problem and warns proactively
- Memory OFF: standard generic hint with no context

### Code Editor & Execution
- **Monaco Editor** — the same editor used in VS Code
- Python, JavaScript, and Java support
- Real-time execution against test cases on the server
- Per-test-case results with expected vs actual output
- Anti-cheat: tab switch detection + countdown timer

### AI Submission Feedback
- Mistake classification: `null_check`, `index_error`, `time_complexity`, `syntax_error`, `edge_case`, `logic_error`
- Three-metric AI score: **Correctness / Efficiency / Style**
- Feedback stored back into Hindsight memory for future personalisation

### Memory Profile
- **INSIGHTS tab**: weak areas, common mistakes, streak, AI recommendation
- **HINDSIGHT tab**: cloud memories stored via Hindsight API
- **HISTORY tab**: local session attempt history with timestamps

### Leaderboard
- Global ranking by score (10 pts per problem + accuracy bonus)
- Live stats: problems solved, accuracy %, sessions

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Code Editor | Monaco Editor |
| Styling | Custom CSS3 + Tailwind |
| Backend | Python + FastAPI |
| AI | AWS Bedrock — Claude Haiku |
| Memory | Hindsight API |
| Code Runner | Python asyncio subprocess (multi-language) |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- AWS account with Bedrock access enabled (`us-east-1`)
- Hindsight API key from [hindsight.vectorize.io](https://hindsight.vectorize.io)

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Create `backend/.env`:

```env
AWS_BEDROCK_API_KEY=your_bedrock_key
AWS_ACCESS_KEY_ID=your_access_key        # alternative auth
AWS_SECRET_ACCESS_KEY=your_secret_key    # alternative auth
AWS_REGION=us-east-1
HINDSIGHT_API_KEY=your_hindsight_key
HINDSIGHT_BASE_URL=https://api.hindsight.vectorize.io
HINDSIGHT_BANK_ID=CodeMind
```

Run the backend:

```bash
uvicorn main:app --reload
# Starts on http://127.0.0.1:8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Starts on http://localhost:5173
```

---

## Deployment

### Backend → Render

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Runtime | Python 3 |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

Add all environment variables in Render → Settings → Environment.

### Frontend → Vercel

| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Add environment variable in Vercel → Settings → Environment Variables:

```
VITE_API_URL=https://your-render-url.onrender.com
```

---

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/signup` | Create account |
| POST | `/login` | Login |
| POST | `/guest` | Guest session |

### Problems
| Method | Endpoint | Description |
|---|---|---|
| GET | `/problems` | Get problem library |
| POST | `/generate-problem` | AI-generate problem for user |
| GET | `/daily-challenge` | Today's daily challenge |

### Execution & Feedback
| Method | Endpoint | Description |
|---|---|---|
| POST | `/run-code` | Execute code against test cases |
| POST | `/submit` | Submit + get AI feedback |
| POST | `/hint` | Get memory-powered or generic hint |
| POST | `/optimize` | Code optimization analysis |

### Memory & Analytics
| Method | Endpoint | Description |
|---|---|---|
| GET | `/learning-insights/:user_id` | AI learning insights |
| GET | `/memory/:user_id` | Hindsight memories + local history |
| GET | `/leaderboard` | Top 20 leaderboard |
| GET | `/status` | API health check |

---

## How Memory Works

```
Session 1: User struggles with null checks in arrays
→ Backend stores: "Failed Two Sum | mistake: null_check | language: python"
   via Hindsight retain()

Session 2: User attempts a new arrays problem
→ Backend calls Hindsight recall()
→ Returns: past null_check pattern
→ AI hint: "⚠️ Based on your history, you often miss null/empty checks —
            verify nums is not None before accessing indices."
```

The **Before/After toggle** in the navbar lets you instantly switch between memory-enhanced and generic AI responses to see the difference.

---

## Project Structure

```
CodeMind/
├── backend/
│   ├── main.py              # FastAPI app — all routes and business logic
│   ├── hindsight_client.py  # Hindsight API wrapper (retain, recall, list)
│   ├── problems.json        # Curated problem library (6 problems)
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Dashboard.jsx        # Problem list + AI generator
    │   │   ├── ProblemSolver.jsx    # Editor + execution + hints
    │   │   ├── MemoryProfile.jsx    # Insights + history + memories
    │   │   ├── Leaderboard.jsx      # Global rankings
    │   │   └── AuthScreen.jsx       # Login / signup / guest
    │   ├── api.js           # Centralised API helper (uses VITE_API_URL)
    │   ├── App.jsx          # Root — nav, memory toggle, auth state
    │   ├── icons.jsx        # Custom SVG icon set
    │   └── index.css        # Dark theme, animations, component styles
    ├── vite.config.js
    └── package.json
```

---

## Live Demo

**[codemind-tau.vercel.app](https://codemind-tau.vercel.app/)**

- Click **Continue as Guest** to explore without creating an account
- Try the **AI Generator** — select a topic and click Generate
- Solve a problem and click **Smart Hint** — toggle memory ON/OFF to see the difference
- Submit a solution to get AI feedback and a score

---

## Future Scope

- Persistent database (MongoDB Atlas / Supabase) to replace in-memory stores
- JWT authentication with refresh tokens
- C++, Rust, Go language support
- 100+ problem library with adaptive difficulty
- Streaks, badges, and daily goals
- Mobile app (React Native)
- Multi-language UI (Telugu, Hindi, Tamil)

---

*Built with AWS Bedrock + Hindsight Memory | Deployed on Vercel + Render*
