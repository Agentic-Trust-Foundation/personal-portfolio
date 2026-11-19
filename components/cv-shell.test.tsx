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
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1220)); });
}

describe("Terminal-first CV interaction", () => {
  it("launches the hidden Snake inside the terminal and restores the same CV session on Escape", async () => {
    await click("Yes, I have");
    const input = host.querySelector("#cvcli-command") as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Missing native input setter");
    await act(async () => {
      setter.call(input, "cv play snake");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const form = host.querySelector(".cvcli-form") as HTMLFormElement;
    await act(async () => { form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    expect(host.querySelector('[aria-label="CV Snake game"]')).toBeTruthy();
    expect(host.querySelector("#cvcli-command")).toBeNull();
    expect(host.querySelector(".cvcli-history")).toBeNull();
    expect(host.querySelector(".cvcli-startup")).toBeNull();
    expect(host.querySelector(".cvcli-command-toggle")).toBeNull();
    expect(host.querySelector(".cvcli-viewport")?.classList.contains("cvcli-game-mode")).toBe(true);
    expect(host.querySelector(".cvcli-console-game")).toBeTruthy();
    expect(host.querySelector(".cvcli-status-switch")).toBeNull();
    await act(async () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(host.querySelector('[aria-label="CV Snake game"]')).toBeNull();
    expect(host.querySelector("#cvcli-command")).toBeTruthy();
    expect(host.querySelector(".cvcli-history")).toBeTruthy();
    expect(host.querySelector(".cvcli-viewport")?.classList.contains("cvcli-game-mode")).toBe(false);
    expect(host.textContent).toContain("Back to CV");
  });
  it("enables and disables Oneko without launching a full-screen game", async () => {
    await click("Yes, I have");
    const observed: boolean[] = [];
    const listener = (event: Event) => observed.push((event as CustomEvent<{ enabled: boolean }>).detail.enabled);
    window.addEventListener("cv:oneko", listener);
    const input = host.querySelector("#cvcli-command") as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Missing native value setter");
    const run = async (command: string) => {
      const activeInput = host.querySelector("#cvcli-command") as HTMLInputElement;
      await act(async () => {
        setter.call(activeInput, command);
        activeInput.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await act(async () => {
        host.querySelector<HTMLFormElement>(".cvcli-form")?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true })
        );
      });
    };
    try {
      await run("cv play oneko");
      expect(observed).toEqual([true]);
      expect(host.querySelector(".cvcli-game-slot")).toBeNull();
      expect(host.textContent).toContain("Oneko is here");
      await run("cv play oneko off");
      expect(observed).toEqual([true, false]);
      expect(host.textContent).toContain("Oneko stopped");
      expect(host.querySelector("#cvcli-command")).toBeTruthy();
    } finally {
      window.removeEventListener("cv:oneko", listener);
    }
  });

  it("makes hidden extras discoverable through a small Help control, not the guided menu", async () => {
    await click("Yes, I have");
    await click("HELP + EXTRAS");
    expect(host.textContent).toContain("cv play snake");
    expect(host.querySelector(".cvcli-game-slot")).toBeNull();
    expect(host.querySelectorAll(".cvcli-action")).toHaveLength(0);
  });

  it("returns from an active expert session to the opening Bash question without reloading", async () => {
    await click("Switch to light mode");
    await click("Yes, I have");
    const input = host.querySelector("#cvcli-command") as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Missing native value setter");
    await act(async () => {
      setter.call(input, "cv work");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      host.querySelector<HTMLFormElement>(".cvcli-form")?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true })
      );
    });
    expect(host.querySelectorAll(".cvcli-turn")).toHaveLength(1);
    await click("Back to CV welcome screen and Bash question");
    expect(host.textContent).toContain("Have you used Bash or a terminal before?");
    expect(host.querySelector("#cvcli-command")).toBeNull();
    expect(host.querySelector(".cvcli-history")).toBeNull();
    expect(host.querySelector(".cvcli-viewport")?.getAttribute("data-phase")).toBe("intro");
    expect(host.querySelector(".cvcli-viewport")?.getAttribute("data-theme")).toBe("light");
    expect(window.localStorage.getItem("hossein-cv-terminal-theme")).toBe("light");
    await click("No, show me");
    expect(host.textContent).toContain("Guided mode loaded.");
    expect(host.querySelectorAll(".cvcli-turn")).toHaveLength(0);
  });

  it("returns from full-screen Snake to the opening question via the terminal title", async () => {
    await click("Yes, I have");
    const input = host.querySelector("#cvcli-command") as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Missing native value setter");
    await act(async () => {
      setter.call(input, "cv play snake");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      host.querySelector<HTMLFormElement>(".cvcli-form")?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true })
      );
    });
    expect(host.querySelector(".cvcli-game-mode")).toBeTruthy();
    await click("Back to CV welcome screen and Bash question");
    expect(host.querySelector(".cvcli-game-mode")).toBeNull();
    expect(host.querySelector(".cvcli-game-slot")).toBeNull();
    expect(host.querySelector(".cvcli-startup")).toBeTruthy();
    expect(host.textContent).toContain("Have you used Bash or a terminal before?");
  });

  it("minimizes to the interactive desktop and restores the same terminal session", async () => {
    await click("Yes, I have");
    const input = host.querySelector("#cvcli-command") as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Missing native value setter");
    await act(async () => {
      setter.call(input, "cv help");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      host.querySelector<HTMLFormElement>(".cvcli-form")?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true })
      );
    });
    expect(host.querySelectorAll(".cvcli-turn")).toHaveLength(1);
    await click("Minimize terminal to AI Ops desktop");
    expect(host.querySelector(".cvcli-desktop-open")).toBeTruthy();
    expect(host.querySelector(".cvcli-shell")?.getAttribute("aria-hidden")).toBe("true");
    expect(host.textContent).toContain("AI & Platform");
    expect(host.textContent).toContain("Observability");
    await click("Spike traffic");
    expect(host.textContent).toContain("972");
    await click("Restore CV terminal");
    expect(host.querySelector(".cvcli-desktop-open")).toBeNull();
    expect(host.querySelector(".cvcli-shell")?.getAttribute("aria-hidden")).toBe("false");
    expect(host.querySelectorAll(".cvcli-turn")).toHaveLength(1);
    expect(host.textContent).toContain("Available CV commands");
  });

  it("maximizes and restores without closing or reloading the CV shell", async () => {
    await click("Maximize terminal window");
    expect(host.querySelector(".cvcli-window-maximized")).toBeTruthy();
    await click("Restore terminal window size");
    expect(host.querySelector(".cvcli-window-maximized")).toBeNull();
    expect(host.querySelectorAll(".cvcli-light-red")).toHaveLength(1);
    expect(host.querySelectorAll(".cvcli-light-red button")).toHaveLength(0);
  });

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

  it("eases the prompt into view on a paced scroll after expert mode selection", async () => {
    await click("Yes, I have");
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 290)); });
    expect(host.textContent).toContain("EXPERT MODE");
    expect(host.textContent).toContain("Terminal mode ready.");
    expect(scrollSpy).toHaveBeenCalled();
    expect(scrollSpy.mock.calls.some(([options]) => options.behavior === "auto")).toBe(true);
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
