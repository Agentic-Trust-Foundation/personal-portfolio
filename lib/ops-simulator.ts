/**
 * Synthetic, reproducible DevOps sandbox. Never touches a real cluster.
 * Failure cases are scripted for plausibility and reliable regression tests.
 */
export const PIPELINE_STAGES = ["Checks", "Build", "Security", "Rollout", "Health"] as const;
export type LabIntent = "surge" | "normalize" | "deploy" | "inspect" | "reset";
export type Traffic = "normal" | "surge";
export type PipelineStatus = "idle" | "running" | "success" | "failed";
export type LabEvent = { id: number; message: string; kind: "info" | "good" | "warning" };
export type LabState = {
  traffic: Traffic;
  pipelineStep: number; // -1 idle; 0..4 stage; 5 successful completion
  pipelineStatus: PipelineStatus;
  failedStage: number | null;
  attempt: number;
  candidateVersion: string | null;
  version: string; // last successfully deployed version, not failed candidates
  durations: number[];
  tick: number;
  metricTick: number; // independent of traffic/deploy clicks, so numbers drift only with the telemetry clock
  events: LabEvent[];
};

const BASE_VERSION = "v1.8.2";
function stageDurations(attempt: number) {
  return PIPELINE_STAGES.map((_, index) =>
    740 + ((attempt * 7 + index * 3) % 5) * 350 +
    (index === 1 && attempt % 4 === 0 ? 1550 : 0)
  );
}
export function initialLab(): LabState {
  return {
    traffic: "normal", pipelineStep: -1, pipelineStatus: "idle",
    failedStage: null, attempt: 0, candidateVersion: null,
    version: BASE_VERSION, durations: [], tick: 0, metricTick: 0,
    events: [
      { id: 2, kind: "good", message: "All services healthy · 3/3 replicas ready" },
      { id: 1, kind: "info", message: "Interactive lab booted · simulated data only" },
    ],
  };
}
const addEvent = (state: LabState, message: string, kind: LabEvent["kind"]): LabState => ({
  ...state,
  events: [{ id: (state.events[0]?.id ?? 0) + 1, message, kind }, ...state.events].slice(0, 6),
});
export function failureStage(attempt: number): number | null {
  // Familiar deterministic incidents: v1.8.5 build fails, v1.8.9 security fails.
  // Later runs occasionally fail to mimic non-perfect delivery pipelines.
  if (attempt === 3 || (attempt > 9 && attempt % 11 === 0)) return 1;
  if (attempt === 7 || (attempt > 9 && attempt % 13 === 0)) return 2;
  return null;
}
export function runLabAction(state: LabState, action: LabIntent): LabState {
  switch (action) {
    case "surge":
      return addEvent({ ...state, traffic: "surge", tick: state.tick + 1 }, "Traffic surge · autoscaler increased replicas to 5", "warning");
    case "normalize":
      return addEvent({ ...state, traffic: "normal", tick: state.tick + 1 }, "Traffic normalized · replicas scaled down to 3", "good");
    case "deploy": {
      if (state.pipelineStatus === "running") return state;
      const attempt = state.attempt + 1;
      const candidateVersion = "v1.8." + (2 + attempt);
      return addEvent({
        ...state, pipelineStatus: "running", pipelineStep: 0, failedStage: null,
        attempt, candidateVersion, durations: stageDurations(attempt),
        tick: state.tick + 1,
      }, "Candidate " + candidateVersion + " queued · Checks", "info");
    }
    case "inspect":
      return addEvent({ ...state, tick: state.tick + 1 }, "Inspect requested · metrics are synthetic", "info");
    case "reset":
      return addEvent(initialLab(), "Demo reset · version restored to " + BASE_VERSION, "good");
  }
}
export function advanceLab(state: LabState): LabState {
  if (state.pipelineStatus !== "running" ||
      state.pipelineStep < 0 || state.pipelineStep >= PIPELINE_STAGES.length) return state;
  const stage = state.pipelineStep;
  const failure = failureStage(state.attempt);
  if (failure === stage) {
    const reason = stage === 1
      ? "Build failed · dependency mismatch / compilation error"
      : "Security failed · vulnerable dependency detected";
    return addEvent({
      ...state, pipelineStatus: "failed", failedStage: stage, tick: state.tick + 1,
    }, state.candidateVersion + " · " + reason + " · next candidate may fix it", "warning");
  }
  const next = stage + 1;
  if (next === PIPELINE_STAGES.length) {
    return addEvent({
      ...state, pipelineStatus: "success", pipelineStep: next,
      version: state.candidateVersion ?? state.version, tick: state.tick + 1,
    }, "Release " + state.candidateVersion + " healthy · rolling update complete", "good");
  }
  return addEvent({ ...state, pipelineStep: next, tick: state.tick + 1 },
    state.candidateVersion + " · " + PIPELINE_STAGES[next] + " running", "info");
}
export function advanceTelemetry(state: LabState): LabState {
  // One shared client-side clock drives the graph and the displayed metrics.
  // It never sends requests, modifies a real cluster, or advances CI/CD stages.
  return { ...state, tick: state.tick + 1, metricTick: state.metricTick + 1 };
}

export function labMetrics(state: LabState) {
  const high = state.traffic === "surge";
  const inRollout = state.pipelineStatus === "running" && state.pipelineStep === 3;
  const t = state.metricTick;
  // Deterministic, gentle fluctuations (rather than random telemetry).
  // Tick zero preserves exact baseline values and the traffic scenario reset.
  const drift = (primary: number, secondary: number, phase: number) =>
    t === 0 ? 0 : Math.round(
      Math.sin(t * 1.04 + phase) * primary +
      Math.sin(t * .47 + phase / 2) * secondary
    );
  const errorsHundredths = (high ? 18 : 2) +
    (t === 0 ? 0 : Math.round(Math.sin(t * .91 + .3) * (high ? 2 : 1)));
  return {
    rps: (high ? 972 : 246) + (high ? drift(18, 6, .1) : drift(8, 3, .1)),
    p95: (high ? 192 : 78) + (high ? drift(5, 2, 1.4) : drift(3, 1, 1.4)),
    errors: (errorsHundredths / 100).toFixed(2) + "%",
    cpu: (high ? 76 : 39) + (high ? drift(3, 1, 2) : drift(2, 1, 2)),
    ram: (high ? 68 : 45) + drift(2, 1, 2.5),
    // Single source of truth for both visible workload icons and cooling fans.
    podsPerNode: high ? [2, 2, 1] : [1, 1, 1],
    replicas: high ? 5 : 3,
    nodes: 3,
    ready: inRollout ? (high ? 4 : 2) : (high ? 5 : 3),
    version: state.version,
  };
}
export function chartPoints(state: LabState, count = 36): number[] {
  const high = state.traffic === "surge";
  const points = Array.from({ length: count }, (_, i) => {
    const wave = Math.sin((i + state.tick) * .61) * 21 + Math.cos(i * .23) * 15;
    const load = high
      ? (i < count * .6 ? 250 + 720 * (i / (count * .6)) : 970)
      : 246;
    return Math.max(0, Math.round(load + wave + (i % 7 === 0 ? 24 : 0)));
  });
  // The current endpoint of the chart must agree with the RPS card.
  if (points.length) points[points.length - 1] = labMetrics(state).rps;
  return points;
}
export function inferLabIntent(text: string): LabIntent | null {
  const s = text.trim().toLowerCase();
  if (!s || s.length > 240) return null;
  if (/\b(reset|restart|clear scenario)\b|ریست|از اول/.test(s)) return "reset";
  if (/\b(deploy|release|ship|pipeline|ci\/cd|rollout)\b|دیپلوی|انتشار|پایپ/.test(s)) return "deploy";
  if (/\b(recover|normalize|normal|scale down|reduce|low traffic)\b|عادی|کاهش|کم کن|برگردان/.test(s)) return "normalize";
  if (/\b(traffic|surge|spike|scale up|load test|high load)\b|ترافیک|بار زیاد|افزایش|شلوغ/.test(s)) return "surge";
  if (/\b(status|show|inspect|explain|metrics|cluster|kubernetes|help)\b|وضعیت|کلاستر|توضیح|راهنما|نشون/.test(s)) return "inspect";
  return null;
}
export function localLabReply(intent: LabIntent | null, state: LabState): string {
  const metrics = labMetrics(state);
  switch (intent) {
    case "surge": return "Simulated traffic increased. Watch Requests/sec, CPU and replica count move together.";
    case "normalize": return "Scenario back to normal. The lab scaled demo replicas down without touching a real cluster.";
    case "deploy": return "Starting simulated candidate " + (state.candidateVersion ?? "release") + ". Stages can pass, fail or run longer than expected. No real build occurs.";
    case "reset": return "Lab reset to its original healthy state.";
    case "inspect": return `Demo cluster: ${metrics.nodes} nodes · ${metrics.ready}/${metrics.replicas} replicas · ${metrics.rps} RPS · p95 ${metrics.p95}ms. Current deployed: ${state.version}. All figures are simulated.`;
    default: return "I am in offline demo mode. Try “increase traffic”, “deploy”, “show status” or “reset”.";
  }
}
