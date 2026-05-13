import { useState, useEffect, useRef } from "react";

// ── Constants ──────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "geschichte",   label: "Geschichte",         emoji: "🏛️", color: "#a78bfa" },
  { id: "sport",        label: "Sport",               emoji: "⚽", color: "#34d399" },
  { id: "musik",        label: "Musik",               emoji: "🎵", color: "#f472b6" },
  { id: "wissenschaft", label: "Wissenschaft",        emoji: "🔬", color: "#38bdf8" },
  { id: "geografie",    label: "Geografie",           emoji: "🌍", color: "#4ade80" },
  { id: "film",         label: "Film & TV",           emoji: "🎬", color: "#fb923c" },
  { id: "natur",        label: "Natur & Tiere",       emoji: "🦁", color: "#86efac" },
  { id: "essen",        label: "Essen & Trinken",     emoji: "🍕", color: "#fbbf24" },
  { id: "technologie",  label: "Technologie",         emoji: "💻", color: "#60a5fa" },
  { id: "kunst",        label: "Kunst & Literatur",   emoji: "🎨", color: "#e879f9" },
  { id: "politik",      label: "Politik & Wirtschaft",emoji: "🏛", color: "#f87171" },
  { id: "gemischt",     label: "Gemischt",            emoji: "🎲", color: "#c9a84c" },
];
const DIFFICULTIES = [
  { id: "leicht", label: "Leicht", color: "#4ade80", bg: "rgba(74,222,128,0.1)" },
  { id: "mittel", label: "Mittel", color: "#facc15", bg: "rgba(250,204,21,0.1)" },
  { id: "schwer", label: "Schwer", color: "#f87171", bg: "rgba(248,113,113,0.1)" },
];
const TOTAL_Q = 10;
const BASE_TIME = 20;
const LB_KEY = "pubquiz-lb-v5";

// ── Storage (localStorage für Vercel) ─────────────────────────────────────────
async function loadLB() {
  try {
    const raw = localStorage.getItem(LB_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
async function saveLB(entry) {
  try {
    const cur = await loadLB();
    const upd = [...cur, entry].sort((a, b) => b.score - a.score).slice(0, 20);
    localStorage.setItem(LB_KEY, JSON.stringify(upd));
    return upd;
  } catch { return []; }
}

// ── API ────────────────────────────────────────────────────────────────────────
async function fetchQuestion(category, difficulty, usedQs) {
  const cat = CATEGORIES.find(c => c.id === category)?.label || "Gemischt";
  const used = usedQs.length ? `\nNicht wiederholen:\n${usedQs.slice(-15).join("\n")}` : "";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system: `Pub-Quiz-Master. NUR JSON, kein Markdown.
Format: {"frage":"...","antworten":["Richtig","Falsch2","Falsch3","Falsch4"],"richtig":0,"erklaerung":"1-2 Sätze"}
richtig ist IMMER 0. Schwierigkeit: ${difficulty}. Kategorie: ${cat}.${used}`,
      messages: [{ role: "user", content: "Neue Frage." }],
    }),
  });
  const data = await res.json();
  const txt = data.content?.find(b => b.type === "text")?.text || "";
  const parsed = JSON.parse(txt.replace(/```json|```/g, "").trim());
  const correct = parsed.antworten[0];
  const shuffled = [...parsed.antworten].sort(() => Math.random() - 0.5);
  return {
    frage: parsed.frage,
    antworten: shuffled,
    richtig: shuffled.indexOf(correct),
    erklaerung: parsed.erklaerung,
  };
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const G = {
  page: { minHeight: "100vh", background: "#080810", color: "#e8e4f0", fontFamily: "'Inter',system-ui,sans-serif", display: "flex", flexDirection: "column", alignItems: "center" },
  card: { width: "100%", maxWidth: 540, padding: "0 18px 60px" },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Sora:wght@700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  :root{--gold:#c9a84c;--gold2:#e8c66a}
  ::-webkit-scrollbar{width:4px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:2px}

  .ans{all:unset;display:flex;align-items:center;gap:12px;width:100%;padding:13px 16px;border-radius:14px;border:1.5px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);cursor:pointer;font-size:14px;color:#e8e4f0;transition:all .15s;line-height:1.45}
  .ans:hover:not(:disabled){border-color:rgba(255,255,255,.2);background:rgba(255,255,255,.06)}
  .ans.sel{border-color:var(--gold);background:rgba(201,168,76,.09)}
  .ans.ok{border-color:#4ade80;background:rgba(74,222,128,.1);color:#4ade80}
  .ans.bad{border-color:#f87171;background:rgba(248,113,113,.09);color:#f87171}
  .ans.dim{opacity:.25}
  .ans.out{opacity:.15;text-decoration:line-through}

  .cat{all:unset;display:flex;align-items:center;gap:7px;padding:9px 13px;border-radius:10px;border:1.5px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);cursor:pointer;font-size:13px;font-weight:500;color:rgba(232,228,240,.6);transition:all .15s;white-space:nowrap}
  .cat:hover{background:rgba(255,255,255,.05);color:#e8e4f0}
  .cat.on{color:#080810;font-weight:700}

  .diff{all:unset;padding:8px 20px;border-radius:8px;border:1.5px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);cursor:pointer;font-size:13px;font-weight:600;color:rgba(232,228,240,.5);transition:all .15s}
  .diff:hover{color:#e8e4f0;border-color:rgba(255,255,255,.18)}
  .diff.on{color:#080810}

  .btn-primary{all:unset;background:linear-gradient(135deg,var(--gold),var(--gold2));color:#080810;font-weight:800;font-size:15px;padding:13px 30px;border-radius:12px;cursor:pointer;letter-spacing:.2px;transition:all .2s;display:inline-block}
  .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px)}
  .btn-primary:disabled{opacity:.35;cursor:default;transform:none;filter:none}
  .btn-ghost{all:unset;color:var(--gold);border:1.5px solid rgba(201,168,76,.3);padding:11px 22px;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s}
  .btn-ghost:hover{background:rgba(201,168,76,.08);border-color:rgba(201,168,76,.5)}
  .btn-link{all:unset;color:rgba(232,228,240,.3);font-size:12px;cursor:pointer;transition:color .15s}
  .btn-link:hover{color:rgba(232,228,240,.6)}

  .joker{all:unset;display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 18px;border-radius:11px;border:1.5px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);cursor:pointer;transition:all .2s}
  .joker:hover:not(:disabled){background:rgba(255,255,255,.07);transform:translateY(-2px)}
  .joker:disabled,.joker.used{opacity:.2;cursor:default;transform:none}

  .ninput{all:unset;width:100%;padding:14px 18px;border-radius:12px;border:1.5px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);font-size:16px;color:#e8e4f0;text-align:center;transition:border-color .2s}
  .ninput:focus{border-color:var(--gold)}
  .ninput::placeholder{color:rgba(232,228,240,.2)}

  .score-glow{text-shadow:0 0 40px rgba(201,168,76,.5)}

  @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes popIn{0%{opacity:0;transform:scale(.9)}100%{opacity:1;transform:scale(1)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes streakPop{0%{transform:scale(1)}50%{transform:scale(1.5)}100%{transform:scale(1)}}
  .anim-fadeUp{animation:fadeUp .35s ease both}
  .anim-popIn{animation:popIn .28s ease both}
`;

// ── Small components ───────────────────────────────────────────────────────────
function Logo({ size = "md" }) {
  const big = size === "lg";
  return (
    <div style={{ textAlign: "center", marginBottom: big ? 32 : 20 }}>
      <div style={{ fontSize: 10, letterSpacing: 6, color: "var(--gold)", textTransform: "uppercase", fontWeight: 700, marginBottom: 4, opacity: .8 }}>The Grand</div>
      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: big ? 44 : 26, fontWeight: 800, letterSpacing: -.5, background: "linear-gradient(135deg,#e8e4f0 30%,var(--gold))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        Pub Quiz
      </div>
      {big && <div style={{ width: 40, height: 2, background: "linear-gradient(90deg,transparent,var(--gold),transparent)", margin: "10px auto 0" }} />}
    </div>
  );
}
function Divider() { return <div style={{ height: 1, background: "rgba(255,255,255,.06)", margin: "20px 0" }} />; }
function Label({ children }) { return <div style={{ fontSize: 10, letterSpacing: 4, color: "var(--gold)", textTransform: "uppercase", fontWeight: 700, marginBottom: 10, opacity: .8 }}>{children}</div>; }
function Spinner() { return <div style={{ fontSize: 22, display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</div>; }
function MedalIcon({ rank }) {
  if (rank === 0) return <span style={{ fontSize: 18 }}>🥇</span>;
  if (rank === 1) return <span style={{ fontSize: 18 }}>🥈</span>;
  if (rank === 2) return <span style={{ fontSize: 18 }}>🥉</span>;
  return <span style={{ fontSize: 13, color: "rgba(232,228,240,.3)", minWidth: 22, textAlign: "center" }}>{rank + 1}</span>;
}

// ── App ────────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("name");
  const [nameInput, setNameInput] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [category, setCategory] = useState("gemischt");
  const [difficulty, setDifficulty] = useState("mittel");

  const [q, setQ] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [eliminated, setEliminated] = useState([]);
  const [score, setScore] = useState(0);
  const [qNum, setQNum] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [usedQs, setUsedQs] = useState([]);
  const [history, setHistory] = useState([]);
  const [j5050, setJ5050] = useState(true);
  const [jTime, setJTime] = useState(true);

  const [timeLeft, setTimeLeft] = useState(BASE_TIME);
  const [timerOn, setTimerOn] = useState(false);
  const timerRef = useRef(null);

  const [lb, setLb] = useState([]);
  const [lbLoading, setLbLoading] = useState(false);

  useEffect(() => {
    if (timerOn && timeLeft > 0 && !revealed) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    } else if (timerOn && timeLeft === 0 && !revealed) {
      reveal(null);
    }
    return () => clearTimeout(timerRef.current);
  }, [timerOn, timeLeft, revealed]);

  async function fetchLB() {
    setLbLoading(true);
    setLb(await loadLB());
    setLbLoading(false);
  }

  function goName() {
    const n = nameInput.trim();
    if (!n) return;
    setPlayerName(n);
    fetchLB();
    setScreen("menu");
  }

  async function loadQ() {
    setLoading(true); setSelected(null); setRevealed(false);
    setEliminated([]); setErr(null); setTimeLeft(BASE_TIME); setTimerOn(false);
    try {
      const nq = await fetchQuestion(category, difficulty, usedQs);
      setQ(nq); setUsedQs(p => [...p, nq.frage]); setTimerOn(true);
    } catch { setErr("Fehler – bitte nochmals versuchen."); }
    setLoading(false);
  }

  function startQuiz() {
    setScore(0); setQNum(1); setStreak(0); setBestStreak(0);
    setUsedQs([]); setHistory([]); setJ5050(true); setJTime(true);
    setScreen("quiz"); setTimeout(loadQ, 40);
  }

  function reveal(forceSel) {
    clearTimeout(timerRef.current); setTimerOn(false);
    const sel = forceSel !== undefined ? forceSel : selected;
    setSelected(sel); setRevealed(true);
    const ok = sel !== null && sel === q.richtig;
    const ns = ok ? streak + 1 : 0;
    setStreak(ns); setBestStreak(bs => Math.max(ns, bs));
    const bonus = ok && ns >= 3 ? 1 : 0;
    if (ok) setScore(s => s + 1 + bonus);
    setHistory(h => [...h, { frage: q.frage, ok, antwort: sel !== null ? q.antworten[sel] : "—", richtig: q.antworten[q.richtig], bonus }]);
  }

  async function next() {
    if (qNum >= TOTAL_Q) {
      const entry = { name: playerName, score, total: TOTAL_Q, category, difficulty, bestStreak, date: new Date().toLocaleDateString("de-CH") };
      const upd = await saveLB(entry);
      setLb(upd); setScreen("result");
    } else { setQNum(n => n + 1); loadQ(); }
  }

  const cat = CATEGORIES.find(c => c.id === category);
  const diff = DIFFICULTIES.find(d => d.id === difficulty);
  const timerPct = (timeLeft / BASE_TIME) * 100;
  const timerCol = timeLeft > 10 ? "#4ade80" : timeLeft > 5 ? "#facc15" : "#f87171";

  // ── NAME ───────────────────────────────────────────────────────────────────
  if (screen === "name") return (
    <div style={G.page}>
      <style>{css}</style>
      <div style={{ ...G.card, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="anim-fadeUp" style={{ width: "100%", textAlign: "center" }}>
          <Logo size="lg" />
          <p style={{ color: "rgba(232,228,240,.4)", fontSize: 14, marginBottom: 32, lineHeight: 1.7 }}>
            10 KI-generierte Fragen · Joker · Streak-Bonus
          </p>
          <input className="ninput" placeholder="Dein Name…" value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && goName()} autoFocus maxLength={20} />
          <div style={{ marginTop: 14 }}>
            <button className="btn-primary" disabled={!nameInput.trim()} onClick={goName}>Spielen →</button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── MENU ──────────────────────────────────────────────────────────────────
  if (screen === "menu") return (
    <div style={G.page}>
      <style>{css}</style>
      <div style={{ ...G.card, paddingTop: 36 }} className="anim-fadeUp">
        <Logo />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Hallo, {playerName} 👋</div>
            <div style={{ fontSize: 12, color: "rgba(232,228,240,.35)", marginTop: 2 }}>Bereit für {TOTAL_Q} Fragen?</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn-ghost" style={{ fontSize: 13, padding: "8px 14px" }} onClick={() => { fetchLB(); setScreen("leaderboard"); }}>🏆</button>
            <button className="btn-link" onClick={() => { setPlayerName(""); setNameInput(""); setScreen("name"); }}>Wechseln</button>
          </div>
        </div>
        <Divider />
        <Label>Kategorie</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 24 }}>
          {CATEGORIES.map(c => (
            <button key={c.id} className={`cat ${category === c.id ? "on" : ""}`}
              style={category === c.id ? { background: c.color, borderColor: c.color } : {}}
              onClick={() => setCategory(c.id)}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
        <Label>Schwierigkeit</Label>
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {DIFFICULTIES.map(d => (
            <button key={d.id} className={`diff ${difficulty === d.id ? "on" : ""}`}
              style={difficulty === d.id ? { background: d.color, borderColor: d.color } : {}}
              onClick={() => setDifficulty(d.id)}>{d.label}</button>
          ))}
        </div>
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: "14px 18px", marginBottom: 28, fontSize: 13, color: "rgba(232,228,240,.5)", lineHeight: 1.9 }}>
          🔥 <b style={{ color: "#e8e4f0" }}>Streak-Bonus</b> — ab 3x in Folge: +1 Punkt<br />
          🃏 <b style={{ color: "#e8e4f0" }}>Joker</b> — 50:50 &amp; +15 Sekunden
        </div>
        <div style={{ textAlign: "center" }}>
          <button className="btn-primary" onClick={startQuiz}>Quiz starten</button>
        </div>
      </div>
    </div>
  );

  // ── QUIZ ──────────────────────────────────────────────────────────────────
  if (screen === "quiz") return (
    <div style={G.page}>
      <style>{css}</style>
      <div style={{ ...G.card, paddingTop: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: "rgba(232,228,240,.4)" }}>
            <span style={{ color: "var(--gold)", fontWeight: 700 }}>{playerName}</span> · {qNum}/{TOTAL_Q}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {streak >= 2 && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, animation: "streakPop .35s ease" }}>
                <span>🔥</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#f97316" }}>{streak}x</span>
              </div>
            )}
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 800, color: "var(--gold)" }}>
              {score} <span style={{ fontSize: 11, fontWeight: 500, opacity: .6 }}>Pkt</span>
            </div>
          </div>
        </div>
        <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,.06)", marginBottom: 6, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${((qNum - 1) / TOTAL_Q) * 100}%`, background: "linear-gradient(90deg,var(--gold),var(--gold2))", transition: "width .5s" }} />
        </div>
        <div style={{ display: "flex", gap: 7, marginBottom: 18, marginTop: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: cat?.color, textTransform: "uppercase" }}>{cat?.emoji} {cat?.label}</span>
          <span style={{ fontSize: 11, color: diff?.color, opacity: .8, letterSpacing: 1, textTransform: "uppercase" }}>· {diff?.label}</span>
        </div>

        {loading && <div style={{ textAlign: "center", padding: "64px 0", color: "rgba(232,228,240,.3)" }}><Spinner /><div style={{ marginTop: 12, fontSize: 13 }}>Frage wird generiert…</div></div>}
        {err && <div style={{ textAlign: "center", padding: 32, color: "#f87171", fontSize: 14 }}>{err}<br /><br /><button className="btn-ghost" onClick={loadQ}>Nochmals</button></div>}

        {!loading && !err && q && (
          <div className="anim-popIn">
            {!revealed && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 10, letterSpacing: 3, color: "rgba(232,228,240,.25)", textTransform: "uppercase" }}>Zeit</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: timerCol }}>{timeLeft}s</span>
                </div>
                <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${timerPct}%`, background: timerCol, transition: "width 1s linear, background .5s" }} />
                </div>
              </div>
            )}
            <div style={{ padding: "18px 20px", background: "rgba(255,255,255,.03)", borderRadius: 14, borderLeft: `3px solid ${cat?.color || "var(--gold)"}`, marginBottom: 16, fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 700, lineHeight: 1.55 }}>
              {q.frage}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {q.antworten.map((a, i) => {
                const isElim = eliminated.includes(i);
                let cls = "ans";
                if (isElim) cls += " out";
                else if (revealed) {
                  if (i === q.richtig) cls += " ok";
                  else if (i === selected) cls += " bad";
                  else cls += " dim";
                } else if (selected === i) cls += " sel";
                return (
                  <button key={i} className={cls} disabled={revealed || isElim} onClick={() => !revealed && !isElim && setSelected(i)}>
                    <span style={{ fontWeight: 700, fontSize: 12, opacity: .4, minWidth: 18 }}>{["A","B","C","D"][i]}</span>
                    <span style={{ flex: 1 }}>{a}</span>
                    {revealed && i === q.richtig && <span style={{ marginLeft: "auto", fontSize: 13 }}>✓</span>}
                  </button>
                );
              })}
            </div>
            {!revealed && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className={`joker ${!j5050 ? "used" : ""}`} disabled={!j5050} onClick={() => {
                  if (!j5050 || revealed || !q) return; setJ5050(false);
                  const ws = q.antworten.map((_, i) => i).filter(i => i !== q.richtig && i !== selected);
                  setEliminated(ws.sort(() => Math.random() - .5).slice(0, 2));
                }}>
                  <span style={{ fontSize: 16 }}>🃏</span>
                  <span style={{ fontSize: 11, color: "rgba(232,228,240,.4)" }}>50:50</span>
                </button>
                <button className={`joker ${!jTime ? "used" : ""}`} disabled={!jTime} onClick={() => {
                  if (!jTime || revealed) return; setJTime(false); setTimeLeft(t => Math.min(t + 15, 35));
                }}>
                  <span style={{ fontSize: 16 }}>⏱️</span>
                  <span style={{ fontSize: 11, color: "rgba(232,228,240,.4)" }}>+15s</span>
                </button>
                {selected !== null && (
                  <button className="btn-primary" style={{ marginLeft: "auto", fontSize: 14, padding: "10px 22px" }} onClick={() => reveal(undefined)}>
                    Antworten →
                  </button>
                )}
              </div>
            )}
            {revealed && (
              <div className="anim-fadeUp">
                <div style={{ padding: "14px 18px", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, fontSize: 13, lineHeight: 1.7, color: "rgba(232,228,240,.65)", marginBottom: 14 }}>
                  <span style={{ color: "var(--gold)", fontWeight: 700 }}>💡 </span>{q.erklaerung}
                  {history[history.length - 1]?.bonus > 0 && (
                    <div style={{ marginTop: 8, color: "#f97316", fontWeight: 700, fontSize: 12 }}>🔥 Streak-Bonus: +1 Extrapunkt!</div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <button className="btn-primary" onClick={next}>
                    {qNum >= TOTAL_Q ? "Ergebnis →" : "Weiter →"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // ── RESULT ────────────────────────────────────────────────────────────────
  if (screen === "result") {
    const myRank = lb.findIndex(e => e.name === playerName && e.score === score);
    const maxPts = TOTAL_Q + 3;
    const pct = Math.round((score / maxPts) * 100);
    return (
      <div style={G.page}>
        <style>{css}</style>
        <div style={{ ...G.card, paddingTop: 36 }} className="anim-fadeUp">
          <Logo />
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: "rgba(232,228,240,.35)", marginBottom: 6 }}>{playerName}</div>
            <div className="score-glow" style={{ fontFamily: "'Sora',sans-serif", fontSize: 80, fontWeight: 900, color: "var(--gold)", lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: 12, color: "rgba(232,228,240,.3)", marginTop: 4 }}>von {maxPts} möglichen Punkten · {pct}%</div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 800, marginTop: 10 }}>
              {score >= 11 ? "🏆 Pub-Quiz-Legende!" : score >= 8 ? "🥇 Ausgezeichnet!" : score >= 6 ? "👍 Solides Resultat" : score >= 4 ? "📚 Noch Luft nach oben" : "🎯 Weiter üben!"}
            </div>
            <div style={{ fontSize: 12, color: "rgba(232,228,240,.3)", marginTop: 6 }}>
              {cat?.emoji} {cat?.label} · {diff?.label} · Beste Streak 🔥{bestStreak}
            </div>
            {myRank >= 0 && <div style={{ fontSize: 13, color: "var(--gold)", fontWeight: 700, marginTop: 6 }}>Platz {myRank + 1} im Leaderboard 🏅</div>}
          </div>
          <Divider />
          <Label>Auswertung</Label>
          <div style={{ maxHeight: 240, overflowY: "auto", marginBottom: 20 }}>
            {history.map((h, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,.05)", alignItems: "flex-start" }}>
                <span style={{ fontSize: 13, flexShrink: 0 }}>{h.ok ? "✅" : "❌"}</span>
                <div>
                  <div style={{ fontSize: 13, color: "rgba(232,228,240,.6)", lineHeight: 1.4 }}>{h.frage}</div>
                  {!h.ok && <div style={{ fontSize: 12, color: "#4ade80", marginTop: 2 }}>✓ {h.richtig}</div>}
                  {h.bonus > 0 && <div style={{ fontSize: 11, color: "#f97316", marginTop: 2 }}>🔥 +1 Streak-Bonus</div>}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <button className="btn-primary" onClick={startQuiz}>Nochmals spielen</button>
            <button className="btn-ghost" onClick={() => { fetchLB(); setScreen("leaderboard"); }}>🏆 Leaderboard</button>
            <button className="btn-ghost" onClick={() => setScreen("menu")}>Einstellungen</button>
          </div>
        </div>
      </div>
    );
  }

  // ── LEADERBOARD ───────────────────────────────────────────────────────────
  if (screen === "leaderboard") return (
    <div style={G.page}>
      <style>{css}</style>
      <div style={{ ...G.card, paddingTop: 36 }} className="anim-fadeUp">
        <Logo />
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 20, textAlign: "center" }}>🏆 Leaderboard</div>
        {lbLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}><Spinner /></div>
        ) : lb.length === 0 ? (
          <div style={{ textAlign: "center", color: "rgba(232,228,240,.3)", padding: "40px 0", fontSize: 14 }}>Noch keine Einträge — sei der Erste!</div>
        ) : lb.map((e, i) => {
          const isMe = e.name === playerName;
          const c = CATEGORIES.find(c => c.id === e.category);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", marginBottom: 6, borderRadius: 12, background: isMe ? "rgba(201,168,76,.07)" : "rgba(255,255,255,.02)", border: isMe ? "1.5px solid rgba(201,168,76,.25)" : "1.5px solid rgba(255,255,255,.05)" }}>
              <MedalIcon rank={i} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: isMe ? "var(--gold)" : "#e8e4f0", display: "flex", alignItems: "center", gap: 6 }}>
                  {e.name}{isMe && <span style={{ fontSize: 10, opacity: .5, fontWeight: 400 }}>du</span>}
                </div>
                <div style={{ fontSize: 11, color: "rgba(232,228,240,.3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c?.emoji} {c?.label || e.category} · {e.difficulty} · 🔥{e.bestStreak} · {e.date}
                </div>
              </div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 900, color: i === 0 ? "var(--gold)" : "rgba(232,228,240,.7)", flexShrink: 0 }}>{e.score}</div>
            </div>
          );
        })}
        <Divider />
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button className="btn-primary" onClick={startQuiz}>Quiz spielen</button>
          <button className="btn-ghost" onClick={() => setScreen("menu")}>← Zurück</button>
        </div>
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <button className="btn-link" onClick={fetchLB}>↻ Aktualisieren</button>
        </div>
      </div>
    </div>
  );
                            }
