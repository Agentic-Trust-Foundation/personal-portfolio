import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import Terminal from "./terminal";

describe("CV terminal visitor flows", () => {
  let root: Root;
  let host: HTMLDivElement;

  beforeEach(async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => { root.render(<Terminal />); });
  });

  afterEach(async () => {
    await act(async () => { root.unmount(); });
    host.remove();
  });

  function findButton(label: string): HTMLButtonElement {
    const button = [...host.querySelectorAll("button")].find((node) => node.textContent?.includes(label));
    if (!button) throw new Error("Could not find button: " + label);
    return button;
  }

  it("asks new visitors about their terminal experience", () => {
    expect(host.textContent).toContain("Have you used Bash or a terminal before?");
    expect(host.querySelector("#terminal-command")).toBeNull();
    expect(findButton("No, show me around")).toBeTruthy();
    expect(findButton("Yes, open terminal")).toBeTruthy();
  });

  it("lets a beginner click commands to see detailed real CV data", async () => {
    await act(async () => { findButton("No, show me around").click(); });
    expect(host.textContent).toContain("GUIDED MODE");
    expect(findButton("cv work -v")).toBeTruthy();
    await act(async () => { findButton("cv work -v").click(); });
    expect(host.textContent).toContain("Apache Fineract");
    expect(host.textContent).toContain("Mobtakeran");
  });

  it("opens a clean terminal for experienced visitors", async () => {
    await act(async () => { findButton("Yes, open terminal").click(); });
    expect(host.textContent).toContain("TERMINAL MODE");
    expect(host.textContent).toContain("cv help");
    expect(host.querySelector("#terminal-command")).toBeTruthy();
    expect([...host.querySelectorAll("button")].some((b) => b.title === "cv work -v")).toBe(false);
    await act(async () => { findButton("Switch mode").click(); });
    expect(host.textContent).toContain("GUIDED MODE");
  });
});
