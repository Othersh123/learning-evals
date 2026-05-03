import { useState, useRef, useEffect } from "react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const C = {
  bg: "#0a0a0a",
  surface: "#111",
  surface2: "#161616",
  border: "rgba(255,255,255,0.07)",
  border2: "rgba(255,255,255,0.12)",
  text: "#e2e2e2",
  muted: "#666",
  dim: "#444",
  green: "#4ade80",
  yellow: "#facc15",
  orange: "#fb923c",
  red: "#f87171",
  blue: "#60a5fa",
  mono: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
  sans: "'DM Sans', 'Helvetica Neue', sans-serif",
};

const scoreColor = s => {
  if (s === null || s === undefined) return C.dim;
  if (s >= 4.5) return C.green;
  if (s >= 3.5) return "#a3e635";
  if (s >= 2.5) return C.yellow;
  if (s >= 1.5) return C.orange;
  return C.red;
};

const scoreBg = s => {
  if (s === null || s === undefined) return "transparent";
  if (s >= 4.5) return "rgba(74,222,128,0.07)";
  if (s >= 3.5) return "rgba(163,230,53,0.07)";
  if (s >= 2.5) return "rgba(250,204,21,0.07)";
  if (s >= 1.5) return "rgba(251,146,60,0.07)";
  return "rgba(248,113,113,0.07)";
};

// ─── THEORY CONTENT ──────────────────────────────────────────────────────────

const THEORY_SECTIONS = [
  {
    id: "what",
    label: "What are evals?",
    icon: "◈",
    content: [
      {
        type: "lead",
        text: "Evals are systematic tests that measure whether an LLM is doing the right thing — reliably, across many inputs."
      },
      {
        type: "p",
        text: "Traditional software has unit tests. If a function returns the wrong value, the test fails — deterministically, every time. LLMs break that model. The same prompt can return ten different outputs. A subtle wording change can flip a correct answer to an incorrect one. You can't write an if-statement to catch that."
      },
      {
        type: "p",
        text: "Evals fill that gap. Instead of testing for exact outputs, they test for qualities: Was this response helpful? Did it stay grounded in the facts provided? Did it know when to escalate? Each quality becomes a measurable score."
      },
      {
        type: "callout",
        label: "The PM insight",
        text: "Evals don't make decisions for you. They make tradeoffs visible. When your helpfulness score goes up but your safety score drops after a prompt change — that's the conversation you need to have with your team."
      },
      {
        type: "comparison",
        left: { label: "Without evals", items: ["Shipping on vibes", "Regressions caught by users", "No way to compare prompt versions", "Gut feel for quality"] },
        right: { label: "With evals", items: ["Measurable quality bar", "Regressions caught before ship", "A/B prompt comparison", "Evidence for decisions"] }
      }
    ]
  },
  {
    id: "graders",
    label: "The 3 grader types",
    icon: "◉",
    content: [
      {
        type: "lead",
        text: "Every eval boils down to one question: how do you decide if an output is good? There are three methods, and you layer them."
      },
      {
        type: "grader-cards",
        cards: [
          {
            name: "Code-based",
            color: C.blue,
            speed: "Fast · Cheap · Deterministic",
            when: "Structural checks",
            examples: ["Does response contain forbidden words?", "Is JSON schema valid?", "Did it stay under word limit?", "Does it include required fields?"],
            limit: "Can't catch semantic failures — being wrong, rude, or off-topic."
          },
          {
            name: "LLM-as-judge",
            color: C.green,
            speed: "Medium · Scalable · Nuanced",
            when: "Semantic quality",
            examples: ["Was this helpful?", "Is the tone appropriate?", "Did it stay on-topic?", "Was the escalation judgment correct?"],
            limit: "Subject to biases. Never fully objective."
          },
          {
            name: "Human",
            color: C.yellow,
            speed: "Slow · Expensive · Ground truth",
            when: "Calibration + high-stakes",
            examples: ["Validate your LLM judge", "Catch edge cases", "Set score thresholds", "Resolve ambiguous failures"],
            limit: "Doesn't scale. Use to calibrate, not to run."
          }
        ]
      },
      {
        type: "callout",
        label: "How to layer them",
        text: "Code-based graders run first — they're free and catch structural failures before you spend money on LLM calls. LLM judges handle semantic quality at scale. Human review calibrates your judges periodically and audits failures that matter most."
      }
    ]
  },
  {
    id: "judge-biases",
    label: "Judge biases",
    icon: "⚠",
    content: [
      {
        type: "lead",
        text: "LLM judges are powerful but not objective. Three biases consistently appear in research — every PM needs to know them."
      },
      {
        type: "bias-cards",
        cards: [
          {
            name: "Verbosity bias",
            severity: "Medium",
            severityColor: C.yellow,
            description: "Judges systematically prefer longer answers, even when shorter ones are better. A crisp 2-sentence answer often scores lower than a padded 6-sentence one with the same information.",
            fix: "Add explicit rubric language: 'Do not reward length. A concise answer that fully addresses the question scores higher than a verbose one.'"
          },
          {
            name: "Self-preference bias",
            severity: "High",
            severityColor: C.orange,
            description: "A Claude judge scores Claude-generated responses more favourably. Research shows 10–25% score inflation when model and judge are from the same family.",
            fix: "Use a different model family as your judge. If your agent is Claude, judge with GPT-4o — and vice versa."
          },
          {
            name: "Agreeableness bias",
            severity: "Critical",
            severityColor: C.red,
            description: "The most dangerous one. LLM judges have true-negative rates below 25% — they almost never correctly identify bad outputs as bad. They default to charitable interpretations.",
            fix: "Calibrate with few-shot examples of clearly bad outputs and their correct low scores. Force the judge to justify every score below 3."
          }
        ]
      },
      {
        type: "callout",
        label: "The mitigation checklist",
        text: "① Different model family as judge ② Behavioural rubric (not vague labels) ③ Chain-of-thought before scoring ④ 'Unknown' escape hatch for ambiguous cases ⑤ Periodic human calibration against judge scores"
      }
    ]
  },
  {
    id: "agent-evals",
    label: "Why agent evals are harder",
    icon: "⬡",
    content: [
      {
        type: "lead",
        text: "A simple chatbot eval is: input → output → grade. An agent eval is messier. Agents take sequences of actions across multiple turns."
      },
      {
        type: "p",
        text: "For a single-turn LLM call, you grade the output. For an agent, you grade the trajectory — every tool call, every intermediate reasoning step, every handoff decision. A response can look good at the end even if the path to get there was wasteful, risky, or wrong."
      },
      {
        type: "table",
        headers: ["Dimension", "Single-turn eval", "Agent eval"],
        rows: [
          ["What's graded", "Final response", "Full trajectory + final response"],
          ["Tool use", "N/A", "Did it call the right tools in the right order?"],
          ["Memory", "N/A", "Did it maintain context across turns?"],
          ["Escalation", "Single decision", "Did it recognize the right moment to hand off?"],
          ["Cost", "Tokens per response", "Tokens × steps × tool calls"],
          ["Failure modes", "Wrong answer", "Loops, wrong tools, lost context, premature escalation"],
        ]
      },
      {
        type: "callout",
        label: "The PM framing",
        text: "Agent evals require you to define what 'done well' looks like at every step, not just at the end. That's a product decision masquerading as a technical one. The PM's job is to write those definitions."
      }
    ]
  },
  {
    id: "eval-loop",
    label: "The eval loop",
    icon: "↻",
    content: [
      {
        type: "lead",
        text: "Evals are only useful inside a loop. A one-off score tells you where you are. A loop tells you whether you're improving."
      },
      {
        type: "loop-steps",
        steps: [
          { num: "01", label: "Build dataset", color: "#a78bfa", desc: "Start with 20–30 handcrafted test cases covering your most important and most failure-prone scenarios. Each case needs a user message, expected agent behaviour, and a minimum acceptable score per dimension." },
          { num: "02", label: "Run evals", color: C.blue, desc: "Run all graders against all test cases. Collect scores per dimension per case. Track which cases passed and which failed against your thresholds." },
          { num: "03", label: "Analyse failures", color: C.yellow, desc: "This is where the value lives. Read every failure's reasoning — not just its score. Two score-2 failures might have completely different root causes. The score tells you something broke. The reasoning tells you what to fix." },
          { num: "04", label: "Improve", color: C.green, desc: "Edit the system prompt, the few-shot examples, the tool definitions, or the grounding data — whatever the failure analysis points to. Then re-run and compare. Never ship a change that moves a score without understanding why." },
        ]
      },
      {
        type: "callout",
        label: "Cadence",
        text: "Run evals on every prompt change, every model version update, and every significant data change. Treat them like CI/CD for your AI system — not a quarterly audit."
      }
    ]
  }
];

// ─── RUBRICS & PROMPTS ───────────────────────────────────────────────────────

const INSPECT_ITEMS = [
  {
    id: "relevance",
    label: "Relevance",
    color: "#60a5fa",
    what: "Does the agent's response address what the customer actually asked — their literal question AND their underlying intent?",
    rubric: `1 — Off-topic: addresses something the customer did not ask about. Could have been sent to a different question entirely.

2 — Adjacent: right general area but targets a related issue rather than the one actually raised. Customer would need to ask again.

3 — Partial: addresses the main topic but ignores a secondary part of the message that also needed answering.

4 — On-topic with minor drift: directly addresses the question but includes unnecessary content that pulls attention away.

5 — Exactly on-target: every sentence is directed at what the customer asked. Nothing missing, nothing irrelevant.`,
    prompt: `You are a strict QA evaluator for a customer support AI.
Evaluate ONLY RELEVANCE — whether the agent addressed what the customer actually asked.
Do not evaluate tone, accuracy, completeness, or helpfulness.

Rubric:
1 = Off-topic (addressed the wrong thing entirely)
2 = Adjacent (right area, wrong issue)
3 = Partial (main topic addressed, secondary ignored)
4 = On-topic with minor drift (unnecessary content present)
5 = Exactly on-target (every sentence addresses the ask)

IMPORTANT:
- Judge what the customer MEANT, not just what they typed
- If the customer asked multiple questions, score 3 or below if any was ignored
- Ignore response quality — a relevant bad answer scores 5 if it addresses the right thing

Customer message: {user_message}
Agent response: {agent_response}

Reason in 2 sentences, then return ONLY valid JSON:
{"reasoning": "...", "score": 1-5, "low_confidence": true/false}`,
    biasNote: "This judge is vulnerable to verbosity bias — a long response that addresses the question plus adds tangential content should score 4, not 5. The rubric explicitly defines score 4 to catch this."
  },
  {
    id: "helpfulness",
    label: "Helpfulness",
    color: "#4ade80",
    what: "Did the response actually help the customer? Are they better off after reading it?",
    rubric: `1 — Ignored or misunderstood the question. The customer gains nothing.

2 — Related but didn't address the actual need. Customer still stuck.

3 — Partially helpful, important gaps remain. Customer has partial progress.

4 — Main need addressed, minor gaps or unclear next steps. Customer can mostly proceed.

5 — Fully resolved. Next step is obvious. Customer is unblocked.`,
    prompt: `You are a strict QA evaluator for a customer support AI.
Evaluate ONLY HELPFULNESS — did the response actually help the customer?

Rubric:
1 = Ignored or misunderstood the question
2 = Related but missed the actual need
3 = Partially helpful, important gaps remain
4 = Main need addressed, minor gaps
5 = Fully resolved, next step is obvious

IMPORTANT:
- Evaluate whether the customer is BETTER OFF after reading the response
- A polite non-answer scores 1, not 3
- A response that correctly says "I can't help with that" when appropriate can still score 4+
- Do not reward length or politeness — only substantive helpfulness

Customer message: {user_message}
Agent response: {agent_response}

Reason in 2 sentences, then return ONLY valid JSON:
{"reasoning": "...", "score": 1-5, "low_confidence": true/false}`,
    biasNote: "Agreeableness bias is most dangerous here. The judge tends to give 3 when the correct score is 1–2. The 'polite non-answer scores 1' instruction directly counteracts this."
  },
  {
    id: "escalation",
    label: "Escalation judgment",
    color: "#fb923c",
    what: "Did the agent correctly decide whether to escalate to a human? Did it recognise the right triggers?",
    rubric: `1 — Should have escalated, didn't. Clear escalation signal was ignored.

2 — Escalation signals present but only weakly acknowledged. No clear action.

3 — Reasonable judgment with minor missed signals or awkward framing.

4 — Correctly identified escalation need, minor phrasing issues only.

5 — Perfect: escalated when needed (and explained why), didn't escalate when not needed.

Escalation triggers: legal threats, billing disputes, extreme frustration, repeat failures, safety issues, requests beyond agent scope.
If NO trigger exists and agent didn't escalate → score 5 automatically.`,
    prompt: `You are a strict QA evaluator for a customer support AI.
Evaluate ONLY ESCALATION JUDGMENT — did the agent correctly decide whether to escalate?

Rubric:
1 = Should have escalated, didn't (clear trigger ignored)
2 = Signals present, only weakly acknowledged
3 = Reasonable judgment, minor missed signals
4 = Correctly identified need, minor phrasing issues
5 = Perfect escalation judgment

Escalation triggers: legal threats ("I'll dispute this charge"), billing disputes, extreme frustration, repeat failures, safety issues.
IMPORTANT: If NO escalation trigger exists in the customer message and the agent did NOT escalate → automatically score 5.

Customer message: {user_message}
Agent response: {agent_response}

Reason in 2 sentences, then return ONLY valid JSON:
{"reasoning": "...", "score": 1-5, "low_confidence": true/false}`,
    biasNote: "This judge has a binary quality — either a trigger exists or it doesn't. The 'auto score 5 when no trigger exists' rule prevents the judge from penalising agents for not escalating routine queries."
  }
];

// ─── PLAYGROUND DATA ─────────────────────────────────────────────────────────

const TEST_CASES = [
  { id: "tc_01", label: "Late delivery", user_message: "My order hasn't arrived and it's been 2 weeks. I need it for an event this weekend.", expected_min: { relevance: 4, helpfulness: 4, escalation: 4 } },
  { id: "tc_02", label: "Cancel + double charge", user_message: "How do I cancel my subscription? I've been charged twice this month.", expected_min: { relevance: 4, helpfulness: 4, escalation: 3 } },
  { id: "tc_03", label: "Angry + dispute threat", user_message: "This is absolutely unacceptable. I've been waiting 3 weeks and no one helps me. I'm going to dispute this charge with my bank.", expected_min: { relevance: 4, helpfulness: 3, escalation: 5 } },
  { id: "tc_04", label: "Vague complaint", user_message: "It's not working", expected_min: { relevance: 3, helpfulness: 2, escalation: 2 } },
  { id: "tc_05", label: "Damaged item refund", user_message: "I'd like a refund for order #48291. The product arrived damaged.", expected_min: { relevance: 4, helpfulness: 4, escalation: 3 } },
];

const PRESETS = {
  weak: {
    label: "Weak prompt",
    value: `You are a helpful customer support agent for an e-commerce company.
Be polite and professional. Answer customer questions clearly and concisely.
If you cannot resolve an issue, apologize and suggest they contact support.`
  },
  strong: {
    label: "Strong prompt",
    value: `You are a customer support agent for an e-commerce company.

Before responding, identify:
1. What the customer literally asked
2. What they actually need (their underlying goal)
3. Whether this requires human escalation

Escalation triggers — recommend a human agent immediately if you see:
- Dispute or chargeback threats
- Legal language
- Extreme frustration (repeated failed attempts)
- Complex billing issues

Rules:
- Address BOTH the literal ask and the underlying need
- Give a concrete next step in every response
- When escalating, explain why and what the human agent will do
- Never give a generic answer to a specific problem`
  }
};

const DIMS = ["relevance", "helpfulness", "escalation"];

function buildJudgePrompt(dim, userMessage, agentResponse) {
  const item = INSPECT_ITEMS.find(i => i.id === dim);
  return item.prompt.replace("{user_message}", userMessage).replace("{agent_response}", agentResponse);
}

async function callAgent(systemPrompt, userMessage) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text ?? "[no response]";
}

async function callJudge(dim, userMessage, agentResponse) {
  const prompt = buildJudgePrompt(dim, userMessage, agentResponse);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const raw = data.content?.[0]?.text ?? "{}";
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    const m = raw.match(/"score"\s*:\s*(\d)/);
    return { score: m ? parseInt(m[1]) : null, reasoning: "[parse error — see raw output]", low_confidence: true };
  }
}

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────

function Tag({ children, color }) {
  return (
    <span style={{
      fontFamily: C.mono, fontSize: 10, letterSpacing: "0.06em",
      padding: "2px 7px", borderRadius: 4,
      background: color + "18", color, border: `1px solid ${color}33`,
    }}>{children}</span>
  );
}

function Callout({ label, text }) {
  return (
    <div style={{ borderLeft: `2px solid ${C.green}`, padding: "12px 16px", background: "rgba(74,222,128,0.05)", borderRadius: "0 8px 8px 0", margin: "20px 0" }}>
      <div style={{ fontSize: 10, fontFamily: C.mono, letterSpacing: "0.1em", textTransform: "uppercase", color: C.green, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#aaa", lineHeight: 1.7 }}>{text}</div>
    </div>
  );
}

function ScoreBar({ score }) {
  return (
    <div style={{ height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden", marginTop: 5 }}>
      <div style={{ width: `${score ? (score / 5) * 100 : 0}%`, height: "100%", background: scoreColor(score), borderRadius: 2, transition: "width 0.7s ease" }} />
    </div>
  );
}

// ─── MODULE 1: THEORY ────────────────────────────────────────────────────────

function TheoryModule() {
  const [active, setActive] = useState("what");
  const section = THEORY_SECTIONS.find(s => s.id === active);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 0, minHeight: 600 }}>
      {/* Sidebar */}
      <div style={{ borderRight: `1px solid ${C.border}`, padding: "8px 0" }}>
        {THEORY_SECTIONS.map(s => (
          <button key={s.id} onClick={() => setActive(s.id)} style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
            padding: "10px 16px", background: active === s.id ? "rgba(255,255,255,0.05)" : "transparent",
            border: "none", borderRight: active === s.id ? `2px solid ${C.green}` : "2px solid transparent",
            color: active === s.id ? C.text : C.muted, cursor: "pointer", transition: "all 0.15s",
            fontFamily: C.sans, fontSize: 13,
          }}>
            <span style={{ fontFamily: C.mono, fontSize: 12, color: active === s.id ? C.green : C.dim }}>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "28px 32px", overflowY: "auto", maxHeight: 680 }}>
        <div style={{ fontSize: 10, fontFamily: C.mono, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, marginBottom: 16 }}>
          {THEORY_SECTIONS.findIndex(s => s.id === active) + 1} of {THEORY_SECTIONS.length} · {section.label}
        </div>

        {section.content.map((block, i) => {
          if (block.type === "lead") return (
            <p key={i} style={{ fontSize: 17, fontWeight: 500, color: C.text, lineHeight: 1.6, marginBottom: 20, letterSpacing: "-0.01em" }}>{block.text}</p>
          );
          if (block.type === "p") return (
            <p key={i} style={{ fontSize: 14, color: "#999", lineHeight: 1.75, marginBottom: 16 }}>{block.text}</p>
          );
          if (block.type === "callout") return <Callout key={i} label={block.label} text={block.text} />;

          if (block.type === "comparison") return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "20px 0" }}>
              {[block.left, block.right].map((side, j) => (
                <div key={j} style={{
                  background: j === 1 ? "rgba(74,222,128,0.05)" : "rgba(248,113,113,0.05)",
                  border: `1px solid ${j === 1 ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)"}`,
                  borderRadius: 8, padding: "14px 16px"
                }}>
                  <div style={{ fontSize: 11, fontFamily: C.mono, letterSpacing: "0.08em", textTransform: "uppercase", color: j === 1 ? C.green : C.red, marginBottom: 10 }}>{side.label}</div>
                  {side.items.map((item, k) => (
                    <div key={k} style={{ fontSize: 13, color: "#aaa", lineHeight: 1.6, paddingLeft: 12, position: "relative", marginBottom: 4 }}>
                      <span style={{ position: "absolute", left: 0, color: j === 1 ? C.green : C.red }}>{j === 1 ? "+" : "−"}</span>
                      {item}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          );

          if (block.type === "grader-cards") return (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 12, margin: "20px 0" }}>
              {block.cards.map((card, j) => (
                <div key={j} style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${card.color}`, borderRadius: "0 8px 8px 0", padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: card.color }}>{card.name}</div>
                    <Tag color={card.color}>{card.speed}</Tag>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontFamily: C.mono }}>BEST FOR: {card.when}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                    {card.examples.map((ex, k) => (
                      <span key={k} style={{ fontSize: 11, color: "#888", background: "rgba(255,255,255,0.04)", padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.border}` }}>{ex}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: C.dim, fontFamily: C.mono, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>⚠ {card.limit}</div>
                </div>
              ))}
            </div>
          );

          if (block.type === "bias-cards") return (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 12, margin: "20px 0" }}>
              {block.cards.map((card, j) => (
                <div key={j} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{card.name}</div>
                    <Tag color={card.severityColor}>{card.severity}</Tag>
                  </div>
                  <div style={{ fontSize: 13, color: "#999", lineHeight: 1.65, marginBottom: 10 }}>{card.description}</div>
                  <div style={{ fontSize: 12, color: C.green, background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 6, padding: "8px 12px", fontFamily: C.mono }}>FIX: {card.fix}</div>
                </div>
              ))}
            </div>
          );

          if (block.type === "table") return (
            <div key={i} style={{ margin: "20px 0", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>{block.headers.map((h, k) => (
                    <th key={k} style={{ textAlign: "left", padding: "8px 12px", borderBottom: `1px solid ${C.border}`, color: C.muted, fontFamily: C.mono, letterSpacing: "0.06em", fontSize: 10, textTransform: "uppercase", fontWeight: 400 }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {block.rows.map((row, k) => (
                    <tr key={k} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                      {row.map((cell, l) => (
                        <td key={l} style={{ padding: "9px 12px", color: l === 0 ? C.text : "#888", fontSize: 12, lineHeight: 1.5, fontFamily: l === 0 ? C.mono : C.sans }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );

          if (block.type === "loop-steps") return (
            <div key={i} style={{ margin: "20px 0" }}>
              {block.steps.map((step, j) => (
                <div key={j} style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                  <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", background: step.color + "18", border: `1px solid ${step.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.mono, fontSize: 11, color: step.color, fontWeight: 700 }}>{step.num}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 5 }}>{step.label}</div>
                    <div style={{ fontSize: 13, color: "#888", lineHeight: 1.7 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          );

          return null;
        })}

        {/* Nav */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
          {(() => {
            const idx = THEORY_SECTIONS.findIndex(s => s.id === active);
            return (
              <>
                {idx > 0
                  ? <button onClick={() => setActive(THEORY_SECTIONS[idx - 1].id)} style={{ fontFamily: C.mono, fontSize: 11, color: C.muted, background: "none", border: `1px solid ${C.border}`, padding: "6px 14px", borderRadius: 6, cursor: "pointer" }}>← prev</button>
                  : <div />}
                {idx < THEORY_SECTIONS.length - 1
                  ? <button onClick={() => setActive(THEORY_SECTIONS[idx + 1].id)} style={{ fontFamily: C.mono, fontSize: 11, color: C.green, background: "rgba(74,222,128,0.08)", border: `1px solid rgba(74,222,128,0.25)`, padding: "6px 14px", borderRadius: 6, cursor: "pointer" }}>next →</button>
                  : <Tag color={C.green}>COMPLETE</Tag>}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ─── MODULE 2: INSPECT ───────────────────────────────────────────────────────

function InspectModule() {
  const [active, setActive] = useState("relevance");
  const [view, setView] = useState("rubric");
  const item = INSPECT_ITEMS.find(i => i.id === active);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 0, minHeight: 600 }}>
      <div style={{ borderRight: `1px solid ${C.border}`, padding: "8px 0" }}>
        {INSPECT_ITEMS.map(i => (
          <button key={i.id} onClick={() => setActive(i.id)} style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
            padding: "10px 16px", background: active === i.id ? "rgba(255,255,255,0.05)" : "transparent",
            border: "none", borderRight: active === i.id ? `2px solid ${i.color}` : "2px solid transparent",
            color: active === i.id ? C.text : C.muted, cursor: "pointer", transition: "all 0.15s",
            fontFamily: C.sans, fontSize: 13,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: i.color, opacity: active === i.id ? 1 : 0.3 }} />
            {i.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "24px 28px", overflowY: "auto", maxHeight: 680 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: item.color, marginBottom: 6 }}>{item.label}</div>
            <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6, maxWidth: 500 }}>{item.what}</div>
          </div>
          <Tag color={item.color}>READ-ONLY</Tag>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
          {["rubric", "prompt", "biases"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "7px 16px", background: "none", border: "none",
              borderBottom: view === v ? `2px solid ${item.color}` : "2px solid transparent",
              color: view === v ? C.text : C.muted, fontFamily: C.mono, fontSize: 11,
              letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
              transition: "all 0.15s", marginBottom: -1,
            }}>{v}</button>
          ))}
        </div>

        {view === "rubric" && (
          <div>
            <div style={{ fontSize: 11, fontFamily: C.mono, color: C.muted, letterSpacing: "0.08em", marginBottom: 12 }}>SCORING RUBRIC · 1–5 SCALE</div>
            {item.rubric.split("\n\n").map((line, i) => {
              const score = parseInt(line[0]);
              return (
                <div key={i} style={{
                  display: "flex", gap: 14, padding: "12px 14px", marginBottom: 8,
                  background: score ? scoreBg(score) : C.surface,
                  border: `1px solid ${score ? scoreColor(score) + "25" : C.border}`,
                  borderRadius: 8,
                }}>
                  {score ? <div style={{ flexShrink: 0, fontSize: 20, fontWeight: 700, fontFamily: C.mono, color: scoreColor(score), width: 20, lineHeight: 1.3 }}>{score}</div> : null}
                  <div style={{ fontSize: 13, color: "#bbb", lineHeight: 1.65 }}>{score ? line.slice(4) : line}</div>
                </div>
              );
            })}
          </div>
        )}

        {view === "prompt" && (
          <div>
            <div style={{ fontSize: 11, fontFamily: C.mono, color: C.muted, letterSpacing: "0.08em", marginBottom: 12 }}>JUDGE PROMPT · SENT TO EVALUATOR MODEL</div>
            <div style={{
              background: "#0d0d0d", border: `1px solid ${C.border2}`, borderRadius: 8,
              padding: "16px 18px", fontFamily: C.mono, fontSize: 12, lineHeight: 1.8,
              color: "#ccc", whiteSpace: "pre-wrap", userSelect: "none",
            }}>
              {item.prompt.split(/(\{[^}]+\})/).map((part, i) =>
                part.match(/^\{[^}]+\}$/)
                  ? <span key={i} style={{ color: item.color, background: item.color + "18", borderRadius: 3, padding: "0 3px" }}>{part}</span>
                  : part
              )}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: C.dim, fontFamily: C.mono }}>
              ↑ highlighted fields are filled at runtime with the actual message and response
            </div>
          </div>
        )}

        {view === "biases" && (
          <div>
            <div style={{ fontSize: 11, fontFamily: C.mono, color: C.muted, letterSpacing: "0.08em", marginBottom: 12 }}>KNOWN BIASES · THIS DIMENSION</div>
            <div style={{ background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.2)", borderRadius: 8, padding: "14px 16px", fontSize: 13, color: "#bbb", lineHeight: 1.7 }}>
              {item.biasNote}
            </div>
            <Callout label="General mitigation" text="Always use a different model family as judge than the model being evaluated. Run each judge call at temperature 0 for consistency. Validate periodically against human labels on 20–30 cases." />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MODULE 3: PLAYGROUND ────────────────────────────────────────────────────

const STORAGE_KEY = "eval_playground_runs";

function loadRuns() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRun(run) {
  try {
    const runs = loadRuns();
    runs.unshift(run);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs.slice(0, 10)));
  } catch {}
}

function PlaygroundModule() {
  const [systemPrompt, setSystemPrompt] = useState(PRESETS.weak.value);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [activeCase, setActiveCase] = useState(0);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [pastRuns, setPastRuns] = useState(loadRuns);
  const [compareRun, setCompareRun] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const abortRef = useRef(false);

  async function runEval() {
    setRunning(true);
    setResults(null);
    abortRef.current = false;
    const total = TEST_CASES.length * (1 + DIMS.length);
    let done = 0;
    setProgress({ done: 0, total });
    const allResults = [];

    for (const tc of TEST_CASES) {
      if (abortRef.current) break;
      const agentResponse = await callAgent(systemPrompt, tc.user_message);
      done++;
      setProgress({ done, total });
      const scores = {};
      for (const dim of DIMS) {
        if (abortRef.current) break;
        scores[dim] = await callJudge(dim, tc.user_message, agentResponse);
        done++;
        setProgress({ done, total });
      }
      allResults.push({ ...tc, agentResponse, scores });
      setResults([...allResults]);
    }

    if (!abortRef.current && allResults.length === TEST_CASES.length) {
      const run = { id: Date.now(), label: systemPrompt.slice(0, 60) + "…", prompt: systemPrompt, ts: new Date().toLocaleTimeString(), results: allResults };
      saveRun(run);
      setPastRuns(loadRuns());
    }
    setRunning(false);
  }

  // Compute aggregates
  const avgScores = DIMS.map(dim => {
    if (!results) return null;
    const vals = results.map(r => r.scores[dim]?.score).filter(v => v != null);
    return vals.length ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : null;
  });

  const compareAvg = DIMS.map(dim => {
    if (!compareRun) return null;
    const vals = compareRun.results.map(r => r.scores[dim]?.score).filter(v => v != null);
    return vals.length ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : null;
  });

  const passRates = DIMS.map(dim => {
    if (!results) return null;
    const passed = results.filter(r => (r.scores[dim]?.score ?? 0) >= r.expected_min[dim]).length;
    return Math.round((passed / results.length) * 100);
  });

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* LEFT */}
        <div>
          <div style={{ fontSize: 10, fontFamily: C.mono, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>System Prompt</div>
          <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} disabled={running} style={{
            width: "100%", boxSizing: "border-box", background: C.surface,
            border: `1px solid ${C.border}`, borderRadius: 8, color: "#d4d4d4",
            fontFamily: C.mono, fontSize: 12, lineHeight: 1.75, padding: "14px 16px",
            resize: "vertical", minHeight: 200, outline: "none", transition: "border-color 0.2s",
          }}
            onFocus={e => e.target.style.borderColor = C.border2}
            onBlur={e => e.target.style.borderColor = C.border}
          />

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {Object.entries(PRESETS).map(([key, p]) => (
              <button key={key} onClick={() => setSystemPrompt(p.value)} disabled={running} style={{
                fontSize: 11, fontFamily: C.mono, padding: "5px 12px", borderRadius: 5,
                border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer",
              }}
                onMouseOver={e => { e.target.style.color = C.text; e.target.style.borderColor = C.border2; }}
                onMouseOut={e => { e.target.style.color = C.muted; e.target.style.borderColor = C.border; }}
              >{p.label}</button>
            ))}
          </div>

          <button onClick={running ? () => { abortRef.current = true; } : runEval} style={{
            marginTop: 12, width: "100%", padding: "11px",
            borderRadius: 8, border: "none", cursor: "pointer",
            background: running ? "rgba(248,113,113,0.12)" : "rgba(74,222,128,0.12)",
            color: running ? C.red : C.green,
            fontFamily: C.mono, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
            outline: `1px solid ${running ? C.red + "33" : C.green + "33"}`,
            transition: "all 0.2s",
          }}>
            {running ? `■ STOP  ·  ${progress.done}/${progress.total} calls` : "▶  RUN EVAL  ·  5 cases × 4 API calls"}
          </button>

          {running && (
            <div style={{ marginTop: 6, height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1 }}>
              <div style={{ height: "100%", background: C.green, borderRadius: 1, width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`, transition: "width 0.3s" }} />
            </div>
          )}

          {/* History */}
          <div style={{ marginTop: 16 }}>
            <button onClick={() => setShowHistory(h => !h)} style={{
              fontSize: 10, fontFamily: C.mono, letterSpacing: "0.1em", textTransform: "uppercase",
              color: C.muted, background: "none", border: "none", cursor: "pointer", padding: 0,
            }}>
              {showHistory ? "▾" : "▸"} run history ({pastRuns.length})
            </button>

            {showHistory && pastRuns.length > 0 && (
              <div style={{ marginTop: 8, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
                {pastRuns.map((run, i) => (
                  <div key={run.id} style={{
                    padding: "9px 14px", borderBottom: i < pastRuns.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    cursor: "pointer", transition: "background 0.15s",
                  }}
                    onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                    onMouseOut={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div>
                      <div style={{ fontSize: 11, color: "#aaa" }}>{run.label}</div>
                      <div style={{ fontSize: 10, color: C.dim, fontFamily: C.mono }}>{run.ts}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { setResults(run.results); setActiveTab("dashboard"); }} style={{ fontSize: 10, fontFamily: C.mono, padding: "3px 9px", borderRadius: 4, border: `1px solid ${C.border}`, background: "none", color: C.muted, cursor: "pointer" }}>load</button>
                      <button onClick={() => { setCompareRun(compareRun?.id === run.id ? null : run); }} style={{
                        fontSize: 10, fontFamily: C.mono, padding: "3px 9px", borderRadius: 4,
                        border: `1px solid ${compareRun?.id === run.id ? C.blue + "66" : C.border}`,
                        background: compareRun?.id === run.id ? "rgba(96,165,250,0.1)" : "none",
                        color: compareRun?.id === run.id ? C.blue : C.muted, cursor: "pointer",
                      }}>{compareRun?.id === run.id ? "unpin" : "compare"}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {compareRun && (
              <div style={{ marginTop: 8, fontSize: 11, color: C.blue, fontFamily: C.mono, background: "rgba(96,165,250,0.08)", border: `1px solid rgba(96,165,250,0.2)`, borderRadius: 6, padding: "7px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>comparing vs: {compareRun.label.slice(0, 45)}…</span>
                <button onClick={() => setCompareRun(null)} style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", fontFamily: C.mono, fontSize: 11 }}>✕</button>
              </div>
            )}
          </div>

          {/* How it works */}
          <div style={{ marginTop: 16, background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontFamily: C.mono, letterSpacing: "0.1em", textTransform: "uppercase", color: C.dim, marginBottom: 6 }}>How this works</div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
              Each case runs <span style={{ color: "#aaa", fontFamily: C.mono }}>4 API calls</span>: one agent call with your prompt, then one LLM-as-judge call per dimension. Judge scores on a 1–5 rubric and explains its reasoning. Runs are saved automatically — compare any two from history.
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div>
          <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: `1px solid ${C.border}` }}>
            {["dashboard", "traces"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: "7px 16px", background: "none", border: "none",
                borderBottom: activeTab === tab ? `2px solid ${C.green}` : "2px solid transparent",
                color: activeTab === tab ? C.text : C.muted, fontFamily: C.mono, fontSize: 11,
                letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
                transition: "all 0.15s", marginBottom: -1,
              }}>{tab}</button>
            ))}
          </div>

          {activeTab === "dashboard" && (
            <DashboardTab
              results={results} running={running} compareRun={compareRun}
              avgScores={avgScores} compareAvg={compareAvg} passRates={passRates}
              onRowClick={i => { setActiveCase(i); setActiveTab("traces"); }}
              progress={progress}
            />
          )}

          {activeTab === "traces" && (
            <TracesTab results={results} activeCase={activeCase} setActiveCase={setActiveCase} running={running} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD TAB ───────────────────────────────────────────────────────────

function DashboardTab({ results, running, compareRun, avgScores, compareAvg, passRates, onRowClick, progress }) {
  return (
    <div>
      {/* Score cards with delta */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        {DIMS.map((dim, i) => {
          const score = avgScores[i];
          const cmp = compareAvg[i];
          const delta = score !== null && cmp !== null ? (score - cmp).toFixed(1) : null;
          return (
            <div key={dim} style={{
              flex: 1, background: score !== null ? scoreBg(score) : "rgba(255,255,255,0.02)",
              border: `1px solid ${score !== null ? scoreColor(score) + "30" : C.border}`,
              borderRadius: 8, padding: "12px 14px",
            }}>
              <div style={{ fontSize: 10, fontFamily: C.mono, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, marginBottom: 4 }}>{dim}</div>
              {running && !results
                ? <div style={{ fontSize: 22, fontWeight: 700, color: C.dim, fontFamily: C.mono }}>—</div>
                : <div style={{ fontSize: 22, fontWeight: 700, color: score !== null ? scoreColor(score) : C.dim, fontFamily: C.mono }}>
                  {score ?? "—"}
                  <span style={{ fontSize: 12, color: C.dim, fontWeight: 400 }}>/5</span>
                </div>
              }
              {delta !== null && (
                <div style={{ fontSize: 11, fontFamily: C.mono, color: parseFloat(delta) > 0 ? C.green : parseFloat(delta) < 0 ? C.red : C.muted, marginTop: 3 }}>
                  {parseFloat(delta) > 0 ? "↑" : parseFloat(delta) < 0 ? "↓" : "="} {Math.abs(delta)} vs compare
                </div>
              )}
              <ScoreBar score={running && !results ? null : score} />
            </div>
          );
        })}
      </div>

      {/* Pass rates */}
      {results && (
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          {DIMS.map((dim, i) => (
            <div key={dim} style={{ flex: 1, background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px" }}>
              <div style={{ fontSize: 10, color: C.dim, fontFamily: C.mono, letterSpacing: "0.08em", textTransform: "uppercase" }}>pass rate</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: C.mono, color: passRates[i] >= 80 ? C.green : passRates[i] >= 60 ? C.yellow : C.red, marginTop: 2 }}>
                {passRates[i]}%
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Per-case table with failure explainer */}
      {results ? (
        <div style={{ background: "rgba(255,255,255,0.01)", border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 54px 54px 54px", padding: "7px 14px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, color: C.dim, fontFamily: C.mono, letterSpacing: "0.08em", textTransform: "uppercase" }}>test case</div>
            {DIMS.map(d => <div key={d} style={{ fontSize: 10, color: C.dim, fontFamily: C.mono, letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center" }}>{d.slice(0, 3)}</div>)}
          </div>

          {results.map((r, i) => {
            const failures = DIMS.filter(d => (r.scores[d]?.score ?? 0) < r.expected_min[d]);
            const hasFailure = failures.length > 0;
            return (
              <RowWithExplainer key={r.id} r={r} i={i} failures={failures} hasFailure={hasFailure}
                onTrace={() => onRowClick(i)} compareResult={compareRun?.results?.[i]}
              />
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "52px 0", color: running ? C.dim : "#2a2a2a", fontSize: 12, fontFamily: C.mono }}>
          {running ? `running · ${progress.done}/${progress.total} api calls` : "run the eval to see results"}
        </div>
      )}
    </div>
  );
}

function RowWithExplainer({ r, i, failures, hasFailure, onTrace, compareResult }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderBottom: `1px solid rgba(255,255,255,0.03)` }}>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 54px 54px 54px", padding: "9px 14px", cursor: "pointer", transition: "background 0.15s" }}
        onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
        onMouseOut={e => e.currentTarget.style.background = "transparent"}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {hasFailure && <span style={{ fontSize: 8, color: C.red, fontFamily: C.mono }}>▼</span>}
          <span style={{ fontSize: 12, color: hasFailure ? "#ddd" : "#aaa" }}>{r.label}</span>
          {!hasFailure && <span style={{ fontSize: 9, color: "#333", fontFamily: C.mono }}>▸ trace</span>}
        </div>
        {DIMS.map(d => {
          const s = r.scores[d]?.score;
          const cs = compareResult?.scores[d]?.score;
          const delta = s !== null && s !== undefined && cs !== null && cs !== undefined ? s - cs : null;
          return (
            <div key={d} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 700, color: s != null ? scoreColor(s) : C.dim }}>{s ?? "—"}</div>
              {delta !== null && <div style={{ fontSize: 9, fontFamily: C.mono, color: delta > 0 ? C.green : delta < 0 ? C.red : C.dim }}>{delta > 0 ? "↑" : delta < 0 ? "↓" : "="}{Math.abs(delta)}</div>}
            </div>
          );
        })}
      </div>

      {/* Failure explainer */}
      {open && (
        <div style={{ padding: "0 14px 14px", borderTop: `1px solid rgba(255,255,255,0.04)`, background: "rgba(255,255,255,0.01)" }}>
          {hasFailure ? (
            <div>
              <div style={{ fontSize: 10, fontFamily: C.mono, color: C.red, letterSpacing: "0.1em", textTransform: "uppercase", padding: "10px 0 8px" }}>
                Why did this fail?
              </div>
              {failures.map(dim => (
                <div key={dim} style={{ marginBottom: 10, background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <Tag color={C.red}>{dim}</Tag>
                    <span style={{ fontFamily: C.mono, fontSize: 12, color: scoreColor(r.scores[dim]?.score) }}>
                      scored {r.scores[dim]?.score ?? "?"} · needed {r.expected_min[dim]}+
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.65, fontFamily: C.mono }}>
                    {r.scores[dim]?.reasoning ?? "No reasoning captured"}
                  </div>
                </div>
              ))}
              <button onClick={e => { e.stopPropagation(); onTrace(); }} style={{
                marginTop: 4, fontSize: 10, fontFamily: C.mono, color: C.muted, background: "none",
                border: `1px solid ${C.border}`, padding: "5px 12px", borderRadius: 5, cursor: "pointer",
              }}>view full trace →</button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 10, fontFamily: C.mono, color: C.green, letterSpacing: "0.1em", textTransform: "uppercase", padding: "10px 0 8px" }}>
                All dimensions passed
              </div>
              {DIMS.map(dim => (
                <div key={dim} style={{ marginBottom: 8, display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <Tag color={C.green}>{dim}</Tag>
                  <div style={{ fontSize: 12, color: "#777", lineHeight: 1.65, fontFamily: C.mono }}>{r.scores[dim]?.reasoning}</div>
                </div>
              ))}
              <button onClick={e => { e.stopPropagation(); onTrace(); }} style={{
                marginTop: 4, fontSize: 10, fontFamily: C.mono, color: C.muted, background: "none",
                border: `1px solid ${C.border}`, padding: "5px 12px", borderRadius: 5, cursor: "pointer",
              }}>view full trace →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── TRACES TAB ──────────────────────────────────────────────────────────────

function TracesTab({ results, activeCase, setActiveCase, running }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {TEST_CASES.map((tc, i) => (
          <button key={tc.id} onClick={() => setActiveCase(i)} style={{
            fontSize: 11, fontFamily: C.mono, padding: "4px 10px", borderRadius: 5,
            border: `1px solid ${activeCase === i ? C.border2 : C.border}`,
            background: activeCase === i ? "rgba(255,255,255,0.07)" : "transparent",
            color: activeCase === i ? C.text : C.muted, cursor: "pointer", transition: "all 0.15s",
          }}>{tc.label}</button>
        ))}
      </div>

      {results?.[activeCase] ? (
        <div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: C.dim, fontFamily: C.mono, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Customer message</div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px", fontSize: 13, color: "#ccc", lineHeight: 1.6 }}>
              {results[activeCase].user_message}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: C.dim, fontFamily: C.mono, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Agent response</div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px", fontSize: 13, color: "#ccc", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
              {results[activeCase].agentResponse}
            </div>
          </div>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: C.mono, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Judge verdicts</div>
          {DIMS.map(dim => {
            const j = results[activeCase].scores[dim];
            const passed = (j?.score ?? 0) >= results[activeCase].expected_min[dim];
            return (
              <div key={dim} style={{
                marginBottom: 8, background: j?.score ? scoreBg(j.score) : "rgba(255,255,255,0.02)",
                border: `1px solid ${j?.score ? scoreColor(j.score) + "30" : C.border}`,
                borderRadius: 8, padding: "12px 14px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontFamily: C.mono, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted }}>{dim}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {j?.low_confidence && <Tag color={C.yellow}>LOW CONF</Tag>}
                    <Tag color={passed ? C.green : C.red}>{passed ? "PASS" : "FAIL"}</Tag>
                    <span style={{ fontSize: 20, fontWeight: 700, fontFamily: C.mono, color: j?.score ? scoreColor(j.score) : C.dim }}>{j?.score ?? "—"}</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#888", lineHeight: 1.65, fontFamily: C.mono }}>{j?.reasoning ?? "—"}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#2a2a2a", fontSize: 12, fontFamily: C.mono }}>
          {running ? "running…" : "run the eval first"}
        </div>
      )}
    </div>
  );
}

// ─── ROOT APP ────────────────────────────────────────────────────────────────

const MODULES = [
  { id: "theory", label: "Theory", num: "01", desc: "Concepts" },
  { id: "inspect", label: "Inspect", num: "02", desc: "Rubrics & prompts" },
  { id: "playground", label: "Playground", num: "03", desc: "Learning by doing" },
];

export default function App() {
  const [module, setModule] = useState("theory");

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: C.sans }}>
      {/* Top nav */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "0 28px", display: "flex", alignItems: "stretch", gap: 0 }}>
        <div style={{ paddingRight: 28, paddingTop: 16, paddingBottom: 16, borderRight: `1px solid ${C.border}`, marginRight: 24, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, boxShadow: `0 0 8px ${C.green}` }} />
            <span style={{ fontSize: 10, fontFamily: C.mono, color: C.dim, letterSpacing: "0.1em" }}>LLM EVAL PLAYGROUND</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text, letterSpacing: "-0.02em" }}>Customer Support Agent</div>
        </div>

        {MODULES.map(m => (
          <button key={m.id} onClick={() => setModule(m.id)} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "0 20px",
            background: "none", border: "none", borderBottom: module === m.id ? `2px solid ${C.green}` : "2px solid transparent",
            color: module === m.id ? C.text : C.muted, cursor: "pointer", transition: "all 0.15s",
            fontFamily: C.sans,
          }}>
            <span style={{ fontFamily: C.mono, fontSize: 10, color: module === m.id ? C.green : C.dim }}>{m.num}</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 13, fontWeight: module === m.id ? 500 : 400 }}>{m.label}</div>
              <div style={{ fontSize: 10, color: C.dim, fontFamily: C.mono }}>{m.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Module content */}
      <div style={{ padding: module === "playground" ? "24px 28px" : "0" }}>
        {module === "theory" && <TheoryModule />}
        {module === "inspect" && <InspectModule />}
        {module === "playground" && <PlaygroundModule />}
      </div>
    </div>
  );
}
