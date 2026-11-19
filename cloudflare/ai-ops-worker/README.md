# AI Ops Playground — Cloudflare Workers AI **FREE ONLY** connector

This optional Cloudflare Worker is **not deployed** by the portfolio build.
The Vercel preview is a fully interactive **local simulation**, with **zero AI
calls, zero Worker usage, and no credentials**.

## Hard release gates (must all be true)

1. Verify the exact Cloudflare account is **Workers Free**, not Paid or prepaid AI Gateway credits. Do not add a payment method for this experiment.
2. Keep the model allowlisted as `@cf/meta/llama-3.1-8b-instruct`; re-check its Free eligibility in the official model catalog before activation. Never dynamically choose models from user input.
3. `AI_ENABLED` and `PLAN_ASSERTED_FREE` both default to `false`. Do not change them before owner approval. The second flag is a manual assertion, **not** a way to verify the Cloudflare billing plan.
4. Set `ALLOWED_ORIGIN` to one exact approved Vercel Preview origin (e.g. `https://...vercel.app`, no trailing slash). Never use `*`. No browser API secrets.
5. The Worker has approximate per-client (3/min) and per-location global (12/min) limits; **these are not strict worldwide quotas**. The Cloudflare Workers Free plan is the *only* actual no-billing guarantee. Do not deploy to Workers Paid under any circumstances.
6. Enable `NEXT_PUBLIC_OPS_AI_ENDPOINT=https://<worker-host>/intent` only for a new **Preview** build, after the Worker has passed owner-reviewed Free-plan and CORS checks. Never set it for Production without separate approval.
7. If any check fails or the free quota is exhausted, keep AI disabled and continue using the browser-only demo. Never silently route to a paid API.

Official reference (verified 2026-11-19):
- https://developers.cloudflare.com/workers-ai/platform/pricing/ (10,000 Neurons/day free on Workers Free; no overage, requests fail)
- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/ (approximate POP-local rate limits)
- https://developers.cloudflare.com/workers-ai/get-started/workers-wrangler/ (Workers AI binding)

## Scope and security

`src/index.js` allows only `surge`, `normalize`, `deploy`, `inspect`,
`reset`, or `none`. The model's raw output is **not executed**; the
Worker validates one action and returns a fixed safe response. All server
and Kubernetes states remain synthetic browser-side. Input length is capped,
CORS requires an exact approved Origin, and the Worker performs at most
one AI inference per allowed request (no retries or chaining).

The Worker itself requires owner-controlled Cloudflare credentials and a
separate explicit deploy. The portfolio repository does not contain account
IDs, tokens, Worker URLs or Cloudflare secrets.

## Validation before enabling

- Verify empty origin fails closed and unknown origin is rejected.
- Verify GET and malformed/oversized JSON do not invoke AI.
- Verify origin preflight is restricted to POST and Content-Type.
- Verify one successful allowed request returns only a safe action.
- Verify 429 and depleted free Neurons show local-only fallback.
- Observe real Cloudflare Free account usage (Neurons/day) before increasing limits.

## On / Off runbook — two independent controls

**Visitors:** `Workspace Agent → Assistant mode → Offline Demo / Cloudflare AI`.
The site defaults to **Offline Demo on every new page load** even if a Worker
URL is configured. Only **typed prompts after the visitor explicitly opts in**
are sent to Cloudflare; all preset quick actions remain local. Turning
Offline on prevents subsequent requests and aborts the current browser fetch
best-effort. At most three AI calls are attempted per visit; errors and
quota exhaustion automatically switch that visitor to Offline. The visitor
switch is convenience and privacy, **not** a spending guarantee.

**Owner / everyone at once (authoritative):**
1. Open Cloudflare Dashboard → **Workers & Pages** → **hossein-ai-ops-free-lab**
   → **Settings** → **Variables and Secrets**.
2. Set `AI_ENABLED` to `false` and choose **Deploy**. All subsequent
   `/intent` calls return 503 without any `env.AI.run`, even when a visitor
   has switched to Cloudflare AI. Do not place an unsecured global switch on
   the public site.
3. If the Worker is not deployed, or the Vercel
   `NEXT_PUBLIC_OPS_AI_ENDPOINT` environment variable is absent, the UI
   stays in Offline Demo and offers no active online switch.
4. To enable later: **first confirm the Cloudflare account is Workers Free**
   (not Workers Paid and without prepaid AI Gateway credits), verify Free
   eligibility of the pinned model, configure exact origin, and explicitly
   set `PLAN_ASSERTED_FREE=true` and `AI_ENABLED=true` in the Worker
   settings, then **Deploy**. A Worker URL must be configured separately for
   the intended Vercel environment and rebuilt. The toggle is not a
   substitute for checking account billing.

Cloudflare official docs:
- https://developers.cloudflare.com/workers/configuration/environment-variables/
- https://developers.cloudflare.com/workers-ai/platform/pricing/

A browser may already have an in-flight request when you turn the owner
switch off; the server-side change prevents **new** inference requests after
it takes effect, not work that has already started.
