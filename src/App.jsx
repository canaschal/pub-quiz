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
const MAX_HISTORY = 100;

// ── Supabase — hardcoded als Fallback falls env nicht funktioniert ─────────────
const SB_URL = import.meta.env.VITE_SUPABASE_URL || "https://ypkpkvjpzqrnyxfgbfnx.supabase.co";
const SB_KEY = import.meta.env.VITE_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwa3BrdmpwenFybnl4ZmdiZm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2ODA4NzcsImV4cCI6MjA5NDI1Njg3N30._mI6hadHLyacd3IZFTz5PYEgp9yT3wR57ghxkf-53zQ";
const SB_HEADS = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

async function sbGet(table, query = "") {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${table}${query}`, { headers: SB_HEADS });
    if (!r.ok) return [];
    return await r.json();
  } catch { return []; }
}

async function sbPost(table, body) {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { ...SB_HEADS, "Prefer": "return=minimal" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const err = await r.text();
      console.error("sbPost error:", r.status, err);
    }
  } catch (e) {
    console.error("sbPost exception:", e);
  }
}

async function loadLB() {
  const data = await sbGet("leaderboard", "?order=score.desc&limit=20");
  return Array.isArray(data) ? data : [];
}
async function saveLB(entry) {
  await sbPost("leaderboard", {
    name: entry.name, score: entry.score, total: entry.total,
    category: entry.category, difficulty: entry.difficulty,
    best_streak: entry.bestStreak, date: entry.date,
  });
  return await loadLB();
}
async function loadPlayed(playerName, category) {
  const data = await sbGet("played_questions",
    `?player_name=eq.${encodeURIComponent(playerName)}&category=eq.${encodeURIComponent(category)}&order=created_at.desc&limit=${MAX_HISTORY}`
  );
  return Array.isArray(data) ? data.map(r => r.frage) : [];
}
async function savePlayed(playerName, frage, category) {
  await sbPost("played_questions", { player_name: playerName, frage, category });
}

async function fetchQuestion(category, difficulty, usedQs) {
  const cat = CATEGORIES.find(c => c.id === category)?.label || "Gemischt";
  const used = usedQs.length ? `\nNicht wiederholen:\n${usedQs.join("\n")}` : "";
  const r = await fetch("https://api.anthropic.com/v1/messages", {
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
richtig IMMER 0. Schwierigkeit: ${difficulty}. Kategorie: ${cat}.${used}`,
      messages: [{ role: "user", content: "Neue Frage." }],
    }),
  });
  const data = await r.json();
  const txt = data.content?.find(b => b.type === "text")?.text || "";
  const parsed = JSON.parse(txt.replace(/```json|```/g, "").trim());
  const correct = parsed.antworten[0];
  const shuffled = [...parsed.antworten].sort(() => Math.random() - 0.5);
  return { frage: parsed.frage, antworten: shuffled, richtig: shuffled.indexOf(correct), erklaerung: parsed.erklaerung };
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Sora:wght@700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --gold: #d4aa55; --gold2: #eac96e; --bg: #12121e; --border: rgba(255,255,255,0.1); --text: #ede9f8; --muted: rgba(237,233,248,0.45); }
  html, body { background: var(--bg); color: var(--text); font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  input { font-size: 16px !important; }
  .page { min-height: 100dvh; display: flex; flex-direction: column; align-items: center; background: var(--bg); }
  .card { width: 100%; max-width: 520px; padding: 0 16px 80px; }
  .ans { display: flex; align-items: center; gap: 11px; width: 100%; padding: 15px; border-radius: 14px; border: 1.5px solid var(--border); background: rgba(255,255,255,0.05); cursor: pointer; font-size: 15px; color: var(--text); line-height: 1.4; text-align: left; -webkit-tap-highlight-color: transparent; min-height: 56px; }
  .ans:active { transform: scale(0.98); }
  .ans.sel { border-color: var(--gold); background: rgba(212,170,85,0.12); }
  .ans.ok  { border-color: #4ade80; background: rgba(74,222,128,0.12); color: #4ade80; }
  .ans.bad { border-color: #f87171; background: rgba(248,113,113,0.1); color: #f87171; }
  .ans.dim { opacity: .25; }
  .ans.out { opacity: .15; text-decoration: line-through; }
  .cat { display: flex; align-items: center; gap: 6px; padding: 10px 13px; border-radius: 10px; border: 1.5px solid var(--border); background: rgba(255,255,255,.03); cursor: pointer; font-size: 14px; font-weight: 500; color: var(--muted); white-space: nowrap; -webkit-tap-highlight-color: transparent; min-height: 44px; }
  .cat.on { color: #12121e; font-weight: 700; }
  .diff { padding: 10px 20px; border-radius: 10px; border: 1.5px solid var(--border); background: rgba(255,255,255,.03); cursor: pointer; font-size: 14px; font-weight: 600; color: var(--muted); flex: 1; text-align: center; min-height: 44px; -webkit-tap-highlight-color: transparent; }
  .diff.on { color: #12121e; }
  .btn-p { background: linear-gradient(135deg, var(--gold), var(--gold2)); color: #12121e; font-weight: 800; font-size: 16px; padding: 16px 32px; border-radius: 14px; cursor: pointer; border: none; min-height: 52px; width: 100%; -webkit-tap-highlight-color: transparent; }
  .btn-p:active { filter: brightness(.92); }
  .btn-p:disabled { opacity: .35; }
  .btn-g { color: var(--gold); border: 1.5px solid rgba(212,170,85,.35); padding: 13px 22px; border-radius: 14px; font-size: 15px; font-weight: 600; cursor: pointer; background: transparent; min-height: 48px; width: 100%; -webkit-tap-highlight-color: transparent; }
  .btn-g:active { background: rgba(212,170,85,.1); }
  .btn-l { color: var(--muted); font-size: 13px; cursor: pointer; background: none; border: none; font-family: inherit; padding: 8px; min-height: 44px; }
  .joker { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 20px; border-radius: 12px; border: 1.5px solid var(--border); background: rgba(255,255,255,.05); cursor: pointer; min-height: 56px; -webkit-tap-highlight-color: transparent; }
  .joker:active { transform: scale(.95); }
  .joker:disabled, .joker.used { opacity: .2; cursor: default; }
  .ninput { width: 100%; padding: 16px 18px; border-radius: 14px; border: 1.5px solid var(--border); background: rgba(255,255,255,.06); font-size: 16px; color: var(--text); text-align: center; outline: none; }
  .ninput:focus { border-color: var(--gold); }
  .ninput::placeholder { color: rgba(237,233,248,.25); }
  .badge { display: flex; align-items: center; gap: 11px; background: rgba(255,255,255,.04); border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; }
  .avatar { width: 38px; height: 38px; border-radius: 50%; background: rgba(212,170,85,.15); border: 1.5px solid rgba(212,170,85,.4); display: flex; align-items: center; justify-content: center; font-family: 'Sora',sans-serif; font-weight: 900; font-size: 16px; color: var(--gold); flex-shrink: 0; }
  .infobox { background: rgba(255,255,255,.04); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; font-size: 14px; color: var(--muted); line-height: 1.9; }
  .explbox { padding: 14px 16px; background: rgba(255,255,255,.04); border: 1px solid var(--border); border-radius: 12px; font-size: 14px; line-height: 1.7; color: rgba(237,233,248,.7); }
  .divider { height: 1px; background: var(--border); margin: 18px 0; }
  .lbl { font-size: 10px; letter-spacing: 4px; color: var(--gold); text-transform: uppercase; font-weight: 700; margin-bottom: 10px; opacity: .85; }
  .score-glow { text-shadow: 0 0 40px rgba(212,170,85,.55); }
  @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes popIn  { from { opacity:0; transform:scale(.92); } to { opacity:1; transform:scale(1); } }
  @keyframes spin   { to { transform:rotate(360deg); } }
  .fu { animation: fadeUp .32s ease both; }
  .pi { animation: popIn .25s ease both; }
`;

function Logo({ big }) {
  return (
    <div style={{ textAlign:"center", marginBottom:big?28:18 }}>
      <div style={{ fontSize:10, letterSpacing:6, color:"var(--gold)", textTransform:"uppercase", fontWeight:700, marginBottom:4, opacity:.8 }}>The Grand</div>
      <div style={{ fontFamily:"'Sora',sans-serif", fontSize:big?42:24, fontWeight:800, letterSpacing:-.5, background:"linear-gradient(135deg,#ede9f8 30%,var(--gold))", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Pub Quiz</div>
      {big && <div style={{ width:40, height:2, background:"linear-gradient(90deg,transparent,var(--gold),transparent)", margin:"10px auto 0" }} />}
    </div>
  );
}
const Divider = () => <div className="divider" />;
const Lbl = ({ c }) => <div className="lbl">{c}</div>;
const Spin = () => <div style={{ fontSize:24, display:"inline-block", animation:"spin 1s linear infinite" }}>⏳</div>;
function Medal({ i }) {
  if (i===0) return <span style={{fontSize:20}}>🥇</span>;
  if (i===1) return <span style={{fontSize:20}}>🥈</span>;
  if (i===2) return <span style={{fontSize:20}}>🥉</span>;
  return <span style={{fontSize:13,color:"var(--muted)",minWidth:22,textAlign:"center"}}>{i+1}</span>;
}

export default function App() {
  const [screen, setScreen]         = useState("name");
  const [nameInput, setNameInput]   = useState("");
  const [player, setPlayer]         = useState("");
  const [cat, setCat]               = useState("gemischt");
  const [diff, setDiff]             = useState("mittel");
  const [q, setQ]                   = useState(null);
  const [loading, setLoading]       = useState(false);
  const [err, setErr]               = useState(null);
  const [sel, setSel]               = useState(null);
  const [revealed, setRevealed]     = useState(false);
  const [elim, setElim]             = useState([]);
  const [score, setScore]           = useState(0);
  const [qNum, setQNum]             = useState(0);
  const [streak, setStreak]         = useState(0);
  const [best, setBest]             = useState(0);
  const [sessQs, setSessQs]         = useState([]);
  const [histQs, setHistQs]         = useState([]);
  const [history, setHistory]       = useState([]);
  const [j50, setJ50]               = useState(true);
  const [jT, setJT]                 = useState(true);
  const [time, setTime]             = useState(BASE_TIME);
  const [timerOn, setTimerOn]       = useState(false);
  const [lb, setLb]                 = useState([]);
  const [lbLoad, setLbLoad]         = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalBest, setFinalBest]   = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerOn && time > 0 && !revealed) {
      timerRef.current = setTimeout(() => setTime(t => t-1), 1000);
    } else if (timerOn && time === 0 && !revealed) {
      doReveal(null);
    }
    return () => clearTimeout(timerRef.current);
  }, [timerOn, time, revealed]);

  async function fetchLB() { setLbLoad(true); setLb(await loadLB()); setLbLoad(false); }

  function goName() {
    const n = nameInput.trim(); if (!n) return;
    setPlayer(n); fetchLB(); setScreen("menu");
  }

  async function loadQ(sQs, hQs, category) {
    setLoading(true); setSel(null); setRevealed(false);
    setElim([]); setErr(null); setTime(BASE_TIME); setTimerOn(false);
    try {
      const allUsed = [...new Set([...hQs, ...sQs])];
      const nq = await fetchQuestion(category, diff, allUsed);
      setQ(nq); setTimerOn(true);
    } catch { setErr("Fehler – bitte nochmals versuchen."); }
    setLoading(false);
  }

  async function startQuiz() {
    setScore(0); setQNum(1); setStreak(0); setBest(0);
    setSessQs([]); setHistory([]); setJ50(true); setJT(true);
    setFinalScore(0); setFinalBest(0);
    setScreen("quiz");
    const played = await loadPlayed(player, cat);
    setHistQs(played);
    loadQ([], played, cat);
  }

  function doReveal(forceSel) {
    clearTimeout(timerRef.current); setTimerOn(false);
    const s = forceSel !== undefined ? forceSel : sel;
    setSel(s); setRevealed(true);
    const ok = s !== null && s === q.richtig;
    const ns = ok ? streak+1 : 0;
    setStreak(ns);
    setBest(b => Math.max(ns, b));
    const bonus = ok && ns >= 3 ? 1 : 0;
    if (ok) setScore(sc => sc+1+bonus);
    const newSessQs = [...sessQs, q.frage];
    setSessQs(newSessQs);
    savePlayed(player, q.frage, cat);
    setHistory(h => [...h, { frage:q.frage, ok, richtig:q.antworten[q.richtig], bonus }]);
  }

  function goNext() {
    if (qNum >= TOTAL_Q) {
      const snap = score + (history[history.length-1]?.ok && history[history.length-1]?.bonus ? 0 : 0);
      setFinalScore(score);
      setFinalBest(best);
      setScreen("result");
      saveLB({ name:player, score, total:TOTAL_Q, category:cat, difficulty:diff, bestStreak:best, date:new Date().toLocaleDateString("de-CH") })
        .then(upd => { if (Array.isArray(upd)) setLb(upd); })
        .catch(() => {});
    } else {
      setQNum(n => n+1);
      loadQ(sessQs, histQs, cat);
    }
  }

  const catObj  = CATEGORIES.find(c => c.id === cat)  || CATEGORIES[11];
  const diffObj = DIFFICULTIES.find(d => d.id === diff) || DIFFICULTIES[1];
  const timePct = (time/BASE_TIME)*100;
  const timeCol = time > 10 ? "#4ade80" : time > 5 ? "#facc15" : "#f87171";
  const maxPts  = TOTAL_Q+3;

  if (screen === "name") return (
    <div className="page">
      <style>{css}</style>
      <div className="card fu" style={{ display:"flex", flexDirection:"column", justifyContent:"center", minHeight:"100dvh" }}>
        <Logo big />
        <p style={{ color:"var(--muted)", fontSize:14, marginBottom:28, lineHeight:1.75, textAlign:"center" }}>
          10 KI-generierte Fragen<br />Joker · Streak-Bonus · Leaderboard
        </p>
        <input className="ninput" placeholder="Dein Name…" value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          onKeyDown={e => e.key==="Enter" && goName()}
          autoComplete="off" maxLength={20} />
        <div style={{ marginTop:14, textAlign:"center" }}>
          <button className="btn-p" style={{ width:"auto", padding:"16px 40px" }} disabled={!nameInput.trim()} onClick={goName}>Spielen →</button>
        </div>
      </div>
    </div>
  );

  if (screen === "menu") return (
    <div className="page">
      <style>{css}</style>
      <div className="card fu" style={{ paddingTop:32 }}>
        <Logo />
        <div className="badge" style={{ marginBottom:22 }}>
          <div className="avatar">{player[0]?.toUpperCase()}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:700 }}>{player}</div>
            <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>Bereit für {TOTAL_Q} Fragen?</div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <button className="btn-g" style={{ width:"auto", padding:"10px 14px", fontSize:14 }} onClick={() => { fetchLB(); setScreen("leaderboard"); }}>🏆</button>
            <button className="btn-l" onClick={() => { setPlayer(""); setNameInput(""); setScreen("name"); }}>Wechseln</button>
          </div>
        </div>
        <Divider />
        <Lbl c="Kategorie" />
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:22 }}>
          {CATEGORIES.map(c => (
            <button key={c.id} className={`cat ${cat===c.id?"on":""}`}
              style={cat===c.id ? { background:c.color, borderColor:c.color } : {}}
              onClick={() => setCat(c.id)}>{c.emoji} {c.label}</button>
          ))}
        </div>
        <Lbl c="Schwierigkeit" />
        <div style={{ display:"flex", gap:8, marginBottom:22 }}>
          {DIFFICULTIES.map(d => (
            <button key={d.id} className={`diff ${diff===d.id?"on":""}`}
              style={diff===d.id ? { background:d.color, borderColor:d.color } : {}}
              onClick={() => setDiff(d.id)}>{d.label}</button>
          ))}
        </div>
        <div className="infobox" style={{ marginBottom:26 }}>
          🔥 <b style={{ color:"var(--text)" }}>Streak-Bonus</b> — ab 3x in Folge: +1 Punkt<br />
          🃏 <b style={{ color:"var(--text)" }}>Joker</b> — 50:50 &amp; +15 Sekunden<br />
          🧠 <b style={{ color:"var(--text)" }}>Wiederholungsschutz</b> — bis 100 Fragen gemerkt
        </div>
        <button className="btn-p" onClick={startQuiz}>Quiz starten</button>
      </div>
    </div>
  );

  if (screen === "quiz") return (
    <div className="page">
      <style>{css}</style>
      <div className="card" style={{ paddingTop:24 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div style={{ fontSize:13, color:"var(--muted)" }}>
            <span style={{ color:"var(--gold)", fontWeight:700 }}>{player}</span> · {qNum}/{TOTAL_Q}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {streak >= 2 && <span style={{ fontSize:14, fontWeight:800, color:"#f97316" }}>🔥 {streak}x</span>}
            <span style={{ fontFamily:"'Sora',sans-serif", fontSize:18, fontWeight:800, color:"var(--gold)" }}>
              {score} <span style={{ fontSize:12, fontWeight:500, opacity:.6 }}>Pkt</span>
            </span>
          </div>
        </div>
        <div style={{ height:4, borderRadius:2, background:"rgba(255,255,255,.07)", marginBottom:16, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${((qNum-1)/TOTAL_Q)*100}%`, background:"linear-gradient(90deg,var(--gold),var(--gold2))", transition:"width .5s" }} />
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          <span style={{ fontSize:12, fontWeight:700, letterSpacing:1.5, color:catObj.color, textTransform:"uppercase" }}>{catObj.emoji} {catObj.label}</span>
          <span style={{ fontSize:12, color:diffObj.color, opacity:.8, letterSpacing:1, textTransform:"uppercase" }}>· {diffObj.label}</span>
        </div>
        {loading && <div style={{ textAlign:"center", padding:"60px 0", color:"var(--muted)" }}><Spin /><div style={{ marginTop:14, fontSize:14 }}>Frage wird generiert…</div></div>}
        {err && <div style={{ textAlign:"center", padding:28, color:"#f87171", fontSize:14 }}>{err}<br /><br /><button className="btn-g" style={{ width:"auto" }} onClick={() => loadQ(sessQs, histQs, cat)}>Nochmals</button></div>}
        {!loading && !err && q && (
          <div className="pi">
            {!revealed && (
              <div style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:11, letterSpacing:2, color:"rgba(237,233,248,.3)", textTransform:"uppercase" }}>Zeit</span>
                  <span style={{ fontSize:14, fontWeight:700, color:timeCol }}>{time}s</span>
                </div>
                <div style={{ height:4, borderRadius:2, background:"rgba(255,255,255,.07)", overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${timePct}%`, background:timeCol, transition:"width 1s linear, background .5s" }} />
                </div>
              </div>
            )}
            <div style={{ padding:"18px 16px", background:"rgba(255,255,255,.04)", borderRadius:14, borderLeft:`3px solid ${catObj.color}`, marginBottom:14, fontFamily:"'Sora',sans-serif", fontSize:17, fontWeight:700, lineHeight:1.55 }}>
              {q.frage}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:9, marginBottom:14 }}>
              {q.antworten.map((a, i) => {
                const isElim = elim.includes(i);
                let cls = "ans";
                if (isElim) cls += " out";
                else if (revealed) {
                  if (i === q.richtig) cls += " ok";
                  else if (i === sel) cls += " bad";
                  else cls += " dim";
                } else if (sel === i) cls += " sel";
                return (
                  <button key={i} className={cls} disabled={revealed||isElim} onClick={() => !revealed&&!isElim&&setSel(i)}>
                    <span style={{ fontWeight:700, fontSize:13, opacity:.45, minWidth:20, flexShrink:0 }}>{["A","B","C","D"][i]}</span>
                    <span style={{ flex:1 }}>{a}</span>
                    {revealed && i===q.richtig && <span style={{ marginLeft:"auto" }}>✓</span>}
                  </button>
                );
              })}
            </div>
            {!revealed && (
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <button className={`joker ${!j50?"used":""}`} disabled={!j50} onClick={() => {
                  if (!j50||revealed||!q) return; setJ50(false);
                  const ws = q.antworten.map((_,i)=>i).filter(i=>i!==q.richtig&&i!==sel);
                  setElim(ws.sort(()=>Math.random()-.5).slice(0,2));
                }}>
                  <span style={{ fontSize:18 }}>🃏</span>
                  <span style={{ fontSize:11, color:"var(--muted)" }}>50:50</span>
                </button>
                <button className={`joker ${!jT?"used":""}`} disabled={!jT} onClick={() => {
                  if (!jT||revealed) return; setJT(false); setTime(t=>Math.min(t+15,35));
                }}>
                  <span style={{ fontSize:18 }}>⏱️</span>
                  <span style={{ fontSize:11, color:"var(--muted)" }}>+15s</span>
                </button>
                {sel !== null && (
                  <button className="btn-p" style={{ marginLeft:"auto", width:"auto", padding:"13px 22px", fontSize:15 }} onClick={() => doReveal(undefined)}>
                    Antworten →
                  </button>
                )}
              </div>
            )}
            {revealed && (
              <div className="fu">
                <div className="explbox" style={{ marginBottom:14 }}>
                  <span style={{ color:"var(--gold)", fontWeight:700 }}>💡 </span>{q.erklaerung}
                  {history[history.length-1]?.bonus > 0 && (
                    <div style={{ marginTop:8, color:"#f97316", fontWeight:700, fontSize:13 }}>🔥 Streak-Bonus: +1 Extrapunkt!</div>
                  )}
                </div>
                <button className="btn-p" onClick={goNext}>
                  {qNum >= TOTAL_Q ? "Ergebnis ansehen →" : "Nächste Frage →"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (screen === "result") {
    const myRank = Array.isArray(lb) ? lb.findIndex(e => e.name===player && e.score===finalScore) : -1;
    const emoji = finalScore>=11?"🏆 Pub-Quiz-Legende!":finalScore>=8?"🥇 Ausgezeichnet!":finalScore>=6?"👍 Solides Resultat":finalScore>=4?"📚 Noch Luft nach oben":"🎯 Weiter üben!";
    return (
      <div className="page">
        <style>{css}</style>
        <div className="card fu" style={{ paddingTop:32 }}>
          <Logo />
          <div style={{ textAlign:"center", marginBottom:22 }}>
            <div style={{ fontSize:13, color:"var(--muted)", marginBottom:8 }}>{player}</div>
            <div className="score-glow" style={{ fontFamily:"'Sora',sans-serif", fontSize:82, fontWeight:900, color:"var(--gold)", lineHeight:1 }}>{finalScore}</div>
            <div style={{ fontSize:13, color:"var(--muted)", marginTop:6 }}>von {maxPts} möglichen Punkten</div>
            <div style={{ fontFamily:"'Sora',sans-serif", fontSize:20, fontWeight:800, marginTop:12 }}>{emoji}</div>
            <div style={{ fontSize:13, color:"var(--muted)", marginTop:8 }}>{catObj.emoji} {catObj.label} · {diffObj.label} · Beste Streak 🔥{finalBest}</div>
            {myRank >= 0 && <div style={{ fontSize:14, color:"var(--gold)", fontWeight:700, marginTop:8 }}>Platz {myRank+1} im Leaderboard 🏅</div>}
          </div>
          <Divider />
          <Lbl c="Auswertung" />
          <div style={{ marginBottom:22 }}>
            {history.map((h, i) => (
              <div key={i} style={{ display:"flex", gap:10, padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,.06)", alignItems:"flex-start" }}>
                <span style={{ fontSize:15, flexShrink:0 }}>{h.ok?"✅":"❌"}</span>
                <div>
                  <div style={{ fontSize:14, color:"var(--muted)", lineHeight:1.45 }}>{h.frage}</div>
                  {!h.ok && <div style={{ fontSize:13, color:"#4ade80", marginTop:3 }}>✓ {h.richtig}</div>}
                  {h.bonus>0 && <div style={{ fontSize:12, color:"#f97316", marginTop:3 }}>🔥 +1 Streak-Bonus</div>}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <button className="btn-p" onClick={startQuiz}>Nochmals spielen</button>
            <button className="btn-g" onClick={() => { fetchLB(); setScreen("leaderboard"); }}>🏆 Leaderboard</button>
            <button className="btn-g" onClick={() => setScreen("menu")}>Einstellungen</button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "leaderboard") return (
    <div className="page">
      <style>{css}</style>
      <div className="card fu" style={{ paddingTop:32 }}>
        <Logo />
        <div style={{ fontFamily:"'Sora',sans-serif", fontSize:22, fontWeight:800, marginBottom:18, textAlign:"center" }}>🏆 Leaderboard</div>
        {lbLoad ? (
          <div style={{ textAlign:"center", padding:"40px 0" }}><Spin /></div>
        ) : !Array.isArray(lb) || lb.length===0 ? (
          <div style={{ textAlign:"center", color:"var(--muted)", padding:"40px 0", fontSize:14 }}>Noch keine Einträge — sei der Erste!</div>
        ) : lb.map((e, i) => {
          const isMe = e.name===player;
          const c = CATEGORIES.find(c => c.id===e.category)||CATEGORIES[11];
          return (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 14px", marginBottom:7, borderRadius:13, background:isMe?"rgba(212,170,85,.07)":"rgba(255,255,255,.03)", border:isMe?"1.5px solid rgba(212,170,85,.28)":"1.5px solid var(--border)" }}>
              <Medal i={i} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:700, color:isMe?"var(--gold)":"var(--text)", display:"flex", alignItems:"center", gap:6 }}>
                  {e.name}{isMe&&<span style={{ fontSize:11, opacity:.5, fontWeight:400 }}>du</span>}
                </div>
                <div style={{ fontSize:12, color:"var(--muted)", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {c.emoji} {c.label} · {e.difficulty} · 🔥{e.best_streak} · {e.date}
                </div>
              </div>
              <div style={{ fontFamily:"'Sora',sans-serif", fontSize:22, fontWeight:900, color:i===0?"var(--gold)":"var(--muted)", flexShrink:0 }}>{e.score}</div>
            </div>
          );
        })}
        <Divider />
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <button className="btn-p" onClick={startQuiz}>Quiz spielen</button>
          <button className="btn-g" onClick={() => setScreen("menu")}>← Zurück</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page" style={{ justifyContent:"center" }}>
      <style>{css}</style>
      <button className="btn-p" style={{ width:"auto" }} onClick={() => setScreen("name")}>← Zurück zum Start</button>
    </div>
  );
}
