/**
 * Entirely synthetic, deterministic operations lab. No infrastructure is touched.
 * The UI and local intent router work without network access or AI credentials.
 */
export const PIPELINE_STAGES = ["Checks", "Build", "Security", "Rollout", "Health"] as const;
export type LabIntent = "surge" | "normalize" | "deploy" | "inspect" | "reset";
export type Traffic = "normal" | "surge";
export type LabEvent = { id: number; message: string; kind: "info" | "good" | "warning" };
export type LabState = {
  traffic: Traffic;
  pipelineStep: number; // -1 idle; 0..4 active; 5 finished
  version: "v1.8.2" | "v1.8.3";
  tick: number;
  events: LabEvent[];
};
export function initialLab(): LabState {
  return {
    traffic: "normal", pipelineStep: -1, version: "v1.8.2", tick: 0,
    events: [
      { id: 2, kind: "good", message: "All services healthy · 3/3 replicas ready" },
      { id: 1, kind: "info", message: "Interactive lab booted · simulated data only" },
    ],
  };
}
const addEvent = (state: LabState, message: string, kind: LabEvent["kind"]): LabState => ({
  ...state,
  events: [{ id: state.tick + 10 + (state.events[0]?.id ?? 0), message, kind }, ...state.events].slice(0, 5),
});
export function runLabAction(state: LabState, action: LabIntent): LabState {
  switch (action) {
    case "surge":
      return addEvent({ ...state, traffic: "surge", tick: state.tick + 1 }, "Traffic surge · autoscaler increased replicas to 5", "warning");
    case "normalize":
      return addEvent({ ...state, traffic: "normal", tick: state.tick + 1 }, "Traffic normalized · replicas scaled down to 3", "good");
    case "deploy":
      if (state.pipelineStep >= 0 && state.pipelineStep < PIPELINE_STAGES.length) return state;
      return addEvent({ ...state, pipelineStep: 0, tick: state.tick + 1 }, "Release candidate v1.8.3 queued · Checks", "info");
    case "inspect":
      return addEvent({ ...state, tick: state.tick + 1 }, "Inspect requested · metrics are synthetic", "info");
    case "reset":
      return addEvent(initialLab(), "Demo reset · no real infrastructure affected", "good");
  }
}
export function advanceLab(state: LabState): LabState {
  if (state.pipelineStep < 0 || state.pipelineStep >= PIPELINE_STAGES.length) return state;
  const nextStep = state.pipelineStep + 1;
  if (nextStep === PIPELINE_STAGES.length) {
    return addEvent({ ...state, pipelineStep: nextStep, version: "v1.8.3", tick: state.tick + 1 }, "Release v1.8.3 healthy · rolling update complete", "good");
  }
  return addEvent({ ...state, pipelineStep: nextStep, tick: state.tick + 1 }, "Pipeline · " + PIPELINE_STAGES[nextStep], "info");
}
export function labMetrics(state: LabState) {
  const high = state.traffic === "surge";
  const inRollout = state.pipelineStep === 3;
  return {
    rps: high ? 972 : 246,
    p95: high ? 192 : 78,
    errors: high ? "0.18%" : "0.02%",
    cpu: high ? 76 : 39,
    ram: high ? 68 : 45,
    replicas: high ? 5 : 3,
    nodes: 3,
    ready: inRollout ? (high ? 4 : 2) : (high ? 5 : 3),
    version: state.version,
  };
}
export function chartPoints(state: LabState, count = 36): number[] {
  const high = state.traffic === "surge";
  return Array.from({ length: count }, (_, i) => {
    const wave = Math.sin((i + state.tick) * .61) * 11 + Math.cos(i * .23) * 8;
    const rising = high ? (i < count * .55 ? i * 7 : 190) : 0;
    return Math.round(130 + rising + wave + (i % 7 === 0 ? 15 : 0));
  });
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
    case "deploy": return "Starting a simulated release. Follow Checks → Build → Security → Rollout → Health below.";
    case "reset": return "Lab reset to its original healthy state.";
    case "inspect": return `Demo cluster: ${metrics.nodes} nodes · ${metrics.ready}/${metrics.replicas} replicas · ${metrics.rps} RPS · p95 ${metrics.p95}ms. All figures are simulated.`;
    default: return "I am in offline demo mode. Try “increase traffic”, “deploy”, “show status” or “reset”. Real Cloudflare AI is not connected.";
  }
}
