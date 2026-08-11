import { useState, useRef } from "react";

const SAMPLE_KEYS = ["A", "B", "C", "D", "E", "F"];

export default function CacheModule() {
  const [capacity, setCapacity] = useState(4);
  const [policy, setPolicy] = useState("LRU");
  const [cache, setCache] = useState([]); // {key, value, freq, lastUsed}
  const [keyInput, setKeyInput] = useState("K1");
  const [valInput, setValInput] = useState("v1");
  const [log, setLog] = useState([]);
  const [flash, setFlash] = useState({}); // key -> "hit" | "evict" | "insert"
  const clock = useRef(0);
  const [stats, setStats] = useState({ hits: 0, misses: 0, evictions: 0 });

  function pushLog(entry) {
    setLog((l) => [{ t: clock.current, ...entry }, ...l].slice(0, 40));
  }

  function flashKey(key, type, ms = 650) {
    setFlash((f) => ({ ...f, [key]: type }));
    setTimeout(() => {
      setFlash((f) => {
        const next = { ...f };
        if (next[key] === type) delete next[key];
        return next;
      });
    }, ms);
  }

  function access(key, value) {
    clock.current += 1;
    const now = clock.current;
    setCache((prev) => {
      const idx = prev.findIndex((e) => e.key === key);
      let next = [...prev];

      if (idx !== -1) {
        // HIT
        const entry = { ...next[idx], freq: next[idx].freq + 1, lastUsed: now };
        if (value !== undefined) entry.value = value;
        next.splice(idx, 1);
        next.push(entry);
        setStats((s) => ({ ...s, hits: s.hits + 1 }));
        pushLog({ type: "HIT", key });
        flashKey(key, "hit");
        return next;
      }

      // MISS -> insert
      setStats((s) => ({ ...s, misses: s.misses + 1 }));
      pushLog({ type: "MISS", key });

      if (next.length >= capacity) {
        // choose eviction victim
        let victimIdx;
        if (policy === "LRU") {
          victimIdx = next.reduce(
            (best, e, i) => (e.lastUsed < next[best].lastUsed ? i : best),
            0
          );
        } else {
          // LFU, tie-break by lastUsed (oldest)
          victimIdx = next.reduce((best, e, i) => {
            if (e.freq < next[best].freq) return i;
            if (e.freq === next[best].freq && e.lastUsed < next[best].lastUsed) return i;
            return best;
          }, 0);
        }
        const victim = next[victimIdx];
        pushLog({ type: "EVICT", key: victim.key });
        flashKey(victim.key, "evict");
        next.splice(victimIdx, 1);
        setStats((s) => ({ ...s, evictions: s.evictions + 1 }));
      }

      next.push({ key, value: value ?? "—", freq: 1, lastUsed: now });
      flashKey(key, "insert");
      return next;
    });
  }

  function handleAccess() {
    if (!keyInput.trim()) return;
    access(keyInput.trim(), undefined);
  }
  function handlePut() {
    if (!keyInput.trim()) return;
    access(keyInput.trim(), valInput.trim() || "—");
  }

  function runWorkload() {
    // a skewed random access pattern: some keys much hotter than others
    const weighted = [
      ...Array(6).fill(SAMPLE_KEYS[0]),
      ...Array(4).fill(SAMPLE_KEYS[1]),
      ...Array(2).fill(SAMPLE_KEYS[2]),
      SAMPLE_KEYS[3],
      SAMPLE_KEYS[4],
      SAMPLE_KEYS[5],
    ];
    let i = 0;
    const n = 14;
    const step = () => {
      if (i >= n) return;
      const k = weighted[Math.floor(Math.random() * weighted.length)];
      access(k, `v_${k}`);
      i += 1;
      setTimeout(step, 420);
    };
    step();
  }

  function reset() {
    setCache([]);
    setLog([]);
    setFlash({});
    setStats({ hits: 0, misses: 0, evictions: 0 });
    clock.current = 0;
  }

  // order for display: LRU shows recency order (front = MRU); LFU shows freq order (front = hottest)
  const displayOrder =
    policy === "LRU"
      ? [...cache].sort((a, b) => b.lastUsed - a.lastUsed)
      : [...cache].sort((a, b) => b.freq - a.freq || b.lastUsed - a.lastUsed);

  const hitRate = stats.hits + stats.misses > 0
    ? Math.round((stats.hits / (stats.hits + stats.misses)) * 100)
    : 0;

  return (
    <div>
      <div className="panel-head">
        <h2 className="panel-title">LRU / LFU Cache</h2>
        <span className="panel-sheetno">SCHEMATIC 01 / 04 — REV A</span>
      </div>
      <p className="panel-note">
        Fixed-capacity cache. GET touches a key if present; PUT inserts or overwrites. When the
        cache is full, the eviction policy below picks the victim: least-recently-used, or
        least-frequently-used with oldest-wins tie-break.
      </p>

      <div className="controls-row">
        <div className="field">
          <label>Capacity</label>
          <input
            type="number"
            min={1}
            max={8}
            value={capacity}
            onChange={(e) => setCapacity(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
          />
        </div>
        <div className="field">
          <label>Policy</label>
          <select value={policy} onChange={(e) => setPolicy(e.target.value)}>
            <option value="LRU">LRU — least recently used</option>
            <option value="LFU">LFU — least frequently used</option>
          </select>
        </div>
        <div className="field">
          <label>Key</label>
          <input type="text" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} style={{ width: 70 }} />
        </div>
        <div className="field">
          <label>Value (for PUT)</label>
          <input type="text" value={valInput} onChange={(e) => setValInput(e.target.value)} style={{ width: 70 }} />
        </div>
        <button className="btn primary" onClick={handleAccess}>GET</button>
        <button className="btn primary" onClick={handlePut}>PUT</button>
        <button className="btn" onClick={runWorkload}>RUN SAMPLE WORKLOAD</button>
        <button className="btn rust" onClick={reset}>RESET</button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          minHeight: 100,
          alignItems: "flex-start",
          padding: "6px 0 4px",
        }}
      >
        {displayOrder.length === 0 && (
          <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted)" }}>
            cache is empty — issue a GET or PUT to begin
          </div>
        )}
        {displayOrder.map((entry, i) => {
          const state = flash[entry.key];
          return (
            <div
              key={entry.key}
              style={{
                width: 108,
                border: "1.5px solid var(--ink)",
                background:
                  state === "hit" ? "var(--blueprint-pale)" :
                  state === "evict" ? "var(--rust-pale)" :
                  state === "insert" ? "var(--blueprint-pale)" :
                  "var(--paper)",
                transition: "background 0.3s",
                position: "relative",
              }}
            >
              <div style={{
                fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--muted)",
                borderBottom: "1px solid var(--grid-line-strong)", padding: "3px 6px",
                display: "flex", justifyContent: "space-between",
              }}>
                <span>{policy === "LRU" ? (i === 0 ? "MRU" : `#${i + 1}`) : `f=${entry.freq}`}</span>
                <span>{state === "evict" ? "EVICT" : state === "hit" ? "HIT" : state === "insert" ? "NEW" : ""}</span>
              </div>
              <div style={{ padding: "10px 8px 12px" }}>
                <div style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 16 }}>{entry.key}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-soft)" }}>{entry.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="legend">
        <span><span className="dot" style={{ background: "var(--blueprint-pale)", border: "1px solid var(--blueprint)" }} />hit / insert</span>
        <span><span className="dot" style={{ background: "var(--rust-pale)", border: "1px solid var(--rust)" }} />evicted</span>
      </div>

      <div className="stat-strip">
        <div className="stat"><span className="k">Hits</span><span className="v">{stats.hits}</span></div>
        <div className="stat"><span className="k">Misses</span><span className="v">{stats.misses}</span></div>
        <div className="stat"><span className="k">Evictions</span><span className="v">{stats.evictions}</span></div>
        <div className="stat"><span className="k">Hit rate</span><span className="v">{hitRate}%</span></div>
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 6, textTransform: "uppercase" }}>
          Operation log
        </div>
        <div className="scroll-thin" style={{ maxHeight: 140, overflowY: "auto", border: "1px solid var(--grid-line-strong)" }}>
          {log.length === 0 && (
            <div style={{ padding: 8, fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--muted)" }}>no operations yet</div>
          )}
          {log.map((entry, i) => (
            <div key={i} style={{
              display: "flex", gap: 10, padding: "5px 10px",
              borderBottom: i === log.length - 1 ? "none" : "1px solid var(--grid-line)",
              fontFamily: "var(--mono)", fontSize: 11.5,
            }}>
              <span style={{ color: "var(--muted)", width: 30 }}>t{entry.t}</span>
              <span style={{
                width: 46, fontWeight: 700,
                color: entry.type === "HIT" ? "var(--blueprint)" : entry.type === "EVICT" ? "var(--rust)" : "var(--ink-soft)",
              }}>{entry.type}</span>
              <span>{entry.key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
