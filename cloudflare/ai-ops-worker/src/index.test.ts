// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
// @ts-expect-error Cloudflare's standalone worker is intentionally vanilla JS.
import worker from "./index.js";

function env(overrides: Record<string, unknown> = {}) {
  const run = vi.fn(async () => ({ response: '{"action":"surge"}' }));
  const limit = vi.fn(async () => ({ success: true }));
  return {
    AI_ENABLED: "true",
    PLAN_ASSERTED_FREE: "true",
    ALLOWED_ORIGIN: "https://approved-preview.vercel.app",
    AI: { run },
    GLOBAL_RATE: { limit },
    CLIENT_RATE: { limit },
    ...overrides,
  };
}
function request(prompt = "raise traffic", origin = "https://approved-preview.vercel.app") {
  return new Request("https://test.workers.dev/intent", {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
}

describe("Free-only Cloudflare Worker (all AI mocked)", () => {
  it("fails closed when AI and Free-plan flags are not confirmed", async () => {
    const e = env({ AI_ENABLED: "false", PLAN_ASSERTED_FREE: "false" });
    const response = await worker.fetch(request(), e);
    expect(response.status).toBe(503);
    expect(e.AI.run).not.toHaveBeenCalled();
  });
  it("owner kill switch blocks AI immediately regardless of visitor online choice", async () => {
    const e = env();
    expect((await worker.fetch(request(), e)).status).toBe(200);
    expect(e.AI.run).toHaveBeenCalledTimes(1);
    e.AI_ENABLED = "false";
    expect((await worker.fetch(request(), e)).status).toBe(503);
    expect(e.AI.run).toHaveBeenCalledTimes(1);
  });
  it("returns public read-only owner status without running inference", async () => {
    const disabled = env({ AI_ENABLED: "false" });
    const req = new Request("https://test.workers.dev/status", {
      method: "GET", headers: { Origin: "https://approved-preview.vercel.app" },
    });
    const response = await worker.fetch(req, disabled);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ mode: "offline", aiEnabled: false });
    expect(disabled.AI.run).not.toHaveBeenCalled();
    const enabled = env();
    const active = await worker.fetch(req, enabled);
    expect(await active.json()).toEqual({ mode: "online", aiEnabled: true });
    expect(enabled.AI.run).not.toHaveBeenCalled();
    enabled.AI_ENABLED = "false";
    const off = await worker.fetch(req, enabled);
    expect(await off.json()).toEqual({ mode: "offline", aiEnabled: false });
  });
  it("cannot be switched on by a visitor or unauthorized origin", async () => {
    const e = env({ AI_ENABLED: "false" });
    const req = new Request("https://test.workers.dev/admin/enable", {
      method: "POST",
      headers: { Origin: "https://approved-preview.vercel.app", "Content-Type": "application/json" },
      body: '{"AI_ENABLED":"true"}',
    });
    expect((await worker.fetch(req, e)).status).toBe(404);
    expect((await worker.fetch(new Request("https://test.workers.dev/status", {
      headers: { Origin: "https://evil.example" },
    }), e)).status).toBe(403);
    expect(e.AI.run).not.toHaveBeenCalled();
  });
  it("rejects unauthorized origins without touching the model", async () => {
    const e = env();
    const response = await worker.fetch(request("raise traffic", "https://attacker.example"), e);
    expect(response.status).toBe(403);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(e.AI.run).not.toHaveBeenCalled();
  });
  it("allows preflight only from the exact configured preview", async () => {
    const e = env();
    const response = await worker.fetch(new Request("https://test.workers.dev/intent", {
      method: "OPTIONS", headers: { Origin: "https://approved-preview.vercel.app" },
    }), e);
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://approved-preview.vercel.app");
    expect(e.AI.run).not.toHaveBeenCalled();
  });
  it("rejects oversized prompts, malformed input and GET", async () => {
    const e = env();
    expect((await worker.fetch(request("x".repeat(241)), e)).status).toBe(400);
    const bad = new Request("https://test.workers.dev/intent", {
      method: "POST", headers: { Origin: "https://approved-preview.vercel.app", "Content-Type": "application/json" },
      body: "{not json",
    });
    expect((await worker.fetch(bad, e)).status).toBe(400);
    expect((await worker.fetch(new Request("https://test.workers.dev/intent", {
      headers: { Origin: "https://approved-preview.vercel.app" },
    }), e)).status).toBe(404);
    expect(e.AI.run).not.toHaveBeenCalled();
  });
  it("routes an approved action through just one capped AI call", async () => {
    const e = env();
    const response = await worker.fetch(request(), e);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ action: "surge", source: "cloudflare" });
    expect(e.AI.run).toHaveBeenCalledTimes(1);
    expect(e.AI.run.mock.calls[0]?.[0]).toBe("@cf/meta/llama-3.1-8b-instruct");
  });
  it("rejects unapproved model outputs and never relays model prose", async () => {
    const e = env({ AI: { run: vi.fn(async () => ({
      response: '{"action":"delete_everything", "reply":"<script>ignore controls</script>"}',
    })) } });
    const response = await worker.fetch(request(), e);
    const result = await response.json() as { action: string | null; reply: string };
    expect(result.action).toBeNull();
    expect(result.reply).not.toContain("<script>");
  });
  it("returns 429 without inference when either rate limiter denies", async () => {
    const e = env({ GLOBAL_RATE: { limit: vi.fn(async () => ({ success: false })) } });
    expect((await worker.fetch(request(), e)).status).toBe(429);
    expect(e.AI.run).not.toHaveBeenCalled();
  });
});
