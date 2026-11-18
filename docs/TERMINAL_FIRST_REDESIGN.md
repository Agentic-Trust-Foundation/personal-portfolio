# Terminal-first homepage redesign

This patch is deliberately scoped to the personal portfolio's homepage and adds no backend.

## Reason
The previous design positioned an interactive CV widget below a traditional marketing hero. It looked like a conventional portfolio with a terminal component, rather than a terminal portfolio.

## UX requirements

- The first viewport **is** a terminal window. No promotional hero before the prompt.
- Ask whether the visitor has used Bash / a terminal before, as the first interaction.
- Expert mode shows a simple CLI instruction: `cv help`, a real command prompt, and no guided command cards.
- Guided mode offers clickable command cards and the same prompt; both paths share `executeCommand` from `lib/commands.ts`.
- No other shell commands are enabled. Unexpected input is handled by the existing CV-only parser.
- Tab completion, Up/Down command history, Ctrl+L, live command output, responsive layout, keyboard accessibility.
- Persist no personal state, no analytics, no network requests, no shell execution.
- Always expose formatted CV and PDF links outside the CLI flow.
- Preserve /resume/ (Novorésumé style) and /resume.pdf byte-for-byte.

## Files

- `app/page.tsx` replaces the marketing homepage with `CvShell`.
- `components/cv-shell.tsx` contains the two-mode terminal UI and input handling.
- `app/terminal-home.css` defines the immersive terminal styling, scoped to `.cvcli-` only.
- `components/cv-shell.test.tsx` covers onboarding, expert, guided, and PDF link behavior.

## Checks before production

1. `pnpm test`, `pnpm lint`, and `pnpm build`.
2. Browser check at desktop 1440px and mobile 390px, both modes, keyboard and PDF link.
3. GitHub PR preview from Vercel.
4. Merge only after CI passes and previews are acceptable.
5. Production smoke-check `/`, `/resume/`, and `/resume.pdf`.

The uploaded PDF and Novorésumé layout are unrelated to this change.

## Immersive session behavior (follow-up change)

- The initial name/role banner and Bash onboarding are shown only before the first command interaction.
- On the first typed non-space character (or Tab-completed input), clear the startup/intro screen immediately without losing typed text or focus.
- A guided-mode command button has the same effect when clicked. After execution, the history/output/prompt remain, but the intro and large command cards disappear.
- Guided users retain a small **+ Commands** toggle that reopens the palette on request; choosing a command closes it again.
- Later commands append output normally; only explicit `cv clear` or Ctrl+L removes history.
- CV and PDF links remain available in the window top bar, and switching modes is available from the status bar.
- No backend, OS command or non-`cv` commands are permitted.
