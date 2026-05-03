import { useState, useRef } from "react";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  bg:       "#f9f8f6",
  surface:  "#ffffff",
  surface2: "#f3f2ef",
  border:   "#e2e0db",
  border2:  "#c8c5be",
  text:     "#1a1917",
  muted:    "#6b6860",
  dim:      "#9c9890",
  green:    "#1a7a4a",
  greenBg:  "#edf7f1",
  greenBd:  "#b6dfc9",
  red:      "#b91c1c",
  redBg:    "#fef2f2",
  redBd:    "#fca5a5",
  amber:    "#92400e",
  amberBg:  "#fffbeb",
  amberBd:  "#fcd34d",
  blue:     "#1e40af",
  blueBg:   "#eff6ff",
  blueBd:   "#bfdbfe",
  mono:     "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
  sans:     "'DM Sans', 'Helvetica Neue', sans-serif",
};

const scoreColor = s => {
  if (s == null) return C.dim;
  if (s >= 4.5) return "#166534";
  if (s >= 3.5) return "#3f6212";
  if (s >= 2.5) return "#854d0e";
  if (s >= 1.5) return "#9a3412";
  return "#991b1b";
};
const scoreBg = s => {
  if (s == null) return C.surface2;
  if (s >= 4.5) return "#dcfce7";
  if (s >= 3.5) return "#ecfccb";
  if (s >= 2.5) return "#fef9c3";
  if (s >= 1.5) return "#ffedd5";
  return "#fee2e2";
};
const scoreBorder = s => {
  if (s == null) return C.border;
  if (s >= 4.5) return "#86efac";
  if (s >= 3.5) return "#bef264";
  if (s >= 2.5) return "#fde047";
  if (s >= 1.5) return "#fdba74";
  return "#fca5a5";
};

// ─── THEORY CONTENT ───────────────────────────────────────────────────────────
const THEORY_SECTIONS = [
  {
    id: "what", label: "What are evals?", icon: "◈",
    content: [
      { type: "lead", text: "Evals are systematic tests that measure whether an LLM is doing the right thing, reliably, across many inputs." },
      { type: "p", text: "Traditional software has unit tests. If a function returns the wrong value, the test fails. Deterministically, every time. LLMs break that model. The same prompt can return ten different outputs. A subtle wording change can flip a correct answer to an incorrect one. You can't write an if-statement to catch that." },
      { type: "p", text: "Evals fill that gap. Instead of testing for exact outputs, they test for qualities: Was this response helpful? Did it stay grounded? Did it know when to escalate? Each quality becomes a measurable score." },
      { type: "callout", color: "blue", label: "The PM insight", text: "Evals don't make decisions for you. They make tradeoffs visible. When helpfulness goes up but safety drops after a prompt change. That's the conversation you need to have with your team." },
      { type: "comparison", left: { label: "Without evals", items: ["Shipping on vibes", "Regressions caught by users", "No way to compare prompt versions", "Gut feel for quality"] }, right: { label: "With evals", items: ["Measurable quality bar", "Regressions caught before ship", "A/B prompt comparison", "Evidence for decisions"] } }
    ]
  },
  {
    id: "graders", label: "The 3 grader types", icon: "◉",
    content: [
      { type: "lead", text: "Every eval boils down to one question: how do you decide if an output is good? There are three methods, and you layer them." },
      { type: "grader-cards", cards: [
        { name: "Code-based", color: C.blue, bg: C.blueBg, bd: C.blueBd, speed: "Fast · Cheap · Deterministic", when: "Structural checks", examples: ["Contains forbidden words?", "Is JSON schema valid?", "Within word limit?"], limit: "Can't catch semantic failures: being wrong, rude, or off-topic." },
        { name: "LLM-as-judge", color: C.green, bg: C.greenBg, bd: C.greenBd, speed: "Medium · Scalable · Nuanced", when: "Semantic quality", examples: ["Was this helpful?", "Is the tone appropriate?", "Did it stay on-topic?"], limit: "Subject to biases. Never fully objective." },
        { name: "Human", color: C.amber, bg: C.amberBg, bd: C.amberBd, speed: "Slow · Expensive · Ground truth", when: "Calibration + high-stakes", examples: ["Validate your LLM judge", "Catch edge cases", "Set score thresholds"], limit: "Doesn't scale. Use to calibrate, not to run." }
      ]},
      { type: "callout", color: "green", label: "How to layer them", text: "Code-based graders run first: free and instant. LLM judges handle semantic quality at scale. Human review calibrates your judges periodically and audits the failures that matter most." }
    ]
  },
  {
    id: "biases", label: "Judge biases", icon: "⚠",
    content: [
      { type: "lead", text: "LLM judges are powerful but not objective. Three biases appear consistently in research. Every PM needs to know them." },
      { type: "bias-cards", cards: [
        { name: "Verbosity bias", severity: "Medium", sColor: C.amber, sBg: C.amberBg, sBd: C.amberBd, description: "Judges prefer longer answers even when shorter ones are better. A crisp 2-sentence answer often scores lower than a padded 6-sentence one with identical information.", fix: "Add to rubric: 'Do not reward length. A concise answer that fully resolves the question scores higher than a verbose one.'" },
        { name: "Self-preference bias", severity: "High", sColor: "#c2410c", sBg: "#fff7ed", sBd: "#fdba74", description: "A Claude judge scores Claude responses more favourably. Research shows 10–25% score inflation when model and judge are from the same family.", fix: "Use a different model family as judge. If your agent is Claude, judge with GPT-4o, and vice versa." },
        { name: "Agreeableness bias", severity: "Critical", sColor: C.red, sBg: C.redBg, sBd: C.redBd, description: "The most dangerous one. LLM judges have true-negative rates below 25%. They almost never correctly identify bad outputs as bad.", fix: "Add few-shot examples of clearly bad outputs with correct low scores. Force the judge to justify every score below 3." }
      ]}
    ]
  },
  {
    id: "agent-evals", label: "Why agents are harder", icon: "⬡",
    content: [
      { type: "lead", text: "A simple chatbot eval: input → output → grade. An agent eval is messier: agents act across multiple multiple steps and turns." },
      { type: "p", text: "For a single-turn call, you grade the output. For an agent, you grade the trajectory: every tool call, every reasoning step, every handoff decision. A response can look good at the end even if the path was wasteful, risky, or wrong." },
      { type: "table", headers: ["Dimension", "Single-turn", "Agent"], rows: [
        ["What's graded", "Final response", "Full trajectory + response"],
        ["Tool use", "N/A", "Right tools, right order?"],
        ["Memory", "N/A", "Context across turns?"],
        ["Escalation", "Single decision", "Right moment to hand off?"],
        ["Failure modes", "Wrong answer", "Loops, lost context, wrong tools"],
      ]},
      { type: "callout", color: "blue", label: "The PM framing", text: "Agent evals require you to define what 'done well' looks like at every step, not just the end. That's a product decision masquerading as a technical one." }
    ]
  },
  {
    id: "loop", label: "The eval loop", icon: "↻",
    content: [
      { type: "lead", text: "Evals are only useful inside a loop. A one-off score tells you where you are. A loop tells you whether you're improving." },
      { type: "loop-steps", steps: [
        { num: "01", label: "Build dataset", color: "#6d28d9", desc: "Start with 20–30 handcrafted test cases covering your most important and failure-prone scenarios. Each needs a user message and minimum acceptable score per dimension." },
        { num: "02", label: "Run evals", color: C.blue, desc: "Run all graders against all test cases. Collect scores per dimension. Track which cases passed and which failed your thresholds." },
        { num: "03", label: "Analyse failures", color: C.amber, desc: "This is where the value lives. Read every failure's reasoning, not just its score. Two score-2 failures can have completely different root causes." },
        { num: "04", label: "Improve", color: C.green, desc: "Edit the system prompt, few-shot examples, or grounding data, based on what the failure analysis points to. Re-run and compare. Never ship a change without understanding why a score moved." },
      ]},
      { type: "callout", color: "green", label: "Cadence", text: "Run evals on every prompt change, every model update, every significant data change. Treat them like CI/CD for your AI system, not a quarterly audit." }
    ]
  }
];

// ─── INSPECT DATA ─────────────────────────────────────────────────────────────
const INSPECT_ITEMS = [
  {
    id: "relevance", label: "Relevance", color: C.blue, bg: C.blueBg, bd: C.blueBd,
    what: "Did the agent address what the customer actually asked: their literal question AND their underlying intent?",
    rubric: `1: Off-topic: addresses something the customer did not ask about. Could have been sent to a different question entirely.\n\n2: Adjacent: right general area but targets a related issue rather than the one raised. Customer would need to ask again.\n\n3: Partial: addresses the main topic but ignores a secondary part of the message.\n\n4: On-topic with minor drift: addresses the question but includes unnecessary content.\n\n5: Exactly on-target: every sentence is directed at what the customer asked. Nothing missing, nothing irrelevant.`,
    prompt: `You are a strict QA evaluator for a customer support AI.\nEvaluate ONLY RELEVANCE: whether the agent addressed what the customer actually asked.\nDo not evaluate tone, accuracy, completeness, or helpfulness.\n\nRubric:\n1 = Off-topic\n2 = Adjacent (right area, wrong issue)\n3 = Partial (secondary question ignored)\n4 = On-topic with minor drift\n5 = Exactly on-target\n\nIMPORTANT: Judge intent, not just literal words. If customer asked multiple questions, score 3 or below if any was ignored.\n\nCustomer message: {user_message}\nAgent response: {agent_response}\n\nReason in 2 sentences. Return ONLY a raw JSON object with no markdown, no backticks, no extra text:\n{"reasoning": "...", "score": 1-5, "low_confidence": true/false}`,
    biasNote: "Vulnerable to verbosity bias: a long response that addresses the question plus adds tangential content should score 4, not 5. Score 4 is explicitly defined to catch this."
  },
  {
    id: "helpfulness", label: "Helpfulness", color: C.green, bg: C.greenBg, bd: C.greenBd,
    what: "Did the response actually help the customer? Are they better off after reading it?",
    rubric: `1: Ignored or misunderstood the question. The customer gains nothing.\n\n2: Related but didn't address the actual need. Customer still stuck.\n\n3: Partially helpful, important gaps remain. Customer has partial progress.\n\n4: Main need addressed, minor gaps or unclear next steps.\n\n5: Fully resolved. Next step is obvious. Customer is unblocked.`,
    prompt: `You are a strict QA evaluator for a customer support AI.\nEvaluate ONLY HELPFULNESS: did the response actually help the customer?\n\nRubric:\n1 = Ignored or misunderstood\n2 = Related but missed the need\n3 = Partially helpful, gaps remain\n4 = Main need addressed, minor gaps\n5 = Fully resolved, next step obvious\n\nIMPORTANT: A polite non-answer scores 1, not 3. Evaluate whether the customer is BETTER OFF after reading the response.\n\nCustomer message: {user_message}\nAgent response: {agent_response}\n\nReason in 2 sentences. Return ONLY a raw JSON object with no markdown, no backticks, no extra text:\n{"reasoning": "...", "score": 1-5, "low_confidence": true/false}`,
    biasNote: "Agreeableness bias is most dangerous here. Judges default to 3 when the correct score is 1–2. The 'polite non-answer scores 1' instruction directly counteracts this."
  },
  {
    id: "escalation", label: "Escalation", color: "#c2410c", bg: "#fff7ed", bd: "#fdba74",
    what: "Did the agent correctly decide whether to escalate to a human? Did it recognise the right triggers?",
    rubric: `1: Should have escalated, didn't. Clear trigger was ignored.\n\n2: Signals present but only weakly acknowledged. No clear action taken.\n\n3: Reasonable judgment with minor missed signals.\n\n4: Correctly identified escalation need, minor phrasing issues.\n\n5: Perfect: escalated when needed (explained why), didn't escalate when not needed.\n\nTriggers: legal threats, billing disputes, extreme frustration, repeat failures, safety issues.\nNo trigger present + no escalation = automatic score 5.`,
    prompt: `You are a strict QA evaluator for a customer support AI.\nEvaluate ONLY ESCALATION JUDGMENT: did the agent correctly decide whether to escalate?\n\nRubric:\n1 = Should have escalated, didn't\n2 = Signals present, weakly acknowledged\n3 = Reasonable judgment, minor gaps\n4 = Correctly identified, minor phrasing issues\n5 = Perfect judgment\n\nTriggers: legal threats, billing disputes, extreme frustration, repeat failures, safety issues.\nIMPORTANT: If NO trigger exists and agent did NOT escalate → score 5 automatically.\n\nCustomer message: {user_message}\nAgent response: {agent_response}\n\nReason in 2 sentences. Return ONLY a raw JSON object with no markdown, no backticks, no extra text:\n{"reasoning": "...", "score": 1-5, "low_confidence": true/false}`,
    biasNote: "Binary in nature: either a trigger exists or it doesn't. The 'auto score 5 when no trigger' rule prevents penalising agents for not escalating routine queries."
  }
];

// ─── PLAYGROUND DATA ──────────────────────────────────────────────────────────
const TEST_CASES = [
  { id: "tc_01", label: "Late delivery", user_message: "My order hasn't arrived and it's been 2 weeks. I need it for an event this weekend.", expected_min: { relevance: 4, helpfulness: 4, escalation: 4 } },
  { id: "tc_02", label: "Cancel + double charge", user_message: "How do I cancel my subscription? I've been charged twice this month.", expected_min: { relevance: 4, helpfulness: 4, escalation: 3 } },
  { id: "tc_03", label: "Dispute threat", user_message: "This is absolutely unacceptable. I've been waiting 3 weeks and no one helps me. I'm going to dispute this charge with my bank.", expected_min: { relevance: 4, helpfulness: 3, escalation: 5 } },
  { id: "tc_04", label: "Vague complaint", user_message: "It's not working", expected_min: { relevance: 3, helpfulness: 2, escalation: 2 } },
  { id: "tc_05", label: "Damaged item", user_message: "I'd like a refund for order #48291. The product arrived damaged.", expected_min: { relevance: 4, helpfulness: 4, escalation: 3 } },
];

const PRESETS = {
  weak: { label: "Weak prompt", value: `You are a helpful customer support agent for an e-commerce company.\nBe polite and professional. Answer customer questions clearly and concisely.\nIf you cannot resolve an issue, apologize and suggest they contact support.` },
  strong: { label: "Strong prompt", value: `You are a customer support agent for an e-commerce company.\n\nBefore responding, identify:\n1. What the customer literally asked\n2. What they actually need (their underlying goal)\n3. Whether this requires human escalation\n\nEscalation triggers: recommend a human agent immediately if:\n- Dispute or chargeback threats\n- Legal language\n- Extreme frustration or repeated failures\n- Complex billing issues\n\nRules:\n- Address BOTH the literal ask and underlying need\n- Give a concrete next step in every response\n- When escalating, explain why and what happens next\n- Never give a generic answer to a specific problem` }
};

const DIMS = ["relevance", "helpfulness", "escalation"];
const STORAGE_KEY = "eval_runs_v2";

function loadRuns() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }
function saveRun(run) { try { const r = loadRuns(); r.unshift(run); localStorage.setItem(STORAGE_KEY, JSON.stringify(r.slice(0, 10))); } catch {} }

async function callAgent(system, userMessage) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 400, system, messages: [{ role: "user", content: userMessage }] })
  });
  const d = await res.json();
  return d.content?.[0]?.text ?? "[no response]";
}

async function callJudge(dim, userMsg, agentResp) {
  const item = INSPECT_ITEMS.find(i => i.id === dim);
  const prompt = item.prompt.replace("{user_message}", userMsg).replace("{agent_response}", agentResp);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 300, messages: [{ role: "user", content: prompt }] })
  });
  const d = await res.json();
  const raw = d.content?.[0]?.text ?? "{}";
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  try { return JSON.parse(jsonMatch ? jsonMatch[0] : cleaned); }
  catch { const m = raw.match(/"score"\s*:\s*(\d)/); return { score: m ? parseInt(m[1]) : null, reasoning: "[could not parse judge response]", low_confidence: true }; }
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Pill({ children, color, bg, bd }) {
  return <span style={{ fontSize: 11, fontFamily: C.mono, padding: "2px 8px", borderRadius: 4, background: bg, color, border: `1px solid ${bd}`, fontWeight: 600 }}>{children}</span>;
}

function Callout({ color = "blue", label, text }) {
  const map = { blue: [C.blue, C.blueBg, C.blueBd], green: [C.green, C.greenBg, C.greenBd], amber: [C.amber, C.amberBg, C.amberBd] };
  const [c, bg, bd] = map[color];
  return (
    <div style={{ borderLeft: `3px solid ${c}`, padding: "12px 16px", background: bg, borderRadius: "0 8px 8px 0", margin: "20px 0", border: `1px solid ${bd}`, borderLeftColor: c }}>
      <div style={{ fontSize: 10, fontFamily: C.mono, letterSpacing: "0.1em", textTransform: "uppercase", color: c, marginBottom: 5, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>{text}</div>
    </div>
  );
}

function ScoreBar({ score }) {
  return (
    <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden", marginTop: 6 }}>
      <div style={{ width: `${score ? (score / 5) * 100 : 0}%`, height: "100%", background: scoreColor(score), borderRadius: 2, transition: "width 0.6s ease" }} />
    </div>
  );
}

// ─── MODULE 1: THEORY ────────────────────────────────────────────────────────
function TheoryModule() {
  const [active, setActive] = useState("what");
  const sec = THEORY_SECTIONS.find(s => s.id === active);
  const idx = THEORY_SECTIONS.findIndex(s => s.id === active);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "210px 1fr", minHeight: 600 }}>
      <div style={{ borderRight: `1px solid ${C.border}`, padding: "8px 0", background: C.surface }}>
        {THEORY_SECTIONS.map(s => (
          <button key={s.id} onClick={() => setActive(s.id)} style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
            padding: "11px 16px", background: active === s.id ? C.blueBg : "transparent",
            border: "none", borderRight: active === s.id ? `3px solid ${C.blue}` : "3px solid transparent",
            color: active === s.id ? C.blue : C.muted, cursor: "pointer", transition: "all 0.15s",
            fontFamily: C.sans, fontSize: 13, fontWeight: active === s.id ? 600 : 400,
          }}>
            <span style={{ fontFamily: C.mono, fontSize: 12 }}>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>
      <div style={{ padding: "28px 32px", overflowY: "auto", maxHeight: 680, background: C.surface }}>
        <div style={{ fontSize: 10, fontFamily: C.mono, letterSpacing: "0.1em", textTransform: "uppercase", color: C.dim, marginBottom: 14, fontWeight: 600 }}>
          {idx + 1} of {THEORY_SECTIONS.length} · {sec.label}
        </div>
        {sec.content.map((block, i) => {
          if (block.type === "lead") return <p key={i} style={{ fontSize: 18, fontWeight: 600, color: C.text, lineHeight: 1.55, marginBottom: 18, letterSpacing: "-0.02em" }}>{block.text}</p>;
          if (block.type === "p") return <p key={i} style={{ fontSize: 14, color: C.muted, lineHeight: 1.8, marginBottom: 16 }}>{block.text}</p>;
          if (block.type === "callout") return <Callout key={i} color={block.color} label={block.label} text={block.text} />;
          if (block.type === "comparison") return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "20px 0" }}>
              {[block.left, block.right].map((side, j) => (
                <div key={j} style={{ background: j === 1 ? C.greenBg : C.redBg, border: `1px solid ${j === 1 ? C.greenBd : C.redBd}`, borderRadius: 8, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, fontFamily: C.mono, letterSpacing: "0.08em", textTransform: "uppercase", color: j === 1 ? C.green : C.red, marginBottom: 10, fontWeight: 700 }}>{side.label}</div>
                  {side.items.map((item, k) => (
                    <div key={k} style={{ fontSize: 13, color: C.text, lineHeight: 1.7, paddingLeft: 14, position: "relative", marginBottom: 4 }}>
                      <span style={{ position: "absolute", left: 0, color: j === 1 ? C.green : C.red, fontWeight: 700 }}>{j === 1 ? "+" : "−"}</span>{item}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          );
          if (block.type === "grader-cards") return (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 10, margin: "20px 0" }}>
              {block.cards.map((card, j) => (
                <div key={j} style={{ background: card.bg, border: `1px solid ${card.bd}`, borderLeft: `4px solid ${card.color}`, borderRadius: "0 8px 8px 0", padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: card.color }}>{card.name}</div>
                    <span style={{ fontSize: 11, fontFamily: C.mono, color: card.color, fontWeight: 500 }}>{card.speed}</span>
                  </div>
                  <div style={{ fontSize: 11, fontFamily: C.mono, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Best for: {card.when}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                    {card.examples.map((ex, k) => <span key={k} style={{ fontSize: 12, color: C.text, background: C.surface, padding: "3px 9px", borderRadius: 4, border: `1px solid ${C.border}` }}>{ex}</span>)}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, borderTop: `1px solid ${card.bd}`, paddingTop: 8 }}>⚠ {card.limit}</div>
                </div>
              ))}
            </div>
          );
          if (block.type === "bias-cards") return (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 10, margin: "20px 0" }}>
              {block.cards.map((card, j) => (
                <div key={j} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{card.name}</div>
                    <Pill color={card.sColor} bg={card.sBg} bd={card.sBd}>{card.severity}</Pill>
                  </div>
                  <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 10 }}>{card.description}</div>
                  <div style={{ fontSize: 12, color: C.green, background: C.greenBg, border: `1px solid ${C.greenBd}`, borderRadius: 6, padding: "8px 12px", fontFamily: C.mono, fontWeight: 500 }}>FIX: {card.fix}</div>
                </div>
              ))}
            </div>
          );
          if (block.type === "table") return (
            <div key={i} style={{ margin: "20px 0", border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ background: C.surface2 }}>{block.headers.map((h, k) => <th key={k} style={{ textAlign: "left", padding: "9px 14px", borderBottom: `1px solid ${C.border}`, color: C.muted, fontFamily: C.mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>{h}</th>)}</tr></thead>
                <tbody>{block.rows.map((row, k) => <tr key={k} style={{ borderBottom: k < block.rows.length - 1 ? `1px solid ${C.border}` : "none", background: k % 2 === 0 ? C.surface : C.surface2 }}>{row.map((cell, l) => <td key={l} style={{ padding: "9px 14px", color: l === 0 ? C.text : C.muted, fontSize: 13, fontFamily: l === 0 ? C.mono : C.sans, fontWeight: l === 0 ? 600 : 400 }}>{cell}</td>)}</tr>)}</tbody>
              </table>
            </div>
          );
          if (block.type === "loop-steps") return (
            <div key={i} style={{ margin: "20px 0" }}>
              {block.steps.map((step, j) => (
                <div key={j} style={{ display: "flex", gap: 16, marginBottom: 22, paddingBottom: 22, borderBottom: j < block.steps.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <div style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 8, background: step.color + "15", border: `1px solid ${step.color}50`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.mono, fontSize: 12, color: step.color, fontWeight: 700 }}>{step.num}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 5 }}>{step.label}</div>
                    <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          );
          return null;
        })}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
          {idx > 0 ? <button onClick={() => setActive(THEORY_SECTIONS[idx - 1].id)} style={{ fontFamily: C.mono, fontSize: 12, color: C.muted, background: C.surface2, border: `1px solid ${C.border}`, padding: "7px 16px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>← prev</button> : <div />}
          {idx < THEORY_SECTIONS.length - 1 ? <button onClick={() => setActive(THEORY_SECTIONS[idx + 1].id)} style={{ fontFamily: C.mono, fontSize: 12, color: C.green, background: C.greenBg, border: `1px solid ${C.greenBd}`, padding: "7px 16px", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>next →</button> : <Pill color={C.green} bg={C.greenBg} bd={C.greenBd}>COMPLETE ✓</Pill>}
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
    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", minHeight: 600 }}>
      <div style={{ borderRight: `1px solid ${C.border}`, padding: "8px 0", background: C.surface }}>
        {INSPECT_ITEMS.map(i => (
          <button key={i.id} onClick={() => { setActive(i.id); setView("rubric"); }} style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
            padding: "11px 16px", background: active === i.id ? i.bg : "transparent",
            border: "none", borderRight: active === i.id ? `3px solid ${i.color}` : "3px solid transparent",
            color: active === i.id ? i.color : C.muted, cursor: "pointer", transition: "all 0.15s",
            fontFamily: C.sans, fontSize: 13, fontWeight: active === i.id ? 700 : 400,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: i.color, opacity: active === i.id ? 1 : 0.3 }} />
            {i.label}
          </button>
        ))}
      </div>
      <div style={{ padding: "24px 28px", overflowY: "auto", maxHeight: 680, background: C.surface }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: item.color, marginBottom: 5 }}>{item.label}</div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, maxWidth: 480 }}>{item.what}</div>
          </div>
          <Pill color={C.muted} bg={C.surface2} bd={C.border}>READ-ONLY</Pill>
        </div>
        <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
          {["rubric", "prompt", "biases"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "8px 18px", background: "none", border: "none",
              borderBottom: view === v ? `2px solid ${item.color}` : "2px solid transparent",
              color: view === v ? item.color : C.muted, fontFamily: C.mono, fontSize: 11,
              letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
              transition: "all 0.15s", marginBottom: -1, fontWeight: view === v ? 700 : 400,
            }}>{v}</button>
          ))}
        </div>
        {view === "rubric" && (
          <div>
            <div style={{ fontSize: 11, fontFamily: C.mono, color: C.dim, letterSpacing: "0.08em", marginBottom: 14, textTransform: "uppercase", fontWeight: 600 }}>Scoring Rubric · 1–5 Scale</div>
            {item.rubric.split("\n\n").map((line, i) => {
              const score = parseInt(line[0]);
              return (
                <div key={i} style={{ display: "flex", gap: 14, padding: "12px 14px", marginBottom: 8, background: score ? scoreBg(score) : C.surface2, border: `1px solid ${score ? scoreBorder(score) : C.border}`, borderRadius: 8 }}>
                  {score ? <div style={{ flexShrink: 0, fontSize: 22, fontWeight: 800, fontFamily: C.mono, color: scoreColor(score), width: 22, lineHeight: 1.2 }}>{score}</div> : null}
                  <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>{score ? line.slice(4) : line}</div>
                </div>
              );
            })}
          </div>
        )}
        {view === "prompt" && (
          <div>
            <div style={{ fontSize: 11, fontFamily: C.mono, color: C.dim, letterSpacing: "0.08em", marginBottom: 14, textTransform: "uppercase", fontWeight: 600 }}>Judge Prompt · Sent to Evaluator Model</div>
            <div style={{ background: "#1a1a1a", border: `1px solid #333`, borderRadius: 8, padding: "16px 18px", fontFamily: C.mono, fontSize: 12, lineHeight: 1.9, color: "#e2e2e2", whiteSpace: "pre-wrap", userSelect: "none" }}>
              {item.prompt.split(/(\{[^}]+\})/).map((part, i) =>
                part.match(/^\{[^}]+\}$/)
                  ? <span key={i} style={{ color: item.color, background: item.color + "25", borderRadius: 3, padding: "0 3px", fontWeight: 700 }}>{part}</span>
                  : part
              )}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: C.dim, fontFamily: C.mono }}>↑ highlighted fields filled at runtime</div>
          </div>
        )}
        {view === "biases" && (
          <div>
            <div style={{ fontSize: 11, fontFamily: C.mono, color: C.dim, letterSpacing: "0.08em", marginBottom: 14, textTransform: "uppercase", fontWeight: 600 }}>Known Biases · This Dimension</div>
            <div style={{ background: C.amberBg, border: `1px solid ${C.amberBd}`, borderRadius: 8, padding: "14px 16px", fontSize: 13, color: C.text, lineHeight: 1.7 }}>{item.biasNote}</div>
            <Callout color="green" label="General mitigation" text="Always use a different model family as judge than the model being evaluated. Run judge calls at temperature 0 for consistency. Validate periodically against human labels on 20–30 cases." />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MODULE 3: PLAYGROUND ────────────────────────────────────────────────────
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
    setRunning(true); setResults(null); abortRef.current = false;
    const total = TEST_CASES.length * (1 + DIMS.length);
    let done = 0;
    setProgress({ done: 0, total });
    const allResults = [];
    for (const tc of TEST_CASES) {
      if (abortRef.current) break;
      const agentResponse = await callAgent(systemPrompt, tc.user_message);
      done++; setProgress({ done, total });
      const scores = {};
      for (const dim of DIMS) {
        if (abortRef.current) break;
        scores[dim] = await callJudge(dim, tc.user_message, agentResponse);
        done++; setProgress({ done, total });
      }
      allResults.push({ ...tc, agentResponse, scores });
      setResults([...allResults]);
    }
    if (!abortRef.current && allResults.length === TEST_CASES.length) {
      const run = { id: Date.now(), label: systemPrompt.slice(0, 55) + "…", prompt: systemPrompt, ts: new Date().toLocaleTimeString(), results: allResults };
      saveRun(run); setPastRuns(loadRuns());
    }
    setRunning(false);
  }

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
    return Math.round(results.filter(r => (r.scores[dim]?.score ?? 0) >= r.expected_min[dim]).length / results.length * 100);
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
      <div>
        <div style={{ fontSize: 11, fontFamily: C.mono, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, marginBottom: 8, fontWeight: 700 }}>System Prompt</div>
        <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} disabled={running} style={{
          width: "100%", boxSizing: "border-box", background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 8, color: C.text, fontFamily: C.mono, fontSize: 12, lineHeight: 1.8,
          padding: "14px 16px", resize: "vertical", minHeight: 210, outline: "none", transition: "border-color 0.2s",
        }}
          onFocus={e => e.target.style.borderColor = C.blue}
          onBlur={e => e.target.style.borderColor = C.border}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {Object.entries(PRESETS).map(([key, p]) => (
            <button key={key} onClick={() => setSystemPrompt(p.value)} disabled={running} style={{
              fontSize: 12, fontFamily: C.mono, padding: "6px 14px", borderRadius: 6,
              border: `1px solid ${C.border}`, background: C.surface2, color: C.muted,
              cursor: "pointer", fontWeight: 600, transition: "all 0.15s",
            }}
              onMouseOver={e => { e.target.style.background = C.blueBg; e.target.style.borderColor = C.blueBd; e.target.style.color = C.blue; }}
              onMouseOut={e => { e.target.style.background = C.surface2; e.target.style.borderColor = C.border; e.target.style.color = C.muted; }}
            >{p.label}</button>
          ))}
        </div>
        <button onClick={running ? () => { abortRef.current = true; } : runEval} style={{
          marginTop: 12, width: "100%", padding: "12px", borderRadius: 8, cursor: "pointer",
          background: running ? C.redBg : C.greenBg, color: running ? C.red : C.green,
          fontFamily: C.mono, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em",
          border: `1px solid ${running ? C.redBd : C.greenBd}`, transition: "all 0.2s",
        }}>
          {running ? `■ STOP  ·  ${progress.done}/${progress.total} calls` : "▶  RUN EVAL  ·  5 cases × 4 API calls"}
        </button>
        {running && (
          <div style={{ marginTop: 6, height: 3, background: C.border, borderRadius: 2 }}>
            <div style={{ height: "100%", background: C.green, borderRadius: 2, width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`, transition: "width 0.3s" }} />
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <button onClick={() => setShowHistory(h => !h)} style={{ fontSize: 11, fontFamily: C.mono, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted, background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 700 }}>
            {showHistory ? "▾" : "▸"} Run history ({pastRuns.length})
          </button>
          {showHistory && pastRuns.length > 0 && (
            <div style={{ marginTop: 8, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
              {pastRuns.map((run, i) => (
                <div key={run.id} style={{ padding: "10px 14px", borderBottom: i < pastRuns.length - 1 ? `1px solid ${C.border}` : "none", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "background 0.15s" }}
                  onMouseOver={e => e.currentTarget.style.background = C.surface2}
                  onMouseOut={e => e.currentTarget.style.background = C.surface}
                >
                  <div>
                    <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{run.label}</div>
                    <div style={{ fontSize: 11, color: C.dim, fontFamily: C.mono }}>{run.ts}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => { setResults(run.results); setActiveTab("dashboard"); }} style={{ fontSize: 11, fontFamily: C.mono, padding: "4px 10px", borderRadius: 5, border: `1px solid ${C.border}`, background: C.surface2, color: C.muted, cursor: "pointer", fontWeight: 600 }}>load</button>
                    <button onClick={() => setCompareRun(compareRun?.id === run.id ? null : run)} style={{ fontSize: 11, fontFamily: C.mono, padding: "4px 10px", borderRadius: 5, border: `1px solid ${compareRun?.id === run.id ? C.blueBd : C.border}`, background: compareRun?.id === run.id ? C.blueBg : C.surface2, color: compareRun?.id === run.id ? C.blue : C.muted, cursor: "pointer", fontWeight: 600 }}>
                      {compareRun?.id === run.id ? "unpin" : "compare"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {compareRun && (
            <div style={{ marginTop: 8, fontSize: 12, color: C.blue, background: C.blueBg, border: `1px solid ${C.blueBd}`, borderRadius: 6, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 600 }}>comparing: {compareRun.label.slice(0, 40)}…</span>
              <button onClick={() => setCompareRun(null)} style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", fontFamily: C.mono, fontSize: 14, fontWeight: 700 }}>✕</button>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, fontFamily: C.mono, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, marginBottom: 6, fontWeight: 700 }}>How this works</div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.75 }}>Each case runs <span style={{ color: C.text, fontFamily: C.mono, fontWeight: 700 }}>4 API calls</span>: one agent call using your prompt, then one LLM-as-judge call per dimension. Runs are saved automatically. Pin any past run to compare scores side by side.</div>
        </div>
      </div>

      <div>
        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: 16 }}>
          {["dashboard", "traces"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "8px 18px", background: "none", border: "none",
              borderBottom: activeTab === tab ? `2px solid ${C.blue}` : "2px solid transparent",
              color: activeTab === tab ? C.blue : C.muted, fontFamily: C.mono, fontSize: 11,
              letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
              transition: "all 0.15s", marginBottom: -1, fontWeight: activeTab === tab ? 700 : 400,
            }}>{tab}</button>
          ))}
        </div>

        {activeTab === "dashboard" && (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              {DIMS.map((dim, i) => {
                const score = avgScores[i], cmp = compareAvg[i];
                const delta = score !== null && cmp !== null ? (score - cmp).toFixed(1) : null;
                return (
                  <div key={dim} style={{ flex: 1, background: score !== null ? scoreBg(score) : C.surface2, border: `1px solid ${score !== null ? scoreBorder(score) : C.border}`, borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, fontFamily: C.mono, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, marginBottom: 4, fontWeight: 700 }}>{dim}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: score !== null ? scoreColor(score) : C.dim, fontFamily: C.mono }}>
                      {running && !results ? "—" : (score ?? "—")}
                      {score && <span style={{ fontSize: 13, color: C.dim, fontWeight: 400 }}>/5</span>}
                    </div>
                    {delta !== null && <div style={{ fontSize: 11, fontFamily: C.mono, color: parseFloat(delta) > 0 ? C.green : parseFloat(delta) < 0 ? C.red : C.muted, marginTop: 2, fontWeight: 700 }}>{parseFloat(delta) > 0 ? "↑" : parseFloat(delta) < 0 ? "↓" : "="}{Math.abs(delta)} vs compare</div>}
                    <ScoreBar score={running && !results ? null : score} />
                  </div>
                );
              })}
            </div>

            {results && (
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                {DIMS.map((dim, i) => (
                  <div key={dim} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 14px" }}>
                    <div style={{ fontSize: 10, color: C.muted, fontFamily: C.mono, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>pass rate</div>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: C.mono, color: passRates[i] >= 80 ? C.green : passRates[i] >= 60 ? C.amber : C.red, marginTop: 2 }}>{passRates[i]}%</div>
                  </div>
                ))}
              </div>
            )}

            {results ? (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 56px 56px 56px", padding: "8px 14px", borderBottom: `1px solid ${C.border}`, background: C.surface2 }}>
                  <div style={{ fontSize: 10, color: C.muted, fontFamily: C.mono, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>test case</div>
                  {DIMS.map(d => <div key={d} style={{ fontSize: 10, color: C.muted, fontFamily: C.mono, letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center", fontWeight: 700 }}>{d.slice(0, 3)}</div>)}
                </div>
                {results.map((r, i) => {
                  const failures = DIMS.filter(d => (r.scores[d]?.score ?? 0) < r.expected_min[d]);
                  return <RowWithExplainer key={r.id} r={r} i={i} failures={failures} onTrace={() => { setActiveCase(i); setActiveTab("traces"); }} compareResult={compareRun?.results?.[i]} />;
                })}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "56px 0", color: C.border2, fontSize: 13, fontFamily: C.mono, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontWeight: 500 }}>
                {running ? `running · ${progress.done}/${progress.total} api calls` : "run the eval to see results"}
              </div>
            )}
          </div>
        )}

        {activeTab === "traces" && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
              {TEST_CASES.map((tc, i) => (
                <button key={tc.id} onClick={() => setActiveCase(i)} style={{
                  fontSize: 11, fontFamily: C.mono, padding: "5px 11px", borderRadius: 5,
                  border: `1px solid ${activeCase === i ? C.blueBd : C.border}`,
                  background: activeCase === i ? C.blueBg : C.surface2,
                  color: activeCase === i ? C.blue : C.muted, cursor: "pointer", fontWeight: activeCase === i ? 700 : 500,
                }}>{tc.label}</button>
              ))}
            </div>
            {results?.[activeCase] ? (
              <div>
                {[{ label: "Customer message", val: results[activeCase].user_message }, { label: "Agent response", val: results[activeCase].agentResponse }].map(({ label, val }) => (
                  <div key={label} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: C.muted, fontFamily: C.mono, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, fontWeight: 700 }}>{label}</div>
                    <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px", fontSize: 13, color: C.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{val}</div>
                  </div>
                ))}
                <div style={{ fontSize: 10, color: C.muted, fontFamily: C.mono, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>Judge verdicts</div>
                {DIMS.map(dim => {
                  const j = results[activeCase].scores[dim];
                  const passed = (j?.score ?? 0) >= results[activeCase].expected_min[dim];
                  return (
                    <div key={dim} style={{ marginBottom: 8, background: j?.score ? scoreBg(j.score) : C.surface2, border: `1px solid ${j?.score ? scoreBorder(j.score) : C.border}`, borderRadius: 8, padding: "12px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontFamily: C.mono, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, fontWeight: 700 }}>{dim}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {j?.low_confidence && <Pill color={C.amber} bg={C.amberBg} bd={C.amberBd}>LOW CONF</Pill>}
                          <Pill color={passed ? C.green : C.red} bg={passed ? C.greenBg : C.redBg} bd={passed ? C.greenBd : C.redBd}>{passed ? "PASS" : "FAIL"}</Pill>
                          <span style={{ fontSize: 24, fontWeight: 800, fontFamily: C.mono, color: j?.score ? scoreColor(j.score) : C.dim }}>{j?.score ?? "—"}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7, fontFamily: C.mono }}>{j?.reasoning ?? "—"}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "48px 0", color: C.border2, fontSize: 13, fontFamily: C.mono, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontWeight: 500 }}>
                {running ? "running…" : "run the eval first"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RowWithExplainer({ r, failures, onTrace, compareResult }) {
  const [open, setOpen] = useState(false);
  const hasFailure = failures.length > 0;
  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 56px 56px 56px", padding: "10px 14px", cursor: "pointer", transition: "background 0.15s", background: C.surface }}
        onMouseOver={e => e.currentTarget.style.background = C.surface2}
        onMouseOut={e => e.currentTarget.style.background = C.surface}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {hasFailure && <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.red, flexShrink: 0, display: "inline-block" }} />}
          <span style={{ fontSize: 13, color: C.text, fontWeight: hasFailure ? 700 : 500 }}>{r.label}</span>
          <span style={{ fontSize: 10, color: C.dim, fontFamily: C.mono, fontWeight: 500 }}>{open ? "▲" : "▼"}</span>
        </div>
        {DIMS.map(d => {
          const s = r.scores[d]?.score;
          const cs = compareResult?.scores[d]?.score;
          const delta = s != null && cs != null ? s - cs : null;
          return (
            <div key={d} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: C.mono, fontSize: 15, fontWeight: 800, color: s != null ? scoreColor(s) : C.dim }}>{s ?? "—"}</div>
              {delta !== null && <div style={{ fontSize: 9, fontFamily: C.mono, color: delta > 0 ? C.green : delta < 0 ? C.red : C.dim, fontWeight: 700 }}>{delta > 0 ? "↑" : delta < 0 ? "↓" : "="}{Math.abs(delta)}</div>}
            </div>
          );
        })}
      </div>
      {open && (
        <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${C.border}`, background: C.surface2 }}>
          <div style={{ fontSize: 10, fontFamily: C.mono, color: hasFailure ? C.red : C.green, letterSpacing: "0.1em", textTransform: "uppercase", padding: "10px 0 8px", fontWeight: 700 }}>
            {hasFailure ? "Why did this fail?" : "All dimensions passed ✓"}
          </div>
          {(hasFailure ? failures : DIMS).map(dim => {
            const j = r.scores[dim];
            const passed = (j?.score ?? 0) >= r.expected_min[dim];
            return (
              <div key={dim} style={{ marginBottom: 8, background: passed ? C.greenBg : C.redBg, border: `1px solid ${passed ? C.greenBd : C.redBd}`, borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <Pill color={passed ? C.green : C.red} bg={passed ? C.greenBg : C.redBg} bd={passed ? C.greenBd : C.redBd}>{dim}</Pill>
                  <span style={{ fontFamily: C.mono, fontSize: 12, color: C.muted, fontWeight: 600 }}>scored {j?.score ?? "?"} · needed {r.expected_min[dim]}+</span>
                </div>
                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7, fontFamily: C.mono }}>{j?.reasoning ?? "No reasoning captured"}</div>
              </div>
            );
          })}
          <button onClick={e => { e.stopPropagation(); onTrace(); }} style={{ marginTop: 6, fontSize: 11, fontFamily: C.mono, color: C.blue, background: C.blueBg, border: `1px solid ${C.blueBd}`, padding: "5px 12px", borderRadius: 5, cursor: "pointer", fontWeight: 700 }}>view full trace →</button>
        </div>
      )}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
const MODULES = [
  { id: "theory",     label: "Theory",     num: "01", desc: "Core concepts" },
  { id: "inspect",    label: "Inspect",    num: "02", desc: "Rubrics & prompts" },
  { id: "playground", label: "Playground", num: "03", desc: "Learning by doing" },
];

export default function App() {
  const [module, setModule] = useState("theory");
  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: C.sans }}>
      <div style={{ borderBottom: `1px solid ${C.border}`, background: C.surface, display: "flex", alignItems: "stretch" }}>
        <div style={{ padding: "14px 24px", borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", justifyContent: "center", marginRight: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.green }} />
            <span style={{ fontSize: 10, fontFamily: C.mono, color: C.dim, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>LLM Eval Playground</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>Customer Support Agent</div>
        </div>
        {MODULES.map(m => (
          <button key={m.id} onClick={() => setModule(m.id)} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "0 20px",
            background: module === m.id ? C.blueBg : "none",
            border: "none", cursor: "pointer",
            borderBottom: module === m.id ? `2px solid ${C.blue}` : "2px solid transparent",
            borderTop: "2px solid transparent",
            color: module === m.id ? C.blue : C.muted, transition: "all 0.15s",
          }}>
            <span style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 700, color: module === m.id ? C.blue : C.dim }}>{m.num}</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 13, fontWeight: module === m.id ? 700 : 500, fontFamily: C.sans, color: module === m.id ? C.blue : C.muted }}>{m.label}</div>
              <div style={{ fontSize: 10, color: C.dim, fontFamily: C.mono, fontWeight: 500 }}>{m.desc}</div>
            </div>
          </button>
        ))}
      </div>
      <div style={{ padding: module === "playground" ? "24px 28px" : "0" }}>
        {module === "theory"     && <TheoryModule />}
        {module === "inspect"    && <InspectModule />}
        {module === "playground" && <PlaygroundModule />}
      </div>
    </div>
  );
}
