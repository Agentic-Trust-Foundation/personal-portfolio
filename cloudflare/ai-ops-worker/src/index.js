/**
 * Explicitly OFF by default. Deploy ONLY to an owner-verified Workers FREE
 * account; NEVER connect paid plans, AI Gateway credits or a billable model.
 *
 * The LLM can ONLY classify a prompt into an allowlisted demo-lab action.
 * It cannot execute shell commands, call external services, or affect real
 * infrastructure. Approximate location-local rate limits reduce abuse, but
 * the Free-plan quota itself is the billing hard-stop.
 *
 * Public inputs never leave Cloudflare except through this account's AI binding.
 */
const MODEL = "@cf/meta/llama-3.1-8b-instruct";
const ACTIONS = new Set(["surge", "normalize", "deploy", "inspect", "reset"]);
const DESCRIPTION = {
  surge: "Traffic surge selected for the synthetic ops lab.",
  normalize: "Normal traffic scenario selected for the synthetic ops lab.",
  deploy: "A simulated CI/CD pipeline is ready to run. No real deployment will occur.",
  inspect: "You can inspect the synthetic metrics and Kubernetes cards.",
  reset: "Reset the synthetic ops lab to its initial state.",
  none: "I can help with demo traffic, simulated deployments, inspection and reset.",
};
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store",
};
function json(data, status = 200, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...securityHeaders, "Content-Type": "application/json; charset=utf-8",
      ...(origin ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" } : {}),
    },
  });
}
function pickAction(output) {
  const raw = String(output ?? "").slice(0, 700).trim();
  let candidate;
  try {
    const obj = JSON.parse(raw);
    candidate = obj && typeof obj === "object" && obj.action;
  } catch {
    // Some instruct models surround short JSON with prose or code fences.
    const match = raw.match(/"action"\s*:\s*"(surge|normalize|deploy|inspect|reset|none)"/);
    candidate = match?.[1] || "none";
  }
  return ACTIONS.has(candidate) ? candidate : null;
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowed = env.ALLOWED_ORIGIN || "";

    // Disable even CORS preflights from unknown sites; no wildcard origins.
    if (!allowed || origin !== allowed) return json({ error: "Origin not allowed" }, 403);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: {
        ...securityHeaders,
        "Access-Control-Allow-Origin": allowed,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "600",
        "Vary": "Origin",
      } });
    }
    if (request.method !== "POST" || url.pathname !== "/intent") return json({ error: "Not found" }, 404, allowed);

    // Fail-closed until the owner verifies the Free-only plan and sets both flags.
    if (env.AI_ENABLED !== "true" || env.PLAN_ASSERTED_FREE !== "true" ||
        !env.AI || !env.GLOBAL_RATE || !env.CLIENT_RATE) {
      return json({ error: "AI offline; use local demo" }, 503, allowed);
    }
    if (!(request.headers.get("Content-Type") || "").startsWith("application/json")) {
      return json({ error: "JSON required" }, 415, allowed);
    }
    const raw = await request.text();
    if (raw.length > 700) return json({ error: "Input too long" }, 413, allowed);
    let data;
    try { data = JSON.parse(raw); } catch { return json({ error: "Invalid JSON" }, 400, allowed); }
    if (!data || typeof data.prompt !== "string" ||
        data.prompt.trim().length < 2 || data.prompt.length > 240) {
      return json({ error: "Prompt must be 2–240 characters" }, 400, allowed);
    }

    // Both limits are approximate and per POP. The account MUST remain
    // Workers Free, which hard-stops inference when daily Neurons are exhausted.
    const globalGate = await env.GLOBAL_RATE.limit({ key: "ops-lab-global" });
    if (!globalGate.success) return json({ error: "Free quota protection" }, 429, allowed);
    const clientKey = request.headers.get("CF-Connecting-IP") || "anonymous";
    const clientGate = await env.CLIENT_RATE.limit({ key: clientKey });
    if (!clientGate.success) return json({ error: "Slow down, use local demo" }, 429, allowed);
    try {
      const result = await env.AI.run(MODEL, {
        messages: [
          { role: "system", content:
            "You are a strict action router for a fake DevOps playground. " +
            "Read the user's message and reply with ONLY one compact JSON object " +
            "{\"action\":\"surge|normalize|deploy|inspect|reset|none\"}. " +
            "Choose surge for increased traffic/load, normalize for reduce/recover, " +
            "deploy for release, inspect for metrics/status questions, reset to reset. " +
            "No other actions. Never output code or answer unrelated questions." },
          { role: "user", content: data.prompt.slice(0, 240) },
        ],
        max_tokens: 100, temperature: 0,
      });
      const action = pickAction(result?.response);
      return json({
        action, reply: DESCRIPTION[action || "none"], source: "cloudflare",
      }, 200, allowed);
    } catch {
      // Includes Cloudflare model rate limits / exhausted free Neurons; do not retry.
      return json({ error: "AI unavailable; use local demo" }, 503, allowed);
    }
  },
};
