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

## Terminal-first clear-screen release — 2026-11-18

- Requested outcome: the homepage itself is a terminal, not a marketing hero with a terminal widget.
- New opening state: full-window CV CLI, name and role, plus a Bash experience question.
- First non-empty typed input, Tab completion or guided command click dismisses the startup banner and onboarding text immediately; typed input and focus are preserved.
- In guided mode, click-to-run command cards collapse on the first command and can be reopened using a compact **Commands** toggle. In expert mode only a prompt and minimal help remain.
- Command outputs append as terminal history; `cv clear` and Ctrl+L clear history while keeping the session open.
- CV-only command parser and routes `/resume/`, `/cv.html`, `/resume.pdf` remain unchanged. No real shell or backend.
- Code PR: https://github.com/Agentic-Trust-Foundation/personal-portfolio/pull/2; merged code SHA `e79469a489bd0d734abe60554c5f2815b5d0db1b`.
- GitHub Actions run `44370558933`: SUCCESS, unit and interaction tests (22 total), lint, static build and PDF output checks.
- Vercel production deployment `dpl_5E9N1mv4daQ69gxipkWBL9iaTVPk`: READY on `https://personal-portfolio-ardindokhts-projects.vercel.app`.
- HTTP verified `/`, `/resume/`, `/resume.pdf`, `/cv.html`: all HTTP 200; homepage includes terminal onboarding and no legacy marketing hero.
- Browser UX: automated component tests cover the first typed character, focus preservation, guided click clearing, palette reopening and `cv clear`; final human visual review remains a normal design-iteration step.

## Small CV and terminal refinement — 2026-11-18

- Canonical training and static HTML now use **DevSecOps Training (2026)**; the longer "final session Nov 20" text is intentionally removed.
- The checked-in A4 PDF was updated at the original text location using Open Sans Bold; a one-off CI run verified it remains two pages and the new label is searchable while the old label is absent.
- Terminal startup collapse increased from 580 ms to 1080 ms; prompt scrolling now uses a paced 1220 ms animation rather than browser-dependent native smooth timing. A short initial delay improves the transition and prefers-reduced-motion remains respected.
- The one-time PDF refresh workflow is removed after producing the asset, so normal lightweight portfolio CI remains the standard gate.
- Production release status must be recorded only after main CI and Vercel production verification.

## Oneko cursor companion — 2026-11-19 (pending release verification)

- Commands: `cv play oneko` turns on, `cv play oneko off` turns off. Listed under `cv help` Bonus beside Snake; never added to the main guided CV command menu.
- A pixel cat follows the mouse anywhere on this **website**, not only in the terminal. The original `oneko.gif` sprite and directional frame offsets are attributed to adryd325/oneko.js (MIT, full license at `licenses/oneko-js-MIT.txt`). The mouse-pointer SVG is newly drawn for this portfolio.
- Global Next.js layout mounts the client companion on the homepage and on `/resume/`, using `sessionStorage` to preserve activation within the same browser tab. It does not track activity, contact any backend, or operate outside this domain.
- Transparent pet overlay uses `pointer-events:none`; visible dismiss button or `cv play oneko off` restores the original cursor. Text inputs retain an I-beam cursor.
- Motion is disabled for touch-only and prefers-reduced-motion environments and while the full-screen Snake game is open.
- Add release SHA, GitHub Actions evidence, Vercel Preview and HTTP checks only after those steps actually pass.

## Terminal title back navigation — 2026-11-19

- The header path `hossein@cv: ~` (or `~/snake`) is now a keyboard-accessible back button with a subtle left arrow, hover/focus styling, and a descriptive label.
- Clicking returns to the original Bash-experience question within the current page: resets CLI mode, command transcript/history, prompt, guided panel and game mode; scrolls the terminal to the top and focuses the question. No forced browser reload.
- Current Dark/Light preference and site-wide optional Oneko companion stay active, while CV HTML/PDF and command syntax remain unchanged.
- Re-entering the intro uses a brief reveal animation that respects `prefers-reduced-motion`.
- New regression tests cover return from an expert session and from the immersive Snake game. Production deployment must be confirmed against CI and Vercel before marking this release complete.

## AI Ops Playground preview — 2026-11-19

**Isolation / rollback gate**
- Production and preserved backup remain at `6f2ea945ad1f2778ed26fd231c64ba73a863a683` (release after PR #9), with confirmed Vercel READY deployment `dpl_ASwQwaEGyFkTE5yKbzHoiAY9avqq`.
- Feature work lives only on `feat/ai-ops-desktop-preview` (PR #10); do not merge to `main` without owner visual acceptance.
- The original CV Terminal, guided mode, typed commands, color theme, Oneko, Snake and two-page static PDF are still present and test-covered.

**Implemented in preview**
- Full-screen compact AI Ops desktop, revealed by terminal yellow Minimize control; green control toggles maximize, red is non-destructive; Restore via desktop Dock.
- Synthetic observability dashboard, 3-node Kubernetes topology with autoscaling, and deterministic 5-stage CI/CD rolling update.
- An agent-like panel accepts limited English and Persian lab instructions. By default, all actions are computed locally and cost $0. Data are clearly labeled DEMO/SIMULATED.
- Optional Cloudflare Workers AI code prepared in an isolated, disabled-by-default directory. It may be enabled only after verified Workers Free account and exact origin setup. No tokens, keys, Cloudflare account actions or paid service are used.

**Evidence and unresolved gates**
- CI: Vitest, ESLint, Next.js static export and PDF integrity required on PR head; record link and count once verified.
- Vercel PR Preview: require READY and HTTP checks for `/`, `/resume/`, `/resume.pdf`.
- Desktop visual/browser QA (especially minimize/restore on mobile) remains independent of unit tests and HTTP checks; obtain owner's feedback before any production release.
- Cloudflare Workers AI: NOT DEPLOYED, NOT CONNECTED, NOT REQUESTED TO INFER. Verify Free plan manually and only enable after explicit separate approval.
