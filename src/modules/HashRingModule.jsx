import { useState, useMemo } from "react";
import { hashToDegree } from "../utils/hash";

const NODE_COLORS = ["#2B4C8C", "#B5502F", "#4A7C59", "#8C5EA8", "#C48A1E"];

function polar(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export default function HashRingModule() {
  const [nodes, setNodes] = useState(["node-a", "node-b", "node-c"]);
  const [keys, setKeys] = useState(["user:104", "user:207", "user:318", "order:55", "order:91", "session:6"]);
  const [replicas, setReplicas] = useState(3);
  const [nodeInput, setNodeInput] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [lastMoved, setLastMoved] = useState([]);

  const nodeColor = (n) => NODE_COLORS[nodes.indexOf(n) % NODE_COLORS.length];

  // virtual node points on ring
  const ringPoints = useMemo(() => {
    const pts = [];
    nodes.forEach((n) => {
      for (let r = 0; r < replicas; r++) {
        const deg = hashToDegree(`${n}#${r}`);
        pts.push({ node: n, deg });
      }
    });
    return pts.sort((a, b) => a.deg - b.deg);
  }, [nodes, replicas]);

  function ownerOf(key) {
    if (ringPoints.length === 0) return null;
    const deg = hashToDegree(key);
    const found = ringPoints.find((p) => p.deg >= deg);
    return (found ?? ringPoints[0]).node;
  }

  const assignments = useMemo(() => {
    const map = {};
    keys.forEach((k) => (map[k] = ownerOf(k)));
    return map;
  }, [keys, ringPoints]);

  function addNode() {
    const name = nodeInput.trim();
    if (!name || nodes.includes(name)) return;
    const before = { ...assignments };
    setNodes((n) => [...n, name]);
    setNodeInput("");
    setTimeout(() => {
      const moved = keys.filter((k) => ownerOf(k) !== before[k]);
      setLastMoved(moved);
    }, 0);
  }

  function removeNode(name) {
    if (nodes.length <= 1) return;
    const before = { ...assignments };
    setNodes((n) => n.filter((x) => x !== name));
    setTimeout(() => {
      const moved = keys.filter((k) => ownerOf(k) !== before[k]);
      setLastMoved(moved);
    }, 0);
  }

  function addKey() {
    const k = keyInput.trim();
    if (!k || keys.includes(k)) return;
    setKeys((prev) => [...prev, k]);
    setKeyInput("");
  }

  // load distribution
  const load = useMemo(() => {
    const counts = {};
    nodes.forEach((n) => (counts[n] = 0));
    keys.forEach((k) => {
      const owner = assignments[k];
      if (owner) counts[owner] = (counts[owner] || 0) + 1;
    });
    return counts;
  }, [assignments, nodes, keys]);

  const R = 150, CX = 190, CY = 190;

  return (
    <div>
      <div className="panel-head">
        <h2 className="panel-title">Consistent Hashing Ring</h2>
        <span className="panel-sheetno">SCHEMATIC 03 / 04 — REV A</span>
      </div>
      <p className="panel-note">
        Each node places {replicas} virtual point(s) on a 0–359° ring (more replicas → smoother
        load). A key belongs to the first node point clockwise from its own hash. Add or remove a
        node and watch only the keys near that stretch of ring move — not the whole set.
      </p>

      <div className="controls-row">
        <div className="field">
          <label>Node name</label>
          <input type="text" value={nodeInput} onChange={(e) => setNodeInput(e.target.value)}
            placeholder="node-d" style={{ width: 90 }} onKeyDown={(e) => e.key === "Enter" && addNode()} />
        </div>
        <button className="btn primary" onClick={addNode}>ADD NODE</button>
        <div className="field">
          <label>Key</label>
          <input type="text" value={keyInput} onChange={(e) => setKeyInput(e.target.value)}
            placeholder="user:441" style={{ width: 100 }} onKeyDown={(e) => e.key === "Enter" && addKey()} />
        </div>
        <button className="btn" onClick={addKey}>ADD KEY</button>
        <div className="field">
          <label>Virtual nodes / replica</label>
          <input type="number" min={1} max={12} value={replicas}
            onChange={(e) => setReplicas(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
        <svg width="380" height="380" style={{ flexShrink: 0 }}>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--grid-line-strong)" strokeWidth="1.5" />
          {[0, 90, 180, 270].map((d) => {
            const p = polar(CX, CY, R + 14, d);
            return (
              <text key={d} x={p.x} y={p.y} fontSize="9" fontFamily="IBM Plex Mono" fill="var(--muted)"
                textAnchor="middle">{d}°</text>
            );
          })}
          {/* virtual node ticks */}
          {ringPoints.map((p, i) => {
            const outer = polar(CX, CY, R + 6, p.deg);
            const inner = polar(CX, CY, R - 6, p.deg);
            return (
              <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                stroke={nodeColor(p.node)} strokeWidth="2.5" />
            );
          })}
          {/* primary node label (replica 0) */}
          {nodes.map((n) => {
            const deg = hashToDegree(`${n}#0`);
            const p = polar(CX, CY, R + 28, deg);
            return (
              <text key={n} x={p.x} y={p.y} fontSize="10.5" fontWeight="700" fontFamily="IBM Plex Mono"
                fill={nodeColor(n)} textAnchor="middle">{n}</text>
            );
          })}
          {/* keys */}
          {keys.map((k) => {
            const deg = hashToDegree(k);
            const p = polar(CX, CY, R - 26, deg);
            const owner = assignments[k];
            const moved = lastMoved.includes(k);
            return (
              <g key={k}>
                <circle cx={p.x} cy={p.y} r={moved ? 6 : 4.5} fill={owner ? nodeColor(owner) : "var(--muted)"}
                  stroke="var(--paper)" strokeWidth="1.2" />
              </g>
            );
          })}
        </svg>

        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 8, textTransform: "uppercase" }}>
            Nodes &amp; load
          </div>
          {nodes.map((n) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ width: 12, height: 12, background: nodeColor(n), display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--mono)", fontSize: 12.5, width: 76 }}>{n}</span>
              <div style={{ flex: 1, height: 8, background: "var(--paper)", border: "1px solid var(--grid-line-strong)" }}>
                <div style={{
                  width: `${keys.length ? ((load[n] || 0) / keys.length) * 100 : 0}%`,
                  height: "100%", background: nodeColor(n),
                }} />
              </div>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, width: 34, textAlign: "right" }}>{load[n] || 0}</span>
              <button className="btn rust" style={{ padding: "3px 8px", fontSize: 10.5 }}
                onClick={() => removeNode(n)} disabled={nodes.length <= 1}>×</button>
            </div>
          ))}

          <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.1em", color: "var(--muted)", margin: "18px 0 8px", textTransform: "uppercase" }}>
            Keys ({keys.length})
          </div>
          <div className="scroll-thin" style={{ maxHeight: 130, overflowY: "auto", border: "1px solid var(--grid-line-strong)" }}>
            {keys.map((k) => (
              <div key={k} style={{
                display: "flex", justifyContent: "space-between", padding: "5px 10px",
                borderBottom: "1px solid var(--grid-line)", fontFamily: "var(--mono)", fontSize: 11.5,
                background: lastMoved.includes(k) ? "var(--rust-pale)" : "transparent",
              }}>
                <span>{k}</span>
                <span style={{ color: nodeColor(assignments[k]) }}>{assignments[k]}</span>
              </div>
            ))}
          </div>
          {lastMoved.length > 0 && (
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--rust)", marginTop: 8 }}>
              {lastMoved.length} key(s) remapped by the last change — highlighted above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
