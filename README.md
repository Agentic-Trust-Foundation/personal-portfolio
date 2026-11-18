# Hossein Mohammaddokht — Interactive CV

A personal, content-first portfolio with a **CV-only command line** and a readable normal resume. Built on the structure and visual language of [Umer Farooq's terminal-resume](https://github.com/umeranjum17/terminal-resume), used under its MIT License (included in this repository).

## What this does

- Asks whether a visitor has used Bash before.
- **Guided mode:** click-to-run `cv` commands, no terminal knowledge required.
- **Terminal mode:** type `cv help`, use Tab to complete commands, ↑/↓ for history.
- Supports `cv work -v`, `cv skills -v`, individual projects, certifications, and contact information.
- Offers an accessible resume at `/resume/` and an actual static PDF at `/resume.pdf`.
- No backend, database, real shell, analytics, cookies, API keys, or runtime network access.

## Commands

```text
cv help
cv about
cv skills
cv skills -v
cv work
cv work -v
cv work --company algoritm
cv projects
cv projects agentwallet -v
cv projects atlas -v
cv projects kuhban -v
cv education
cv certs
cv languages
cv contact
cv resume
cv download
cv clear
cv play snake
cv play oneko
cv play oneko off
```

No OS command works: `bash`, `ls`, `cat`, `sudo`, etc. are rejected in `lib/commands.ts`. Input is rendered as React text; no command is executed in the host environment.

## Run and validate

Requires Node.js 22+ and pnpm (lockfile pinned to upstream dependencies).

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev        # local site with generated PDF
pnpm test
pnpm lint
pnpm build
```

`pnpm build` generates a **fully static `out/`** directory for deployment. The two-page styled PDF and self-contained HTML are checked in as `public/resume.pdf` and `public/cv.html`. Regenerate them from `content/profile.json` before changing CV content:

```bash
python scripts/render_resume.py --root . --html public/cv.html --pdf public/resume.pdf --previews .cv-render
```

The renderer uses Python Playwright/Chromium and PyMuPDF locally; Vercel only serves static files (no Python backend).

## Vercel

1. Import the **Agentic-Trust-Foundation/personal-portfolio** repository into a Vercel project with Git integration.
2. Framework: Next.js. Build command: `pnpm build`. Install: `pnpm install --frozen-lockfile`.
3. Deploy `main` as the production branch; previews can use pull requests. No environment variables are required.
4. Before promoting publicly, verify the PDF, names, dates, email and contact links.

Current GitHub CI validates unit and interaction tests, lint, static build and PDF integrity. Production URL: https://personal-portfolio-ardindokhts-projects.vercel.app (verify the current deploy and CV asset versions before announcing changes).

## Edit content

- `content/profile.json` — canonical source of truth for the terminal, resume page and generated PDF.
- `content/profile.ts` — typed access to the canonical resume model.
- `lib/commands.ts` — strict command parser; do not connect to an OS shell.
- `components/terminal.tsx` — terminal interactions and guided/expert modes.
- `app/resume/page.tsx` — complete accessible HTML resume.
- `app/portfolio.css` — responsive styling.
- `scripts/render_resume.py` — regenerates the Novorésumé-style `public/resume.pdf` and `public/cv.html` from canonical JSON on demand.

See [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md) for implementation checklist, release gates, and unresolved verification.

## License and attribution

Original template (c) 2026 Umer Farooq, MIT. License is preserved in [LICENSE](LICENSE). Adaptations are for Hossein's personal portfolio.

## Fun commands and Oneko attribution

The CV terminal offers two optional Bonus commands: `cv play snake` (in-terminal game mode) and `cv play oneko` (pixel cat follows the mouse across this portfolio). `cv play oneko off` or the tiny Oneko dismissal button disables it. The cat runs only in the browser, remembers activation for the current tab, uses no backend/network access, and respects reduced-motion settings. It cannot follow the cursor on unrelated websites; that would require a browser extension.

Cat spritesheet and sprite-frame references: **adryd325/oneko.js** (copyright © 2022 adryd, MIT). The sprite is stored locally at `public/oneko.gif` and the license notice is preserved at `licenses/oneko-js-MIT.txt`. The cursor mouse SVG is independently authored for this portfolio.
