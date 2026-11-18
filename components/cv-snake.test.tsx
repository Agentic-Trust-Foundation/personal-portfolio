import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import CvSnake from "./cv-snake";
import { SNAKE_COLUMNS, SNAKE_ROWS } from "@/lib/snake";

describe("CV Snake browser interaction", () => {
  let host: HTMLDivElement;
  let root: Root;
  let exit: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    window.localStorage.clear();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(16), 0));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    exit = vi.fn();
    await act(async () => { root.render(<CvSnake onExit={exit} />); });
  });

  afterEach(async () => {
    await act(async () => { root.unmount(); });
    host.remove();
    vi.unstubAllGlobals();
  });

  it("draws a terminal-like board with no backend UI", () => {
    expect(host.querySelectorAll(".cv-snake-cell")).toHaveLength(SNAKE_COLUMNS * SNAKE_ROWS);
    expect(host.querySelector(".cv-snake-head")).toBeTruthy();
    expect(host.querySelector(".cv-snake-food")).toBeTruthy();
    expect(host.textContent).toContain("CV SNAKE");
    expect(host.textContent).toContain("BEST");
    expect(host.querySelector("input")).toBeNull();
  });

  it("captures arrow keys, pauses and resumes with P", async () => {
    const arrow = new KeyboardEvent("keydown", { key: "ArrowUp", cancelable: true, bubbles: true });
    await act(async () => { window.dispatchEvent(arrow); });
    expect(arrow.defaultPrevented).toBe(true);
    await act(async () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "p", bubbles: true })); });
    expect(host.textContent).toContain("PAUSED");
    await act(async () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "p", bubbles: true })); });
    expect(host.textContent).not.toContain("PAUSED");
  });

  it("supports touch controls, restarts with R and exits with Escape", async () => {
    const up = host.querySelector('[aria-label="Move up"]') as HTMLButtonElement;
    expect(up).toBeTruthy();
    await act(async () => { up.click(); });
    await act(async () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "r", bubbles: true })); });
    expect(host.textContent).toContain("SCORE");
    await act(async () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(exit).toHaveBeenCalledWith(0);
  });

  it("lets a touch visitor leave without needing a keyboard", async () => {
    const button = host.querySelector('[aria-label="Exit Snake game"]') as HTMLButtonElement;
    await act(async () => { button.click(); });
    expect(exit).toHaveBeenCalledWith(0);
  });
});
