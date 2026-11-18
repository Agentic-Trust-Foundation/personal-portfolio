import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import OnekoCompanion, { ONEKO_EVENT, setOnekoEnabled } from "./oneko-companion";

describe("Oneko website companion", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    window.sessionStorage.clear();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(16), 0));
    vi.stubGlobal("cancelAnimationFrame", (handle: number) => window.clearTimeout(handle));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => { root.render(<OnekoCompanion />); });
  });
  afterEach(async () => {
    await act(async () => { root.unmount(); });
    container.remove();
    vi.unstubAllGlobals();
    window.sessionStorage.clear();
  });

  it("is off by default and never changes the main page without a command", () => {
    expect(document.documentElement.classList.contains("cv-oneko-enabled")).toBe(false);
    expect(container.querySelector(".cv-oneko-cat")).toBeNull();
  });

  it("starts on the command event, ignores pointer clicks, and can be dismissed", async () => {
    await act(async () => { setOnekoEnabled(true); });
    expect(window.sessionStorage.getItem("hossein-cv-oneko-enabled")).toBe("yes");
    expect(document.documentElement.classList.contains("cv-oneko-enabled")).toBe(true);
    const cat = container.querySelector(".cv-oneko-cat");
    expect(cat).toBeTruthy();
    expect(cat?.getAttribute("aria-hidden")).toBe("true");
    const close = container.querySelector<HTMLButtonElement>(".cv-oneko-dismiss");
    expect(close).toBeTruthy();
    await act(async () => { close!.click(); });
    expect(container.querySelector(".cv-oneko-cat")).toBeNull();
    expect(document.documentElement.classList.contains("cv-oneko-enabled")).toBe(false);
    expect(window.sessionStorage.getItem("hossein-cv-oneko-enabled")).toBeNull();
  });

  it("chases the user's mouse without intercepting mouse input", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("(pointer: fine)"),
      media: query,
      addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {},
    }));
    await act(async () => { setOnekoEnabled(true); });
    const sprite = container.querySelector<HTMLElement>(".cv-oneko-cat");
    expect(sprite).not.toBeNull();
    const initial = sprite!.style.transform;
    window.dispatchEvent(new MouseEvent("mousemove", {
      clientX: 240, clientY: 180, bubbles: true,
    }));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 230)); });
    expect(sprite!.style.transform).not.toBe(initial);
  });

  it("respects the system's reduced-motion preference", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("pointer: fine") || query.includes("reduced-motion: reduce"),
      media: query,
      addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {},
    }));
    await act(async () => { setOnekoEnabled(true); });
    const sprite = container.querySelector<HTMLElement>(".cv-oneko-cat");
    const initial = sprite!.style.transform;
    window.dispatchEvent(new MouseEvent("mousemove", { clientX: 240, clientY: 180 }));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 160)); });
    expect(sprite!.style.transform).toBe(initial);
  });

  it("keeps its activation across a page remount in the same tab", async () => {
    await act(async () => { setOnekoEnabled(true); });
    await act(async () => { root.unmount(); });
    root = createRoot(container);
    await act(async () => { root.render(<OnekoCompanion />); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
    expect(container.querySelector(".cv-oneko-cat")).toBeTruthy();
    await act(async () => { window.dispatchEvent(new CustomEvent(ONEKO_EVENT, { detail: { enabled: false } })); });
    expect(container.querySelector(".cv-oneko-cat")).toBeNull();
  });
});
