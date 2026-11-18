import { profile, type Experience, type Project } from "@/content/profile";

/**
 * A deliberately limited CV command language.
 * This is never a shell or a bridge to the host OS. No eval, child processes,
 * networking, filesystem access, or free-form code execution is involved.
 */
export interface CommandResult {
  type: "output" | "download" | "clear" | "error";
  title?: string;
  lines: string[];
  suggestions?: string[];
  link?: { href: string; label: string; download?: boolean };
}

export const ALLOWED_COMMANDS = [
  "cv", "cv help", "cv about", "cv skills", "cv skills -v",
  "cv work", "cv work -v", "cv work --company algoritm",
  "cv projects", "cv projects agentwallet", "cv projects atlas",
  "cv projects kuhban", "cv education", "cv certs", "cv languages",
  "cv contact", "cv resume", "cv download", "cv clear",
] as const;

export const GUIDED_COMMANDS = [
  { label: "About me", command: "cv about" },
  { label: "Skills", command: "cv skills" },
  { label: "Work history", command: "cv work" },
  { label: "Work details", command: "cv work -v" },
  { label: "Projects", command: "cv projects" },
  { label: "Education", command: "cv education" },
  { label: "Contact", command: "cv contact" },
  { label: "Download PDF", command: "cv download" },
] as const;

function output(title: string, lines: string[], suggestions?: string[]): CommandResult {
  return { type: "output", title, lines, suggestions };
}
function error(message: string): CommandResult {
  return { type: "error", title: "Command not available", lines: [message, "Type cv help to see the supported commands."] };
}
function briefWork(job: Experience): string {
  return `${job.dates}  |  ${job.title}  |  ${job.company}`;
}
function detailWork(job: Experience): string[] {
  return [
    `${job.title} — ${job.company}`,
    `${job.dates} · ${job.location}`,
    ...job.bullets.map((bullet) => `• ${bullet}`),
  ];
}
function detailProject(project: Project, verbose: boolean): string[] {
  return [
    `${project.name} — ${project.title}`,
    `Status: ${project.status}`,
    project.description,
    ...(verbose ? project.bullets.map((bullet) => `• ${bullet}`) : []),
    ...(verbose ? [`Focus: ${project.tags.join(" · ")}`] : []),
  ];
}

export function executeCommand(input: string): CommandResult {
  // Allow extra whitespace but only our explicit grammar.
  const raw = input.trim().replace(/\s+/g, " ");
  const tokens = raw.toLowerCase().split(" ");
  if (!raw || tokens[0] !== "cv") return error("This is a CV interface, not a system shell.");
  const verb = tokens[1] ?? "help";
  const rest = tokens.slice(2);
  const verbose = rest.length === 1 && rest[0] === "-v";
  const noArgs = rest.length === 0;

  if ((verb === "help" || verb === "--help") && noArgs) {
    return output("Available CV commands", [
      "cv about                   About me",
      "cv skills       [-v]        Skills / full skill list",
      "cv work         [-v]        Work experience / detailed responsibilities",
      "cv work --company <name>    One employer (algoritm, mobtakeran, etc.)",
      "cv projects                 Personal projects",
      "cv projects <name> [-v]     One project (agentwallet, atlas, kuhban)",
      "cv education                Education",
      "cv certs                    Training and courses",
      "cv languages                Spoken languages",
      "cv contact                  Contact information",
      "cv resume                   View the full CV page",
      "cv download                 Download CV as PDF",
      "cv clear                    Clear terminal history",
      "",
      "Only cv commands work here. Tab completes a command; ↑ / ↓ browse history.",
    ], ["cv about", "cv skills", "cv work", "cv projects"]);
  }
  if (verb === "about" && noArgs) {
    return output(profile.name, [profile.role + " | " + profile.focus, "", profile.introduction, "", profile.direction], ["cv work", "cv projects"]);
  }
  if (verb === "skills" && (noArgs || verbose)) {
    return output("Technical skills", profile.skills.map((group) =>
      verbose ? `${group.title}\n  ${group.items.join(" · ")}` : `${group.title}: ${group.items.slice(0, 4).join(" · ")}`
    ), verbose ? ["cv work -v"] : ["cv skills -v", "cv work"]);
  }
  if (verb === "work") {
    if (noArgs) return output("Work experience", profile.experience.map(briefWork), ["cv work -v"]);
    if (verbose) return output("Work experience — details", profile.experience.flatMap((job, i) => [
      ...(i > 0 ? [""] : []), ...detailWork(job),
    ]));
    if (rest.length === 2 && rest[0] === "--company") {
      const match = profile.experience.find((job) =>
        job.id === rest[1] || job.company.toLowerCase().includes(rest[1])
      );
      return match
        ? output("Work / " + match.company, detailWork(match))
        : error("Unknown employer. Try cv work for the list.");
    }
    return error("Use cv work, cv work -v, or cv work --company <name>.");
  }
  if (verb === "projects") {
    if (noArgs) return output("Selected projects", profile.projects.map((p) =>
      `${p.name}  [${p.status}]\n  ${p.short}`
    ), profile.projects.map((p) => `cv projects ${p.id} -v`));
    const project = profile.projects.find((p) => p.id === rest[0]);
    if (!project || rest.length > 2 || (rest.length === 2 && rest[1] !== "-v")) {
      return error("Choose agentwallet, atlas or kuhban. Example: cv projects atlas -v.");
    }
    return output("Project / " + project.name, detailProject(project, rest[1] === "-v"),
      rest[1] === "-v" ? undefined : [`cv projects ${project.id} -v`]);
  }
  if (verb === "education" && noArgs) {
    return output("Education", profile.education.map((e) => `${e.title}\n  ${e.school} | ${e.dates} | ${e.location}`));
  }
  if (verb === "certs" && noArgs) {
    return output("Training & certificates", [...profile.training]);
  }
  if (verb === "languages" && noArgs) {
    return output("Languages", profile.languages.map((lang) => `${lang.name} — ${lang.level}`));
  }
  if (verb === "contact" && noArgs) {
    return output("Contact", [
      `Email: ${profile.email}`, `LinkedIn: ${profile.linkedinUrl}`,
      `GitHub: ${profile.githubUrl}`, `Location: ${profile.location}`,
    ], undefined);
  }
  if (verb === "resume" && noArgs) return {
    ...output("Full resume", ["Open the accessible, readable web version of my CV."]),
    link: { href: "/resume", label: "Open resume" },
  };
  if (verb === "download" && noArgs) return {
    type: "download", title: "Download CV",
    lines: ["Starting PDF download. You can also use the direct link below."],
    link: { href: "/resume.pdf", label: "Download resume.pdf", download: true },
  };
  if (verb === "clear" && noArgs) return { type: "clear", lines: [] };
  return error("Unsupported cv command or arguments.");
}
