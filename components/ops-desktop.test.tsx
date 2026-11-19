import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import OpsDesktop from "./ops-desktop";

describe("AI Ops workspace preview", () => {
  let host: HTMLDivElement;
  let root: Root;
  const onRestore = vi.fn();
  const onHome = vi.fn();
  const onThemeToggle = vi.fn();

  beforeEach(async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    onRestore.mockReset();
    onHome.mockReset();
    onThemeToggle.mockReset();
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
      window.setTimeout(() => cb(16), 0));
    vi.stubGlobal("cancelAnimationFrame", (handle: number) => window.clearTimeout(handle));
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => { root.render(<OpsDesktop visible theme="dark" onRestore={onRestore} onHome={onHome} onThemeToggle={onThemeToggle} />); });
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
        onHome={onHome} onThemeToggle={onThemeToggle} aiEndpoint="https://example.workers.dev/intent" />);
      await Promise.resolve();
    });
  };
  it("shows no visitor on/off switch and remains offline without an owner status signal", async () => {
    const fetchSpy = vi.fn(async () => ({ ok: false, status: 503 }));
    vi.stubGlobal("fetch", fetchSpy);
    await configured();
    expect(host.querySelectorAll(".ops-ai-mode-buttons")).toHaveLength(0);
    expect(host.querySelectorAll("button[aria-label*='Cloudflare AI']")).toHaveLength(0);
    expect(host.textContent).toContain("OFFLINE DEMO");
    await typePrompt("increase traffic");
    expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(fetchSpy.mock.calls.every(([, options]) => (options as RequestInit)?.method !== "POST")).toBe(true);
    expect(host.textContent).toContain("972");
  });
  it("uses Cloudflare when the OWNER enables it, not through a visitor switch", async () => {
    const fetchSpy = vi.fn(async (_url: string, options?: RequestInit) =>
      options?.method === "GET"
        ? { ok: true, json: async () => ({ mode: "online", aiEnabled: true }) }
        : { ok: true, json: async () => ({ action: "surge", reply: "Synthetic traffic increased." }) }
    );
    vi.stubGlobal("fetch", fetchSpy);
    await configured();
    expect(host.textContent).toContain("CLOUDFLARE AI · OWNER ENABLED");
    await typePrompt("increase traffic");
    expect(fetchSpy.mock.calls.filter(([, opts]) => (opts as RequestInit)?.method === "POST")).toHaveLength(1);
    expect(host.textContent).toContain("972");
    expect(host.querySelectorAll(".ops-ai-mode-buttons")).toHaveLength(0);
  });
  it("switches all visitors to offline after owner disables the Worker", async () => {
    let enabled = true;
    const fetchSpy = vi.fn(async (_url: string, options?: RequestInit) =>
      options?.method === "GET"
        ? { ok: true, json: async () => ({ mode: enabled ? "online" : "offline", aiEnabled: enabled }) }
        : { ok: true, json: async () => ({ action: "inspect", reply: "Synthetic inspection." }) }
    );
    vi.stubGlobal("fetch", fetchSpy);
    await configured();
    expect(host.textContent).toContain("OWNER ENABLED");
    enabled = false;
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
    });
    expect(host.textContent).toContain("OFFLINE DEMO");
    await typePrompt("show status");
    expect(fetchSpy.mock.calls.filter(([, opts]) => (opts as RequestInit)?.method === "POST")).toHaveLength(0);
    expect(host.textContent).toContain("synthetic");
  });
  it("falls back locally on a server-side disabled response even if status was previously enabled", async () => {
    const fetchSpy = vi.fn(async (_url: string, options?: RequestInit) =>
      options?.method === "GET"
        ? { ok: true, json: async () => ({ mode: "online", aiEnabled: true }) }
        : { ok: false, status: 503 }
    );
    vi.stubGlobal("fetch", fetchSpy);
    await configured();
    await typePrompt("show status");
    expect(host.textContent).toContain("OFFLINE DEMO");
    expect(host.textContent).toContain("Switched to the local demo");
    await typePrompt("increase traffic");
    expect(fetchSpy.mock.calls.filter(([, opts]) => (opts as RequestInit)?.method === "POST")).toHaveLength(1);
    expect(host.textContent).toContain("972");
  });
  it("keeps each worker's fan count equal to its visible CPU-shaped workload icons", async () => {
    const counts = () => [...host.querySelectorAll(".ops-node")].map((node) => ({
      fans: node.querySelectorAll(".ops-fan-shell").length,
      icons: node.querySelectorAll(".ops-pod").length,
    }));
    expect(counts()).toEqual([
      { fans: 1, icons: 1 }, { fans: 1, icons: 1 }, { fans: 1, icons: 1 },
    ]);
    await click("Spike traffic");
    expect(counts()).toEqual([
      { fans: 2, icons: 2 }, { fans: 2, icons: 2 }, { fans: 1, icons: 1 },
    ]);
    expect(host.querySelectorAll(".ops-cpu-fans-busy")).toHaveLength(3);
    await click("Normal");
    expect(counts()).toEqual([
      { fans: 1, icons: 1 }, { fans: 1, icons: 1 }, { fans: 1, icons: 1 },
    ]);
  });
  it("shows a new CI/CD candidate and resets the deployed version", async () => {
    await click("RUN DEMO");
    expect(host.textContent).toContain("v1.8.3");
    expect(host.textContent).toContain("BUILDING CANDIDATE");
    await click("Reset demo workspace");
    expect(host.textContent).toContain("v1.8.2");
    expect(host.textContent).not.toContain("BUILDING CANDIDATE");
  });
  it("offers visible Home and Restart actions while preserving the offline demo", async () => {
    expect(host.querySelector('[aria-label="Back to CV home screen"]')).toBeTruthy();
    expect(host.querySelector('[aria-label="Restart AI Ops playground"]')).toBeTruthy();
    await click("Spike traffic");
    await click("RUN DEMO");
    expect(host.textContent).toContain("v1.8.3");
    await click("Restart AI Ops playground");
    expect(host.textContent).toContain("v1.8.2");
    expect(host.textContent).toContain("246");
    expect(host.textContent).toContain("OFFLINE DEMO");
    expect(host.textContent).not.toContain("BUILDING CANDIDATE");
    expect(host.textContent).toContain("Welcome to the lab.");
    await click("Back to CV home screen");
    expect(onHome).toHaveBeenCalledOnce();
    expect(onRestore).not.toHaveBeenCalled();
  });
  it("offers a working dock to restore the CV and a theme toggle", async () => {
    await click("Restore CV terminal");
    await click("Toggle desktop light and dark theme");
    expect(onRestore).toHaveBeenCalledOnce();
    expect(onThemeToggle).toHaveBeenCalledOnce();
  });
});
