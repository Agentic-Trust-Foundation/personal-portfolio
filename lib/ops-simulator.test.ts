import { describe, expect, it } from "vitest";
import { advanceLab, chartPoints, inferLabIntent, initialLab, labMetrics, localLabReply, PIPELINE_STAGES, runLabAction } from "./ops-simulator";

describe("AI Ops lab (local-only, synthetic)", () => {
  it("starts healthy and deterministic", () => {
    const lab = initialLab();
    expect(labMetrics(lab)).toMatchObject({ nodes: 3, replicas: 3, ready: 3, version: "v1.8.2" });
    expect(chartPoints(lab)).toEqual(chartPoints(initialLab()));
    expect(chartPoints(lab)).toHaveLength(36);
  });
  it("models a traffic surge and safe recovery without remote calls", () => {
    const surge = runLabAction(initialLab(), "surge");
    expect(labMetrics(surge)).toMatchObject({ rps: 972, replicas: 5, ready: 5 });
    const recovered = runLabAction(surge, "normalize");
    expect(labMetrics(recovered)).toMatchObject({ rps: 246, replicas: 3, ready: 3 });
  });
  it("performs a full synthetic CI/CD rollout and changes the demo version", () => {
    let lab = runLabAction(initialLab(), "deploy");
    expect(lab.pipelineStep).toBe(0);
    expect(runLabAction(lab, "deploy")).toEqual(lab);
    for (let n = 0; n < PIPELINE_STAGES.length; n++) lab = advanceLab(lab);
    expect(lab.pipelineStep).toBe(PIPELINE_STAGES.length);
    expect(lab.version).toBe("v1.8.3");
    expect(lab.events[0].message).toContain("rolling update complete");
    expect(advanceLab(lab)).toEqual(lab);
  });
  it("understands tightly scoped English and Persian instructions", () => {
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
  it("does not pretend a local demo is live AI or production telemetry", () => {
    expect(localLabReply(null, initialLab())).toContain("Cloudflare AI is not connected");
    expect(localLabReply("inspect", initialLab())).toContain("simulated");
    expect(runLabAction(initialLab(), "reset").version).toBe("v1.8.2");
  });
});
