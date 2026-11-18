# P.CV-inspired color palette and terminal motion

Scope: **Homepage only** (`app/terminal-home.css` and `components/cv-shell.tsx`).
The approved Novorésumé-style `/resume/` and `/resume.pdf` are deliberately untouched.

## Behavior

- **Dark (default):** sampled from the provided screenshot: `#181820` (RGB 24,24,32). Neutral, mostly monochrome text and UI controls replace the previous teal/green terminal palette.
- **Light (optional):** warm off-white background (`#f4f4f2`), near-white panel, charcoal text. Light/Dark toggle lives in the terminal title bar and is keyboard-accessible.
- A chosen theme is remembered in `localStorage` under `hossein-cv-terminal-theme` when storage is available. If storage is blocked, the toggle still works for the current visit.
- **Selecting Terminal Mode** smoothly moves the inner terminal scroll toward the input prompt; the mode information and prompt fade/slide in rather than appearing in one frame.
- **Selecting Guided Mode** scrolls smoothly toward the clickable commands without opening the mobile software keyboard.
- **First typed character or guided command** starts the terminal session. The splash content stays in the DOM for a 580 ms opacity/height collapse; the prompt and output remain available immediately.
- Subsequent commands scroll within the terminal, not the entire browser page, with native `scrollTo({behavior: 'smooth'})`.
- `prefers-reduced-motion: reduce` switches to nonanimated behavior.
- `cv clear`, Ctrl+L, completion and history, the command allowlist and no-shell security model remain unchanged.

## Files

- `components/cv-shell.tsx`: dark/light theme state, storage, smooth inner-terminal scroll, and transition state.
- `app/terminal-home.css`: monochrome design tokens, light overrides, startup collapse/entrance animation, reduced-motion rules.
- `components/cv-shell.test.tsx`: React tests for mode selection, clear, theme, and animated transition.
- `demo.html`: standalone *simulated* interactive preview. It does not use the real CV command parser and should not be deployed as the application.
- `changes.patch`: normal `git apply` patch made against the prior immersive-terminal patch (`Hossein_Terminal_Immersive_ClearScreen_Update.zip`).

## Verification performed here

- TypeScript/JSX syntax transpilation diagnostics: **0**.
- Chromium visual checks at desktop `1440×900`, tablet `768×1024`, mobile `390×844` and narrow mobile `320×720`.
- Background color matches `rgb(24, 24, 32)`; Light Mode has `rgb(244,244,242)`.
- No horizontal overflow across checked sizes.
- Smooth mode-enter opacity observed between start and completion; splash height decreases during transition.
- Reduced-motion path ends directly in active state.

**Not verified in this environment:** actual Next.js build, full Vitest/ESLint run, GitHub PR, and Vercel production deployment. This environment did not expose GitHub/Vercel app actions this turn; do not claim live site changed.

## Apply and deploy

Apply to `Agentic-Trust-Foundation/personal-portfolio` on a fresh feature branch. Check that the repository's existing immersive terminal matches the base patch before applying. Do not overwrite unrelated changes.

```bash
git apply --check changes.patch
git apply changes.patch
pnpm install --frozen-lockfile
pnpm test
pnpm lint
pnpm build
```

Open a PR; merge only after CI and browser checks. When GitHub-Vercel integration deploys, check `/` dark/light and smooth entry, and recheck `/resume/` and `/resume.pdf` (unchanged).
