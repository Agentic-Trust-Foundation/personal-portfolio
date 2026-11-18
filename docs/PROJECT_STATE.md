# Personal Portfolio — Project State

**Scope:** Agentic-Trust-Foundation/personal-portfolio (independent of the org's existing `portfolio` project)  
**Start:** 2026-11-18  
**Target:** Static Next.js + TypeScript, Vercel-ready, no backend.

## Decisions

- Use terminal-resume as an MIT-licensed starting point; adapt UI and command behavior.
- Ask visitors if they have used Bash; guided commands vs expert prompt.
- Strict `cv` command grammar. No OS commands, Bash, REPL, external CLI, or execution bridge.
- Downloads are PDF only (`cv download`), never DOCX.
- Source of truth is `content/profile.json`. Do not imply AI roadmap features are already live.
- Keep public HTML resume available for non-technical visitors and search engines.

## Implemented

- [x] New private repository initialized and MIT notice preserved
- [x] Central personal profile, skills, experience, projects and education
- [x] Strict CV command parser with verbose and project-specific commands
- [x] Interactive terminal with first-visit mode selection and guided buttons
- [x] Keyboard command history and Tab completion; accessible live output
- [x] Accessible normal resume page and responsive site design
- [x] Static export configuration, command unit tests, and guided/expert component interaction tests

## Release checks (do not claim complete until confirmed)

- [x] CI generated a two-page PDF, and static export integrity passed (`out/resume.pdf`, 11,864 bytes); browser download still pending live QA
- [x] GitHub Actions: unit/interaction tests, lint, TypeScript, static Next.js build and PDF checks all PASS
- [ ] Browser QA (mobile + desktop, keyboard and download)
- [ ] Vercel Git integration, preview deploy, smoke test and live URL
- [ ] Verify any personal contact links and Algoritm end month
- [ ] Verify display behavior of multi-page PDF on actual printers

## Safety / deployment

GitHub repository is currently private. The Vercel connector's Git context returned no available teams on the initial check, so deployment **must not** be reported as live until a connected team and successful build/deployment are confirmed. No domain is assumed.

## Next actions

Confirm Vercel team authorization, connect the Git repository when approved, deploy and inspect desktop/mobile and PDF downloading. Confirm contact links and exact Algoritm end date before public promotion.

## Latest verified code

- Latest tested code commit: `ad605a2a4f4654523897752323235c3e93217f56` (correct verbose project autocomplete whitelist)
- GitHub Actions run `44311730444`: success; includes unit, interaction, lint, build and PDF file checks
- Vercel team scope `ardindokhts-projects` returned 403 and requires user approval; a one-time authorization link was provided in the chat

## Vercel deployment evidence (2026-11-18)

- Vercel team: `ardindokhts-projects` (`team_KAa2ShlJnmtzDwULWnY9jH0l`)
- Project: `personal-portfolio` (`prj_ZGTn1kWoqIGGBCNMc9bgfZmLNHhV`)
- Initial Next.js build failed only because of Vercel framework/output-directory conflict; framework set to null and output `out` for static export.
- First successful static deployment: `dpl_BmHNJrC18xLnFcnLLb2StatvuoDE` (READY).
- Production deployment: `dpl_5vV6hvW6EH5vPW2cYWC5esPSi6XV` (READY), https://personal-portfolio-ardindokhts-projects.vercel.app
- Vercel fetched `/`, `/resume/`, and `/resume.pdf`: each 200; PDF starts `%PDF-1.4` and has two pages.
- Vercel Authentication now applies to Preview only; Production public exposure is intentional for a personal portfolio.
- **Git integration not yet active**: Vercel Git namespace is `Agentic-Trust-Foundation` but its Git provider reports `repo_not_found` for the private repository. Automatic deployment on GitHub pushes will need a Vercel GitHub installation grant to this repository. Direct source upload deployment works without that grant.
- Follow-up source adjustments for `cv skill` alias and accurate terminal wording must be redeployed to Production before release closure.
