# SYSDESIGN/LAB

An interactive "drafting table" for four mechanisms that show up in almost every
backend / system design interview:

1. **LRU / LFU Cache** — capacity-bound cache with GET/PUT, hit/miss/eviction tracking, and a sample skewed-workload runner.
2. **Rate Limiter** — token bucket vs. sliding window counter, with a live bucket gauge and request timeline.
3. **Consistent Hashing Ring** — nodes and keys placed on a hash ring with configurable virtual nodes; add/remove a node and see only the affected keys remap.
4. **Load Balancer** — round robin, weighted round robin, least connections, and random routing across simulated backends.

Pure client-side React — no backend, no database, nothing to provision. Built specifically
to deploy for free on Netlify as a static site.

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

## Deploy to Netlify (free)

**Option A — drag and drop (fastest):**
1. Run `npm run build` locally.
2. Go to https://app.netlify.com/drop
3. Drag the `dist/` folder onto the page. Done — you get a live URL immediately.

**Option B — connect to GitHub (recommended, auto-redeploys on push):**
1. Push this project to a GitHub repo.
2. In Netlify: **Add new site → Import an existing project → GitHub** → pick the repo.
3. Build command: `npm run build`   ·   Publish directory: `dist`
   (already set in `netlify.toml`, so Netlify should detect this automatically).
4. Deploy. You'll get a `*.netlify.app` URL, with a custom domain option if you want one.

## Stack

React 19 + Vite, plain CSS (no framework), IBM Plex Mono/Sans/Serif. No external runtime
dependencies beyond React — kept intentionally lean so it stays inside every free-tier limit.
