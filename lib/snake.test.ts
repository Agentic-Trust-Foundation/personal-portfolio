import { describe, expect, it } from "vitest";
import {
  advanceSnake, newSnakeGame, pauseSnake, pickFood, samePoint,
  SNAKE_COLUMNS, SNAKE_ROWS, steerSnake, type SnakeState,
} from "./snake";

describe("CV Snake engine", () => {
  it("starts with a legal snake and food outside its body", () => {
    const game = newSnakeGame(42);
    expect(game.status).toBe("playing");
    expect(game.snake).toHaveLength(3);
    expect(game.food).not.toBeNull();
    expect(game.snake.some((cell) => samePoint(cell, game.food!))).toBe(false);
  });

  it("moves one cell each tick and never mutates its input", () => {
    const initial = newSnakeGame(21);
    const next = advanceSnake(initial);
    expect(next.snake[0].x).toBe(initial.snake[0].x + 1);
    expect(next.snake).toHaveLength(initial.snake.length);
    expect(initial.snake[0].x).toBe(7);
  });

  it("ignores reversal and accepts perpendicular steering", () => {
    const initial = newSnakeGame(42);
    expect(steerSnake(initial, "left")).toBe(initial);
    const up = steerSnake(initial, "up");
    expect(advanceSnake(up).snake[0].y).toBe(initial.snake[0].y - 1);
  });

  it("adds points and grows when a food cell is eaten", () => {
    const initial = newSnakeGame(3);
    const current: SnakeState = {
      ...initial, food: { x: initial.snake[0].x + 1, y: initial.snake[0].y },
    };
    const next = advanceSnake(current);
    expect(next.score).toBe(10);
    expect(next.snake).toHaveLength(4);
    expect(next.food && next.snake.some((cell) => samePoint(cell, next.food!))).toBe(false);
  });

  it("stops when hitting a wall and never advances again", () => {
    const initial = newSnakeGame(3);
    const atWall: SnakeState = {
      ...initial,
      snake: [{ x: SNAKE_COLUMNS - 1, y: 4 }, { x: SNAKE_COLUMNS - 2, y: 4 }],
    };
    const end = advanceSnake(atWall);
    expect(end.status).toBe("over");
    expect(advanceSnake(end)).toBe(end);
  });

  it("detects self collision but allows moving into the vacated tail", () => {
    const initial = newSnakeGame(2);
    const collision: SnakeState = {
      ...initial, direction: "up", queuedDirection: "up",
      snake: [{ x: 5, y: 6 }, { x: 5, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 6, y: 7 }],
      food: { x: 1, y: 1 },
    };
    expect(advanceSnake(collision).status).toBe("over");
    const tailMove: SnakeState = {
      ...collision, snake: [{ x: 5, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 5 }, { x: 5, y: 5 }],
      direction: "up", queuedDirection: "up",
    };
    expect(advanceSnake(tailMove).status).toBe("playing");
  });

  it("pauses and resumes without moving", () => {
    const playing = newSnakeGame(6);
    const paused = pauseSnake(playing);
    expect(paused.status).toBe("paused");
    expect(advanceSnake(paused)).toBe(paused);
    expect(pauseSnake(paused).status).toBe("playing");
  });

  it("picks free food cells or declares a full board", () => {
    const full = Array.from({ length: SNAKE_COLUMNS * SNAKE_ROWS }, (_, i) => ({
      x: i % SNAKE_COLUMNS, y: Math.floor(i / SNAKE_COLUMNS),
    }));
    expect(pickFood(full, 10)).toBeNull();
  });
});
