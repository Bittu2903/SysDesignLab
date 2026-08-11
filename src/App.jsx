import { useState } from "react";
import "./App.css";
import CacheModule from "./modules/CacheModule";
import RateLimiterModule from "./modules/RateLimiterModule";
import HashRingModule from "./modules/HashRingModule";
import LoadBalancerModule from "./modules/LoadBalancerModule";

const SHEETS = [
  { id: "cache", num: "01", name: "LRU / LFU Cache", desc: "eviction policies", Component: CacheModule },
  { id: "rate", num: "02", name: "Rate Limiter", desc: "token bucket · sliding window", Component: RateLimiterModule },
  { id: "hash", num: "03", name: "Consistent Hashing", desc: "ring · virtual nodes", Component: HashRingModule },
  { id: "lb", num: "04", name: "Load Balancer", desc: "routing strategies", Component: LoadBalancerModule },
];

export default function App() {
  const [active, setActive] = useState("cache");
  const sheet = SHEETS.find((s) => s.id === active);
  const Active = sheet.Component;

  return (
    <div className="sheet">
      <header className="titleblock">
        <span className="tb-corner-bl" />
        <span className="tb-corner-br" />
        <div className="tb-eyebrow">Interactive drafting table — distributed systems</div>
        <h1 className="tb-title">SYSDESIGN<span>/</span>LAB</h1>
        <p className="tb-sub">
          Four mechanisms that show up in almost every backend interview, drawn to scale and
          driven by your inputs — not slides. Nudge a value, fire a request, watch the state change.
        </p>
        <div className="tb-strip">
          <div className="tb-cell">
            <span className="k">Drawn by</span>
            <span className="v">
              <a href="https://linkedin.com" target="_blank" rel="noreferrer">
                Bittu Singh
              </a>
            </span>
          </div><div className="tb-cell"><span className="k">Scale</span><span className="v">1:1 — live simulation</span></div>
          <div className="tb-cell"><span className="k">Sheet</span><span className="v">{sheet.num} of 04</span></div>
          <div className="tb-cell"><span className="k">Stack</span><span className="v">React · client-side only</span></div>
        </div>
      </header>

      <div className="layout">
        <nav className="index-panel">
          <div className="index-head">Sheet index</div>
          <ul className="index-list">
            {SHEETS.map((s) => (
              <li key={s.id}>
                <button
                  className={`index-item ${s.id === active ? "active" : ""}`}
                  onClick={() => setActive(s.id)}
                >
                  <span className="num">SCHEMATIC {s.num}</span>
                  <span className="name">{s.name}</span>
                  <span className="desc">{s.desc}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main className="panel">
          <span className="p-corner-bl" />
          <span className="p-corner-br" />
          <Active />
        </main>
      </div>

      <footer className="footer-note">
        SYSDESIGN/LAB — built to review core mechanisms before a system design round · no backend, no tracking, runs entirely in your browser
      </footer>
    </div>
  );
}
