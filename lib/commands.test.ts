import { describe, expect, it } from "vitest";
import { ALLOWED_COMMANDS, GUIDED_COMMANDS, GUIDED_EXTRA_COMMANDS, executeCommand } from "./commands";
import { profile } from "../content/profile";

describe("CV-only terminal commands", () => {
  it("keeps the Snake Easter egg off the normal help and guided commands", () => {
    const help = executeCommand("cv help");
    expect(help.lines.join(" ")).toContain("BONUS / TAKE A BREAK");
    expect(help.lines.join(" ")).toContain("cv play snake");
    expect(GUIDED_COMMANDS.some((item) => item.command === "cv play snake")).toBe(false);
    expect(GUIDED_EXTRA_COMMANDS.some((item) => item.command === "cv play snake")).toBe(false);
    expect(ALLOWED_COMMANDS).toContain("cv play snake");
  });
  it("allows only the exact Snake command, never arbitrary game or OS commands", () => {
    expect(executeCommand("cv play snake").type).toBe("game");
    expect(executeCommand(" CV  PLAY  SNAKE ").type).toBe("game");
    for (const invalid of ["snake", "cv play", "cv play minesweeper", "cv play snake --exec", "cv play snake; ls"]) {
      expect(executeCommand(invalid).type).toBe("error");
    }
  });
  it("lists German at Basic level and keeps DevSecOps training current", () => {
    const languages = executeCommand("cv languages");
    expect(languages.lines.join(" ")).toContain("German — Basic");
    expect(languages.lines.join(" ")).not.toContain("French");
    expect(executeCommand("cv certs").lines.join(" ")).toContain("DevSecOps Training (2026)");
  });
  it("shows an actionable help reference", () => {
    const help = executeCommand("cv help");
    expect(help.type).toBe("output");
    expect(help.lines.join(" ")).toContain("cv work");
    expect(help.lines.join(" ")).toContain("cv download");
    expect(help.lines.join(" ")).not.toContain("--docx");
  });
  it("lists the completed-year DevSecOps training without a future session date", () => {
    const certs = executeCommand("cv certs").lines.join(" ");
    expect(certs).toContain("DevSecOps Training (2026)");
    expect(certs).not.toContain("final session Nov 20");
  });
  it("accepts cv skill and cv skills as aliases", () => {
    expect(executeCommand("cv skill")).toEqual(executeCommand("cv skills"));
    expect(executeCommand("cv skill -v")).toEqual(executeCommand("cv skills -v"));
  });
  it("accepts and normalizes whitespace and case", () => {
    const a = executeCommand(" CV   WoRk   -V ");
    expect(a.type).toBe("output");
    expect(a.lines.join(" ")).toContain("Apache Fineract");
  });
  it("rejects all non-cv system commands", () => {
    for (const input of ["ls", "sudo su", "cat /etc/passwd", "bash", "curl example.com", "whoami", "rm -rf /", "npm run dev"]) {
      expect(executeCommand(input).type).toBe("error");
    }
  });
  it("rejects arguments and shell-like suffixes that are not explicitly supported", () => {
    for (const input of ["cv help; ls", "cv work && whoami", "cv skills --execute", "cv download --docx", "cv projects atlas | cat", "cv exec"]) {
      expect(executeCommand(input).type).toBe("error");
    }
  });
  it("returns concise and verbose work experience", () => {
    const summary = executeCommand("cv work");
    const verbose = executeCommand("cv work -v");
    expect(summary.lines).toHaveLength(profile.experience.length);
    expect(verbose.lines.length).toBeGreaterThan(summary.lines.length);
    expect(verbose.lines.join(" ")).toContain("Apache Fineract");
  });
  it("filters a company by safe, known slug", () => {
    const detail = executeCommand("cv work --company algoritm");
    expect(detail.type).toBe("output");
    expect(detail.lines.join(" ")).toContain("Algoritm");
    expect(executeCommand("cv work --company unknown").type).toBe("error");
  });
  it("supports named projects and -v", () => {
    for (const id of ["agentwallet", "atlas", "kuhban"]) {
      const result = executeCommand(`cv projects ${id} -v`);
      expect(result.type).toBe("output");
      expect(result.lines.join(" ")).toContain("In development");
    }
    expect(executeCommand("cv projects fake -v").type).toBe("error");
  });
  it("downloads only the static PDF", () => {
    const pdf = executeCommand("cv download");
    expect(pdf.type).toBe("download");
    expect(pdf.link?.href).toBe("/resume.pdf");
    expect(pdf.link?.download).toBe(true);
  });
  it("offers a normal web resume and clear command", () => {
    expect(executeCommand("cv resume").link?.href).toBe("/resume");
    expect(executeCommand("cv clear").type).toBe("clear");
  });
  it("keeps guided actions within the approved command list", () => {
    const allowed = new Set<string>(ALLOWED_COMMANDS);
    for (const action of [...GUIDED_COMMANDS, ...GUIDED_EXTRA_COMMANDS]) {
      expect(allowed.has(action.command)).toBe(true);
      expect(executeCommand(action.command).type).not.toBe("error");
    }
  });
  it("does not interpret untrusted input as HTML", () => {
    const r = executeCommand("cv about <img src=x onerror=alert(1)>");
    expect(r.type).toBe("error");
    // UI renders each output line as React text, not dangerouslySetInnerHTML.
  });
});
