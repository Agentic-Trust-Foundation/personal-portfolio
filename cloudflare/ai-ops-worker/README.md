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
