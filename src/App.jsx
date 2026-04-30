import { useState, useEffect, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const METRICS = ["context_relevance", "context_recall", "answer_relevance", "completeness", "groundedness"];
const PERSONAS = ["balanced", "strict", "lenient", "adversarial"];

const PERSONA_META = {
  balanced:    { label: "Balanced",    color: "#4A9EFF", border: "rgba(74,158,255,0.3)", icon: "⚖️", desc: "Glean's current system. Neutral calibration." },
  strict:      { label: "Strict",      color: "#FF6B6B", border: "rgba(255,107,107,0.3)", icon: "🔬", desc: "Penalizes vagueness. Scores lower when in doubt." },
  lenient:     { label: "Lenient",     color: "#51CF66", border: "rgba(81,207,102,0.3)", icon: "🤝", desc: "Gives benefit of the doubt. Rewards partial answers." },
  adversarial: { label: "Adversarial", color: "#FFB347", border: "rgba(255,179,71,0.3)", icon: "⚔️", desc: "Hunts for flaws, hallucinations, and gaps." },
};

const BENCHMARK_CASES = [
  { id: "self_enhance_001", label: "Self-enhancement bias", tag: "KEY TEST", tagColor: "#FF6B6B", desc: "Answer mirrors the judge model's own writing style. The exact bias Glean named." },
  { id: "verbosity_001",    label: "Verbosity bias",       tag: "BIAS",     tagColor: "#FFB347", desc: "Correct answer buried in filler. Single judge prefers longer responses." },
  { id: "hallucination_001",label: "Hallucination test",   tag: "CRITICAL", tagColor: "#FF6B6B", desc: "Answer invents facts not in context. Tests groundedness scoring." },
  { id: "completeness_001", label: "Missing half the answer", tag: "BIAS",  tagColor: "#FFB347", desc: "Answer ignores the limitations half of the question." },
  { id: "grounded_001",     label: "Perfectly grounded",   tag: "CONTROL",  tagColor: "#51CF66", desc: "Perfect answer. Single judge and jury should agree closely." },
];

function GlowBar({ value, color }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (value === null || value === undefined) return;
    const t = setTimeout(() => setWidth(value * 100), 50);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div style={{ position: "relative", height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${width}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: 99, transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)", boxShadow: `0 0 8px ${color}55` }} />
    </div>
  );
}

function MetricRow({ metric, data, isActive }) {
  const [expanded, setExpanded] = useState(false);
  const verdictColor = !data ? "#555" : data.delta > 0.05 ? "#FF6B6B" : data.delta < -0.05 ? "#51CF66" : "#51CF66";
  const verdictLabel = !data ? "" : data.delta > 0.1 ? "INFLATED" : data.delta > 0.05 ? "DRIFTED" : data.delta < -0.05 ? "DEFLATED" : "ALIGNED";
  const barColor = !data ? "#4A9EFF" : data.delta > 0.05 ? "#FF6B6B" : "#51CF66";
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: isActive ? "rgba(74,158,255,0.03)" : "transparent", transition: "background 0.3s" }}>
      <div onClick={() => data && setExpanded(e => !e)} style={{ padding: "16px 24px", cursor: data ? "pointer" : "default", display: "grid", gridTemplateColumns: "190px 1fr 1fr 140px 20px", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isActive && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4A9EFF", boxShadow: "0 0 8px #4A9EFF", flexShrink: 0, animation: "pulse 1s infinite" }} />}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: isActive ? "#4A9EFF" : "#5A7A9E", fontWeight: 500 }}>{metric}</span>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>Single judge</div>
          <GlowBar value={data?.single} color="#4A9EFF" />
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#4A9EFF", marginTop: 4 }}>{data ? data.single.toFixed(3) : <span style={{ color: "rgba(255,255,255,0.1)" }}>—</span>}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>Jury mean</div>
          <GlowBar value={data?.jury_mean} color={barColor} />
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: barColor, marginTop: 4 }}>{data ? data.jury_mean.toFixed(3) : <span style={{ color: "rgba(255,255,255,0.1)" }}>—</span>}</div>
        </div>
        <div>
          {data && <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: verdictColor, background: `${verdictColor}12`, border: `1px solid ${verdictColor}25`, padding: "4px 10px", borderRadius: 5 }}>
            {data.delta >= 0 ? "+" : ""}{data.delta.toFixed(3)} <span style={{ fontSize: 9, opacity: 0.8 }}>{verdictLabel}</span>
          </div>}
          {!data && isActive && <span style={{ fontSize: 11, color: "#4A9EFF", animation: "fade 1.2s infinite" }}>running...</span>}
        </div>
        <div style={{ color: "rgba(255,255,255,0.15)", fontSize: 11, textAlign: "center" }}>{data ? (expanded ? "▲" : "▼") : ""}</div>
      </div>
      {expanded && data && (
        <div style={{ padding: "0 24px 20px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginTop: 14 }}>
            {PERSONAS.map(p => {
              const score = data.jury_scores?.[p];
              const meta = PERSONA_META[p];
              return (
                <div key={p} style={{ background: `${meta.color}0A`, border: `1px solid ${meta.color}20`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 20, marginBottom: 8 }}>{meta.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: meta.color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{meta.label}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color: "white", marginBottom: 5 }}>{score?.toFixed(3) ?? "—"}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>{meta.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [cases, setCases] = useState([]);
  const [mode, setMode] = useState("cases");
  const [selectedCase, setSelectedCase] = useState(null);
  const [query, setQuery] = useState("");
  const [context, setContext] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState("idle");
  const [activeMetric, setActiveMetric] = useState(null);
  const [metricData, setMetricData] = useState({});
  const [overall, setOverall] = useState(null);
  const [log, setLog] = useState([]);
  const [section, setSection] = useState("tool");
  const logRef = useRef(null);

  useEffect(() => { fetch(`${API}/cases`).then(r => r.json()).then(setCases).catch(() => {}); }, []);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);

  const selectCase = async (c) => {
    setSelectedCase(c);
    const full = await fetch(`${API}/cases/${c.id}`).then(r => r.json());
    setQuery(full.query); setContext(full.context); setAnswer(full.answer);
    resetResults();
  };

  const resetResults = () => { setStatus("idle"); setActiveMetric(null); setMetricData({}); setOverall(null); setLog([]); };
  const addLog = (msg, type = "default") => setLog(l => [...l, { text: msg, type, time: new Date().toLocaleTimeString("en-US", { hour12: false }) }]);

  const runEval = async () => {
    if (!query.trim() || !context.trim() || !answer.trim()) return;
    resetResults(); setStatus("running");
    addLog("Initializing evaluation pipeline...", "info");
    try {
      const resp = await fetch(`${API}/evaluate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, context, answer }) });
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));
          if (data.type === "start") addLog("Running single judge + 3 jury personas across 5 metrics...", "info");
          if (data.type === "metric_start") { setActiveMetric(data.metric); addLog(`Evaluating: ${data.metric}`, "metric"); }
          if (data.type === "single_result") addLog(`  balanced: ${data.score.toFixed(3)}`, "score");
          if (data.type === "jury_result") addLog(`  ${data.persona}: ${data.score.toFixed(3)}`, "score");
          if (data.type === "metric_complete") {
            setMetricData(prev => ({ ...prev, [data.metric]: data }));
            const tag = data.delta > 0.05 ? "INFLATED" : data.delta < -0.05 ? "DEFLATED" : "aligned";
            addLog(`  delta: ${data.delta >= 0 ? "+" : ""}${data.delta.toFixed(3)} [${tag}]`, data.delta > 0.05 ? "warn" : "ok");
          }
          if (data.type === "complete") {
            setOverall(data); setActiveMetric(null); setStatus("done");
            addLog("---", "sep");
            addLog(`OVERALL: single=${data.overall_single} jury=${data.overall_jury} delta=${data.overall_delta >= 0 ? "+" : ""}${data.overall_delta.toFixed(3)}`, "result");
            addLog(`VERDICT: ${data.bias_direction.toUpperCase()}`, data.bias_direction === "inflated" ? "warn" : "ok");
          }
        }
      }
    } catch (e) { setStatus("error"); addLog(`Error: ${e.message}`, "warn"); }
  };

  const canRun = query.trim() && context.trim() && answer.trim() && status !== "running";
  const progress = METRICS.filter(m => metricData[m]).length;
  const logColor = { info: "#4A9EFF", metric: "rgba(255,255,255,0.6)", score: "rgba(255,255,255,0.4)", warn: "#FF6B6B", ok: "#51CF66", result: "#FFB347", sep: "rgba(255,255,255,0.1)", default: "rgba(255,255,255,0.5)" };

  return (
    <div style={{ background: "#070B12", minHeight: "100vh", color: "white", fontFamily: "'Syne', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes fade { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px}
        textarea{resize:vertical;font-family:inherit} textarea:focus{outline:none;border-color:rgba(74,158,255,0.5)!important}
        button:hover{opacity:0.85}
      `}</style>

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(7,11,18,0.92)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "0 2rem", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #0055AA, #4A9EFF)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 14px rgba(74,158,255,0.35)" }}>
              <svg width="13" height="13" fill="white" viewBox="0 0 16 16"><path d="M13 6.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm-1.5 0a3 3 0 1 0-6 0 3 3 0 0 0 6 0Zm-8.94 6.56 2.47-2.47 1.06 1.06-2.47 2.47-1.06-1.06Z"/></svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-0.01em" }}>glean-eval-bench</span>
          </div>
          <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)" }} />
          <div style={{ display: "flex", gap: 2 }}>
            {[["tool","Live Tool"],["problem","The Problem"],["solution","The Solution"]].map(([s,l]) => (
              <button key={s} onClick={() => setSection(s)} style={{ padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: section===s ? "rgba(74,158,255,0.15)" : "transparent", color: section===s ? "#4A9EFF" : "rgba(255,255,255,0.35)", transition: "all 0.15s", fontFamily: "inherit" }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#51CF66", boxShadow: "0 0 5px #51CF66", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 10, color: "#51CF66", fontWeight: 700, letterSpacing: "0.07em" }}>LIVE</span>
          </div>
          <a href="https://www.glean.com/blog/glean-ai-evaluator" target="_blank" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Glean post</a>
          <a href="https://github.com/Jafar-97/glean-eval-bench" target="_blank" style={{ fontSize: 12, color: "white", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "5px 12px", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
            GitHub
          </a>
        </div>
      </nav>

      {/* ── PROBLEM ── */}
      {section === "problem" && (
        <div style={{ animation: "slideUp 0.35s ease", maxWidth: 880, margin: "0 auto", padding: "64px 2rem 80px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.25)", borderRadius: 20, padding: "5px 14px", marginBottom: 24 }}>
              <div style={{ width: 5, height: 5, background: "#FF6B6B", borderRadius: "50%", boxShadow: "0 0 5px #FF6B6B" }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: "#FF6B6B", letterSpacing: "0.1em" }}>DOCUMENTED PROBLEM FROM GLEAN'S ENGINEERING BLOG</span>
            </div>
            <h1 style={{ fontSize: "clamp(34px, 5vw, 56px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 16 }}>Their own engineers<br />admitted the gap</h1>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>In their AI Evaluator blog post, Glean's engineers documented three specific failure modes in their single-judge evaluation system.</p>
          </div>

          {/* Quote */}
          <div style={{ background: "linear-gradient(135deg, rgba(74,158,255,0.07), rgba(74,158,255,0.03))", border: "1px solid rgba(74,158,255,0.18)", borderLeft: "3px solid #4A9EFF", borderRadius: 14, padding: "28px 36px", marginBottom: 48, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 10, right: 20, fontSize: 56, color: "rgba(74,158,255,0.06)", fontFamily: "Georgia, serif", lineHeight: 1 }}>"</div>
            <p style={{ fontSize: "clamp(16px, 2vw, 20px)", lineHeight: 1.75, color: "rgba(255,255,255,0.82)", fontStyle: "italic", marginBottom: 18 }}>
              "In the future, we will explore techniques like utilizing an ensemble of models, effectively an <span style={{ color: "#4A9EFF", fontStyle: "normal", fontWeight: 700 }}>'LLM jury'</span>, to mitigate biases such as self-enhancement."
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>Megha Jhunjhunwala &amp; Riddhima Narravula — Glean Engineering</div>
              </div>
              <a href="https://www.glean.com/blog/glean-ai-evaluator" target="_blank" style={{ fontSize: 12, color: "#4A9EFF", textDecoration: "none", fontWeight: 600, background: "rgba(74,158,255,0.1)", border: "1px solid rgba(74,158,255,0.25)", padding: "6px 14px", borderRadius: 7, display: "flex", alignItems: "center", gap: 5 }}>
                Read the post <svg width="9" height="9" fill="currentColor" viewBox="0 0 16 16"><path d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/><path d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/></svg>
              </a>
            </div>
          </div>

          {/* 3 bias cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
            {[
              { icon: "🪞", title: "Self-enhancement bias", color: "#FF6B6B", desc: "The LLM judge prefers outputs that match its own writing style. Answers that sound like the model wrote them score artificially higher.", stat: "+0.275", statLabel: "inflation on context_recall" },
              { icon: "📝", title: "Verbosity bias", color: "#FFB347", desc: "Longer responses score artificially higher. A padded answer that buries the key fact outscores a short, direct, correct one.", stat: "+0.250", statLabel: "inflation on groundedness" },
              { icon: "📍", title: "Position bias", color: "#CC88FF", desc: "Facts mentioned earlier score higher regardless of accuracy. Ordering influences the judge in ways that diverge from human judgment.", stat: "+0.200", statLabel: "inflation on answer_relevance" },
            ].map(item => (
              <div key={item.title} style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${item.color}1A`, borderRadius: 12, padding: "24px 20px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${item.color}, transparent)` }} />
                <div style={{ fontSize: 26, marginBottom: 14 }}>{item.icon}</div>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 18 }}>{item.desc}</p>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 14 }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color: item.color }}>{item.stat}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>{item.statLabel}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 48 }}>
            {[["74%","Human-agreement Glean achieved"],["79%","Human-to-human ceiling"],["5%","Gap bias explains"],["0","Public LLM jury implementations"]].map(([n,l]) => (
              <div key={n} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: "18px 14px", textAlign: "center" }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 700, color: "#4A9EFF", marginBottom: 6 }}>{n}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center" }}>
            <button onClick={() => setSection("solution")} style={{ padding: "12px 28px", background: "rgba(74,158,255,0.15)", border: "1px solid rgba(74,158,255,0.3)", color: "#4A9EFF", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>See the solution we built</button>
          </div>
        </div>
      )}

      {/* ── SOLUTION ── */}
      {section === "solution" && (
        <div style={{ animation: "slideUp 0.35s ease", maxWidth: 880, margin: "0 auto", padding: "64px 2rem 80px" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(81,207,102,0.1)", border: "1px solid rgba(81,207,102,0.25)", borderRadius: 20, padding: "5px 14px", marginBottom: 24 }}>
              <div style={{ width: 5, height: 5, background: "#51CF66", borderRadius: "50%", boxShadow: "0 0 5px #51CF66" }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: "#51CF66", letterSpacing: "0.1em" }}>THE SOLUTION WE BUILT</span>
            </div>
            <h1 style={{ fontSize: "clamp(34px, 5vw, 56px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 16 }}>The LLM jury.<br /><span style={{ color: "#4A9EFF" }}>Actually built.</span></h1>
            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>4 judge personas run independently, compute a jury mean, and expose the exact bias delta per metric in real time.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0, border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden", marginBottom: 40 }}>
            {[["01","Input RAG sample","Paste any query, context, and generated answer."],["02","Single judge runs","Balanced persona scores all 5 Glean metrics. This is their current system."],["03","Jury runs","Strict, lenient, and adversarial each score independently."],["04","Bias delta","Single minus jury mean, per metric. Positive delta means inflated."]].map(([n,t,d], i) => (
              <div key={n} style={{ padding: "24px 20px", background: "rgba(255,255,255,0.02)", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#4A9EFF", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 10 }}>{n}</div>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 7 }}>{t}</h4>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>{d}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 40 }}>
            {PERSONAS.map(p => {
              const meta = PERSONA_META[p];
              return (
                <div key={p} style={{ background: `${meta.color}07`, border: `1px solid ${meta.color}18`, borderRadius: 10, padding: "18px 20px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 24, flexShrink: 0 }}>{meta.icon}</span>
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{meta.label}</span>
                      {p === "balanced" && <span style={{ fontSize: 9, background: "rgba(74,158,255,0.12)", color: "#4A9EFF", padding: "2px 7px", borderRadius: 3, fontWeight: 700, letterSpacing: "0.04em" }}>GLEAN'S CURRENT</span>}
                    </div>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{meta.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, overflow: "hidden", marginBottom: 40 }}>
            <div style={{ padding: "12px 20px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "grid", gridTemplateColumns: "190px 1fr 150px", gap: 16 }}>
              {["Metric","Definition","Worst bias found"].map(h => <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</span>)}
            </div>
            {[["context_relevance","Are retrieved docs relevant to the query?","position bias"],["context_recall","Do retrieved docs contain everything needed?","self-enhance +0.275"],["answer_relevance","Does the answer directly address the query?","verbosity +0.150"],["completeness","Does the answer cover all aspects asked?","self-enhance +0.125"],["groundedness","Is every claim supported by the context?","verbosity +0.250"]].map(([n,d,b], i) => (
              <div key={n} style={{ display: "grid", gridTemplateColumns: "190px 1fr 150px", padding: "13px 20px", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.04)" : "none", alignItems: "center", gap: 16 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#4A9EFF" }}>{n}</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{d}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#FF6B6B", background: "rgba(255,107,107,0.08)", padding: "3px 8px", borderRadius: 4 }}>{b}</span>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center" }}>
            <button onClick={() => setSection("tool")} style={{ padding: "13px 32px", background: "linear-gradient(135deg, #0055AA, #4A9EFF)", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 0 22px rgba(74,158,255,0.28)", fontFamily: "inherit" }}>Run the live tool</button>
          </div>
        </div>
      )}

      {/* ── LIVE TOOL ── */}
      {section === "tool" && (
        <div style={{ animation: "slideUp 0.3s ease" }}>
          <div style={{ background: "linear-gradient(180deg, rgba(74,158,255,0.06) 0%, transparent 100%)", borderBottom: "1px solid rgba(255,255,255,0.04)", padding: "36px 2rem 28px" }}>
            <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#4A9EFF", letterSpacing: "0.1em" }}>LIVE EVALUATION TOOL</span>
                  <div style={{ height: 1, width: 32, background: "rgba(74,158,255,0.3)" }} />
                </div>
                <h1 style={{ fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.15, marginBottom: 7 }}>Single judge vs LLM jury</h1>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", maxWidth: 540, lineHeight: 1.6 }}>Glean's engineers documented self-enhancement bias in their single-judge eval and named an LLM jury as their next move. Pick a case to see the bias delta stream live.</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setSection("problem")} style={{ fontSize: 12, fontWeight: 600, color: "#FF6B6B", background: "rgba(255,107,107,0.09)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: 7, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit" }}>The problem</button>
                <button onClick={() => setSection("solution")} style={{ fontSize: 12, fontWeight: 600, color: "#51CF66", background: "rgba(81,207,102,0.09)", border: "1px solid rgba(81,207,102,0.2)", borderRadius: 7, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit" }}>The solution</button>
              </div>
            </div>
          </div>

          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "22px 2rem", display: "grid", gridTemplateColumns: "310px 1fr", gap: 18 }}>
            {/* LEFT */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", borderRadius: 7, border: "1px solid rgba(255,255,255,0.07)", padding: 3 }}>
                {[["cases","Benchmark cases"],["custom","Custom input"]].map(([m,l]) => (
                  <button key={m} onClick={() => { setMode(m); resetResults(); }} style={{ flex: 1, padding: "6px 0", fontSize: 12, fontWeight: 600, borderRadius: 5, border: "none", cursor: "pointer", background: mode===m ? "rgba(74,158,255,0.18)" : "transparent", color: mode===m ? "#4A9EFF" : "rgba(255,255,255,0.28)", transition: "all 0.15s", fontFamily: "inherit" }}>{l}</button>
                ))}
              </div>

              {mode === "cases" && BENCHMARK_CASES.map(c => (
                <div key={c.id} onClick={() => selectCase(c)} style={{ padding: "13px 15px", borderRadius: 9, cursor: "pointer", border: `1px solid ${selectedCase?.id===c.id ? "rgba(74,158,255,0.35)" : "rgba(255,255,255,0.05)"}`, background: selectedCase?.id===c.id ? "rgba(74,158,255,0.07)" : "rgba(255,255,255,0.02)", transition: "all 0.15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{c.id}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: `${c.tagColor}12`, color: c.tagColor, letterSpacing: "0.05em" }}>{c.tag}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "white", marginBottom: 3 }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>{c.desc}</div>
                </div>
              ))}

              {mode === "custom" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[["query","Query",query,setQuery,3,"The user's question..."],["context","Retrieved context",context,setContext,5,"Documents your RAG system retrieved..."],["answer","Generated answer",answer,setAnswer,4,"The AI response to evaluate..."]].map(([k,l,v,set,r,ph]) => (
                    <div key={k}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 5 }}>{l}</label>
                      <textarea value={v} onChange={e => set(e.target.value)} placeholder={ph} rows={r} style={{ width: "100%", padding: "9px 11px", fontSize: 12, lineHeight: 1.6, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 7, color: "rgba(255,255,255,0.8)" }} />
                    </div>
                  ))}
                </div>
              )}

              {(query || context || answer) && (
                <button onClick={runEval} disabled={!canRun} style={{ width: "100%", padding: "12px 0", fontSize: 14, fontWeight: 700, background: canRun ? "linear-gradient(135deg, #0055AA, #4A9EFF)" : "rgba(255,255,255,0.07)", color: canRun ? "white" : "rgba(255,255,255,0.25)", border: "none", borderRadius: 9, cursor: canRun ? "pointer" : "not-allowed", boxShadow: canRun ? "0 0 18px rgba(74,158,255,0.22)" : "none", transition: "all 0.2s", fontFamily: "inherit" }}>
                  {status === "running" ? `Evaluating ${progress}/5 metrics...` : "Run evaluation"}
                </button>
              )}
            </div>

            {/* RIGHT */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {overall && (
                <div style={{ background: "linear-gradient(135deg, rgba(74,158,255,0.09), rgba(74,158,255,0.03))", border: "1px solid rgba(74,158,255,0.18)", borderRadius: 12, padding: "18px 22px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, animation: "slideUp 0.4s ease" }}>
                  {[["Single judge", overall.overall_single.toFixed(3), "#4A9EFF","balanced only"],["Jury mean", overall.overall_jury.toFixed(3), "#51CF66","avg of 4 personas"],["Bias delta", (overall.overall_delta>=0?"+":"")+overall.overall_delta.toFixed(3), overall.overall_delta>0.05?"#FF6B6B":"#51CF66","single minus jury"],["Verdict", overall.bias_direction.toUpperCase(), overall.bias_direction==="inflated"?"#FF6B6B":"#51CF66", overall.bias_direction==="inflated"?"single over-scored":"judges aligned"]].map(([label,value,color,sub]) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>{label}</div>
                      <div style={{ fontFamily: label==="Verdict"?"'Syne',sans-serif":"'JetBrains Mono',monospace", fontSize: label==="Verdict"?13:22, fontWeight: 700, color, marginBottom: 3 }}>{value}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{sub}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "12px 24px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "grid", gridTemplateColumns: "190px 1fr 1fr 140px 20px", gap: 16 }}>
                  {["Metric","Single judge","Jury mean","Delta",""].map((h,i) => <span key={i} style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.18)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</span>)}
                </div>
                {METRICS.map(m => <MetricRow key={m} metric={m} data={metricData[m]} isActive={activeMetric===m} />)}
              </div>

              {log.length > 0 && (
                <div style={{ background: "#080D14", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: "9px 14px", display: "flex", gap: 5, alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    {["#FF5F57","#FFBD2E","#28C840"].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />)}
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.18)", marginLeft: 7 }}>evaluation log</span>
                    {status === "running" && <div style={{ marginLeft: "auto", display: "flex", gap: 3 }}>{[0,1,2].map(i => <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "#4A9EFF", animation: `pulse 1s ${i*0.2}s infinite` }} />)}</div>}
                  </div>
                  <div ref={logRef} style={{ padding: "10px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.9, maxHeight: 170, overflowY: "auto" }}>
                    {log.map((entry, i) => (
                      <div key={i} style={{ display: "flex", gap: 14, color: logColor[entry.type] || logColor.default }}>
                        <span style={{ color: "rgba(255,255,255,0.12)", flexShrink: 0 }}>{entry.time}</span>
                        <span>{entry.text === "---" ? "─".repeat(36) : entry.text}</span>
                      </div>
                    ))}
                    {status === "running" && <div style={{ color: "#4A9EFF", animation: "fade 1s infinite" }}>▊</div>}
                  </div>
                </div>
              )}

              {status === "idle" && log.length === 0 && (
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12, padding: "52px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 38, marginBottom: 14 }}>⚖️</div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 7 }}>Select a benchmark case to begin</p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.22)", maxWidth: 360, margin: "0 auto", lineHeight: 1.6 }}>Scores stream in live as each of the 4 judge personas evaluates independently.</p>
                  <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 22 }}>
                    <button onClick={() => setSection("problem")} style={{ fontSize: 12, fontWeight: 600, color: "#FF6B6B", background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.18)", borderRadius: 7, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit" }}>What's the problem?</button>
                    <button onClick={() => setSection("solution")} style={{ fontSize: 12, fontWeight: 600, color: "#51CF66", background: "rgba(81,207,102,0.08)", border: "1px solid rgba(81,207,102,0.18)", borderRadius: 7, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit" }}>How does it work?</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "20px 2rem", marginTop: 20 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.18)" }}>glean-eval-bench &nbsp;|&nbsp; Not affiliated with Glean &nbsp;|&nbsp; Built to demonstrate the LLM jury Glean said they'd explore</p>
          <div style={{ display: "flex", gap: 18 }}>
            <a href="https://www.glean.com/blog/glean-ai-evaluator" target="_blank" style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textDecoration: "none" }}>Glean blog post</a>
            <a href="https://github.com/Jafar-97/glean-eval-bench" target="_blank" style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textDecoration: "none" }}>GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}