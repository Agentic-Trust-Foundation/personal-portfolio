"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ALLOWED_COMMANDS, GUIDED_COMMANDS, executeCommand, type CommandResult } from "@/lib/commands";

type Mode = "guided" | "expert";
type Turn = { id: number; command: string; result: CommandResult };

export default function Terminal() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [value, setValue] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [hint, setHint] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  useEffect(() => {
    if (mode) inputRef.current?.focus();
  }, [mode]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [turns, mode]);

  const run = useCallback((raw: string) => {
    const command = raw.trim().replace(/\s+/g, " ");
    if (!command) return;
    const result = executeCommand(command);
    if (result.type === "clear") {
      setTurns([]);
    } else {
      setTurns((prev) => [...prev, { id: idRef.current++, command, result }].slice(-50));
    }
    setHistory((prev) => [...prev.slice(-49), command]);
    setHistoryIndex(-1);
    setValue("");
    setHint("");

    if (result.type === "download") {
      // Only a fixed, local, static PDF file is offered. No server-side execution.
      const anchor = document.createElement("a");
      anchor.href = "/resume.pdf";
      anchor.download = "Hossein-Mohammaddokht-CV.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }
    inputRef.current?.focus();
  }, []);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    run(value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!history.length) return;
      const next = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(next);
      setValue(history[next]);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (historyIndex === -1) return;
      const next = historyIndex + 1;
      if (next >= history.length) {
        setHistoryIndex(-1);
        setValue("");
      } else {
        setHistoryIndex(next);
        setValue(history[next]);
      }
    } else if (event.key === "Tab") {
      event.preventDefault();
      const lower = value.toLowerCase();
      const matches = ALLOWED_COMMANDS.filter((cmd) => cmd.startsWith(lower));
      if (!matches.length) return setHint("No matching CV command. Try cv help.");
      if (matches.length === 1) {
        setValue(matches[0]);
        return setHint("");
      }
      let prefix = matches[0];
      for (const match of matches.slice(1)) {
        while (!match.startsWith(prefix)) prefix = prefix.slice(0, -1);
      }
      if (prefix.length > lower.length) setValue(prefix);
      setHint(matches.slice(0, 6).join("    "));
    } else if (event.key.toLowerCase() === "l" && event.ctrlKey) {
      event.preventDefault();
      run("cv clear");
    }
  };

  const setExperience = (selected: Mode) => {
    setMode(selected);
    setTurns([]);
    setHistoryIndex(-1);
    setValue("");
    setHint("");
  };

  return (
    <div className="terminal-window" role="region" aria-label="Interactive CV terminal">
      <div className="terminal-titlebar">
        <div className="terminal-lights" aria-hidden="true"><i /><i /><i /></div>
        <div className="terminal-title">hossein@portfolio: ~/cv</div>
        <span className="terminal-titlebar-right">CV CLI / v1.0</span>
      </div>
      <div className="terminal-console" ref={logRef}>
        <div className="terminal-welcome">
          <span className="terminal-green">✓</span> connected to <strong>hossein.cv</strong>
          <div className="terminal-small">A safe CV interface. No access to a real system shell.</div>
        </div>
        {mode === null ? (
          <div className="onboarding" aria-labelledby="onboarding-title">
            <span className="terminal-muted">FIRST, A QUICK QUESTION:</span>
            <h3 id="onboarding-title">Have you used Bash or a terminal before?</h3>
            <p>Choose how you want to browse my resume. You can change this later.</p>
            <div className="onboarding-options">
              <button className="onboard-primary" type="button" onClick={() => setExperience("guided")}>
                <span>No, show me around</span><span aria-hidden="true">→</span>
              </button>
              <button className="onboard-secondary" type="button" onClick={() => setExperience("expert")}>
                <span>Yes, open terminal</span><span aria-hidden="true">↵</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="terminal-mode-line">
              <span><span className="terminal-green">●</span> {mode === "guided" ? "GUIDED MODE" : "TERMINAL MODE"}</span>
              <button type="button" onClick={() => setExperience(mode === "guided" ? "expert" : "guided")}>Switch mode ↔</button>
            </div>
            <div className="terminal-instructions">
              {mode === "guided"
                ? <>Click any command below, or type one yourself. <strong>Nothing here runs on a server.</strong></>
                : <>Welcome. Type <code>cv help</code> to see commands. Only <code>cv</code> commands are supported.</>}
            </div>
            {mode === "guided" && (
              <div className="guided-commands" aria-label="Click a CV command">
                {GUIDED_COMMANDS.map((item) => (
                  <button key={item.command} title={item.command} type="button" onClick={() => run(item.command)}>
                    <span>{item.label}</span><code>{item.command}</code>
                  </button>
                ))}
              </div>
            )}
            <div className="terminal-transcript" role="log" aria-live="polite" aria-relevant="additions text">
              {turns.map((turn) => (
                <div className="terminal-turn" key={turn.id}>
                  <div className="terminal-command-line"><span className="terminal-prompt-icon">$</span> {turn.command}</div>
                  <div className={turn.result.type === "error" ? "terminal-result terminal-error" : "terminal-result"}>
                    {turn.result.title && <div className="terminal-result-title">{turn.result.title}</div>}
                    {turn.result.lines.map((line, index) => <div key={index} className="terminal-result-line">{line || "\u00a0"}</div>)}
                    {turn.result.link && (
                      <a className="terminal-result-link" href={turn.result.link.href} download={turn.result.link.download ? "Hossein-Mohammaddokht-CV.pdf" : undefined}>
                        {turn.result.link.label} ↗
                      </a>
                    )}
                    {mode === "guided" && turn.result.suggestions && (
                      <div className="result-suggestions">
                        {turn.result.suggestions.map((command) => <button key={command} type="button" onClick={() => run(command)}>{command} ↗</button>)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <form className="terminal-input-form" onSubmit={onSubmit}>
              <label className="terminal-input-label" htmlFor="terminal-command"><span className="terminal-prompt-icon">$</span><span className="sr-only">CV command</span></label>
              <input
                id="terminal-command"
                ref={inputRef}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                enterKeyHint="go"
                maxLength={160}
                value={value}
                onChange={(event) => { setValue(event.target.value); setHint(""); }}
                onKeyDown={onKeyDown}
                aria-label="Enter a CV command, such as cv work -v"
                placeholder={mode === "expert" ? "cv help" : "cv projects atlas -v"}
              />
              <button type="submit" disabled={!value.trim()} aria-label="Execute CV command">Run ↵</button>
            </form>
            {hint && <div className="terminal-hint" role="status">{hint}</div>}
          </>
        )}
      </div>
      <div className="terminal-statusbar">
        <span>{mode ? (mode === "expert" ? "TAB to complete · ↑↓ history" : "Click to run · or type cv help") : "CHOOSE YOUR EXPERIENCE"}</span>
        <span>LOCAL COMMANDS ONLY <span className="terminal-green">●</span></span>
      </div>
    </div>
  );
}
