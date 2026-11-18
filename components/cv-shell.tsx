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
import {
  ALLOWED_COMMANDS,
  GUIDED_COMMANDS,
  executeCommand,
  type CommandResult,
} from "@/lib/commands";

type ShellMode = "guided" | "expert";
type TranscriptLine = {
  id: number;
  command: string;
  result: CommandResult;
};

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

// A single, explicitly scoped command grammar: not Bash, not an OS shell.
// executeCommand returns strings and local links; no input is ever evaluated.
export default function CvShell() {
  const [mode, setMode] = useState<ShellMode | null>(null);
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showMore, setShowMore] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [hint, setHint] = useState("");
  const promptRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineId = useRef(0);

  useEffect(() => {
    if (mode) promptRef.current?.focus();
  }, [mode, sessionActive]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mode, lines, showMore, showCommandPalette, sessionActive]);

  const execute = useCallback((raw: string) => {
    const command = raw.trim().replace(/\s+/g, " ");
    if (!command) return;
    const result = executeCommand(command);

    // First command clears the splash screen, not the user's command history.
    setSessionActive(true);
    setShowCommandPalette(false);
    setShowMore(false);
    setHistory((prev) => [...prev.slice(-79), command]);
    setHistoryIndex(-1);
    setHint("");
    setInput("");

    if (result.type === "clear") {
      setLines([]);
    } else {
      setLines((prev) => [...prev.slice(-59), { id: ++lineId.current, command, result }]);
    }

    if (result.type === "download") {
      const anchor = document.createElement("a");
      anchor.href = "/resume.pdf";
      anchor.download = "Hossein-Mohammaddokht-CV.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }
    promptRef.current?.focus();
  }, []);

  function chooseMode(nextMode: ShellMode) {
    setMode(nextMode);
    setLines([]);
    setHistoryIndex(-1);
    setInput("");
    setHint("");
    setShowMore(false);
    setSessionActive(false);
    setShowCommandPalette(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    execute(input);
  }

  function onInputChange(next: string) {
    setInput(next);
    setHint("");
    if (next.trim() && !sessionActive) {
      // As soon as typing begins, remove the intro and startup guide.
      // Keep the text the visitor has already typed in the prompt.
      setSessionActive(true);
      setShowCommandPalette(false);
      setShowMore(false);
    }
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
    const target = event.target as HTMLElement;
    if (target instanceof Element && !target.closest("button,a,input,form")) promptRef.current?.focus();
  }

  return (
    <main className={`cvcli-viewport${sessionActive ? " cvcli-engaged" : ""}`} id="main">
      <a className="cvcli-skip" href="#cvcli-main">Skip to CV terminal</a>
      <div className="cvcli-shell">
        <header className="cvcli-header" aria-label="Terminal window">
          <div className="cvcli-top-left">
            <div className="cvcli-window-dots" aria-hidden="true"><i /><i /><i /></div>
            <span className="cvcli-header-divider" aria-hidden="true" />
            <span className="cvcli-tab"><span className="cvcli-tab-symbol">▸</span> hossein@cv: ~</span>
          </div>
          <nav className="cvcli-utilities" aria-label="CV shortcuts">
            <a href="/resume/" title="Open the formatted resume">CV <span aria-hidden="true">↗</span></a>
            <a href="/resume.pdf" download="Hossein-Mohammaddokht-CV.pdf" title="Download CV as PDF">PDF <span aria-hidden="true">↓</span></a>
          </nav>
        </header>

        <div id="cvcli-main" ref={scrollRef} onClick={focusEmptySpace} className="cvcli-console" role="region" aria-label="Interactive CV command line">
          {!sessionActive && <div className="cvcli-boot" aria-label="CV shell introduction">
            <div className="cvcli-boot-bar"><span>CV SHELL</span><span>V1.0</span><span>CLIENT-SIDE ONLY</span></div>
            <h1 className="cvcli-boot-name">{profile.name}<span className="cvcli-caret">_</span></h1>
            <div className="cvcli-boot-role">{profile.role}</div>
            <div className="cvcli-boot-focus">{profile.focus}</div>
            <div className="cvcli-boot-rule" aria-hidden="true">───────────────────────────────────────────────────────────</div>
          </div>}

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
              {!sessionActive && <section className="cvcli-session" aria-label="Terminal session information">
                <div className="cvcli-input-record"><span className="cvcli-prompt-mark">$</span> cv</div>
                <p className="cvcli-note"><span className="cvcli-success">✓</span> {mode === "guided" ? "Guided mode loaded." : "Terminal mode ready."}</p>
                <p className="cvcli-muted">
                  {mode === "guided"
                    ? "Choose a command to explore my CV. No typing needed."
                    : <>Type <code>cv help</code> to list the available commands. Only <code>cv</code> commands work here.</>}
                </p>
                <button className="cvcli-switch" type="button" onClick={() => chooseMode(mode === "guided" ? "expert" : "guided")}>Switch to {mode === "guided" ? "terminal" : "guided"} mode</button>
              </section>}

              {mode === "guided" && sessionActive && (
                <button type="button" className="cvcli-command-toggle" aria-expanded={showCommandPalette} aria-controls="cvcli-guided-panel" onClick={() => setShowCommandPalette((prev) => !prev)}>
                  {showCommandPalette ? "− Hide commands" : "+ Commands"}
                </button>
              )}

              {mode === "guided" && (!sessionActive || showCommandPalette) && (
                <div className="cvcli-guided" id="cvcli-guided-panel">
                  <div className="cvcli-group-label">// QUICK COMMANDS · CLICK TO RUN</div>
                  <div className="cvcli-command-grid">
                    {GUIDED_COMMANDS.map((item) => (
                      <button type="button" key={item.command} title={item.command} onClick={() => execute(item.command)} className="cvcli-action">
                        <span className="cvcli-action-text">{item.label}</span><code>{item.command}</code><span aria-hidden="true">↵</span>
                      </button>
                    ))}
                  </div>
                  <button className="cvcli-more" type="button" aria-expanded={showMore} onClick={() => setShowMore((prev) => !prev)}>
                    {showMore ? "− Hide other commands" : "+ More commands"}
                  </button>
                  {showMore && (
                    <div className="cvcli-command-grid cvcli-command-grid-more">
                      {EXTENDED_COMMANDS.map((item) => (
                        <button type="button" key={item.command} onClick={() => execute(item.command)} className="cvcli-action">
                          <span className="cvcli-action-text">{item.label}</span><code>{item.command}</code><span aria-hidden="true">↵</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="cvcli-history" role="log" aria-live="polite" aria-relevant="additions text">
                {lines.map((line) => (
                  <div className="cvcli-turn" key={line.id}>
                    <div className="cvcli-input-record"><span className="cvcli-prompt-mark">$</span> {line.command}</div>
                    <div className={line.result.type === "error" ? "cvcli-result cvcli-error" : "cvcli-result"}>
                      {line.result.title && <div className="cvcli-result-title">{line.result.title}</div>}
                      {line.result.lines.map((part, index) => <div className="cvcli-result-line" key={index}>{part || "\u00a0"}</div>)}
                      {line.result.link && (
                        <a className="cvcli-result-link" href={line.result.link.href} download={line.result.link.download ? "Hossein-Mohammaddokht-CV.pdf" : undefined}>
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
                <label htmlFor="cvcli-command" className="cvcli-form-label"><span>visitor@hossein</span><span className="cvcli-form-sep">:</span><span>~</span><span className="cvcli-form-dollar">$</span></label>
                <input
                  id="cvcli-command"
                  ref={promptRef}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={160}
                  enterKeyHint="go"
                  value={input}
                  onChange={(event) => onInputChange(event.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={mode === "expert" ? "cv help" : "cv work -v"}
                  aria-label="CV command, for example cv work -v"
                />
                {mode === "guided" ? <button type="submit" disabled={!input.trim()} className="cvcli-run">↵ <span className="cvcli-run-text">Run</span></button> : <span className="cvcli-enter-hint" aria-hidden="true">↵ Enter</span>}
              </form>
              {hint && <div className="cvcli-hint" role="status">{hint}</div>}
            </>
          )}
        </div>

        <footer className="cvcli-status" aria-label="Terminal status">
          <div className="cvcli-status-left"><span className="cvcli-status-dot" /> {sessionActive ? "ACTIVE SESSION" : mode ? `${mode.toUpperCase()} MODE` : "SESSION NOT STARTED"}</div>
          {mode && <button className="cvcli-status-switch" type="button" onClick={() => chooseMode(mode === "guided" ? "expert" : "guided")}>Switch mode ↔</button>}
          <div className="cvcli-status-center">SAFE CV CLI · NO OS SHELL</div>
          <div className="cvcli-status-right">{mode === "expert" ? "TAB: COMPLETE · ↑↓: HISTORY" : mode === "guided" ? "CLICK OR TYPE" : "CHOOSE 1 OR 2"}</div>
        </footer>
      </div>
      {!sessionActive && <div className="cvcli-below" aria-hidden="true"><span>DEVOPS / API MANAGEMENT / AGENTIC AI</span><span>© {new Date().getFullYear()} {profile.name}</span></div>}
    </main>
  );
}
