import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import CvShell from "./cv-shell";

let host: HTMLDivElement;
let root: Root;
const scrollSpy = vi.fn();

beforeEach(async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.localStorage.clear();
  scrollSpy.mockReset();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(16), 0));
  vi.stubGlobal("cancelAnimationFrame", (handle: number) => window.clearTimeout(handle));
  Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: scrollSpy });
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => { root.render(<CvShell />); });
});

afterEach(async () => {
  await act(async () => { root.unmount(); });
  host.remove();
  vi.unstubAllGlobals();
});

function button(label: string) {
  const result = [...host.querySelectorAll("button")].find((node) =>
    node.textContent?.includes(label) || node.getAttribute("aria-label")?.includes(label));
  if (!result) throw new Error("Missing button: " + label);
  return result;
}
async function click(label: string) {
  await act(async () => { button(label).click(); });
}
async function settleTransition() {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 630)); });
}

describe("Terminal-first CV interaction", () => {
  it("starts in the dark terminal and asks about Bash", () => {
    expect(host.querySelector(".cvcli-shell")).toBeTruthy();
    expect(host.querySelector(".cvcli-viewport")?.getAttribute("data-theme")).toBe("dark");
    expect(host.textContent).toContain("Have you used Bash or a terminal before?");
    expect(host.querySelector("#cvcli-command")).toBeNull();
  });

  it("switches to light mode and saves the preference", async () => {
    await click("Switch to light mode");
    expect(host.querySelector(".cvcli-viewport")?.getAttribute("data-theme")).toBe("light");
    expect(window.localStorage.getItem("hossein-cv-terminal-theme")).toBe("light");
    await click("Switch to dark mode");
    expect(host.querySelector(".cvcli-viewport")?.getAttribute("data-theme")).toBe("dark");
  });

  it("smoothly scrolls to the prompt after expert mode selection", async () => {
    await click("Yes, I have");
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    expect(host.textContent).toContain("TERMINAL MODE");
    expect(scrollSpy).toHaveBeenCalled();
    expect(scrollSpy.mock.calls.some(([options]) => options.behavior === "smooth")).toBe(true);
    expect(host.querySelector("#cvcli-command")).toBeTruthy();
  });

  it("lets beginners run a command while the intro collapses softly", async () => {
    await click("No, show me");
    expect(host.querySelectorAll(".cvcli-action").length).toBeGreaterThan(5);
    await click("Work details");
    expect(host.querySelector(".cvcli-viewport")?.getAttribute("data-phase")).toBe("clearing");
    expect(host.querySelector(".cvcli-startup-leaving")).toBeTruthy();
    expect(host.textContent).toContain("Apache Fineract");
    await settleTransition();
    expect(host.querySelector(".cvcli-startup")).toBeNull();
    expect(host.querySelector(".cvcli-viewport")?.getAttribute("data-phase")).toBe("active");
    expect(host.querySelectorAll(".cvcli-turn")).toHaveLength(1);
    await click("Commands");
    await click("More commands");
    await click("Kuhban");
    expect(host.querySelectorAll(".cvcli-turn")).toHaveLength(2);
  });

  it("begins an animated clear on the first typed command character", async () => {
    await click("Yes, I have");
    const input = host.querySelector("#cvcli-command") as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Missing native value setter");
    await act(async () => {
      setter.call(input, "cv");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(input.value).toBe("cv");
    expect(host.querySelector(".cvcli-startup-leaving")).toBeTruthy();
    await settleTransition();
    expect(host.querySelector(".cvcli-boot")).toBeNull();
    expect(host.querySelector("#cvcli-command")).toBeTruthy();
  });

  it("keeps cv clear and normal CV/PDF links accessible", async () => {
    expect(host.querySelector('a[href="/resume/"]')).toBeTruthy();
    expect(host.querySelector('a[href="/resume.pdf"]')).toBeTruthy();
    await click("No, show me");
    await click("Work history");
    await settleTransition();
    await click("Commands");
    await click("More commands");
    await click("Clear screen");
    expect(host.querySelectorAll(".cvcli-turn")).toHaveLength(0);
    expect(host.querySelector(".cvcli-startup")).toBeNull();
  });
});
