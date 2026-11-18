#!/usr/bin/env node
/**
 * Generate the downloadable, searchable A4 PDF from content/profile.json.
 * Build-time only. Uses built-in Node APIs; no backend, browser print dialog,
 * credentials, tracking, or third-party PDF service.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const cv = JSON.parse(readFileSync(join(root, "content/profile.json"), "utf8"));
const PAGE_W = 595.28, PAGE_H = 841.89, LEFT = 45, RIGHT = 550;
const BOTTOM = 53;
const pages = [];
let current;

function ascii(s) {
  return String(s)
    .replaceAll("—", " - ").replaceAll("–", "-")
    .replaceAll("·", " / ").replaceAll("•", "-")
    .replaceAll("’", "'").replaceAll("“", '"').replaceAll("”", '"')
    .replaceAll("→", "->").replaceAll("↗", "^")
    .normalize("NFKD").replace(/[^\x20-\x7e]/g, "");
}
function escaped(s) {
  return ascii(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
function newPage() {
  current = { y: 787, commands: [] };
  pages.push(current);
}
function draw(text, { x = LEFT, size = 8.4, height = 12.4, bold = false, color = "0.14 0.20 0.25", indent = 0 } = {}) {
  if (current.y < BOTTOM + height) newPage();
  current.commands.push(`${color} rg BT /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x + indent} ${current.y.toFixed(1)} Tm (${escaped(text)}) Tj ET`);
  current.y -= height;
}
function spacer(size = 7) { current.y -= size; }
function rule() {
  const y = current.y;
  current.commands.push(`0.35 0.60 0.47 RG 0.9 w ${LEFT} ${y.toFixed(1)} m ${RIGHT} ${y.toFixed(1)} l S`);
  current.y -= 12;
}
function wrap(text, width = 500, fontSize = 8.4) {
  const limit = Math.max(16, Math.floor(width / (fontSize * 0.535)));
  const words = ascii(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (line.length + word.length + (line ? 1 : 0) > limit && line) {
      lines.push(line);
      line = word;
    } else {
      line += (line ? " " : "") + word;
    }
  }
  if (line) lines.push(line);
  return lines;
}
function paragraph(text, { indent = 0, size = 8.4, lineHeight = 12.2, color } = {}) {
  const width = RIGHT - LEFT - indent;
  for (const line of wrap(text, width, size)) draw(line, { indent, size, height: lineHeight, color: color || "0.15 0.21 0.26" });
}
function label(text) {
  if (current.y < 100) newPage();
  spacer(8);
  draw(text.toUpperCase(), { size: 9.7, height: 18, bold: true, color: "0.08 0.39 0.28" });
}
function heading(text, subtext) {
  if (current.y < 120) newPage();
  draw(text, { size: 9.2, height: 13, bold: true, color: "0.08 0.17 0.21" });
  if (subtext) draw(subtext, { size: 8, height: 12, color: "0.32 0.40 0.45" });
}
function bullet(text) {
  paragraph("- " + text, { indent: 9, size: 8.15, lineHeight: 11.5 });
}
function job(item, full = true) {
  heading(item.title, item.company + " | " + item.dates + " | " + item.location);
  for (const sentence of (full ? item.bullets : item.bullets.slice(0, 2))) bullet(sentence);
  spacer(5);
}

newPage();
draw(cv.name, { size: 20, height: 27, bold: true, color: "0.08 0.17 0.21" });
draw(cv.role + " | API Management, Infrastructure & AI Systems", { size: 9.6, height: 16, color: "0.16 0.40 0.34" });
draw(cv.email + " | " + cv.phone + " | " + cv.location, { size: 8.2, height: 15 });
rule();
label("Profile");
paragraph(cv.introduction);
spacer(3);
paragraph(cv.direction);
label("Core skills");
for (const group of cv.skills) paragraph(group.title + ": " + group.items.join(", "), { size: 8.05, lineHeight: 11.3 });
label("Work experience");
for (const item of cv.experience.slice(0, 3)) job(item, true);

// Keep older roles and selected projects together on page two.
newPage();
label("Earlier experience");
for (const item of cv.experience.slice(3)) job(item, true);
label("Selected independent projects");
for (const item of cv.projects) {
  heading(item.name + " - " + item.title, item.status);
  paragraph(item.description, { size: 8.1, lineHeight: 11.4 });
  for (const sentence of item.bullets.slice(0, 2)) bullet(sentence);
  spacer(5);
}
label("Education");
for (const item of cv.education) {
  heading(item.title, item.school + " | " + item.dates + " | " + item.location);
  spacer(2);
}
label("Training & certificates");
for (const item of cv.training) draw("- " + item, { size: 8.1, height: 11.3 });
label("Languages");
draw(cv.languages.map((item) => item.name + ": " + item.level).join(" | "), { size: 8.0, height: 12 });

if (pages.length !== 2) {
  throw new Error("Expected a readable two-page PDF, got " + pages.length + " pages. Revisit PDF spacing and content.");
}
pages.forEach((page, index) => {
  page.commands.push(`0.47 0.53 0.56 rg BT /F1 7 Tf 1 0 0 1 ${LEFT} 30 Tm (HOSSEIN MOHAMMAD DOKHT - CV) Tj ET`);
  page.commands.push(`0.47 0.53 0.56 rg BT /F1 7 Tf 1 0 0 1 517 30 Tm (${index + 1} / ${pages.length}) Tj ET`);
});

const obj = [];
obj[1] = "<< /Type /Catalog /Pages 2 0 R >>";
obj[2] = `<< /Type /Pages /Kids [${pages.map((_, i) => `${5 + i * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`;
obj[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
obj[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
for (let i = 0; i < pages.length; i++) {
  const pageId = 5 + i * 2, streamId = pageId + 1;
  const stream = pages[i].commands.join("\n") + "\n";
  obj[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamId} 0 R >>`;
  obj[streamId] = `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}endstream`;
}
const header = "%PDF-1.4\n%Static CV\n";
let pdf = header;
const offsets = [0];
for (let id = 1; id < obj.length; id++) {
  offsets[id] = Buffer.byteLength(pdf, "ascii");
  pdf += `${id} 0 obj\n${obj[id]}\nendobj\n`;
}
const xrefAt = Buffer.byteLength(pdf, "ascii");
pdf += `xref\n0 ${obj.length}\n0000000000 65535 f \n`;
for (let id = 1; id < obj.length; id++) pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
pdf += `trailer\n<< /Size ${obj.length} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
mkdirSync(join(root, "public"), { recursive: true });
const destination = join(root, "public", "resume.pdf");
writeFileSync(destination, Buffer.from(pdf, "ascii"));
console.log(`PDF_READY pages=${pages.length} bytes=${Buffer.byteLength(pdf, "ascii")} path=public/resume.pdf`);
