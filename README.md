# LLM Eval Playground

An interactive learning platform for understanding LLM evaluations, built as a Claude artifact.

**Live demo:** <a href="https://claude.ai/public/artifacts/bbccbb6f-6dac-4e2a-abce-7690941cb5d0" target="_blank" rel="noopener noreferrer">Open demo ↗</a>

---

## What this is

A three-module learning tool that teaches LLM evals through theory, inspection, and hands-on experimentation — using a customer support agent as the subject.

Built as a portfolio project to demonstrate AI PM competency: designing eval criteria, surfacing tradeoffs, and making the abstract concrete for a non-technical audience.

---

## Modules

### 01 · Theory
Five concept sections covering:
- What evals are and why they exist
- The three grader types (code-based, LLM-as-judge, human)
- Judge biases and how to mitigate them (verbosity, self-preference, agreeableness)
- Why agent evals are harder than single-turn evals
- The eval loop: build → run → analyse → improve

### 02 · Inspect
Read-only reference for all three eval dimensions:
- **Relevance** — did the agent address what was actually asked?
- **Helpfulness** — did the response actually help?
- **Escalation judgment** — did the agent know when to hand off to a human?

Each dimension shows: scoring rubric, full judge prompt, and known bias notes.

### 03 · Playground
Live eval runner where you edit the agent's system prompt and watch scores change in real time.

Features:
- 5 pre-built test cases (late delivery, cancel + double charge, dispute threat, vague complaint, damaged item refund)
- 3 eval dimensions scored via LLM-as-judge
- Weak prompt and strong prompt presets to demonstrate the delta
- Run history persisted in localStorage
- Delta view: compare any two runs side by side
- Failure explainer: click any row to see why it failed and the judge's reasoning

---

## Architecture

```
User edits system prompt
        ↓
Agent call  →  agent_response        (claude-sonnet-4-20250514)
        ↓
Judge call × 3  →  { score, reasoning, low_confidence }
        ↓
Aggregate  →  mean score, pass rate, per-case table
        ↓
Failure analysis  →  reasoning surfaced inline
```

Each eval run makes **20 API calls**: 5 test cases × (1 agent + 3 judges).

The judge uses a *different* model call than the agent to avoid self-preference bias.

---

## Running locally

This is a React component built for the Claude artifact environment. To run it locally:

### Option A: Claude artifact (simplest)
1. Open [claude.ai](https://claude.ai)
2. Start a new conversation
3. Paste the contents of `EvalPlatform.jsx` and ask Claude to render it as an artifact

### Option B: Next.js / Vite

```bash
npm create vite@latest eval-playground -- --template react
cd eval-playground
npm install
```

Copy `EvalPlatform.jsx` into `src/`. Replace `src/App.jsx` with:

```jsx
import EvalPlatform from './EvalPlatform'
export default function App() {
  return <EvalPlatform />
}
```

The component calls `https://api.anthropic.com/v1/messages` directly. For local dev you'll need a proxy or backend route to keep your API key out of the browser. See `docs/deployment.md` for a Next.js setup.

---

## Key design decisions

**Why LLM-as-judge over code-based graders here?**
Relevance, helpfulness, and escalation judgment are semantic qualities — there's no regex that catches "the agent answered the wrong question." LLM judges handle this at scale.

**Why separate judge calls per dimension?**
Running one combined judge for all three dimensions produces correlated scores and makes failure diagnosis harder. Separate calls isolate each failure mode.

**Why surface reasoning, not just scores?**
A score of 2 tells you something is broken. The reasoning tells you *what* to fix. The playground surfaces judge reasoning inline for this reason.

**Why the weak/strong prompt presets?**
The delta between them — especially on escalation judgment for the dispute threat case — is the clearest demonstration of why prompt engineering matters. Numbers in a table are less compelling than watching a score jump from 1 to 5.

---

## Eval dimensions

| Dimension | Grader type | What it measures |
|-----------|-------------|-----------------|
| Relevance | LLM-as-judge | Did the response address what was actually asked? |
| Helpfulness | LLM-as-judge | Did the customer actually get helped? |
| Escalation judgment | LLM-as-judge | Did the agent correctly identify when to hand off? |

---

## About

Built by [Othersh](https://github.com/othersh) as an AI PM portfolio project.

The goal: demonstrate that AI PM work is about designing evaluation criteria, making tradeoffs visible, and building systems that help teams make better decisions — not just shipping features.

---

## License

MIT
