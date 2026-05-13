import { useState, useEffect, useRef } from "react";

const CATEGORIES = [
  { id: "geschichte",   label: "Geschichte",          emoji: "🏛️", color: "#a78bfa" },
  { id: "sport",        label: "Sport",                emoji: "⚽", color: "#34d399" },
  { id: "musik",        label: "Musik",                emoji: "🎵", color: "#f472b6" },
  { id: "wissenschaft", label: "Wissenschaft",         emoji: "🔬", color: "#38bdf8" },
  { id: "geografie",    label: "Geografie",            emoji: "🌍", color: "#4ade80" },
  { id: "film",         label: "Film & TV",            emoji: "🎬", color: "#fb923c" },
  { id: "natur",        label: "Natur & Tiere",        emoji: "🦁", color: "#86efac" },
  { id: "essen",        label: "Essen & Trinken",      emoji: "🍕", color: "#fbbf24" },
  { id: "technologie",  label: "Technologie",          emoji: "💻", color: "#60a5fa" },
  { id: "kunst",        label: "Kunst & Literatur",    emoji: "🎨", color: "#e879f9" },
  { id: "politik",      label: "Politik & Wirtschaft", emoji: "🏛",  color: "#f87171" },
  { id: "gemischt",     label: "Gemischt",             emoji: "🎲", color: "#c9a84c" },
];
const DIFFICULTIES = [
  { id: "leicht", label: "Leicht", color: "#4ade80" },
  { id: "mittel", label: "Mittel", color: "#facc15" },
  { id: "schwer", label: "Schwer", color: "#f87171" },
];
const TOTAL_Q = 10;
const BASE_TIME = 20;
const LB_KEY = "pubquiz-lb-v5";

async function loadLB() {
  try { const r = localStorage.getItem(LB_KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
async function saveLB(entry) {
  try {
    const cur = await loadLB();
    const upd = [...cur, entry].sort((a, b) => b.score - a.score).slice(0, 20);
    localStorage.setItem(LB_KEY, JSON.stringify(upd));
    return upd;
  } catch { return []; }
}

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
  return { frage: parsed.frage, antworten: shuffled, richtig: shuffled.indexOf(correct), erklaerung: parsed.erklaerung };
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Sora:wght@700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --gold: #d4aa55; --gold2: #eac96e; --bg: #12121e; --bg2: #1a1a2e; --card: rgba(255,255,255,0.05); --border: rgba(255,255,255,0.1); --text: #ede9f8; --muted: rgba(237,233,248,0.45); }
  html, body { background: var(--bg); color: var(--text); font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  /* prevent zoom on input focus iOS */
  input { font-size: 16px !important; }

  /* Layout */
  .page { min-height: 100dvh; display: flex; flex-direction: column; align-items: center; background: var(--bg); }
  .card { width: 100%; max-width: 520px; padding: 0 16px 80px; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.15); border-radius: 2px; }

  /* Answer buttons */
  .ans { display: flex; align-items: center; gap: 11px; width: 100%; padding: 15px 15px; border-radius: 14px; border: 1.5px solid var(--border); background: var(--card); cursor: pointer; font-size: 15px; color: var(--text); transition: all .15s; line-height: 1.4; text-align: left; -webkit-tap-highlight-color: transparent; min-height: 56px; }
  .ans:active { transform: scale(0.98); }
  .ans.sel { border-color: var(--gold); background: rgba(212,170,85,0.12); }
  .ans.ok  { border-color: #4ade80; background: rgba(74,222,128,0.12); color: #4ade80; }
  .ans.bad { border-color: #f87171; background: rgba(248,113,113,0.1); color: #f87171; }
  .ans.dim { opacity: .25; }
  .ans.out { opacity: .15; text-decoration: line-through; }

  /* Category pills */
  .cat { display: flex; align-items: center; gap: 6px; padding: 10px 13px; border-radius: 10px; border: 1.5px solid var(--border); background: rgba(255,255,255,.03); cursor: pointer; font-size: 14px; font-weight: 500; color: var(--muted); transition: all .15s; white-space: nowrap; -webkit-tap-highlight-color: transparent; min-height: 44px; }
  .cat.on { color: #12121e; font-weight: 700; }

  /* Difficulty pills */
  .diff { padding: 10px 20px; border-radius: 10px; border: 1.5px solid var(--border); background: rgba(255,255,255,.03); cursor: pointer; font-size: 14px; font-weight: 600; color: var(--muted); transition: all .15s; flex: 1; text-align: center; min-height: 44px; -webkit-tap-highlight-color: transparent; }
  .diff.on { color: #12121e; }

  /* Buttons */
  .btn-primary { background: linear-gradient(135deg, var(--gold), var(--gold2)); color: #12121e; font-weight: 800; font-size: 16px; padding: 16px 32px; border-radius: 14px; cursor: pointer; border: none; transition: all .2s; display: inline-block; min-height: 52px; -webkit-tap-highlight-color: transparent; }
  .btn-primary:active { filter: brightness(.92); transform: scale(.98); }
  .btn-primary:disabled { opacity: .35; cursor: default; }
  .btn-ghost { color: var(--gold); border: 1.5px solid rgba(212,170,85,.35); padding: 13px 22px; border-radius: 14px; font-size: 15px; font-weight: 600; cursor: pointer; background: transparent; transition: all .2s; min-height: 48px; -webkit-tap-highlight-color: transparent; }
  .btn-ghost:active { background: rgba(212,170,85,.1); }
  .btn-link { color: var(--muted); font-size: 13px; cursor: pointer; background: none; border: none; font-family: inherit; padding: 8px; min-height: 44px; }

  /* Joker */
  .joker { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 20px; border-radius: 12px; border: 1.5px solid var(--border); background: var(--card); cursor: pointer; transition: all .2s; min-height: 56px; -webkit-tap-highlight-color: transparent; border: none; background: rgba(255,255,255,.05); border: 1.5px solid var(--border); }
  .joker:active { transform: scale(.95); }
  .joker.used, .joker:disabled { opacity: .2; cursor: default; }

  /* Name input */
  .ninput { width: 100%; padding: 16px 18px; border-radius: 14px; border: 1.5px solid var(--border); background: rgba(255,255,255,.06); font-size: 16px; color: var(--text); text-align: center; transition: border-color .2s; outline: none; }
  .ninput:focus { border-color: var(--gold); }
  .ninput::placeholder { color: rgba(237,233,248,.25); }

  /* Player badge */
  .player-badge { display: flex; align-items: center; gap: 11px; background: rgba(255,255,255,.04); border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; }
  .avatar { width: 38px; height: 38px; border-radius: 50%; background: rgba(212,170,85,.15); border: 1.5px solid rgba(212,170,85,.4); display: flex; align-items: center; justify-content: center; font-family: 'Sora',sans-serif; font-weight: 900; font-size: 16px; color: var(--gold); flex-shrink: 0; }

  /* Info box */
  .infobox { background: rgba(255,255,255,.04); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; font-size: 14px; color: var(--muted); line-height: 1.9; }

  /* Explanation box */
  .explbox { padding: 14px 16px; background: rgba(255,255,255,.04); border: 1px solid var(--border); border-radius: 12px; font-size: 14px; line-height: 1.7; color: rgba(237,233,248,.7); }

  .score-glow { text-shadow: 0 0 40px rgba(212,170,85,.55); }
  .divider { height: 1px; background: var(--border); margin: 18px 0; }
  .label { font-size: 10px; letter-spacing: 4px; color: var(--gold); text-transform: uppercase; font-weight: 700; margin-bottom: 10px; opacity: .85; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes popIn  { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: scale(1); } }
  @keyframes spin   { to { transform: rotate(360deg); } }
  .anim-fadeUp { animation: fadeUp .32s ease both; }
  .anim-popIn  { animation: popIn .25s ease both; }
`;

function Logo({ big }) {
  return (
    <div style={{ textAlign: "center", marginBottom: big ? 28 : 18 }}>
      <div style={{ fontSize: 10, letterSpacing: 6, color: "var(--gold)", textTransform: "uppercase", fontWeight: 700, marginBottom: 4, opacity: .8 }}>The Grand</div>
      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: big ? 42 : 24, fontWeight: 800, letterSpacing: -.5, background: "linear-gradient(135deg,#ede9f8 30%,var(--gold))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Pub Quiz</div>
      {big && <div style={{ width: 40, height: 2, background: "linear-gradient(90deg,transparent,var(--gold),transparent)", margin: "10px auto 0" }} />}
    </div>
  );
}
function Divider() { return <div className="divider" />; }
function Label({ children }) { return <div className="label">{children}</div>; }
function Spinner() { return <div style={{ fontSize: 24, display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</div>; }
function Medal({ rank }) {
  if (rank === 0) return <span style={{ fontSize: 20 }}>🥇</span>;
  if (rank === 1) return <span style={{ fontSize: 20 }}>🥈</span>;
  if (rank === 2) return <span style={{ fontSize: 20 }}>🥉</span>;
  return <span style={{ fontSize: 13, color: "var(--muted)", minWidth: 22, textAlign: "center" }}>{rank + 1}</span>;
}

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

  async function fetchLB() { setLbLoading(true); setLb(await loadLB()); setLbLoading(false); }

  function goName() {
    const n = nameInput.trim(); if (!n) return;
    setPlayerName(n); fetchLB(); setScreen("menu");
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
    setHistory(h => [...h, { frage: q.frage, ok, richtig: q.antworten[q.richtig], bonus }]);
  }

  async function next() {
    if (qNum >= TOTAL_Q) {
      const upd = await saveLB({ name: playerName, score, total: TOTAL_Q, category, difficulty, bestStreak, date: new Date().toLocaleDateString("de-CH") });
      setLb(upd); setScreen("result");
    } else { setQNum(n => n + 1); loadQ(); }
  }

  const cat  = CATEGORIES.find(c => c.id === category);
  const diff = DIFFICULTIES.find(d => d.id === difficulty);
  const timerPct = (timeLeft / BASE_TIME) * 100;
  const timerCol = timeLeft > 10 ? "#4ade80" : timeLeft > 5 ? "#facc15" : "#f87171";

  // ── NAME ──────────────────────────────────────────────────────────────────
  if (screen === "name") return (
    <div className="page">
      <style>{css}</style>
      <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100dvh" }}>
        <div className="anim-fadeUp">
          <Logo big />
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 28, lineHeight: 1.75, textAlign: "center" }}>
            10 KI-generierte Fragen<br />Joker · Streak-Bonus · Leaderboard
          </p>
          <input className="ninput" placeholder="Dein Name…" value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && goName()}
            autoComplete="off" maxLength={20} />
          <div style={{ marginTop: 14, textAlign: "center" }}>
            <button className="btn-primary" disabled={!nameInput.trim()} onClick={goName}>Spielen →</button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── MENU ──────────────────────────────────────────────────────────────────
  if (screen === "menu") return (
    <div className="page">
      <style>{css}</style>
      <div className="card anim-fadeUp" style={{ paddingTop: 32 }}>
        <Logo />
        <div className="player-badge" style={{ marginBottom: 22 }}>
          <div className="avatar">{playerName[0]?.toUpperCase()}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{playerName}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Bereit für {TOTAL_Q} Fragen?</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn-ghost" style={{ fontSize: 14, padding: "10px 14px" }} onClick={() => { fetchLB(); setScreen("leaderboard"); }}>🏆</button>
            <button className="btn-link" onClick={() => { setPlayerName(""); setNameInput(""); setScreen("name"); }}>Wechseln</button>
          </div>
        </div>

        <Divider />
        <Label>Kategorie</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
          {CATEGORIES.map(c => (
            <button key={c.id} className={`cat ${category === c.id ? "on" : ""}`}
              style={category === c.id ? { background: c.color, borderColor: c.color } : {}}
              onClick={() => setCategory(c.id)}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        <Label>Schwierigkeit</Label>
        <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
          {DIFFICULTIES.map(d => (
            <button key={d.id} className={`diff ${difficulty === d.id ? "on" : ""}`}
              style={difficulty === d.id ? { background: d.color, borderColor: d.color } : {}}
              onClick={() => setDifficulty(d.id)}>{d.label}</button>
          ))}
        </div>

        <div className="infobox" style={{ marginBottom: 26 }}>
          🔥 <b style={{ color: "var(--text)" }}>Streak-Bonus</b> — ab 3x in Folge: +1 Punkt<br />
          🃏 <b style={{ color: "var(--text)" }}>Joker</b> — 50:50 &amp; +15 Sekunden
        </div>
        <button className="btn-primary" style={{ width: "100%" }} onClick={startQuiz}>Quiz starten</button>
      </div>
    </div>
  );

  // ── QUIZ ──────────────────────────────────────────────────────────────────
  if (screen === "quiz") return (
    <div className="page">
      <style>{css}</style>
      <div className="card" style={{ paddingTop: 24 }}>
        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            <span style={{ color: "var(--gold)", fontWeight: 700 }}>{playerName}</span> · {qNum}/{TOTAL_Q}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {streak >= 2 && <span style={{ fontSize: 14, fontWeight: 800, color: "#f97316" }}>🔥 {streak}x</span>}
            <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: "var(--gold)" }}>
              {score} <span style={{ fontSize: 12, fontWeight: 500, opacity: .6 }}>Pkt</span>
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,.07)", marginBottom: 16, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${((qNum - 1) / TOTAL_Q) * 100}%`, background: "linear-gradient(90deg,var(--gold),var(--gold2))", transition: "width .5s" }} />
        </div>

        {/* Badge */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: cat?.color, textTransform: "uppercase" }}>{cat?.emoji} {cat?.label}</span>
          <span style={{ fontSize: 12, color: diff?.color, opacity: .8, letterSpacing: 1, textTransform: "uppercase" }}>· {diff?.label}</span>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
            <Spinner /><div style={{ marginTop: 14, fontSize: 14 }}>Frage wird generiert…</div>
          </div>
        )}
        {err && (
          <div style={{ textAlign: "center", padding: 28, color: "#f87171", fontSize: 14 }}>
            {err}<br /><br /><button className="btn-ghost" onClick={loadQ}>Nochmals versuchen</button>
          </div>
        )}

        {!loading && !err && q && (
          <div className="anim-popIn">
            {/* Timer */}
            {!revealed && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, letterSpacing: 2, color: "rgba(237,233,248,.3)", textTransform: "uppercase" }}>Zeit</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: timerCol }}>{timeLeft}s</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,.07)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${timerPct}%`, background: timerCol, transition: "width 1s linear, background .5s" }} />
                </div>
              </div>
            )}

            {/* Question */}
            <div style={{ padding: "18px 16px", background: "rgba(255,255,255,.04)", borderRadius: 14, borderLeft: `3px solid ${cat?.color || "var(--gold)"}`, marginBottom: 14, fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, lineHeight: 1.55 }}>
              {q.frage}
            </div>

            {/* Answers */}
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 14 }}>
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
                    <span style={{ fontWeight: 700, fontSize: 13, opacity: .45, minWidth: 20, flexShrink: 0 }}>{["A","B","C","D"][i]}</span>
                    <span style={{ flex: 1 }}>{a}</span>
                    {revealed && i === q.richtig && <span style={{ marginLeft: "auto", fontSize: 14 }}>✓</span>}
                  </button>
                );
              })}
            </div>

            {/* Jokers */}
            {!revealed && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <button className={`joker ${!j5050 ? "used" : ""}`} disabled={!j5050} onClick={() => {
                  if (!j5050 || revealed || !q) return; setJ5050(false);
                  const ws = q.antworten.map((_, i) => i).filter(i => i !== q.richtig && i !== selected);
                  setEliminated(ws.sort(() => Math.random() - .5).slice(0, 2));
                }}>
                  <span style={{ fontSize: 18 }}>🃏</span>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>50:50</span>
                </button>
                <button className={`joker ${!jTime ? "used" : ""}`} disabled={!jTime} onClick={() => {
                  if (!jTime || revealed) return; setJTime(false); setTimeLeft(t => Math.min(t + 15, 35));
                }}>
                  <span style={{ fontSize: 18 }}>⏱️</span>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>+15s</span>
                </button>
                {selected !== null && (
                  <button className="btn-primary" style={{ marginLeft: "auto", fontSize: 15, padding: "13px 22px" }} onClick={() => reveal(undefined)}>
                    Antworten →
                  </button>
                )}
              </div>
            )}

            {/* Explanation */}
            {revealed && (
              <div className="anim-fadeUp">
                <div className="explbox" style={{ marginBottom: 14 }}>
                  <span style={{ color: "var(--gold)", fontWeight: 700 }}>💡 </span>{q.erklaerung}
                  {history[history.length - 1]?.bonus > 0 && (
                    <div style={{ marginTop: 8, color: "#f97316", fontWeight: 700, fontSize: 13 }}>🔥 Streak-Bonus: +1 Extrapunkt!</div>
                  )}
                </div>
                <button className="btn-primary" style={{ width: "100%" }} onClick={next}>
                  {qNum >= TOTAL_Q ? "Ergebnis ansehen →" : "Nächste Frage →"}
                </button>
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
    return (
      <div className="page">
        <style>{css}</style>
        <div className="card anim-fadeUp" style={{ paddingTop: 32 }}>
          <Logo />
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>{playerName}</div>
            <div className="score-glow" style={{ fontFamily: "'Sora',sans-serif", fontSize: 82, fontWeight: 900, color: "var(--gold)", lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>von {maxPts} möglichen Punkten</div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 800, marginTop: 12 }}>
              {score >= 11 ? "🏆 Pub-Quiz-Legende!" : score >= 8 ? "🥇 Ausgezeichnet!" : score >= 6 ? "👍 Solides Resultat" : score >= 4 ? "📚 Noch Luft nach oben" : "🎯 Weiter üben!"}
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>
              {cat?.emoji} {cat?.label} · {diff?.label} · Beste Streak 🔥{bestStreak}
            </div>
            {myRank >= 0 && <div style={{ fontSize: 14, color: "var(--gold)", fontWeight: 700, marginTop: 8 }}>Platz {myRank + 1} im Leaderboard 🏅</div>}
          </div>

          <Divider />
          <Label>Auswertung</Label>
          <div style={{ marginBottom: 22 }}>
            {history.map((h, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,.06)", alignItems: "flex-start" }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>{h.ok ? "✅" : "❌"}</span>
                <div>
                  <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.45 }}>{h.frage}</div>
                  {!h.ok && <div style={{ fontSize: 13, color: "#4ade80", marginTop: 3 }}>✓ {h.richtig}</div>}
                  {h.bonus > 0 && <div style={{ fontSize: 12, color: "#f97316", marginTop: 3 }}>🔥 +1 Streak-Bonus</div>}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="btn-primary" style={{ width: "100%" }} onClick={startQuiz}>Nochmals spielen</button>
            <button className="btn-ghost" style={{ width: "100%" }} onClick={() => { fetchLB(); setScreen("leaderboard"); }}>🏆 Leaderboard</button>
            <button className="btn-ghost" style={{ width: "100%" }} onClick={() => setScreen("menu")}>Einstellungen</button>
          </div>
        </div>
      </div>
    );
  }

  // ── LEADERBOARD ───────────────────────────────────────────────────────────
  if (screen === "leaderboard") return (
    <div className="page">
      <style>{css}</style>
      <div className="card anim-fadeUp" style={{ paddingTop: 32 }}>
        <Logo />
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 18, textAlign: "center" }}>🏆 Leaderboard</div>

        {lbLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}><Spinner /></div>
        ) : lb.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--muted)", padding: "40px 0", fontSize: 14 }}>Noch keine Einträge — sei der Erste!</div>
        ) : lb.map((e, i) => {
          const isMe = e.name === playerName;
          const c = CATEGORIES.find(c => c.id === e.category);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", marginBottom: 7, borderRadius: 13, background: isMe ? "rgba(212,170,85,.07)" : "rgba(255,255,255,.03)", border: isMe ? "1.5px solid rgba(212,170,85,.28)" : "1.5px solid var(--border)" }}>
              <Medal rank={i} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: isMe ? "var(--gold)" : "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                  {e.name}{isMe && <span style={{ fontSize: 11, opacity: .5, fontWeight: 400 }}>du</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c?.emoji} {c?.label || e.category} · {e.difficulty} · 🔥{e.bestStreak} · {e.date}
                </div>
              </div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 900, color: i === 0 ? "var(--gold)" : "var(--muted)", flexShrink: 0 }}>{e.score}</div>
            </div>
          );
        })}

        <Divider />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="btn-primary" style={{ width: "100%" }} onClick={startQuiz}>Quiz spielen</button>
          <button className="btn-ghost" style={{ width: "100%" }} onClick={() => setScreen("menu")}>← Zurück</button>
        </div>
      </div>
    </div>
  );
}
