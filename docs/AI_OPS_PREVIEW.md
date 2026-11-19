# AI Ops Playground — isolated design and acceptance checklist

**Date:** 2026-11-19  
**Owner intent:** A distinctive, playful AI + DevOps desk behind the CV terminal.
The current personal CV stays live until this prototype is reviewed.

## User journeys

1. Load the existing portfolio homepage: the original CV terminal and
   Bash-experience onboarding must appear exactly as before.
2. Click the **yellow** window control. The terminal animates out and a
   compact desktop shows Monitoring, Kubernetes, CI/CD and AI Workspace Agent.
3. Select **Traffic surge**. RPS increases to the synthetic high-traffic value,
   CPU rises and replicas scale from 3 to 5. **Normal** returns to baseline.
4. Click **Run demo** in the CI/CD card. Checks → Build → Security → Rollout →
   Health progresses automatically, ending at a new simulated version.
5. Type "increase traffic", "deploy", "show status" or Persian equivalents
   in the agent panel. In offline default mode, deterministic local routing
   modifies the same simulation — **no inference and no network calls**.
6. Click the Dock's **Terminal**. Original transcript, input, mode, theme,
   and scroll position are retained. Snake pauses while the terminal is hidden.
7. The **green** window control toggles viewport maximize/restore. The red
   dot is deliberately cosmetic to avoid closing the session.
8. Explore on mobile: all four cards stack, the dock remains reachable,
   buttons remain usable; reduced-motion settings disable animations.

## Architecture

- Static Next.js frontend: current Vercel Git deployment / static output.
- Existing `CvShell` is kept mounted while minimized (CSS and inert).
- `OpsDesktop` is mounted behind it. All telemetry from a deterministic,
  synthetic `ops-simulator` module. No real backends, shell or Kubernetes.
- The AI-like interface defaults to a transparent **OFFLINE DEMO**. Its
  optional `NEXT_PUBLIC_OPS_AI_ENDPOINT` is unset in the repo; no Worker
  endpoint or secret is published.
- A separate Cloudflare Worker scaffold is OFF by default and accepts
  only five allowlisted sandbox actions. If a remote request fails or the
  Free quota is exhausted, fall back locally without automatic retries.
- Workers AI Free: 10,000 Neurons/day; Workers Free 100,000 requests/day.
  Per-POP rate limits are approximate; only the verified Free-plan
  hard stop is a no-overage guarantee. See the Worker README.
- Current site PDF / CV assets remain immutable for this experiment.

## Do not launch without

- Owner visits the isolated Preview and approves desktop layout & interaction.
- CI green for the exact last PR head; Vercel Preview READY.
- Browser visual verification for desktop and mobile; screen reader & keyboard
  navigation reviewed.
- Explicit choice to promote `main` only after review.
- If enabling *real* AI, additional owner authorization and confirmation
  of actual Workers Free plan; never paid plans, AI Gateway credits, or
  AI requests without limits. This is a separate gate from the UI.

## Rollback

Verified baseline Git SHA:
`6f2ea945ad1f2778ed26fd231c64ba73a863a683`.
Preserved branch:
`backup/pre-ai-playground-2026-11-19`.
Verified baseline Vercel deployment:
`dpl_ASwQwaEGyFkTE5yKbzHoiAY9avqq` (Production READY).
Leaving PR #10 unmerged keeps the current site unchanged; close PR if rejected.

## Next iteration — owner control and more realistic CI/CD (2026-11-19)

- Visitors **must not** see an Online/Offline switch. They get a read-only status label.
- Global AI mode is authenticated Cloudflare owner configuration, not a public Vercel route. Worker `GET /status` reports the effective mode without a model call; `POST /intent` enforces `AI_ENABLED` and `PLAN_ASSERTED_FREE`.
- Verify switching the owner flag off leads to a read-only `OFFLINE DEMO` label and local-only commands. No Worker or paid plan is deployed automatically by this PR.
- Kubernetes nodes: one cooling-fan indicator per displayed CPU-shaped workload/pod icon. A traffic surge increases visible pod icons (worker-01: 2, worker-02: 2, worker-03: 1) and speeds up fan rotation; it never creates extra fans unrelated to visible icons. `prefers-reduced-motion` removes rotation.
- CI/CD: increment candidate version on every run, retain last successfully deployed version when Build or Security fails, and allow a retry with the next candidate. Failure cases `v1.8.5` Build and `v1.8.9` Security; varying stage durations imitate occasional slow builds. Reset restores v1.8.2.
- The user-approved initial AI Ops desktop is already in Production via PR #10; this additional PR #11 is separate and must preserve the existing published site until verified.

## Visible navigation and model-readiness fix — 2026-11-20

- AI Ops header now exposes **HOME** (returns to the original Bash-experience welcome screen) and **RESTART** (clears simulated lab and assistant transcript without a full browser reload). The existing Dock's Terminal action still preserves the previous CV session.
- Restart deliberately does **not** reset the Cloudflare call counter or change the owner-controlled AI mode. Existing pipeline versioning and failure scenarios remain unchanged.
- The separate, still-undeployed Cloudflare scaffold now pins `@cf/meta/llama-3.1-8b-instruct-fast` instead of the non-fast model deprecated in May 2026. Free-plan and live model eligibility remain mandatory pre-deploy checks. There is no user-facing AI switch and no change to live AI status.
