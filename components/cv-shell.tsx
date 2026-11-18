"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { profile } from "@/content/profile";
import CvSnake from "./cv-snake";
import {
  ALLOWED_COMMANDS,
  GUIDED_COMMANDS,
  executeCommand,
  type CommandResult,
} from "@/lib/commands";

type ShellMode = "guided" | "expert";
type ColorTheme = "dark" | "light";
type TranscriptLine = {
  id: number;
  command: string;
  result: CommandResult;
};

const STARTUP_TRANSITION_MS = 1080;
const PROMPT_SCROLL_MS = 1220;
const THEME_KEY = "hossein-cv-terminal-theme";

const EXTENDED_COMMANDS = [
  { command: "cv skill -v", label: "All skills" },
  { command: "cv work --company algoritm", label: "API platforms role" },
  { command: "cv projects agentwallet -v", label: "AgentWallet" },
  { command: "cv projects atlas -v", label: "Atlas" },
  { command: "cv projects kuhban -v", label: "Kuhban" },
  { command: "cv education", label: "Education" },
  { command: "cv certs", label: "Training" },
  { command: "cv languages", label: "Languages" },
  { command: "cv contact", label: "Contact" },
  { command: "cv resume", label: "Full CV" },
  { command: "cv clear", label: "Clear screen" },
] as const;

// Client-side CV command vocabulary, not a shell. No OS commands are executed.
export default function CvShell() {
  const [mode, setMode] = useState<ShellMode | null>(null);
  const [theme, setTheme] = useState<ColorTheme>("dark");
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [snakeActive, setSnakeActive] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showMore, setShowMore] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [startupClosing, setStartupClosing] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [hint, setHint] = useState("");
  const promptRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const guidedRef = useRef<HTMLDivElement>(null);
  const snakeRef = useRef<HTMLDivElement>(null);
  const lineId = useRef(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollAnimationFrame = useRef<number | null>(null);

  // Keep the default dark appearance close to the supplied P.CV screenshot.
  // Remember an explicitly selected light theme without affecting the resume page.
  useEffect(() => {
    // Restore the visitor's preference after hydration; keep server markup stable.
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem(THEME_KEY);
        if (stored === "light" || stored === "dark") setTheme(stored);
      } catch {
        // Browsers with storage blocked still support the in-session toggle.
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      if (scrollAnimationFrame.current !== null) {
        window.cancelAnimationFrame(scrollAnimationFrame.current);
      }
    };
  }, []);

  const prefersReducedMotion = useCallback(() => {
    return typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const scrollTo = useCallback((target: "prompt" | "guide" | "game") => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    const anchor = target === "guide" ? guidedRef.current : target === "game" ? snakeRef.current : promptRef.current;
    if (!anchor) return;
    if (scrollAnimationFrame.current !== null) {
      window.cancelAnimationFrame(scrollAnimationFrame.current);
      scrollAnimationFrame.current = null;
    }
    // Keep recomputing the destination as the opening panel collapses; a
    // fixed end position would jump when the content height changes.
    const destination = () => {
      if (target === "prompt") return Math.max(0, viewport.scrollHeight - viewport.clientHeight);
      const viewportRect = viewport.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      return Math.max(0, viewport.scrollTop + anchorRect.top - viewportRect.top - 22);
    };
    if (prefersReducedMotion()) {
      viewport.scrollTo({ top: destination(), behavior: "auto" });
      return;
    }
    const origin = viewport.scrollTop;
    let elapsed = 0;
    let previousTime: number | null = null;
    const animate = (time: number) => {
      const delta = previousTime === null ? 16 : Math.min(50, Math.max(16, time - previousTime));
      previousTime = time;
      elapsed += delta;
      const progress = Math.min(1, elapsed / PROMPT_SCROLL_MS);
      const eased = progress * progress * (3 - 2 * progress);
      viewport.scrollTo({ top: origin + (destination() - origin) * eased, behavior: "auto" });
      if (progress < 1) scrollAnimationFrame.current = window.requestAnimationFrame(animate);
      else scrollAnimationFrame.current = null;
    };
    scrollAnimationFrame.current = window.requestAnimationFrame(animate);
  }, [prefersReducedMotion]);

  // Let the chosen mode appear before moving the scroll position. The scroll
  // itself uses a fixed, deliberately gentle duration rather than the
  // browser's usually faster built-in "smooth" timing.
  useEffect(() => {
    if (!mode) return;
    const timeout = window.setTimeout(() => {
      if (mode === "expert") promptRef.current?.focus({ preventScroll: true });
      scrollTo(mode === "expert" ? "prompt" : "guide");
    }, prefersReducedMotion() ? 0 : 220);
    return () => window.clearTimeout(timeout);
  }, [mode, scrollTo, prefersReducedMotion]);

  // Follow newly entered commands without restarting the animation every
  // frame while the splash closes.
  useEffect(() => {
    if (!mode || !sessionActive) return;
    const timeout = window.setTimeout(() => scrollTo(snakeActive ? "game" : "prompt"), prefersReducedMotion() ? 0 : 260);
    return () => window.clearTimeout(timeout);
  }, [mode, lines, sessionActive, showCommandPalette, snakeActive, scrollTo, prefersReducedMotion]);

  const beginSession = useCallback(() => {
    if (sessionActive) return;
    setSessionActive(true);
    setShowCommandPalette(false);
    setShowMore(false);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (prefersReducedMotion()) {
      setStartupClosing(false);
    } else {
      // Keep the splash mounted while its height and opacity animate away.
      setStartupClosing(true);
      closeTimer.current = setTimeout(() => {
        setStartupClosing(false);
        closeTimer.current = null;
      }, STARTUP_TRANSITION_MS);
    }
  }, [sessionActive, prefersReducedMotion]);

  const execute = useCallback((raw: string) => {
    const command = raw.trim().replace(/\s+/g, " ");
    if (!command) return;
    const result = executeCommand(command);
    beginSession();
    if (result.type === "game") setSnakeActive(true);
    setShowCommandPalette(false);
    setShowMore(false);
    setHistory((previous) => [...previous.slice(-79), command]);
    setHistoryIndex(-1);
    setHint("");
    setInput("");
    if (result.type === "clear") setLines([]);
    else setLines((previous) => [...previous.slice(-59), {
      id: ++lineId.current, command, result,
    }]);

    if (result.type === "download") {
      const anchor = document.createElement("a");
      anchor.href = "/resume.pdf";
      anchor.download = "Hossein-Mohammaddokht-CV.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }
    if (result.type !== "game") promptRef.current?.focus({ preventScroll: true });
  }, [beginSession]);

  const exitSnake = useCallback((score: number) => {
    setSnakeActive(false);
    setLines((previous) => [...previous.slice(-59), {
      id: ++lineId.current,
      command: "cv play snake · exit",
      result: { type: "output", title: "Back to CV", lines: ["Final score: " + score + " · Type cv help to continue."] },
    }]);
    window.requestAnimationFrame(() => promptRef.current?.focus({ preventScroll: true }));
  }, []);

  function chooseMode(nextMode: ShellMode) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
    setMode(nextMode);
    setSnakeActive(false);
    setLines([]);
    setHistoryIndex(-1);
    setInput("");
    setHint("");
    setShowMore(false);
    setSessionActive(false);
    setStartupClosing(false);
    setShowCommandPalette(false);
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try { window.localStorage.setItem(THEME_KEY, next); } catch { /* optional */ }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    execute(input);
  }

  function onInputChange(next: string) {
    setInput(next);
    setHint("");
    if (next.trim()) beginSession();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!history.length) return;
      const next = historyIndex < 0 ? history.length - 1 : Math.max(historyIndex - 1, 0);
      setHistoryIndex(next);
      setInput(history[next]);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (historyIndex < 0) return;
      const next = historyIndex + 1;
      setHistoryIndex(next < history.length ? next : -1);
      setInput(next < history.length ? history[next] : "");
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      const typed = input.trimStart().toLowerCase();
      const matches = ALLOWED_COMMANDS.filter((command) => command.startsWith(typed));
      if (!matches.length) {
        setHint("No match. Try cv help");
        return;
      }
      if (matches.length === 1) {
        onInputChange(matches[0]);
        setHint("");
        return;
      }
      let common: string = matches[0];
      for (const candidate of matches.slice(1)) {
        while (common && !candidate.startsWith(common)) common = common.slice(0, -1);
      }
      if (common.length > typed.length) onInputChange(common);
      setHint(matches.slice(0, 7).join("   "));
      return;
    }
    if (event.ctrlKey && event.key.toLowerCase() === "l") {
      event.preventDefault();
      execute("cv clear");
    }
  }

  function focusEmptySpace(event: MouseEvent<HTMLDivElement>) {
    if (snakeActive) return;
    const target = event.target as HTMLElement;
    if (target instanceof Element && !target.closest("button,a,input,form")) {
      promptRef.current?.focus({ preventScroll: true });
    }
  }

  const guidedMenu = (
    <div className="cvcli-guided" id="cvcli-guided-panel" ref={guidedRef}>
      <div className="cvcli-group-label">{"// QUICK COMMANDS · CLICK TO RUN"}</div>
      <div className="cvcli-command-grid">
        {GUIDED_COMMANDS.map((item) => (
          <button type="button" key={item.command} title={item.command}
            onClick={() => execute(item.command)} className="cvcli-action">
            <span className="cvcli-action-text">{item.label}</span>
            <code>{item.command}</code><span aria-hidden="true">↵</span>
          </button>
        ))}
      </div>
      <button className="cvcli-more" type="button" aria-expanded={showMore}
        onClick={() => setShowMore((previous) => !previous)}>
        {showMore ? "− Hide other commands" : "+ More commands"}
      </button>
      {showMore && (
        <div className="cvcli-command-grid cvcli-command-grid-more">
          {EXTENDED_COMMANDS.map((item) => (
            <button type="button" key={item.command} onClick={() => execute(item.command)}
              className="cvcli-action">
              <span className="cvcli-action-text">{item.label}</span>
              <code>{item.command}</code><span aria-hidden="true">↵</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <main className={`cvcli-viewport${sessionActive ? " cvcli-engaged" : ""}${snakeActive ? " cvcli-game-mode" : ""}`}
      data-theme={theme} data-phase={sessionActive ? (startupClosing ? "clearing" : "active") : "intro"}
      id="main">
      <a className="cvcli-skip" href="#cvcli-main">Skip to CV terminal</a>
      <div className="cvcli-shell">
        <header className="cvcli-header" aria-label="Terminal window">
          <div className="cvcli-top-left">
            <div className="cvcli-window-dots" aria-hidden="true"><i /><i /><i /></div>
            <span className="cvcli-header-divider" aria-hidden="true" />
            <span className="cvcli-tab"><span className="cvcli-tab-symbol">▸</span> {snakeActive ? "hossein@cv: ~/snake" : "hossein@cv: ~"}</span>
          </div>
          <nav className="cvcli-utilities" aria-label="CV shortcuts and color theme">
            <button type="button" className="cvcli-theme-switch" onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-pressed={theme === "light"} title="Toggle light and dark color theme">
              <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
              <span>{theme === "dark" ? "LIGHT" : "DARK"}</span>
            </button>
            {!snakeActive && (
              <>
                <a href="/resume/" title="Open the formatted resume">CV <span aria-hidden="true">↗</span></a>
                <a href="/resume.pdf" download="Hossein-Mohammaddokht-CV.pdf"
                  title="Download CV as PDF">PDF <span aria-hidden="true">↓</span></a>
              </>
            )}
          </nav>
        </header>

        <div id="cvcli-main" ref={scrollRef} onClick={focusEmptySpace}
          className={`cvcli-console${snakeActive ? " cvcli-console-game" : ""}`} role="region" aria-label={snakeActive ? "CV Snake game mode" : "Interactive CV command line"}>
          {!snakeActive && (!sessionActive || startupClosing) && (
            <div className={`cvcli-startup${sessionActive ? " cvcli-startup-leaving" : ""}`}>
              <div className="cvcli-startup-content">
                <div className="cvcli-boot" aria-label="CV shell introduction">
                  <div className="cvcli-boot-bar"><span>CV SHELL</span><span>V1.0</span><span>CLIENT-SIDE ONLY</span></div>
                  <h1 className="cvcli-boot-name">{profile.name}<span className="cvcli-caret">_</span></h1>
                  <div className="cvcli-boot-role">{profile.role}</div>
                  <div className="cvcli-boot-focus">{profile.focus}</div>
                  <div className="cvcli-boot-rule" aria-hidden="true">───────────────────────────────────────────────────────────</div>
                </div>
                {mode === null ? (
                  <section className="cvcli-onboarding" aria-labelledby="cvcli-onboard-title">
                    <p className="cvcli-input-record"><span className="cvcli-prompt-mark">$</span> cv</p>
                    <p className="cvcli-note"><span className="cvcli-success">✓</span> Welcome. Before we start, one question:</p>
                    <h2 id="cvcli-onboard-title">Have you used Bash or a terminal before?</h2>
                    <div className="cvcli-onboard-actions">
                      <button type="button" onClick={() => chooseMode("expert")} className="cvcli-choice">
                        <span className="cvcli-choice-number">[ 1 ]</span><span>Yes, I have</span><span aria-hidden="true">↵</span>
                      </button>
                      <button type="button" onClick={() => chooseMode("guided")} className="cvcli-choice">
                        <span className="cvcli-choice-number">[ 2 ]</span><span>No, show me</span><span aria-hidden="true">↵</span>
                      </button>
                    </div>
                    <p className="cvcli-muted cvcli-onboard-footnote">You can still open the <a href="/resume/">regular CV</a> or <a href="/resume.pdf" download="Hossein-Mohammaddokht-CV.pdf">download the PDF</a> without using the terminal.</p>
                  </section>
                ) : (
                  <>
                    <section className="cvcli-session" aria-label="Terminal session information">
                      <p className="cvcli-input-record"><span className="cvcli-prompt-mark">$</span> cv</p>
                      <p className="cvcli-note"><span className="cvcli-success">✓</span> {mode === "guided" ? "Guided mode loaded." : "Terminal mode ready."}</p>
                      <p className="cvcli-muted">
                        {mode === "guided"
                          ? "Choose a command to explore my CV. No typing needed."
                          : <>Type <code>cv help</code> to list the available commands. Only <code>cv</code> commands work here.</>}
                      </p>
                      <button className="cvcli-switch" type="button" onClick={() => chooseMode(mode === "guided" ? "expert" : "guided")}>
                        Switch to {mode === "guided" ? "terminal" : "guided"} mode
                      </button>
                    </section>
                    {mode === "guided" && guidedMenu}
                  </>
                )}
              </div>
            </div>
          )}

          {mode !== null && (
            snakeActive ? (
              <div ref={snakeRef} className="cvcli-game-slot">
                <CvSnake onExit={exitSnake} />
              </div>
            ) : (
            <>
              {mode === "guided" && sessionActive && !startupClosing && (
                <button type="button" className="cvcli-command-toggle"
                  aria-expanded={showCommandPalette} aria-controls="cvcli-guided-panel"
                  onClick={() => setShowCommandPalette((previous) => !previous)}>
                  {showCommandPalette ? "− Hide commands" : "+ Commands"}
                </button>
              )}
              {mode === "guided" && sessionActive && !startupClosing && showCommandPalette && guidedMenu}

              <div className="cvcli-history" role="log" aria-live="polite" aria-relevant="additions text">
                {lines.map((line) => (
                  <div className="cvcli-turn" key={line.id}>
                    <div className="cvcli-input-record"><span className="cvcli-prompt-mark">$</span> {line.command}</div>
                    <div className={line.result.type === "error" ? "cvcli-result cvcli-error" : "cvcli-result"}>
                      {line.result.title && <div className="cvcli-result-title">{line.result.title}</div>}
                      {line.result.lines.map((part, index) => <div className="cvcli-result-line" key={index}>{part || "\u00a0"}</div>)}
                      {line.result.link && (
                        <a className="cvcli-result-link" href={line.result.link.href}
                          download={line.result.link.download ? "Hossein-Mohammaddokht-CV.pdf" : undefined}>
                          {line.result.link.label} <span aria-hidden="true">↗</span>
                        </a>
                      )}
                      {mode === "guided" && line.result.suggestions && (
                        <div className="cvcli-followups">
                          {line.result.suggestions.map((command) => (
                            <button type="button" key={command} onClick={() => execute(command)}>{command} ↵</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={submit} className="cvcli-form" aria-label="CV command input">
                <label htmlFor="cvcli-command" className="cvcli-form-label">
                  <span>visitor@hossein</span><span className="cvcli-form-sep">:</span>
                  <span>~</span><span className="cvcli-form-dollar">$</span>
                </label>
                <input id="cvcli-command" ref={promptRef} autoComplete="off"
                  autoCapitalize="off" autoCorrect="off" spellCheck={false}
                  maxLength={160} enterKeyHint="go" value={input}
                  onChange={(event) => onInputChange(event.target.value)} onKeyDown={onKeyDown}
                  placeholder={mode === "expert" ? "cv help" : "cv work -v"}
                  aria-label="CV command, for example cv work -v" />
                {mode === "guided" ? (
                  <button type="submit" disabled={!input.trim()} className="cvcli-run">
                    ↵ <span className="cvcli-run-text">Run</span>
                  </button>
                ) : <span className="cvcli-enter-hint" aria-hidden="true">↵ Enter</span>}
              </form>
              {hint && <div className="cvcli-hint" role="status">{hint}</div>}
            </>
            )
          )}
        </div>

        <footer className="cvcli-status" aria-label="Terminal status">
          <div className="cvcli-status-left"><span className="cvcli-status-dot" /> {snakeActive ? "SNAKE ACTIVE" : sessionActive ? "ACTIVE SESSION" : mode ? `${mode.toUpperCase()} MODE` : "SESSION NOT STARTED"}</div>
          {mode && !snakeActive && <button className="cvcli-status-switch" type="button" onClick={() => chooseMode(mode === "guided" ? "expert" : "guided")}>Switch mode ↔</button>}
          {mode && !snakeActive ? (
            <button type="button" className="cvcli-status-help" onClick={() => execute("cv help")}
              aria-label="Show CV help and extras" title="Discover CV commands and a little bonus">
              ? HELP + EXTRAS
            </button>
          ) : (
            <div className="cvcli-status-center">{snakeActive ? "GAME MODE · ESC TO RETURN" : "SAFE CV CLI · NO OS SHELL"}</div>
          )}
          <div className="cvcli-status-right">{snakeActive ? "ARROWS/WASD · P: PAUSE · ESC: EXIT" : mode === "expert" ? "TAB: COMPLETE · ↑↓: HISTORY" : mode === "guided" ? "CLICK OR TYPE" : "CHOOSE 1 OR 2"}</div>
        </footer>
      </div>
      {!sessionActive && <div className="cvcli-below" aria-hidden="true"><span>DEVOPS / API MANAGEMENT / AGENTIC AI</span><span>© {new Date().getFullYear()} {profile.name}</span></div>}
    </main>
  );
}
