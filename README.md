# 🧠 CodeMind v3 — AI Coding Mentor with Hindsight Memory

## What's New in v3

| Feature | Details |
|---|---|
| ✅ Auth System | Login / Signup / Guest |
| ✅ Memory Toggle | Before vs After demo mode |
| ✅ Learning Insights API | `/learning-insights/{user_id}` |
| ✅ AI Problem Generator | Targets your weak areas |
| ✅ Timer + Anti-Cheat | Countdown + tab-switch detection |
| ✅ Attempt History | Session-level local tracking |
| ✅ Learning Dashboard | Weak areas, streaks, common mistakes |
| ✅ Hindsight Memory Loop | retain() → recall() → improve |

---

## The Learning Loop (How Memory Works)

```
User solves problem
      ↓
classify_mistakes() → ["index_error", "edge_case"]
      ↓
hs_retain(user_id, content, metadata)   ← stored in Hindsight
      ↓
Next time user asks for hint:
hs_recall(user_id, "mistakes python Two Sum")
      ↓
"You previously made index_error mistakes — check loop bounds!"
      ↓
User improves → fewer mistakes over time
```

---

## Project Structure

```
codemind/
├── backend/
│   ├── main.py              ← FastAPI app (all routes)
│   ├── hindsight_client.py  ← Hindsight retain/recall wrapper
│   ├── problems.json        ← Problem bank
│   ├── requirements.txt
│   └── .env                 ← API keys (don't commit!)
│
└── frontend/
    ├── src/
    │   ├── App.jsx           ← Root (auth + nav)
    │   ├── icons.jsx         ← SVG icon set
    │   ├── index.css         ← Theme + animations
    │   ├── main.jsx          ← ReactDOM entry
    │   └── pages/
    │       ├── AuthScreen.jsx      ← Login/Signup/Guest
    │       ├── Dashboard.jsx       ← Problems + insights
    │       ├── ProblemSolver.jsx   ← Editor + hints + timer
    │       ├── MemoryProfile.jsx   ← Memory bank + history
    │       └── Leaderboard.jsx     ← Global rankings
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## Setup

### Backend

```bash
cd backend
pip install -r requirements.txt

# Edit .env — add your keys:
# AWS_BEDROCK_API_KEY=...
# HINDSIGHT_API_KEY=...
# HINDSIGHT_BANK_ID=CodeMind

uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

---

## API Endpoints

| Method | Route | Description |
|---|---|---|
| POST | `/signup` | Create account |
| POST | `/login` | Sign in |
| POST | `/guest` | Guest session |
| GET | `/problems` | All problems |
| POST | `/run-code` | Execute code |
| POST | `/submit` | Submit + AI feedback |
| POST | `/hint` | Memory-aware hint |
| POST | `/optimize` | Code optimization |
| POST | `/generate-problem` | AI-generated problem |
| GET | `/learning-insights/{user_id}` | Weak areas + recommendation |
| GET | `/memory/{user_id}` | Hindsight memory bank |
| GET | `/attempts/{user_id}` | Session attempt history |
| GET | `/leaderboard` | Global rankings |
| POST | `/timer` | Start/stop problem timer |
| GET | `/daily-challenge` | Daily problem |

---

## Before vs After Demo

Use the **MEM toggle** in the top navigation to switch between:

- **Memory OFF** → Generic hints, no personalization
- **Memory ON** → Hindsight recalls your patterns, hints reference your mistakes

This is the core demo feature showing the value of the memory learning loop.

---

## Memory Structure (Hindsight)

Each submission stores:
```json
{
  "content": "Problem: Two Sum | Lang: python | Failed | Mistakes: index_error, edge_case",
  "tags": ["user:dev_abc123"],
  "metadata": {
    "problem_id": "two_sum",
    "language": "python",
    "passed": false,
    "mistake_types": ["index_error", "edge_case"],
    "score": "2/5",
    "time_taken": 320,
    "timestamp": 1710000000
  }
}
```

---

## Guest vs Authenticated Users

| Feature | Guest | Logged In |
|---|---|---|
| Solve problems | ✅ | ✅ |
| Run code | ✅ | ✅ |
| AI hints | ✅ (generic) | ✅ (personalized) |
| Memory storage | ❌ | ✅ |
| Learning insights | ❌ | ✅ |
| Leaderboard | ❌ | ✅ |
| Cross-session memory | ❌ | ✅ |
