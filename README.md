# SYSDESIGN/LAB

An interactive "drafting table" for four mechanisms that show up in almost every
backend / system design interview:

1. **LRU / LFU Cache** — capacity-bound cache with GET/PUT, hit/miss/eviction tracking, and a sample skewed-workload runner.
2. **Rate Limiter** — token bucket vs. sliding window counter, with a live bucket gauge and request timeline.
3. **Consistent Hashing Ring** — nodes and keys placed on a hash ring with configurable virtual nodes; add/remove a node and see only the affected keys remap.
4. **Load Balancer** — round robin, weighted round robin, least connections, and random routing across simulated backends.

Pure client-side React — no backend, no database, nothing to provision.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Outputs a static site to `dist/`.

