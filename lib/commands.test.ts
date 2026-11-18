import { describe, expect, it } from "vitest";
import { ALLOWED_COMMANDS, GUIDED_COMMANDS, GUIDED_EXTRA_COMMANDS, executeCommand } from "./commands";
import { profile } from "../content/profile";

describe("CV-only terminal commands", () => {
  it("shows an actionable help reference", () => {
    const help = executeCommand("cv help");
    expect(help.type).toBe("output");
    expect(help.lines.join(" ")).toContain("cv work");
    expect(help.lines.join(" ")).toContain("cv download");
    expect(help.lines.join(" ")).not.toContain("--docx");
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
