import { useState, useRef, useEffect } from "react";

const WINDOW_MS = 5000;

export default function RateLimiterModule() {
  const [algo, setAlgo] = useState("TOKEN_BUCKET");
  const [capacity, setCapacity] = useState(8);
  const [refillPerSec, setRefillPerSec] = useState(2);
  const [windowLimit, setWindowLimit] = useState(6);

  const [tokens, setTokens] = useState(8);
  const [events, setEvents] = useState([]); // {t, allowed}
  const [autoFire, setAutoFire] = useState(false);
  const [autoRate, setAutoRate] = useState(3); // requests/sec when auto-firing

  const lastRefill = useRef(Date.now());
  const startTime = useRef(Date.now());
  const tickRef = useRef(null);
  const autoRef = useRef(null);

  // token bucket refill loop
  useEffect(() => {
    tickRef.current = setInterval(() => {
      if (algo !== "TOKEN_BUCKET") return;
      const now = Date.now();
      const elapsed = (now - lastRefill.current) / 1000;
      lastRefill.current = now;
      setTokens((t) => Math.min(capacity, t + elapsed * refillPerSec));
    }, 120);
    return () => clearInterval(tickRef.current);
  }, [algo, capacity, refillPerSec]);

  useEffect(() => {
    if (autoFire) {
      autoRef.current = setInterval(fire, 1000 / autoRate);
    } else if (autoRef.current) {
      clearInterval(autoRef.current);
    }
    return () => autoRef.current && clearInterval(autoRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFire, autoRate, algo, windowLimit, capacity]);

  function fire() {
    const now = Date.now();
    let allowed;

    if (algo === "TOKEN_BUCKET") {
      setTokens((t) => {
        if (t >= 1) {
          allowed = true;
          return t - 1;
        }
        allowed = false;
        return t;
      });
    } else {
      // sliding window counter over WINDOW_MS
      setEvents((prev) => {
        const recentCount = prev.filter((e) => e.allowed && now - e.t < WINDOW_MS).length;
        allowed = recentCount < windowLimit;
        return prev;
      });
    }

    setEvents((prev) => [...prev, { t: now, allowed }].slice(-60));
  }

  function reset() {
    setEvents([]);
    setTokens(capacity);
    lastRefill.current = Date.now();
    startTime.current = Date.now();
  }

  const now = Date.now();
  const recent = events.slice(-30);
  const allowedCount = events.filter((e) => e.allowed).length;
  const blockedCount = events.length - allowedCount;

  const windowCount = events.filter((e) => e.allowed && now - e.t < WINDOW_MS).length;

  return (
    <div>
      <div className="panel-head">
        <h2 className="panel-title">Rate Limiter</h2>
        <span className="panel-sheetno">SCHEMATIC 02 / 04 — REV A</span>
      </div>
      <p className="panel-note">
        Fire requests one at a time or turn on auto-fire. Token bucket allows short bursts up to
        capacity, then throttles to the refill rate. Sliding window counter caps requests within a
        rolling {WINDOW_MS / 1000}s window.
      </p>

      <div className="controls-row">
        <div className="field">
          <label>Algorithm</label>
          <select value={algo} onChange={(e) => { setAlgo(e.target.value); reset(); }}>
            <option value="TOKEN_BUCKET">Token bucket</option>
            <option value="SLIDING_WINDOW">Sliding window counter</option>
          </select>
        </div>
        {algo === "TOKEN_BUCKET" ? (
          <>
            <div className="field">
              <label>Bucket capacity</label>
              <input type="number" min={1} max={30} value={capacity}
                onChange={(e) => { const v = Number(e.target.value) || 1; setCapacity(v); setTokens(v); }} />
            </div>
            <div className="field">
              <label>Refill / sec</label>
              <input type="number" min={0.5} step={0.5} max={10} value={refillPerSec}
                onChange={(e) => setRefillPerSec(Number(e.target.value) || 0.5)} />
            </div>
          </>
        ) : (
          <div className="field">
            <label>Limit / {WINDOW_MS / 1000}s window</label>
            <input type="number" min={1} max={30} value={windowLimit}
              onChange={(e) => setWindowLimit(Number(e.target.value) || 1)} />
          </div>
        )}
        <div className="field">
          <label>Auto-fire rate (req/s)</label>
          <input type="number" min={1} max={12} value={autoRate}
            onChange={(e) => setAutoRate(Number(e.target.value) || 1)} />
        </div>
        <button className="btn primary" onClick={fire}>SEND REQUEST</button>
        <button className={`btn ${autoFire ? "rust" : ""}`} onClick={() => setAutoFire((a) => !a)}>
          {autoFire ? "STOP AUTO-FIRE" : "START AUTO-FIRE"}
        </button>
        <button className="btn" onClick={reset}>RESET</button>
      </div>

      {algo === "TOKEN_BUCKET" ? (
        <div style={{ display: "flex", gap: 24, alignItems: "flex-end", marginBottom: 6 }}>
          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Bucket
            </div>
            <div style={{
              width: 64, height: 160, border: "1.5px solid var(--ink)", position: "relative",
              background: "var(--paper)", display: "flex", alignItems: "flex-end",
            }}>
              <div style={{
                width: "100%",
                height: `${Math.min(100, (tokens / capacity) * 100)}%`,
                background: tokens < 1 ? "var(--rust-pale)" : "var(--blueprint-pale)",
                borderTop: "2px solid " + (tokens < 1 ? "var(--rust)" : "var(--blueprint)"),
                transition: "height 0.12s linear",
              }} />
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 12, marginTop: 6, textAlign: "center" }}>
              {tokens.toFixed(1)} / {capacity}
            </div>
          </div>
          <div className="stat-strip" style={{ marginTop: 0, flex: 1, alignSelf: "stretch" }}>
            <div className="stat"><span className="k">Allowed</span><span className="v">{allowedCount}</span></div>
            <div className="stat"><span className="k">Throttled</span><span className="v">{blockedCount}</span></div>
            <div className="stat"><span className="k">Refill rate</span><span className="v">{refillPerSec}/s</span></div>
          </div>
        </div>
      ) : (
        <div className="stat-strip" style={{ marginBottom: 6 }}>
          <div className="stat"><span className="k">In current window</span><span className="v">{windowCount} / {windowLimit}</span></div>
          <div className="stat"><span className="k">Allowed</span><span className="v">{allowedCount}</span></div>
          <div className="stat"><span className="k">Throttled</span><span className="v">{blockedCount}</span></div>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 6, textTransform: "uppercase" }}>
          Request timeline (most recent {recent.length})
        </div>
        <div style={{
          display: "flex", gap: 3, alignItems: "flex-end", height: 60,
          border: "1px solid var(--grid-line-strong)", padding: "6px 8px", overflowX: "auto",
        }}>
          {recent.length === 0 && (
            <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--muted)" }}>no requests fired yet</span>
          )}
          {recent.map((e, i) => (
            <div key={i} title={e.allowed ? "allowed" : "throttled"} style={{
              width: 8,
              height: e.allowed ? 40 : 18,
              background: e.allowed ? "var(--blueprint)" : "var(--rust)",
              flexShrink: 0,
            }} />
          ))}
        </div>
        <div className="legend">
          <span><span className="dot" style={{ background: "var(--blueprint)" }} />allowed</span>
          <span><span className="dot" style={{ background: "var(--rust)" }} />throttled (429)</span>
        </div>
      </div>
    </div>
  );
}
