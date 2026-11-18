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
```

No OS command works: `bash`, `ls`, `cat`, `sudo`, etc. are rejected in `lib/commands.ts`. Input is rendered as React text; no command is executed in the host environment.

## Run and validate

Requires Node.js 22+ and pnpm (lockfile pinned to upstream dependencies).

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm lint
pnpm build
```

`pnpm build` generates a **fully static `out/`** directory for deployment.

## Vercel

1. Import the **Agentic-Trust-Foundation/personal-portfolio** repository into a Vercel project with Git integration.
2. Framework: Next.js. Build command: `pnpm build`. Install: `pnpm install --frozen-lockfile`.
3. Deploy `main` as the production branch; previews can use pull requests. No environment variables are required.
4. Before promoting publicly, verify the PDF, names, dates, email and contact links.

No Vercel project or domain is implied by this repository; the live URL is recorded only when actually deployed.

## Edit content

- `content/profile.ts` — one source of truth for the resume, projects and commands.
- `lib/commands.ts` — strict command parser; do not connect to an OS shell.
- `components/terminal.tsx` — terminal interactions and guided/expert modes.
- `app/resume/page.tsx` — complete accessible HTML resume.
- `app/portfolio.css` — responsive styling.
- `public/resume.pdf` — distributable PDF. Regenerate whenever the profile changes.

See [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md) for implementation checklist, release gates, and unresolved verification.

## License and attribution

Original template (c) 2026 Umer Farooq, MIT. License is preserved in [LICENSE](LICENSE). Adaptations are for Hossein's personal portfolio.
