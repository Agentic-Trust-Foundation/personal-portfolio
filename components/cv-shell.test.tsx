import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import CvShell from "./cv-shell";

let host: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => { root.render(<CvShell />); });
});

afterEach(async () => {
  await act(async () => { root.unmount(); });
  host.remove();
});

function click(label: string) {
  const button = [...host.querySelectorAll("button")].find((b) => b.textContent?.includes(label));
  if (!button) throw new Error("Missing button: " + label);
  return act(async () => { button.click(); });
}

describe("Terminal-first portfolio UX", () => {
  it("opens directly in a terminal and asks about Bash", () => {
    expect(host.querySelector(".cvcli-shell")).toBeTruthy();
    expect(host.textContent).toContain("Have you used Bash or a terminal before?");
    expect(host.textContent).toContain("$ cv");
    expect(host.querySelector("#cvcli-command")).toBeNull();
  });

  it("gives a beginner clickable commands with real CV output", async () => {
    await click("No, show me");
    expect(host.textContent).toContain("GUIDED MODE");
    expect(host.querySelectorAll(".cvcli-action").length).toBeGreaterThan(5);
    await click("Work details");
    expect(host.textContent).toContain("Apache Fineract");
    expect(host.textContent).toContain("Algoritm");
    // Running the first command clears the startup screen and collapses the cards.
    expect(host.querySelector(".cvcli-boot")).toBeNull();
    expect(host.querySelector(".cvcli-session")).toBeNull();
    expect(host.querySelector(".cvcli-guided")).toBeNull();
    expect(host.textContent).toContain("ACTIVE SESSION");
    // A beginner can still reopen the palette and choose another command.
    await click("Commands");
    await click("More commands");
    expect(host.textContent).toContain("AgentWallet");
    await click("Kuhban");
    expect(host.textContent).toContain("Kuhban");
    expect(host.querySelector(".cvcli-guided")).toBeNull();
    expect(host.querySelectorAll(".cvcli-turn")).toHaveLength(2);
  });

  it("gives an expert a real prompt with minimal help", async () => {
    await click("Yes, I have");
    expect(host.textContent).toContain("TERMINAL MODE");
    expect(host.textContent).toContain("cv help");
    expect(host.querySelector("#cvcli-command")).toBeTruthy();
    expect(host.querySelectorAll(".cvcli-action")).toHaveLength(0);
  });

  it("clears startup text on the first typed character, preserving the prompt", async () => {
    await click("Yes, I have");
    const input = host.querySelector("#cvcli-command") as HTMLInputElement;
    expect(input).toBeTruthy();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("HTMLInputElement.value setter not available");
    await act(async () => {
      setter.call(input, "cv");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(host.querySelector(".cvcli-boot")).toBeNull();
    expect(host.querySelector(".cvcli-session")).toBeNull();
    expect(input.value).toBe("cv");
    expect(document.activeElement).toBe(input);
    expect(host.querySelectorAll(".cvcli-action")).toHaveLength(0);
  });

  it("clears old command output without reintroducing the startup screen", async () => {
    await click("No, show me");
    await click("Work history");
    expect(host.querySelectorAll(".cvcli-turn")).toHaveLength(1);
    await click("Commands");
    await click("More commands");
    await click("Clear screen");
    expect(host.querySelectorAll(".cvcli-turn")).toHaveLength(0);
    expect(host.querySelector(".cvcli-boot")).toBeNull();
    expect(host.querySelector(".cvcli-session")).toBeNull();
    expect(host.querySelector("#cvcli-command")).toBeTruthy();
  });

  it("keeps formatted CV and PDF available before onboarding", () => {
    expect(host.querySelector('a[href="/resume/"]')).toBeTruthy();
    expect(host.querySelector('a[href="/resume.pdf"]')).toBeTruthy();
  });
});
