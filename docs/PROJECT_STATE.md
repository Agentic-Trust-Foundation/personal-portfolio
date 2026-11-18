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

## Production release verification — 2026-11-18

- **Current public URL:** https://personal-portfolio-ardindokhts-projects.vercel.app
- **Verified source commit:** `5ae2c89f25f337282d31513ef0a70dc963f62cd5`
- **CI:** https://github.com/Agentic-Trust-Foundation/personal-portfolio/actions/runs/44325150028 — SUCCESS (tests, lint, Next.js build, static PDF check).
- **Production Vercel deployment:** `dpl_3Hwb9vnysHEksaBF5uxKkezP1TaS` — READY; static export with Next.js framework auto-handler disabled and output directory `out`.
- **HTTP checks:** `/` 200 with onboarding question, `/resume/` 200 with work/projects, `/resume.pdf` 200 with PDF signature and two pages (11,864 bytes). Checks made against the stable production alias through Vercel.
- **Visitor access:** Vercel Authentication restricted to Preview; Production is intended for public visitors. Preview remains protected.
- **Command correction:** singular `cv skill` and `cv skill -v` aliases supported alongside plural `cv skills`.
- **Outstanding:** Vercel GitHub integration lists the organization but cannot see the private repo (`repo_not_found`). Direct source deployment succeeded, but pushes do **not** automatically deploy until the Vercel GitHub App receives repository access.
- **Outstanding:** Visual browser QA (desktop and phone) has not been demonstrated; component tests and HTTP tests are separate evidence. Confirm contact details and actual Algoritm end month before treating biography as fully verified.

## German CV update — 2026-11-18

- Prepared Novorésumé-like 2-page HTML/CSS and PDF from owner-provided HTML, with locally bundled SVG geometry (no editor scripts, trackers, or font binaries).
- German (Basic) replaces French in canonical data, web CV, static `cv.html`, PDF, and `cv languages` output. Persian/English unchanged.
- Headline remains `DevOps | API Management & AI Platform Engineer`; focus is `AI Systems & Agentic AI Platform Engineering`.
- DevSecOps listed as training in progress (`2026; final session Nov 20`), not an awarded certification.
- Home hero now emphasizes API Management / Platform Engineering / Agentic AI, not Infrastructure as a headline.
- Vercel Git integration is now linked to `Agentic-Trust-Foundation/personal-portfolio`, confirmed in Vercel deployment context. PR preview and CI must pass before merging to main.
- Future updates to `content/profile.json` require regenerating the tracked `public/cv.html` and `public/resume.pdf` by running `python scripts/render_resume.py --root . --html public/cv.html --pdf public/resume.pdf --previews .cv-render`. Vercel requires no Python backend.
