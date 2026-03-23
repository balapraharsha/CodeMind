from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import boto3, json, httpx, os, time, re, asyncio, tempfile, sys as _sys
from dotenv import load_dotenv
from collections import defaultdict, Counter

load_dotenv()
app = FastAPI(title="CodeMind API v3")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ── In-memory stores ────────────────────────────────────────────────────────
leaderboard_store = {}
users_store = {}          # { user_id: { password, display_name, created_at } }
sessions_store = {}       # { token: user_id }
attempt_history = defaultdict(list)   # { user_id: [ attempt_dicts ] }
timer_store = defaultdict(dict)       # { user_id: { problem_id: start_time } }

# ── Config ──────────────────────────────────────────────────────────────────
BEDROCK_KEY   = os.getenv("AWS_BEDROCK_API_KEY")
AWS_KEY_ID    = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET    = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION    = os.getenv("AWS_REGION", "us-east-1")
HINDSIGHT_KEY = os.getenv("HINDSIGHT_API_KEY")
HINDSIGHT_URL = os.getenv("HINDSIGHT_BASE_URL", "https://api.hindsight.vectorize.io")

HAS_BEDROCK   = bool(BEDROCK_KEY or (AWS_KEY_ID and AWS_SECRET))
HAS_HINDSIGHT = bool(HINDSIGHT_KEY)

bedrock = None
if HAS_BEDROCK and not BEDROCK_KEY:
    try:
        bedrock = boto3.client(service_name="bedrock-runtime", region_name=AWS_REGION,
                               aws_access_key_id=AWS_KEY_ID, aws_secret_access_key=AWS_SECRET)
    except Exception as e:
        print(f"Bedrock init failed: {e}"); HAS_BEDROCK = False

hindsight = None
if HAS_HINDSIGHT:
    try:
        from hindsight_client import HindsightClient
        hindsight = HindsightClient(api_key=HINDSIGHT_KEY, base_url=HINDSIGHT_URL)
    except Exception as e:
        print(f"Hindsight init failed: {e}"); HAS_HINDSIGHT = False

print(f"[CodeMind] Bedrock={'ON' if HAS_BEDROCK else 'OFF'} | Hindsight={'ON' if HAS_HINDSIGHT else 'OFF'}")


# ── Pydantic Models ─────────────────────────────────────────────────────────
class SignupRequest(BaseModel):
    user_id: str
    password: str
    display_name: Optional[str] = None

class LoginRequest(BaseModel):
    user_id: str
    password: str

class SubmissionRequest(BaseModel):
    user_id: str; problem_id: str; problem_title: str
    problem_description: str; code: str; language: str; test_results: dict
    time_taken: Optional[int] = 0       # seconds
    memory_mode: Optional[bool] = True  # before/after toggle

class HintRequest(BaseModel):
    user_id: str; problem_id: str; problem_title: str
    problem_description: str; code: str; language: str
    memory_mode: Optional[bool] = True

class OptimizeRequest(BaseModel):
    user_id: str; code: str; language: str; problem_title: str

class GenerateRequest(BaseModel):
    user_id: str; topic: Optional[str] = "arrays"; difficulty: Optional[str] = "Easy"

class TimerRequest(BaseModel):
    user_id: str; problem_id: str; action: str  # "start" | "stop"


# ── Bedrock ─────────────────────────────────────────────────────────────────
def call_bedrock(system_prompt: str, user_message: str, max_tokens: int = 1024) -> str:
    if not HAS_BEDROCK:
        return _fallback_response(user_message)

    MODEL_IDS = [
        "anthropic.claude-haiku-20240307-v1:0",
        "anthropic.claude-3-haiku-20240307-v1:0",
        "anthropic.claude-instant-v1",
    ]
    payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": max_tokens,
        "system": system_prompt,
        "messages": [{"role": "user", "content": user_message}]
    }

    if BEDROCK_KEY:
        for model_id in MODEL_IDS:
            try:
                url  = f"https://bedrock-runtime.{AWS_REGION}.amazonaws.com/model/{model_id}/invoke"
                resp = httpx.post(url, headers={"x-api-key": BEDROCK_KEY, "Content-Type": "application/json", "Accept": "application/json"},
                                  content=json.dumps(payload), timeout=30)
                if resp.status_code == 200:
                    return resp.json()["content"][0]["text"]
                elif resp.status_code == 404:
                    continue
            except Exception as e:
                print(f"Bedrock attempt error: {e}"); break

    if bedrock:
        for model_id in MODEL_IDS:
            try:
                response = bedrock.invoke_model(body=json.dumps(payload), modelId=model_id,
                                                accept="application/json", contentType="application/json")
                return json.loads(response.get("body").read())["content"][0]["text"]
            except Exception as e:
                print(f"Bedrock boto3 {model_id}: {e}"); continue

    return _fallback_response(user_message)


def _fallback_response(msg: str) -> str:
    if "generate" in msg.lower() and "problem" in msg.lower():
        # Return a valid fallback problem JSON so parse doesn't fail
        import re as _re
        topic_m = _re.search(r'topic:\s*(\w[\w\s]*)', msg)
        diff_m  = _re.search(r'(Easy|Medium|Hard)', msg)
        topic   = topic_m.group(1).strip() if topic_m else "Arrays"
        diff    = diff_m.group(1) if diff_m else "Easy"
        return json.dumps({
            "id": "fallback-problem",
            "title": f"{diff} {topic} Problem",
            "difficulty": diff,
            "topic": topic,
            "description": f"Given an array of integers, find the sum of all elements. Return the total sum.",
            "examples": [{"input": "[1, 2, 3]", "output": "6"}],
            "test_cases": [{"input": "[1, 2, 3]", "expected_output": "6"}, {"input": "[]", "expected_output": "0"}],
            "starter_code": {
                "python": "def solution(nums):\n    # Write your solution here\n    pass\n",
                "javascript": "function solution(nums) {\n    // Write your solution here\n}\n",
                "java": "public class Solution {\n    public int solution(int[] nums) {\n        // Write your solution here\n        return 0;\n    }\n}\n"
            }
        })
    if "hint" in msg.lower():
        return "**Hint:** Break the problem into smaller steps. Check your edge cases (empty input, single element). Make sure your loop boundaries are correct."
    if "optimize" in msg.lower() or "complexity" in msg.lower():
        return "**Optimization tip:** Consider using a hash map to reduce time complexity from O(n²) to O(n). Check if you can solve this in a single pass."
    if "insight" in msg.lower() or "weak" in msg.lower():
        return json.dumps({"weak_areas": ["arrays", "edge_cases"], "common_mistakes": ["index_error", "null_check"],
                           "recommendation": "Practice edge cases in array problems. Focus on boundary conditions.", "streak": 0, "total_solved": 0})
    return "**Feedback:** Good attempt! Make sure all test cases pass including edge cases. Check for null/empty inputs and boundary conditions.\n\n*Add your AWS Bedrock key to `.env` for personalized AI feedback.*"


# ── Hindsight helpers ────────────────────────────────────────────────────────
def hs_retain(user_id, content, metadata):
    if not HAS_HINDSIGHT: return
    try: hindsight.retain(user_id=user_id, content=content, metadata=metadata)
    except Exception as e: print(f"Hindsight retain: {e}")

def hs_recall(user_id, query):
    if not HAS_HINDSIGHT: return []
    try: return hindsight.recall(user_id=user_id, query=query).get("memories", [])
    except Exception as e: print(f"Hindsight recall: {e}"); return []

def hs_list(user_id):
    if not HAS_HINDSIGHT: return []
    try: return hindsight.list_memories(user_id=user_id).get("memories", [])
    except Exception as e: print(f"Hindsight list: {e}"); return []


# ── Utilities ────────────────────────────────────────────────────────────────
def classify_mistakes(errors: list, code: str) -> list:
    combined = " ".join(errors + [code]).lower()
    types = []
    if any(x in combined for x in ["null","none","undefined","nonetype"]): types.append("null_check")
    if any(x in combined for x in ["index","out of range","out of bounds","subscript"]): types.append("index_error")
    if any(x in combined for x in ["timeout","time limit","tle"]): types.append("time_complexity")
    if any(x in combined for x in ["syntaxerror","syntax","invalid syntax"]): types.append("syntax_error")
    if any(x in combined for x in ["edge","empty","[]","{}"]): types.append("edge_case")
    return list(set(types)) or ["logic_error"]

def score_code(code: str, passed: int, total: int, language: str) -> dict:
    pct      = (passed / total * 100) if total > 0 else 0
    lines    = [l for l in code.split("\n") if l.strip()]
    has_comm = any("#" in l or "//" in l for l in lines)
    nested   = code.count("for") + code.count("while")
    eff      = 100 if nested <= 1 else max(40, 100 - (nested-1)*20)
    style    = min(100, 60 + (20 if has_comm else 0) + (20 if len(lines) < 30 else 0))
    return {"correctness": f"{min(100,int(pct))}/100", "efficiency": f"{eff}/100", "style": f"{style}/100"}

def update_leaderboard(user_id, solved, accuracy):
    if user_id not in leaderboard_store:
        leaderboard_store[user_id] = {"user_id":user_id,"solved":0,"sessions":0,"total_accuracy":0,"score":0,"accuracy":0}
    e = leaderboard_store[user_id]
    e["sessions"] += 1
    if solved: e["solved"] += 1
    e["total_accuracy"] += accuracy
    e["accuracy"] = round(e["total_accuracy"] / e["sessions"])
    e["score"]    = e["solved"] * 10 + e["accuracy"]

def build_memory_context(past: list) -> str:
    if not past: return ""
    lines = [m.get("content","") for m in past[:5] if m.get("content")]
    return "Student's past mistake patterns:\n" + "\n".join(f"- {l}" for l in lines)

def get_weak_areas(user_id: str) -> dict:
    """Analyze all attempt history to produce learning insights."""
    attempts = attempt_history.get(user_id, [])
    if not attempts:
        return {"weak_areas":[], "common_mistakes":[], "recommendation":"Start solving problems to build your profile!", "streak":0, "total_solved":0, "accuracy":0}

    all_mistakes = [m for a in attempts for m in a.get("mistake_types", [])]
    mistake_counts = Counter(all_mistakes)
    topics_failed  = Counter(a.get("topic","general") for a in attempts if not a.get("passed"))
    topics_solved  = Counter(a.get("topic","general") for a in attempts if a.get("passed"))

    weak  = [t for t, _ in topics_failed.most_common(3)]
    cmist = [m for m, _ in mistake_counts.most_common(3)]
    total = len(attempts)
    solved= sum(1 for a in attempts if a.get("passed"))
    acc   = round((solved/total)*100) if total else 0

    # Streak: consecutive days
    days  = sorted(set(int(a.get("timestamp",0)) // 86400 for a in attempts), reverse=True)
    streak= 0
    today = int(time.time()) // 86400
    for d in days:
        if d >= today - streak: streak += 1
        else: break

    rec = "Great work — keep pushing harder problems!" if not weak else f"Focus on {', '.join(weak[:2])} — that's where you struggle most. Practice {cmist[0] if cmist else 'edge cases'}."
    return {"weak_areas": weak, "common_mistakes": cmist, "recommendation": rec, "streak": streak, "total_solved": solved, "accuracy": acc, "total_attempts": total}


# ── Auth Routes ──────────────────────────────────────────────────────────────
@app.post("/signup")
async def signup(req: SignupRequest):
    if req.user_id in users_store:
        raise HTTPException(400, "User ID already taken")
    import hashlib
    users_store[req.user_id] = {
        "password": hashlib.sha256(req.password.encode()).hexdigest(),
        "display_name": req.display_name or req.user_id,
        "created_at": int(time.time())
    }
    token = f"tok_{req.user_id}_{int(time.time())}"
    sessions_store[token] = req.user_id
    return {"token": token, "user_id": req.user_id, "display_name": users_store[req.user_id]["display_name"]}

@app.post("/login")
async def login(req: LoginRequest):
    import hashlib
    user = users_store.get(req.user_id)
    if not user:
        raise HTTPException(401, "User not found")
    if user["password"] != hashlib.sha256(req.password.encode()).hexdigest():
        raise HTTPException(401, "Invalid password")
    token = f"tok_{req.user_id}_{int(time.time())}"
    sessions_store[token] = req.user_id
    return {"token": token, "user_id": req.user_id, "display_name": user["display_name"]}

@app.post("/guest")
async def guest_login():
    import random, string
    guest_id = "guest_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    token    = f"tok_{guest_id}_{int(time.time())}"
    sessions_store[token] = guest_id
    return {"token": token, "user_id": guest_id, "display_name": f"Guest #{guest_id[-4:].upper()}", "is_guest": True}


# ── Timer Routes ─────────────────────────────────────────────────────────────
@app.post("/timer")
async def manage_timer(req: TimerRequest):
    if req.action == "start":
        timer_store[req.user_id][req.problem_id] = int(time.time())
        return {"started": True, "start_time": timer_store[req.user_id][req.problem_id]}
    elif req.action == "stop":
        start = timer_store[req.user_id].get(req.problem_id)
        elapsed = (int(time.time()) - start) if start else 0
        return {"elapsed": elapsed, "start_time": start}
    return {"error": "Unknown action"}


# ── Learning Insights ────────────────────────────────────────────────────────
@app.get("/learning-insights/{user_id}")
async def learning_insights(user_id: str):
    """Returns personalized learning analytics — used by Dashboard."""
    local = get_weak_areas(user_id)
    # Also ask AI to synthesize if we have memory
    past = hs_recall(user_id, "mistakes programming weaknesses")
    if past:
        mem_text = "\n".join(m.get("content","") for m in past[:8])
        system   = "You are a coding coach. Return ONLY valid JSON, no markdown."
        msg      = f"""Based on these memory entries for a student, return learning insights as JSON:
{mem_text}

Return: {{"weak_areas":["..."],"common_mistakes":["..."],"recommendation":"...",
"next_challenge":"specific topic to practice next","confidence_score":0-100}}"""
        raw = call_bedrock(system, msg, max_tokens=400)
        try:
            clean = re.sub(r"```[a-z]*\n?","",raw).strip()
            ai_insight = json.loads(clean)
            local.update(ai_insight)
        except: pass
    return local


# ── Before/After Mode ────────────────────────────────────────────────────────
@app.post("/hint")
async def get_hint(req: HintRequest):
    """
    memory_mode=True  → personalized hint using Hindsight recall
    memory_mode=False → generic hint (demo before/after comparison)
    """
    if req.memory_mode:
        past    = hs_recall(req.user_id, f"{req.language} mistakes {req.problem_title}")
        mem_ctx = build_memory_context(past)
        proactive = "\nIMPORTANT: Warn about likely mistakes from their history FIRST before giving the hint." if past else ""
        system  = f"You are CodeMind, a patient coding mentor. Hint WITHOUT the solution. Max 2 paragraphs. Markdown.\n{mem_ctx}{proactive}"
    else:
        past   = []
        system = "You are a generic coding assistant. Give a general hint for this problem. Be brief."

    msg = f"Hint for '{req.problem_title}'.\nProblem: {req.problem_description}\nCode:\n```{req.language}\n{req.code}\n```"
    return {"hint": call_bedrock(system, msg), "personalized": len(past) > 0, "memory_mode": req.memory_mode}


@app.post("/submit")
async def submit_solution(req: SubmissionRequest):
    passed     = req.test_results.get("passed", 0)
    total      = req.test_results.get("total", 0)
    errors     = req.test_results.get("errors", [])
    all_passed = passed == total and total > 0
    mistake_types = [] if all_passed else classify_mistakes(errors, req.code)

    # Memory recall (if memory mode on)
    past = hs_recall(req.user_id, f"mistakes {req.language} {req.problem_title}") if req.memory_mode else []
    mem_ctx = build_memory_context(past)

    system = f"You are CodeMind, a sharp coding mentor. Be specific, technical, concise (max 3 paragraphs). Use markdown.\n{mem_ctx}"
    if all_passed:
        msg = f"Student solved '{req.problem_title}' in {req.language}.\nCode:\n```{req.language}\n{req.code}\n```\nPraise briefly, then ONE improvement tip."
    else:
        msg = f"Student attempted '{req.problem_title}' in {req.language}.\nFailed {total-passed}/{total} tests.\nErrors: {json.dumps(errors[:3])}\nMistakes: {mistake_types}\nCode:\n```{req.language}\n{req.code}\n```\nExplain what went wrong. Don't give the solution."

    feedback = call_bedrock(system, msg)
    ai_score = score_code(req.code, passed, total, req.language)

    # Store in Hindsight memory
    if req.memory_mode:
        hs_retain(req.user_id,
                  f"Problem: {req.problem_title} | Lang: {req.language} | {'Solved' if all_passed else 'Failed'}" +
                  (f" | Mistakes: {', '.join(mistake_types)}" if mistake_types else "") +
                  (f" | Time: {req.time_taken}s" if req.time_taken else ""),
                  {"problem_id": req.problem_id, "language": req.language, "passed": all_passed,
                   "mistake_types": mistake_types, "score": f"{passed}/{total}",
                   "time_taken": req.time_taken, "timestamp": int(time.time())})

    # Local history for insights
    attempt_history[req.user_id].append({
        "problem_id": req.problem_id, "problem_title": req.problem_title,
        "language": req.language, "passed": all_passed,
        "mistake_types": mistake_types, "score": f"{passed}/{total}",
        "time_taken": req.time_taken, "timestamp": int(time.time()),
        "topic": req.problem_id.split("_")[0] if "_" in req.problem_id else "general"
    })

    acc = round((passed/total)*100) if total > 0 else 0
    update_leaderboard(req.user_id, all_passed, acc)

    return {"feedback": feedback, "passed": passed, "total": total, "all_passed": all_passed,
            "mistake_types": mistake_types, "ai_score": ai_score, "memory_stored": HAS_HINDSIGHT and req.memory_mode}


@app.post("/optimize")
async def optimize_code(req: OptimizeRequest):
    past = hs_recall(req.user_id, f"time complexity efficiency {req.language}")
    ctx  = "\nNote: student has struggled with time complexity — be detailed about Big-O." if any(
        "time_complexity" in (m.get("metadata", {}).get("mistake_types") or []) for m in past) else ""
    system = f"You are a performance-focused code reviewer. Analyze time/space complexity and suggest optimizations.{ctx} Use markdown."
    msg    = f"Problem: {req.problem_title}\nLang: {req.language}\nCode:\n```{req.language}\n{req.code}\n```"
    return {"analysis": call_bedrock(system, msg, max_tokens=800)}


@app.post("/generate-problem")
async def generate_problem(req: GenerateRequest):
    past = hs_recall(req.user_id, "mistakes programming")
    all_types = [t for m in past for t in (m.get("metadata", {}).get("mistake_types") or [])]
    weak = [t for t, _ in Counter(all_types).most_common(2)]
    weak_ctx = f"\nTarget these weakness areas: {', '.join(weak)}." if weak else ""
    system = "You are a coding problem designer. Return ONLY valid JSON, no markdown, no explanation."
    msg    = f"""Generate a {req.difficulty} problem on topic: {req.topic}.{weak_ctx}
Return JSON:
{{"id":"slug","title":"Title","difficulty":"{req.difficulty}","topic":"{req.topic}","description":"...","examples":[{{"input":"...","output":"..."}}],"test_cases":[{{"input":"...","expected_output":"..."}}],"starter_code":{{"python":"# code\\n","javascript":"// code\\n","java":"// code\\n"}}}}"""
    raw = call_bedrock(system, msg, max_tokens=1200)
    try:
        clean = re.sub(r"```[a-z]*\n?", "", raw).strip()
        return {"problem": json.loads(clean), "tailored_to": weak}
    except:
        return {"error": "Parse failed", "raw": raw}


@app.get("/problems")
async def get_problems():
    with open("problems.json") as f: return {"problems": json.load(f)}

@app.get("/leaderboard")
async def get_leaderboard():
    return {"leaderboard": sorted(leaderboard_store.values(), key=lambda x: x["score"], reverse=True)[:20]}

@app.get("/memory/{user_id}")
async def get_user_memory(user_id: str):
    local = attempt_history.get(user_id, [])
    hs    = hs_list(user_id)
    return {"memories": hs, "local_history": local[-20:], "user_id": user_id, "has_hindsight": HAS_HINDSIGHT}

@app.get("/attempts/{user_id}")
async def get_attempts(user_id: str):
    return {"attempts": attempt_history.get(user_id, [])[-50:]}

@app.get("/daily-challenge")
async def daily_challenge():
    import datetime
    today = datetime.date.today().isoformat()
    with open("problems.json") as f: problems = json.load(f)
    return {"challenge": problems[hash(today) % len(problems)], "date": today}

@app.get("/status")
async def status():
    return {"bedrock": HAS_BEDROCK, "hindsight": HAS_HINDSIGHT, "version": "3.0",
            "users": len(users_store), "total_attempts": sum(len(v) for v in attempt_history.values())}

@app.get("/")
def root():
    return {"status": "CodeMind API v3", "bedrock": HAS_BEDROCK, "hindsight": HAS_HINDSIGHT}


# ── Code Runner ──────────────────────────────────────────────────────────────
@app.post("/run-code")
async def run_code(payload: dict):
    code = payload.get("code", ""); language = payload.get("language", "python")
    test_cases = payload.get("test_cases", [])
    PYTHON_CMD = _sys.executable

    async def run_single(tc):
        stdin_data = tc.get("input", ""); expected = tc.get("expected_output", "").strip()
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                if language == "python":
                    fpath = os.path.join(tmpdir, "solution.py")
                    with open(fpath, "w") as f: f.write(code)
                    cmd = [PYTHON_CMD, fpath]
                elif language == "javascript":
                    fpath = os.path.join(tmpdir, "solution.js")
                    with open(fpath, "w") as f: f.write(code)
                    cmd = ["node", fpath]
                elif language == "java":
                    match = re.search(r'public\s+class\s+(\w+)', code)
                    cn = match.group(1) if match else "Main"
                    fpath = os.path.join(tmpdir, f"{cn}.java")
                    with open(fpath, "w") as f: f.write(code)
                    cp = await asyncio.create_subprocess_exec("javac", fpath, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE, cwd=tmpdir)
                    _, cerr = await asyncio.wait_for(cp.communicate(), timeout=10)
                    if cp.returncode != 0:
                        return {"input": stdin_data, "expected": expected, "actual": "", "passed": False, "error": cerr.decode()[:300], "status": "Compile Error"}
                    cmd = ["java", "-cp", tmpdir, cn]
                else:
                    return {"input": stdin_data, "expected": expected, "actual": "", "passed": False, "error": f"Language '{language}' not supported", "status": "Unsupported"}

                proc = await asyncio.create_subprocess_exec(*cmd, stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE, cwd=tmpdir)
                stdin_bytes = (stdin_data.rstrip() + "\n").encode()
                stdout, stderr = await asyncio.wait_for(proc.communicate(input=stdin_bytes), timeout=8)
                actual  = stdout.decode().strip()
                err_out = stderr.decode().strip()
                passed  = actual == expected and proc.returncode == 0
                return {"input": stdin_data, "expected": expected, "actual": actual, "passed": passed,
                        "error": err_out[:300] if not passed and err_out else "", "status": "Accepted" if passed else ("Runtime Error" if err_out else "Wrong Answer")}
        except asyncio.TimeoutError:
            return {"input": stdin_data, "expected": expected, "actual": "", "passed": False, "error": "Time limit exceeded (8s)", "status": "TLE"}
        except FileNotFoundError:
            rt = {"python": "python3", "javascript": "node", "java": "java"}.get(language, language)
            return {"input": stdin_data, "expected": expected, "actual": "", "passed": False, "error": f"'{rt}' not installed.", "status": "Runtime Not Found"}
        except Exception as e:
            return {"input": stdin_data, "expected": expected, "actual": "", "passed": False, "error": str(e)[:200], "status": "Error"}

    results = list(await asyncio.gather(*[run_single(tc) for tc in test_cases]))
    passed_count = sum(1 for r in results if r["passed"])
    return {"results": results, "passed": passed_count, "total": len(results),
            "errors": [r["error"] for r in results if r.get("error")]}