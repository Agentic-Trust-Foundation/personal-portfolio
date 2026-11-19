"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  advanceSnake, newSnakeGame, pauseSnake, samePoint, steerSnake,
  SNAKE_COLUMNS, SNAKE_ROWS, SNAKE_TICK_MS,
  type SnakeDirection,
} from "@/lib/snake";

const BEST_KEY = "hossein-cv-snake-high-score";
const DIRECTION_KEYS: Record<string, SnakeDirection> = {
  arrowup: "up", w: "up",
  arrowdown: "down", s: "down",
  arrowleft: "left", a: "left",
  arrowright: "right", d: "right",
};

export default function CvSnake({ onExit, suspended = false }: { onExit: (score: number) => void; suspended?: boolean }) {
  const [game, setGame] = useState(() => newSnakeGame(Date.now()));
  const [savedBest, setSavedBest] = useState(0);
  const bestWritten = useRef(0);
  const gameRef = useRef<HTMLElement>(null);
  const scoreRef = useRef(0);
  useEffect(() => { scoreRef.current = game.score; }, [game.score]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = Number.parseInt(window.localStorage.getItem(BEST_KEY) || "0", 10);
        const score = Number.isFinite(stored) && stored > 0 ? stored : 0;
        bestWritten.current = score;
        setSavedBest(score);
      } catch {
        // Storage may be disabled; the game still works.
      }
      gameRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (game.score <= bestWritten.current) return;
    bestWritten.current = game.score;
    try { window.localStorage.setItem(BEST_KEY, String(game.score)); } catch { /* optional */ }
  }, [game.score]);

  useEffect(() => {
    if (game.status !== "playing" || suspended) return;
    const timer = window.setInterval(() => setGame((previous) => advanceSnake(previous)), SNAKE_TICK_MS);
    return () => window.clearInterval(timer);
  }, [game.status, suspended]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setGame((previous) => previous.status === "playing" ? { ...previous, status: "paused" } : previous);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const move = useCallback((direction: SnakeDirection) => {
    setGame((previous) => steerSnake(previous, direction));
  }, []);

  const reset = useCallback(() => {
    setGame(newSnakeGame(Date.now()));
    gameRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const direction = DIRECTION_KEYS[key];
      if (direction) {
        event.preventDefault();
        move(direction);
      } else if (key === "escape") {
        event.preventDefault();
        onExit(scoreRef.current);
      } else if (key === "p" || key === " ") {
        event.preventDefault();
        if (!event.repeat) setGame((previous) => pauseSnake(previous));
      } else if (key === "r") {
        event.preventDefault();
        if (!event.repeat) reset();
      }
    };
    // Capture arrow keys before browser page-scrolling or terminal history shortcuts.
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [move, onExit, reset]);

  const cells = useMemo(() => {
    const head = game.snake[0];
    const body = new Set(game.snake.slice(1).map((point) => point.x + "," + point.y));
    return Array.from({ length: SNAKE_ROWS * SNAKE_COLUMNS }, (_, i) => {
      const point = { x: i % SNAKE_COLUMNS, y: Math.floor(i / SNAKE_COLUMNS) };
      const kind = samePoint(point, head)
        ? "head" : body.has(point.x + "," + point.y)
          ? "body" : game.food && samePoint(point, game.food)
            ? "food" : "empty";
      return <span key={i} className={"cv-snake-cell cv-snake-" + kind} />;
    });
  }, [game.snake, game.food]);

  return (
    <section className="cv-snake" ref={gameRef} tabIndex={-1} role="region" aria-label="CV Snake game">
      <div className="cv-snake-heading">
        <div>
          <span className="cv-snake-eyebrow">[ HIDDEN COMMAND · CV PLAY SNAKE ]</span>
          <h2>CV SNAKE<span className="cv-snake-cursor">_</span></h2>
        </div>
        <div className="cv-snake-scores">
          <span>SCORE <strong>{String(game.score).padStart(3, "0")}</strong></span>
          <span>BEST <strong>{String(Math.max(savedBest, game.score)).padStart(3, "0")}</strong></span>
        </div>
      </div>
      <div className="cv-snake-board-wrap">
        <div
          aria-hidden="true"
          className="cv-snake-board"
          style={{ gridTemplateColumns: "repeat(" + SNAKE_COLUMNS + ", minmax(0, 1fr))" }}
        >
          {cells}
        </div>
        {game.status !== "playing" && (
          <div className="cv-snake-overlay" role="status">
            <strong>{game.status === "paused" ? "PAUSED" : game.status === "won" ? "YOU WIN" : "GAME OVER"}</strong>
            <span>{game.status === "paused" ? "P to resume" : "R to restart · Esc to exit"}</span>
          </div>
        )}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {game.status === "playing" ? "Snake is playing" : game.status + ". "} Score {game.score}. Best {Math.max(savedBest, game.score)}.
      </p>
      <div className="cv-snake-bottom">
        <div className="cv-snake-help">ARROWS / WASD TO MOVE <span>·</span> P PAUSE <span>·</span> R RESTART <span>·</span> ESC EXIT</div>
        <div className="cv-snake-buttons">
          <button type="button" onClick={() => setGame((previous) => pauseSnake(previous))} disabled={game.status === "over" || game.status === "won"} aria-label="Pause or resume Snake">{game.status === "paused" ? "RESUME" : "PAUSE"}</button>
          <button type="button" onClick={reset} aria-label="Restart Snake">RESTART</button>
          <button type="button" onClick={() => onExit(scoreRef.current)} aria-label="Exit Snake game">EXIT ↵</button>
        </div>
      </div>
      <div className="cv-snake-touch" aria-label="Snake movement controls">
        <span />
        <button type="button" onClick={() => move("up")} aria-label="Move up">↑</button>
        <span />
        <button type="button" onClick={() => move("left")} aria-label="Move left">←</button>
        <button type="button" onClick={() => move("down")} aria-label="Move down">↓</button>
        <button type="button" onClick={() => move("right")} aria-label="Move right">→</button>
      </div>
    </section>
  );
}
