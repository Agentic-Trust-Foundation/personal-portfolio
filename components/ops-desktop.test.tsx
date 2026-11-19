import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import OpsDesktop from "./ops-desktop";

describe("AI Ops workspace preview", () => {
  let host: HTMLDivElement;
  let root: Root;
  const onRestore = vi.fn();
  const onThemeToggle = vi.fn();

  beforeEach(async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    onRestore.mockReset();
    onThemeToggle.mockReset();
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
      window.setTimeout(() => cb(16), 0));
    vi.stubGlobal("cancelAnimationFrame", (handle: number) => window.clearTimeout(handle));
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => { root.render(<OpsDesktop visible theme="dark" onRestore={onRestore} onThemeToggle={onThemeToggle} />); });
  });
  afterEach(async () => {
    await act(async () => { root.unmount(); });
    host.remove();
    vi.unstubAllGlobals();
  });
  const click = async (label: string) => {
    const b = [...host.querySelectorAll("button")].find((node) =>
      node.textContent?.includes(label) || node.getAttribute("aria-label")?.includes(label)
    );
    if (!b) throw new Error("Missing control: " + label);
    await act(async () => { b.click(); });
  };
  it("shows all four interactive work surfaces with accurate demo labels", () => {
    expect(host.querySelectorAll(".ops-panel")).toHaveLength(4);
    expect(host.textContent).toContain("AI & Platform");
    expect(host.textContent).toContain("Observability");
    expect(host.textContent).toContain("Kubernetes");
    expect(host.textContent).toContain("CI / CD");
    expect(host.textContent).toContain("Workspace Agent");
    expect(host.textContent).toContain("SIMULATED · NO LIVE SYSTEMS");
    expect(host.textContent).toContain("OFFLINE DEMO");
  });
  it("changes multiple panels together in a client-only traffic surge", async () => {
    await click("Spike traffic");
    expect(host.textContent).toContain("972");
    expect(host.textContent).toContain("5/5");
    expect(host.textContent).toContain("Traffic surge selected".slice(0, 0) || "Simulated traffic increased");
    await click("Normal");
    expect(host.textContent).toContain("246");
    expect(host.textContent).toContain("3/3");
  });
  it("routes assistant prompts locally with absolutely no network calls", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const input = host.querySelector<HTMLInputElement>("#ops-agent-input");
    expect(input).toBeTruthy();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Missing input setter");
    await act(async () => {
      setter.call(input, "show status");
      input!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      host.querySelector<HTMLFormElement>(".ops-agent-form")?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true })
      );
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(host.textContent).toContain("synthetic");
  });
  const typePrompt = async (value: string) => {
    const input = host.querySelector<HTMLInputElement>("#ops-agent-input");
    if (!input) throw new Error("Missing assistant input");
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Missing input setter");
    await act(async () => {
      setter.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      host.querySelector<HTMLFormElement>(".ops-agent-form")?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true })
      );
      await Promise.resolve();
    });
  };
  const configured = async () => {
    await act(async () => {
      root.render(<OpsDesktop visible theme="dark" onRestore={onRestore}
        onThemeToggle={onThemeToggle} aiEndpoint="https://example.workers.dev/intent" />);
    });
  };
  it("starts OFFLINE even when a valid Cloudflare endpoint is available", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await configured();
    const offline = host.querySelector<HTMLButtonElement>('button[aria-label="Use Offline Demo without AI network requests"]');
    const online = host.querySelector<HTMLButtonElement>('button[aria-label="Use Cloudflare AI for typed prompts"]');
    expect(offline?.getAttribute("aria-pressed")).toBe("true");
    expect(online?.disabled).toBe(false);
    expect(online?.getAttribute("aria-pressed")).toBe("false");
    await typePrompt("show status");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(host.textContent).toContain("synthetic");
  });
  it("uses Cloudflare once only after explicit opt-in, then OFF prevents further calls", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ action: "surge", reply: "Synthetic traffic increased." }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    await configured();
    await click("Use Cloudflare AI for typed prompts");
    const online = host.querySelector('button[aria-label="Use Cloudflare AI for typed prompts"]');
    expect(online?.getAttribute("aria-pressed")).toBe("true");
    await typePrompt("increase traffic");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain("972");
    await click("Use Offline Demo without AI network requests");
    expect(online?.getAttribute("aria-pressed")).toBe("false");
    await typePrompt("show status");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain("synthetic");
  });
  it("fails closed to local demo when the owner disables the Worker globally", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    vi.stubGlobal("fetch", fetchSpy);
    await configured();
    await click("Use Cloudflare AI for typed prompts");
    await typePrompt("show status");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const online = host.querySelector<HTMLButtonElement>('button[aria-label="Use Cloudflare AI for typed prompts"]');
    expect(online?.disabled).toBe(true);
    expect(host.textContent).toContain("Switched to the local demo");
    await typePrompt("increase traffic");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain("972");
  });
  it("offers a working dock to restore the CV and a theme toggle", async () => {
    await click("Restore CV terminal");
    await click("Toggle desktop light and dark theme");
    expect(onRestore).toHaveBeenCalledOnce();
    expect(onThemeToggle).toHaveBeenCalledOnce();
  });
});
