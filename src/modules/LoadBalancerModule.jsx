import { useState, useRef, useEffect } from "react";

const INITIAL_NODES = [
  { id: "srv-1", weight: 1 },
  { id: "srv-2", weight: 1 },
  { id: "srv-3", weight: 2 },
];

export default function LoadBalancerModule() {
  const [algo, setAlgo] = useState("ROUND_ROBIN");
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [active, setActive] = useState({}); // id -> active connections
  const [totalRouted, setTotalRouted] = useState({});
  const [log, setLog] = useState([]);
  const [autoFire, setAutoFire] = useState(false);
  const rrIndex = useRef(0);
  const wrrState = useRef({ index: -1, current: 0 });
  const autoRef = useRef(null);

  useEffect(() => {
    setActive(Object.fromEntries(nodes.map((n) => [n.id, 0])));
    setTotalRouted(Object.fromEntries(nodes.map((n) => [n.id, 0])));
    rrIndex.current = 0;
    wrrState.current = { index: -1, current: 0 };
  }, [nodes.length]);

  useEffect(() => {
    if (autoFire) {
      autoRef.current = setInterval(route, 550);
    } else if (autoRef.current) {
      clearInterval(autoRef.current);
    }
    return () => autoRef.current && clearInterval(autoRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFire, algo, nodes]);

  function pickNode() {
    if (algo === "ROUND_ROBIN") {
      const n = nodes[rrIndex.current % nodes.length];
      rrIndex.current += 1;
      return n;
    }
    if (algo === "WEIGHTED_ROUND_ROBIN") {
      // smooth weighted round robin (Nginx-style)
      const st = wrrState.current;
      const total = nodes.reduce((s, n) => s + n.weight, 0);
      let best = null;
      const weights = st.weights || (st.weights = Object.fromEntries(nodes.map((n) => [n.id, 0])));
      nodes.forEach((n) => {
        weights[n.id] = (weights[n.id] || 0) + n.weight;
        if (!best || weights[n.id] > weights[best.id]) best = n;
      });
      weights[best.id] -= total;
      return best;
    }
    if (algo === "LEAST_CONNECTIONS") {
      return [...nodes].sort((a, b) => (active[a.id] || 0) - (active[b.id] || 0))[0];
    }
    // RANDOM
    return nodes[Math.floor(Math.random() * nodes.length)];
  }

  function route() {
    if (nodes.length === 0) return;
    const node = pickNode();
    const duration = 900 + Math.random() * 1800;
    setActive((a) => ({ ...a, [node.id]: (a[node.id] || 0) + 1 }));
    setTotalRouted((t) => ({ ...t, [node.id]: (t[node.id] || 0) + 1 }));
    setLog((l) => [{ node: node.id, t: Date.now() }, ...l].slice(0, 30));
    setTimeout(() => {
      setActive((a) => ({ ...a, [node.id]: Math.max(0, (a[node.id] || 0) - 1) }));
    }, duration);
  }

  function addNode() {
    if (nodes.length >= 6) return;
    const id = `srv-${nodes.length + 1}`;
    setNodes((n) => [...n, { id, weight: 1 }]);
  }
  function removeNode(id) {
    if (nodes.length <= 1) return;
    setNodes((n) => n.filter((x) => x.id !== id));
  }
  function setWeight(id, w) {
    setNodes((n) => n.map((x) => (x.id === id ? { ...x, weight: Math.max(1, w) } : x)));
  }
  function reset() {
    setActive(Object.fromEntries(nodes.map((n) => [n.id, 0])));
    setTotalRouted(Object.fromEntries(nodes.map((n) => [n.id, 0])));
    setLog([]);
    rrIndex.current = 0;
    wrrState.current = { index: -1, current: 0 };
  }

  const maxActive = Math.max(1, ...nodes.map((n) => active[n.id] || 0));

  return (
    <div>
      <div className="panel-head">
        <h2 className="panel-title">Load Balancer</h2>
        <span className="panel-sheetno">SCHEMATIC 04 / 04 — REV A</span>
      </div>
      <p className="panel-note">
        Each request is routed to one backend by the selected strategy. Bars show connections
        currently in flight (each request holds its node for a random 0.9–2.7s to simulate work).
      </p>

      <div className="controls-row">
        <div className="field">
          <label>Strategy</label>
          <select value={algo} onChange={(e) => setAlgo(e.target.value)}>
            <option value="ROUND_ROBIN">Round robin</option>
            <option value="WEIGHTED_ROUND_ROBIN">Weighted round robin</option>
            <option value="LEAST_CONNECTIONS">Least connections</option>
            <option value="RANDOM">Random</option>
          </select>
        </div>
        <button className="btn primary" onClick={route}>SEND REQUEST</button>
        <button className={`btn ${autoFire ? "rust" : ""}`} onClick={() => setAutoFire((a) => !a)}>
          {autoFire ? "STOP AUTO-FIRE" : "START AUTO-FIRE"}
        </button>
        <button className="btn" onClick={addNode} disabled={nodes.length >= 6}>ADD BACKEND</button>
        <button className="btn" onClick={reset}>RESET</button>
      </div>

      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-end", minHeight: 220, padding: "8px 4px" }}>
        {nodes.map((n) => {
          const a = active[n.id] || 0;
          return (
            <div key={n.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 84 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{a}</div>
              <div style={{
                width: 52, height: 160, border: "1.5px solid var(--ink)", background: "var(--paper)",
                display: "flex", alignItems: "flex-end", position: "relative",
              }}>
                <div style={{
                  width: "100%",
                  height: `${(a / maxActive) * 100}%`,
                  background: a === 0 ? "var(--paper-dim)" : "var(--blueprint-pale)",
                  borderTop: "2px solid var(--blueprint)",
                  transition: "height 0.25s ease",
                }} />
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 12, marginTop: 6 }}>{n.id}</div>
              {algo === "WEIGHTED_ROUND_ROBIN" && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <label style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--muted)" }}>w</label>
                  <input type="number" min={1} max={5} value={n.weight} style={{ width: 40, fontSize: 11, padding: "2px 4px" }}
                    onChange={(e) => setWeight(n.id, Number(e.target.value) || 1)}
                    className="mono" />
                </div>
              )}
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
                total: {totalRouted[n.id] || 0}
              </div>
              <button className="btn rust" style={{ padding: "3px 8px", fontSize: 10, marginTop: 6 }}
                onClick={() => removeNode(n.id)} disabled={nodes.length <= 1}>remove</button>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 6, textTransform: "uppercase" }}>
          Routing log
        </div>
        <div className="scroll-thin" style={{ maxHeight: 120, overflowY: "auto", border: "1px solid var(--grid-line-strong)" }}>
          {log.length === 0 && (
            <div style={{ padding: 8, fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--muted)" }}>no requests yet</div>
          )}
          {log.map((e, i) => (
            <div key={i} style={{
              padding: "4px 10px", fontFamily: "var(--mono)", fontSize: 11.5,
              borderBottom: i === log.length - 1 ? "none" : "1px solid var(--grid-line)",
            }}>
              → routed to <strong>{e.node}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
