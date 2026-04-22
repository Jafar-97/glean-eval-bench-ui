import { useState, useEffect, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const METRICS = ["context_relevance", "context_recall", "answer_relevance", "completeness", "groundedness"];
const PERSONAS = ["balanced", "strict", "lenient", "adversarial"];

const PERSONA_META = {
  balanced:    { label: "Balanced",    color: "#0066CC", bg: "#E6F0FF", desc: "Neutral calibration. Glean's current system." },
  strict:      { label: "Strict",      color: "#C53030", bg: "#FFF5F5", desc: "Penalizes any vagueness or unsupported claims." },
  lenient:     { label: "Lenient",     color: "#276749", bg: "#F0FFF4", desc: "Gives benefit of the doubt. Rewards partial answers." },
  adversarial: { label: "Adversarial", color: "#92400E", bg: "#FFFBEB", desc: "Actively hunts for flaws and hallucinations." },
};

const VERDICT_META = {
  inflated:    { label: "Inflated",    color: "#C53030", bg: "#FFF5F5", symbol: "▲" },
  deflated:    { label: "Deflated",    color: "#276749", bg: "#F0FFF4", symbol: "▼" },
  slight_drift:{ label: "Slight drift",color: "#92400E", bg: "#FFFBEB", symbol: "~" },
  aligned:     { label: "Aligned",     color: "#276749", bg: "#F0FFF4", symbol: "✓" },
};

function ScoreBar({ value, color = "#0066CC", size = "normal" }) {
  const h = size === "small" ? 4 : 6;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: h, background: "#EEF2F7", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${(value || 0) * 100}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: size === "small" ? 11 : 13, fontWeight: 500, color: "#0A1628", minWidth: 36, textAlign: "right" }}>
        {value !== null && value !== undefined ? value.toFixed(3) : "..."}
      </span>
    </div>
  );
}

function DeltaBadge({ delta }) {
  if (delta === null || delta === undefined) return null;
  const isInflated = delta > 0.05;
  const isDeflated = delta < -0.05;
  const color = isInflated ? "#C53030" : isDeflated ? "#276749" : "#64748B";
  const bg = isInflated ? "#FFF5F5" : isDeflated ? "#F0FFF4" : "#F1F5F9";
  const label = isInflated ? "inflated" : isDeflated ? "deflated" : "aligned";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: bg, color, border: `1px solid ${color}22` }}>
      {delta >= 0 ? "+" : ""}{delta.toFixed(3)} {label}
    </span>
  );
}

function MetricRow({ metric, data, isActive }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid #EEF2F7", background: isActive ? "#F7FAFF" : "white", transition: "background 0.3s" }}>
      <div style={{ padding: "14px 20px", cursor: data ? "pointer" : "default" }} onClick={() => data && setExpanded(e => !e)}>
        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr 140px 20px", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#0066CC", fontWeight: 500 }}>{metric}</span>
          <div>
            <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Single judge</div>
            <ScoreBar value={data?.single} color="#0066CC" />
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Jury mean</div>
            <ScoreBar value={data?.jury_mean} color={data?.delta > 0.05 ? "#E53E3E" : "#38A169"} />
          </div>
          <div>
            {data && <DeltaBadge delta={data.delta} />}
            {!data && isActive && <span style={{ fontSize: 12, color: "#94A3B8" }}>evaluating...</span>}
          </div>
          <span style={{ color: "#CBD5E1", fontSize: 12 }}>{data ? (expanded ? "▲" : "▼") : ""}</span>
        </div>
      </div>
      {expanded && data && (
        <div style={{ padding: "0 20px 16px", borderTop: "1px solid #EEF2F7" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
            {PERSONAS.map(p => {
              const score = data.jury_scores?.[p];
              const meta = PERSONA_META[p];
              return (
                <div key={p} style={{ background: meta.bg, borderRadius: 8, padding: "12px 14px", border: `1px solid ${meta.color}22` }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: meta.color, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{meta.label}</div>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 18, fontWeight: 600, color: "#0A1628", marginBottom: 4 }}>{score?.toFixed(3) ?? "..."}</div>
                  <div style={{ fontSize: 11, color: "#64748B" }}>{meta.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CaseCard({ c, onSelect, selected }) {
  const biasColor = c.expected_bias === "aligned" ? "#276749" : "#C53030";
  const biasBg = c.expected_bias === "aligned" ? "#F0FFF4" : "#FFF5F5";
  return (
    <div onClick={() => onSelect(c)} style={{ padding: "14px 16px", borderRadius: 10, border: `1.5px solid ${selected ? "#0066CC" : "#E2E8F0"}`, background: selected ? "#E6F0FF" : "white", cursor: "pointer", transition: "all 0.15s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#0066CC", fontWeight: 500 }}>{c.id}</span>
        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10, background: biasBg, color: biasColor }}>{c.expected_bias}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: "#0A1628", marginBottom: 4 }}>{c.label}</div>
      <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5 }}>{c.description}</div>
    </div>
  );
}

export default function App() {
  const [cases, setCases] = useState([]);
  const [mode, setMode] = useState("cases"); // "cases" | "custom"
  const [selectedCase, setSelectedCase] = useState(null);
  const [query, setQuery] = useState("");
  const [context, setContext] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState("idle"); // idle | running | done | error
  const [activeMetric, setActiveMetric] = useState(null);
  const [metricData, setMetricData] = useState({});
  const [overall, setOverall] = useState(null);
  const [log, setLog] = useState([]);
  const logRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/cases`).then(r => r.json()).then(setCases).catch(() => {});
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const selectCase = async (c) => {
    setSelectedCase(c);
    const full = await fetch(`${API}/cases/${c.id}`).then(r => r.json());
    setQuery(full.query);
    setContext(full.context);
    setAnswer(full.answer);
    resetResults();
  };

  const resetResults = () => {
    setStatus("idle");
    setActiveMetric(null);
    setMetricData({});
    setOverall(null);
    setLog([]);
  };

  const addLog = (msg) => setLog(l => [...l, msg]);

  const runEval = async () => {
    if (!query.trim() || !context.trim() || !answer.trim()) return;
    resetResults();
    setStatus("running");
    addLog("Starting evaluation...");

    try {
      const resp = await fetch(`${API}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, context, answer })
      });

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));

          if (data.type === "start") {
            addLog("Connected. Running single judge + LLM jury across 5 metrics...");
          }
          if (data.type === "metric_start") {
            setActiveMetric(data.metric);
            addLog(`  Evaluating ${data.metric}...`);
          }
          if (data.type === "single_result") {
            addLog(`    Balanced judge: ${data.score.toFixed(3)}`);
          }
          if (data.type === "jury_result") {
            addLog(`    ${data.persona} judge: ${data.score.toFixed(3)}`);
          }
          if (data.type === "metric_complete") {
            setMetricData(prev => ({ ...prev, [data.metric]: data }));
            const arrow = data.delta > 0.05 ? "▲ INFLATED" : data.delta < -0.05 ? "▼ DEFLATED" : "✓ aligned";
            addLog(`  ${data.metric}: single=${data.single} jury=${data.jury_mean} delta=${data.delta > 0 ? "+" : ""}${data.delta} ${arrow}`);
          }
          if (data.type === "complete") {
            setOverall(data);
            setActiveMetric(null);
            setStatus("done");
            addLog("");
            addLog(`OVERALL: single=${data.overall_single} jury=${data.overall_jury} delta=${data.overall_delta > 0 ? "+" : ""}${data.overall_delta}`);
            addLog(`BIAS: ${data.bias_direction.toUpperCase()}`);
          }
        }
      }
    } catch (e) {
      setStatus("error");
      addLog(`Error: ${e.message}`);
    }
  };

  const canRun = query.trim() && context.trim() && answer.trim() && status !== "running";
  const progress = METRICS.filter(m => metricData[m]).length;

  return (
    <div style={{ fontFamily: "Inter, sans-serif", color: "#0A1628", background: "#F7FAFF", minHeight: "100vh" }}>

      {/* TOP NAV */}
      <nav style={{ background: "white", borderBottom: "1px solid #E2E8F0", padding: "0 2rem", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 26, height: 26, background: "#0066CC", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" fill="white" viewBox="0 0 16 16"><path d="M13 6.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm-1.5 0a3 3 0 1 0-6 0 3 3 0 0 0 6 0Zm-8.94 6.56 2.47-2.47 1.06 1.06-2.47 2.47-1.06-1.06Z"/></svg>
          </div>
          <span style={{ fontWeight: 600, fontSize: 14 }}>glean-eval-bench</span>
          <span style={{ fontSize: 11, background: "#E6F0FF", color: "#0066CC", padding: "2px 8px", borderRadius: 10, fontWeight: 500 }}>live</span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <a href="https://www.glean.com/blog/glean-ai-evaluator" target="_blank" style={{ fontSize: 13, color: "#64748B", textDecoration: "none" }}>Glean blog post</a>
          <a href="https://github.com/jafar-mohammad/glean-eval-bench" target="_blank" style={{ fontSize: 13, color: "white", background: "#0066CC", padding: "5px 14px", borderRadius: 6, textDecoration: "none", fontWeight: 500 }}>GitHub</a>
        </div>
      </nav>

      {/* HERO STRIP */}
      <div style={{ background: "#0A1628", padding: "28px 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#60A5FA", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Live evaluation tool</p>
          <h1 style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 600, color: "white", letterSpacing: "-0.015em", marginBottom: 8 }}>Single judge vs LLM jury</h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", maxWidth: 600 }}>
            Glean's engineers documented that their single-judge eval suffers from self-enhancement bias and planned to build an ensemble "LLM jury." Run a benchmark case or paste your own RAG sample to see the bias delta live.
          </p>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 2rem", display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, alignItems: "start" }}>

        {/* LEFT PANEL */}
        <div>
          {/* Mode toggle */}
          <div style={{ display: "flex", background: "white", borderRadius: 8, border: "1px solid #E2E8F0", padding: 3, marginBottom: 16 }}>
            {["cases", "custom"].map(m => (
              <button key={m} onClick={() => { setMode(m); resetResults(); }}
                style={{ flex: 1, padding: "7px 0", fontSize: 13, fontWeight: 500, borderRadius: 6, border: "none", cursor: "pointer", background: mode === m ? "#0066CC" : "transparent", color: mode === m ? "white" : "#64748B", transition: "all 0.15s" }}>
                {m === "cases" ? "Benchmark cases" : "Custom input"}
              </button>
            ))}
          </div>

          {mode === "cases" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {cases.map(c => <CaseCard key={c.id} c={c} onSelect={selectCase} selected={selectedCase?.id === c.id} />)}
            </div>
          )}

          {mode === "custom" && (
            <div style={{ background: "white", borderRadius: 10, border: "1px solid #E2E8F0", padding: 16 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Query</label>
                <textarea value={query} onChange={e => setQuery(e.target.value)} placeholder="The user's question..." rows={3}
                  style={{ width: "100%", resize: "vertical", padding: "10px 12px", fontSize: 13, lineHeight: 1.6, border: "1px solid #E2E8F0", borderRadius: 8, fontFamily: "inherit", color: "#0A1628", outline: "none" }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Retrieved context</label>
                <textarea value={context} onChange={e => setContext(e.target.value)} placeholder="The documents your RAG system retrieved..." rows={5}
                  style={{ width: "100%", resize: "vertical", padding: "10px 12px", fontSize: 13, lineHeight: 1.6, border: "1px solid #E2E8F0", borderRadius: 8, fontFamily: "inherit", color: "#0A1628", outline: "none" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Generated answer</label>
                <textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="The AI response you want to evaluate..." rows={4}
                  style={{ width: "100%", resize: "vertical", padding: "10px 12px", fontSize: 13, lineHeight: 1.6, border: "1px solid #E2E8F0", borderRadius: 8, fontFamily: "inherit", color: "#0A1628", outline: "none" }} />
              </div>
            </div>
          )}

          {/* Run button */}
          {(query || context || answer) && (
            <button onClick={runEval} disabled={!canRun}
              style={{ width: "100%", marginTop: 12, padding: "12px 0", fontSize: 15, fontWeight: 600, background: canRun ? "#0066CC" : "#94A3B8", color: "white", border: "none", borderRadius: 8, cursor: canRun ? "pointer" : "not-allowed", transition: "background 0.15s" }}>
              {status === "running" ? `Evaluating... (${progress}/5 metrics)` : "Run evaluation"}
            </button>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div>
          {/* Overall summary */}
          {overall && (
            <div style={{ background: "#0A1628", borderRadius: 12, padding: "20px 24px", marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
              {[
                { label: "Single judge", value: overall.overall_single.toFixed(3), color: "#60A5FA" },
                { label: "Jury mean", value: overall.overall_jury.toFixed(3), color: "#34D399" },
                { label: "Bias delta", value: (overall.overall_delta > 0 ? "+" : "") + overall.overall_delta.toFixed(3), color: overall.overall_delta > 0.05 ? "#F87171" : overall.overall_delta < -0.05 ? "#34D399" : "#94A3B8" },
                { label: "Verdict", value: overall.bias_direction, color: overall.bias_direction === "inflated" ? "#F87171" : overall.bias_direction === "deflated" ? "#34D399" : "#94A3B8" },
              ].map(item => (
                <div key={item.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{item.label}</div>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 22, fontWeight: 600, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Metric rows */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #EEF2F7", display: "grid", gridTemplateColumns: "180px 1fr 1fr 140px 20px", gap: 16 }}>
              {["Metric", "Single judge", "Jury mean", "Delta", ""].map((h, i) => (
                <span key={i} style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
              ))}
            </div>
            {METRICS.map(m => (
              <MetricRow key={m} metric={m} data={metricData[m]} isActive={activeMetric === m} />
            ))}
          </div>

          {/* Live log */}
          {log.length > 0 && (
            <div style={{ background: "#0D1117", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{ background: "#161B22", padding: "10px 16px", display: "flex", gap: 5, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFBD2E" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }} />
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "rgba(255,255,255,0.25)", marginLeft: 8 }}>evaluation log</span>
              </div>
              <div ref={logRef} style={{ padding: "14px 18px", fontFamily: "JetBrains Mono, monospace", fontSize: 12, lineHeight: 1.9, maxHeight: 220, overflowY: "auto" }}>
                {log.map((line, i) => {
                  const isInflated = line.includes("INFLATED");
                  const isAligned = line.includes("aligned") && !line.includes("INFLATED");
                  const isHeader = line.startsWith("OVERALL") || line.startsWith("BIAS");
                  const color = isInflated ? "#F85149" : isAligned ? "#56D364" : isHeader ? "#E3B341" : "rgba(255,255,255,0.6)";
                  return <div key={i} style={{ color }}>{line || "\u00A0"}</div>;
                })}
                {status === "running" && <div style={{ color: "#60A5FA" }}>▊</div>}
              </div>
            </div>
          )}

          {/* Empty state */}
          {status === "idle" && log.length === 0 && (
            <div style={{ background: "white", borderRadius: 12, border: "1px solid #E2E8F0", padding: "48px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚖️</div>
              <p style={{ fontSize: 15, fontWeight: 500, color: "#0A1628", marginBottom: 6 }}>Select a benchmark case or enter a custom sample</p>
              <p style={{ fontSize: 13, color: "#94A3B8", maxWidth: 400, margin: "0 auto" }}>Each evaluation runs a balanced judge plus 3 jury personas and shows the bias delta per metric in real time.</p>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid #E2E8F0", padding: "20px 2rem", marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <p style={{ fontSize: 13, color: "#94A3B8" }}>glean-eval-bench &nbsp;|&nbsp; Built by Jafar Mohammad &nbsp;|&nbsp; Not affiliated with Glean</p>
        <div style={{ display: "flex", gap: 20 }}>
          <a href="https://www.glean.com/blog/glean-ai-evaluator" target="_blank" style={{ fontSize: 13, color: "#94A3B8", textDecoration: "none" }}>Glean blog post</a>
          <a href="https://github.com/jafar-mohammad/glean-eval-bench" target="_blank" style={{ fontSize: 13, color: "#94A3B8", textDecoration: "none" }}>GitHub</a>
        </div>
      </footer>
    </div>
  );
}
