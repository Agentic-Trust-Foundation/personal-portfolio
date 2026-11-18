/**
 * Tiny, deterministic Snake engine for the CV Easter egg.
 * Browser only; never launches a shell or accesses a backend.
 */
export const SNAKE_COLUMNS = 24;
export const SNAKE_ROWS = 14;
export const SNAKE_TICK_MS = 145;

export type SnakeDirection = "up" | "down" | "left" | "right";
export type SnakeStatus = "playing" | "paused" | "over" | "won";
export interface SnakePoint { x: number; y: number }
export interface SnakeState {
  snake: SnakePoint[];
  direction: SnakeDirection;
  queuedDirection: SnakeDirection;
  food: SnakePoint | null;
  score: number;
  seed: number;
  status: SnakeStatus;
}

const MOVES: Record<SnakeDirection, SnakePoint> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
  left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};
const OPPOSITE: Record<SnakeDirection, SnakeDirection> = {
  up: "down", down: "up", left: "right", right: "left",
};

export function samePoint(a: SnakePoint, b: SnakePoint): boolean {
  return a.x === b.x && a.y === b.y;
}

export function pickFood(snake: readonly SnakePoint[], seed: number): SnakePoint | null {
  const occupied = new Set(snake.map((point) => point.x + "," + point.y));
  const available: SnakePoint[] = [];
  for (let y = 0; y < SNAKE_ROWS; y++) {
    for (let x = 0; x < SNAKE_COLUMNS; x++) {
      if (!occupied.has(x + "," + y)) available.push({ x, y });
    }
  }
  if (available.length === 0) return null;
  const selection = (Math.trunc(seed) >>> 0) % available.length;
  return available[selection];
}

export function newSnakeGame(seed = 7): SnakeState {
  const y = Math.floor(SNAKE_ROWS / 2);
  const snake = [{ x: 7, y }, { x: 6, y }, { x: 5, y }];
  return {
    snake,
    direction: "right",
    queuedDirection: "right",
    food: pickFood(snake, seed),
    score: 0,
    seed,
    status: "playing",
  };
}

export function steerSnake(state: SnakeState, direction: SnakeDirection): SnakeState {
  if (state.status !== "playing" || direction === OPPOSITE[state.direction]) return state;
  return { ...state, queuedDirection: direction };
}

export function pauseSnake(state: SnakeState): SnakeState {
  if (state.status === "playing") return { ...state, status: "paused" };
  if (state.status === "paused") return { ...state, status: "playing" };
  return state;
}

export function advanceSnake(state: SnakeState): SnakeState {
  if (state.status !== "playing") return state;
  const direction = state.queuedDirection;
  const move = MOVES[direction];
  const head = { x: state.snake[0].x + move.x, y: state.snake[0].y + move.y };
  const eat = state.food !== null && samePoint(head, state.food);
  const bodyToCheck = eat ? state.snake : state.snake.slice(0, -1);
  const hitWall = head.x < 0 || head.x >= SNAKE_COLUMNS || head.y < 0 || head.y >= SNAKE_ROWS;
  const hitBody = bodyToCheck.some((cell) => samePoint(head, cell));
  if (hitWall || hitBody) return { ...state, status: "over" };
  const nextBody = eat
    ? [head, ...state.snake]
    : [head, ...state.snake.slice(0, -1)];
  const seed = eat ? state.seed + 1 : state.seed;
  const food = eat ? pickFood(nextBody, seed) : state.food;
  return {
    ...state,
    snake: nextBody,
    food,
    direction,
    queuedDirection: direction,
    seed,
    score: state.score + (eat ? 10 : 0),
    status: food === null ? "won" : "playing",
  };
}
