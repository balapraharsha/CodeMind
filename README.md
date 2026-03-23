# Codemind

Codemind is a coding practice platform that behaves like a tutor, not a judge.
Instead of just checking correctness, it tracks how you solve problems and improves its feedback over time.

---

## What It Does

Most platforms follow this loop:

```
Input → Run → Pass/Fail → Done
```

Codemind changes that to:

```
Input → Execute → Analyze → Learn → Adapt feedback
```

It focuses on **how you solve problems**, not just whether you got them right.

---

## Key Features

### 1. Real Code Execution

* Runs user code in a sandboxed environment (e.g. Firecracker)
* Supports multiple languages (extensible)
* Prevents system-level access

---

### 2. Feedback That Evolves

* Explains errors in simple terms
* Suggests improvements instead of just showing output
* Adjusts explanations based on past attempts

---

### 3. Memory-Based Learning (Hindsight)

Codemind stores and uses past attempts to guide future feedback.

* Tracks user submissions per problem
* Identifies repeated mistakes
* Adapts hints based on patterns

Example:

> First attempt → generic hint
> Third attempt → targeted explanation based on repeated error

---

### 4. Beginner-Friendly by Design

* Focuses on clarity over correctness
* Helps users get unstuck
* Reduces frustration loops

---

## How It Works

### High-Level Architecture

```
Frontend (UI)
    ↓
Backend (Python API)
    ↓
Execution Engine (Sandbox)
    ↓
AI Feedback Layer
    ↓
Memory Layer (Hindsight)
```

---

## Core Idea: Learning from Attempts

Instead of treating each submission independently, Codemind models them as a sequence.

### Basic Flow

```python
def handle_submission(user_id, code, problem_id):
    result = execute(code)

    event = {
        "user_id": user_id,
        "problem_id": problem_id,
        "code": code,
        "result": result
    }

    store_event(event)

    history = retrieve_relevant_attempts(user_id, problem_id)

    feedback = generate_feedback(code, result, history)

    return feedback
```

---

## Memory Layer (Hindsight Integration)

Codemind uses Hindsight to turn past attempts into actionable signals.

### What Gets Stored

* User code
* Execution result
* Error type (classified)
* Problem context

```python
memory.store(
    user_id=user_id,
    input=code,
    output=result,
    metadata={
        "problem_id": problem_id,
        "error_type": classify_error(result)
    }
)
```

---

### How Retrieval Works

Instead of passing all history, we retrieve relevant patterns:

```python
patterns = memory.retrieve(
    user_id=user_id,
    filters={
        "problem_id": problem_id,
        "error_type": "recursion"
    },
    limit=3
)
```

---

## Why This Matters

Without memory:

* Same mistake → same generic hint

With memory:

* Same mistake → targeted feedback referencing past attempts

This creates a **learning loop**, not just evaluation.

---

## Example Behavior

**Before:**

> "Check your base case."

**After:**

> "You're repeating the same recursion mistake from your previous attempt — your base case still doesn’t stop at n == 0."

---

## Tech Stack

* Backend: Python
* Execution: Sandbox (Firecracker or equivalent)
* AI Layer: LLM-based feedback generation
* Memory: Hindsight

---

## Setup

```bash
git clone https://github.com/your-username/codemind.git
cd codemind
pip install -r requirements.txt
python app.py
```

---

## Future Improvements

* Better error classification
* Memory decay / relevance scoring
* Multi-language support expansion
* Smarter hint generation strategies

---

## Philosophy

Codemind is built on a simple belief:

> If your system doesn’t learn from past attempts, it’s not teaching—it’s just reacting.

---

## Contributing

PRs are welcome.
Focus areas:

* Feedback quality
* Memory retrieval strategies
* Execution safety improvements

---

## License

MIT

---
