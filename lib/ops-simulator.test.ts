import { describe, expect, it } from "vitest";
import { advanceLab, advanceTelemetry, chartPoints, failureStage, inferLabIntent, initialLab, labMetrics, localLabReply, PIPELINE_STAGES, runLabAction } from "./ops-simulator";

function finish(state: ReturnType<typeof initialLab>) {
  let s = state;
  for (let i = 0; i < PIPELINE_STAGES.length && s.pipelineStatus === "running"; i++) s = advanceLab(s);
  return s;
}
describe("Synthetic AI Ops lab (no infrastructure or network)", () => {
  it("starts at the stable baseline and repeats its deterministic charts", () => {
    const lab = initialLab();
    expect(labMetrics(lab)).toMatchObject({ nodes: 3, replicas: 3, ready: 3, version: "v1.8.2", podsPerNode: [1,1,1] });
    expect(chartPoints(lab)).toEqual(chartPoints(initialLab()));
    expect(chartPoints(lab)).toHaveLength(36);
  });
  it("updates synthetic metrics gently on the telemetry clock, preserving deployment state", () => {
    const baseline = initialLab();
    const first = advanceTelemetry(baseline);
    const second = advanceTelemetry(first);
    const a = labMetrics(baseline), b = labMetrics(first), c = labMetrics(second);
    expect(a).toMatchObject({ rps: 246, p95: 78, errors: "0.02%", cpu: 39, ram: 45 });
    expect(b.rps).not.toBe(a.rps);
    expect(b.p95).not.toBe(a.p95);
    expect(b.rps).toBeGreaterThan(230);
    expect(b.rps).toBeLessThan(263);
    expect(c.rps).not.toBe(a.rps);
    expect(first.pipelineStatus).toBe("idle");
    expect(first.attempt).toBe(0);
    expect(first.version).toBe(baseline.version);
    expect(chartPoints(first).at(-1)).toBe(b.rps);
    expect(labMetrics({ ...first }).rps).toBe(b.rps);
    expect(labMetrics(runLabAction(first, "reset")).rps).toBe(246);

    const surged = runLabAction(baseline, "surge");
    expect(labMetrics(surged).rps).toBe(972);
    const surgeTick = advanceTelemetry(surged);
    const changed = labMetrics(surgeTick);
    expect(changed.rps).toBeGreaterThan(940);
    expect(changed.rps).toBeLessThan(1005);
    expect(changed.cpu).toBeGreaterThanOrEqual(72);
    expect(changed.cpu).toBeLessThanOrEqual(80);
    expect(changed.errors).toMatch(/^0\\.\d{2}%$/);
    expect(chartPoints(surgeTick).at(-1)).toBe(changed.rps);
    expect(changed.podsPerNode).toEqual([2, 2, 1]);
    expect(changed.replicas).toBe(5);
  });
  it("scales workload icons per worker and keeps their total equal to replicas", () => {
    const high = runLabAction(initialLab(), "surge");
    const scaled = labMetrics(high);
    expect(scaled).toMatchObject({ rps: 972, replicas: 5, ready: 5, podsPerNode: [2, 2, 1] });
    expect(scaled.podsPerNode.reduce((total, count) => total + count, 0)).toBe(scaled.replicas);
    expect(labMetrics(runLabAction(high, "normalize"))).toMatchObject({ rps: 246, replicas: 3, podsPerNode: [1,1,1] });
  });
  it("every run creates a new candidate, success advances deployed version, reset restores baseline", () => {
    let s = initialLab();
    for (const next of ["v1.8.3", "v1.8.4"]) {
      s = runLabAction(s, "deploy");
      expect(s.candidateVersion).toBe(next);
      expect(runLabAction(s, "deploy")).toEqual(s);
      s = finish(s);
      expect(s.pipelineStatus).toBe("success");
      expect(s.version).toBe(next);
    }
    s = runLabAction(s, "reset");
    expect(s.version).toBe("v1.8.2");
    expect(s.attempt).toBe(0);
    expect(s.pipelineStep).toBe(-1);
  });
  it("v1.8.5 fails the build, next candidate fixes it without promoting failed code", () => {
    let s = initialLab();
    s = finish(runLabAction(s, "deploy"));
    s = finish(runLabAction(s, "deploy"));
    s = finish(runLabAction(s, "deploy"));
    expect(s.pipelineStatus).toBe("failed");
    expect(s.failedStage).toBe(1);
    expect(s.candidateVersion).toBe("v1.8.5");
    expect(s.version).toBe("v1.8.4");
    expect(s.events[0].message).toContain("Build failed");
    s = finish(runLabAction(s, "deploy"));
    expect(s.pipelineStatus).toBe("success");
    expect(s.version).toBe("v1.8.6");
  });
  it("v1.8.9 fails security; later candidate can recover and some builds take longer", () => {
    let s = initialLab();
    for (let n = 1; n <= 7; n++) s = finish(runLabAction(s, "deploy"));
    expect(s.pipelineStatus).toBe("failed");
    expect(s.failedStage).toBe(2);
    expect(s.candidateVersion).toBe("v1.8.9");
    expect(s.version).toBe("v1.8.8");
    expect(s.events[0].message).toContain("Security failed");
    s = runLabAction(s, "deploy");
    expect(s.candidateVersion).toBe("v1.8.10");
    expect(s.durations[1]).toBeGreaterThan(s.durations[0]);
    s = finish(s);
    expect(s.version).toBe("v1.8.10");
  });
  it("varying durations are repeatable per run but different across versions", () => {
    const a = runLabAction(initialLab(), "deploy");
    const b = runLabAction(finish(a), "deploy");
    expect(a.durations).not.toEqual(b.durations);
    expect(failureStage(3)).toBe(1);
    expect(failureStage(7)).toBe(2);
    expect(failureStage(1)).toBeNull();
  });
  it("understands tightly scoped English and Persian commands", () => {
    expect(inferLabIntent("increase traffic")).toBe("surge");
    expect(inferLabIntent("ترافیک را افزایش بده")).toBe("surge");
    expect(inferLabIntent("run a deploy")).toBe("deploy");
    expect(inferLabIntent("انتشار نسخه")).toBe("deploy");
    expect(inferLabIntent("normal traffic")).toBe("normalize");
    expect(inferLabIntent("وضعیت کلاستر")).toBe("inspect");
    expect(inferLabIntent("reset")).toBe("reset");
    expect(inferLabIntent("execute arbitrary shell command")).toBeNull();
    expect(inferLabIntent("x".repeat(241))).toBeNull();
  });
  it("does not present synthetic information as real system health", () => {
    expect(localLabReply("inspect", initialLab())).toContain("simulated");
    expect(runLabAction(initialLab(), "reset").version).toBe("v1.8.2");
  });
});
