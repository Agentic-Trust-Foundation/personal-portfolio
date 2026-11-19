# AI Ops Playground — Cloudflare Workers AI **FREE ONLY** connector

This optional Cloudflare Worker is **not deployed** by the portfolio build.
The Vercel preview is a fully interactive **local simulation**, with **zero AI
calls, zero Worker usage, and no credentials**.

## Hard release gates (must all be true)

1. Verify the exact Cloudflare account is **Workers Free**, not Paid or prepaid AI Gateway credits. Do not add a payment method for this experiment.
2. Keep the model allowlisted as `@cf/meta/llama-3.1-8b-instruct-fast` (the non-fast model was deprecated 2026-05-30); re-check its continued availability and Free eligibility in the official model catalog before activation. Never dynamically choose models from user input.
3. `AI_ENABLED` and `PLAN_ASSERTED_FREE` both default to `false`. Do not change them before owner approval. The second flag is a manual assertion, **not** a way to verify the Cloudflare billing plan.
4. Set `ALLOWED_ORIGIN` to one exact approved Vercel Preview origin (e.g. `https://...vercel.app`, no trailing slash). Never use `*`. No browser API secrets.
5. The Worker has approximate per-client (3/min) and per-location global (12/min) limits; **these are not strict worldwide quotas**. The Cloudflare Workers Free plan is the *only* actual no-billing guarantee. Do not deploy to Workers Paid under any circumstances.
6. Enable `NEXT_PUBLIC_OPS_AI_ENDPOINT=https://<worker-host>/intent` only for a new **Preview** build, after the Worker has passed owner-reviewed Free-plan and CORS checks. Never set it for Production without separate approval.
7. If any check fails or the free quota is exhausted, keep AI disabled and continue using the browser-only demo. Never silently route to a paid API.

Official reference (reviewed 2026-11-20):
- https://developers.cloudflare.com/workers-ai/models/llama-3.1-8b-instruct-fast/ (pinned supported model, still verify actual Free eligibility)
- https://developers.cloudflare.com/workers-ai/changelog/ (deprecated non-fast model)
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
- Verify GET /status returns only the owner's mode and does not invoke AI; malformed/oversized POST JSON is rejected.
- Verify origin preflight is restricted to POST and Content-Type.
- Verify one successful allowed request returns only a safe action.
- Verify 429 and depleted free Neurons show local-only fallback.
- Observe real Cloudflare Free account usage (Neurons/day) before increasing limits.

## Owner-only On / Off runbook

**Visitors do not have any AI switch or administrator controls.** The Workspace Agent displays a read-only indicator, `OFFLINE DEMO` or `CLOUDFLARE AI · OWNER ENABLED`. On each new visit it starts offline. If an endpoint is configured, the frontend checks `GET /status` (read-only, zero inference) and periodically refreshes status while the workspace is visible. If the owner changes the settings, visiting users see the new mode after the next status refresh, or sooner when reopening the workspace/tab.

**Owner authority: Cloudflare Dashboard only.** This portfolio has no separate authenticated administration panel. A public frontend cannot change `AI_ENABLED` and no `/admin/enable` endpoint exists.

### Turn OFF globally
1. Open your authenticated Cloudflare Dashboard → **Workers & Pages** → **hossein-ai-ops-free-lab** → **Settings** → **Variables and Secrets**.
2. Set `AI_ENABLED=false`, save and deploy the settings. All **new** `POST /intent` requests will receive HTTP 503 with **zero inference**, regardless of frontend state. `GET /status` returns `{"mode":"offline","aiEnabled":false}`.
3. The site continues as the browser-only simulator. Existing model requests already started before the change may finish; the cutoff applies to new requests after deployment takes effect.

### Turn ON globally (only after separate verification)
1. Verify the actual Cloudflare account is **Workers Free**, not a paid or prepaid plan, and the pinned model is Free eligible. Do not add any payment method for this experiment.
2. Configure exactly one approved origin and a safe Worker endpoint in the intended Vercel environment, then redeploy the site if necessary. `NEXT_PUBLIC_OPS_AI_ENDPOINT` is a public endpoint URL, never a credential.
3. In authenticated Cloudflare Settings, set `PLAN_ASSERTED_FREE=true`, `AI_ENABLED=true`, and deploy. The site will automatically display `CLOUDFLARE AI · OWNER ENABLED` when `GET /status` confirms both flags. The site visitor cannot override the owner's choice.
4. If quota is exhausted, the Worker returns 503/429; the website falls back to Offline Demo and does not retry inference automatically.

The frontend checks status at most every three minutes while visible, plus when a hidden tab returns. Checking status itself uses a free Worker request but never Workers AI inference. Global rate limits in the Worker are **per POP** and not an exact worldwide budget; the verified Workers Free account must be the final no-overage boundary.

Official documentation:
- https://developers.cloudflare.com/workers/configuration/environment-variables/
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

**Current deployment:** This Worker has NOT been deployed; no Cloudflare account or billing plan has been verified in this chat. The Vercel site stays in Offline Demo by default. Updating the model ID in source code does not enable or deploy it.
