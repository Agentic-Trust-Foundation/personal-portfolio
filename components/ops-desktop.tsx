"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Activity, ArrowRight, ArrowUpRight, Boxes, Check, ChevronRight,
  CircleDot, Cpu, FileText, GitBranch, HeartPulse, House, Layers,
  Play, RotateCcw, Send, Server, ShieldCheck, Sparkles, X,
  Terminal, Workflow, Zap,
} from "lucide-react";
import {
  advanceLab, advanceTelemetry, chartPoints, inferLabIntent, initialLab, labMetrics, localLabReply,
  PIPELINE_STAGES, runLabAction, type LabIntent,
} from "@/lib/ops-simulator";

type Theme = "dark" | "light";
type AiMode = "offline" | "online";
type Message = { id: number; kind: "user" | "agent"; text: string; via?: "demo" | "cloudflare" };
type Panel = "monitoring" | "cluster" | "pipeline" | "agent";
type Props = { visible: boolean; theme: Theme; onRestore: () => void; onHome: () => void; onThemeToggle: () => void; aiEndpoint?: string };

const AI_ENDPOINT = process.env.NEXT_PUBLIC_OPS_AI_ENDPOINT?.trim() || "";
const AI_TURN_LIMIT = 3;
const VALID_INTENTS: LabIntent[] = ["surge", "normalize", "deploy", "inspect", "reset"];
const SAMPLE_ACTIONS: { label: string; input: string; action: LabIntent }[] = [
  { label: "Spike traffic", input: "Increase traffic and show how the cluster reacts", action: "surge" },
  { label: "Ship a release", input: "Deploy the next release", action: "deploy" },
  { label: "Explain status", input: "Explain the current cluster status", action: "inspect" },
];
const NODE_NAMES = ["worker-01", "worker-02", "worker-03"];
const INITIAL_MESSAGES: Message[] = [
  { id: 0, kind: "agent", text: "Welcome to the lab. Raise traffic, simulate a release, or inspect the cluster. Nothing here touches production.", via: "demo" },
];

export default function OpsDesktop({ visible, theme, onRestore, onHome, onThemeToggle, aiEndpoint = AI_ENDPOINT }: Props) {
  const [lab, setLab] = useState(initialLab);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => INITIAL_MESSAGES);
  const [busy, setBusy] = useState(false);
  const [remoteUsed, setRemoteUsed] = useState(0);
  // Owner-controlled Cloudflare status. Visitors have no mode toggle.
  // Until the server confirms AI_ENABLED=true, everyone uses Offline Demo.
  const [aiMode, setAiMode] = useState<AiMode>("offline");
  const [aiBlocked, setAiBlocked] = useState(false);
  const aiModeRef = useRef<AiMode>("offline");
  const activeAiRequest = useRef<AbortController | null>(null);
  const [focusPanel, setFocusPanel] = useState<Panel>("agent");
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageId = useRef(0);
  const msgBottomRef = useRef<HTMLDivElement>(null);
  const metrics = labMetrics(lab);
  const isDeploying = lab.pipelineStatus === "running";
  const isAiConfigured = aiEndpoint.startsWith("https://");
  const aiOnline = isAiConfigured && !aiBlocked && remoteUsed < AI_TURN_LIMIT && aiMode === "online";

  useEffect(() => {
    // Abort any pending request if this screen is removed. An already running
    // inference cannot be retroactively canceled at the provider.
    return () => { activeAiRequest.current?.abort(); };
  }, []);

  useEffect(() => {
    if (!visible || !isAiConfigured) return;
    let alive = true;
    let statusAbort: AbortController | null = null;
    const checkOwnerStatus = async () => {
      statusAbort?.abort();
      const controller = new AbortController();
      statusAbort = controller;
      const timeout = window.setTimeout(() => controller.abort(), 4500);
      try {
        const statusUrl = new URL(aiEndpoint);
        if (statusUrl.protocol !== "https:" || !statusUrl.pathname.endsWith("/intent")) {
          throw new Error("Unexpected AI endpoint");
        }
        statusUrl.pathname = statusUrl.pathname.slice(0, -"/intent".length) + "/status";
        const response = await fetch(statusUrl.toString(), {
          method: "GET", cache: "no-store", signal: controller.signal,
          headers: { "Accept": "application/json" },
        });
        const result: unknown = response.ok ? await response.json() : null;
        const available = result && typeof result === "object" && "aiEnabled" in result &&
          (result as { aiEnabled?: unknown }).aiEnabled === true &&
          "mode" in result && (result as { mode?: unknown }).mode === "online";
        if (!alive || controller.signal.aborted) return;
        aiModeRef.current = available ? "online" : "offline";
        setAiMode(aiModeRef.current);
        if (!available) activeAiRequest.current?.abort();
      } catch {
        if (!alive || controller.signal.aborted && statusAbort !== controller) return;
        aiModeRef.current = "offline";
        setAiMode("offline");
        activeAiRequest.current?.abort();
      } finally {
        window.clearTimeout(timeout);
      }
    };
    void checkOwnerStatus();
    // Status checks do not invoke AI. A slow poll avoids excess Worker reads;
    // POST still rejects immediately when the owner server switch is OFF.
    const interval = window.setInterval(() => {
      if (!document.hidden) void checkOwnerStatus();
    }, 180_000);
    const onReturn = () => { if (!document.hidden) void checkOwnerStatus(); };
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      alive = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onReturn);
      statusAbort?.abort();
    };
  }, [visible, isAiConfigured, aiEndpoint]);

  useEffect(() => {
    if (!visible || !isDeploying) return;
    const delay = lab.durations[lab.pipelineStep] ?? 1150;
    const timer = window.setTimeout(() => setLab((previous) => advanceLab(previous)), delay);
    return () => window.clearTimeout(timer);
  }, [visible, isDeploying, lab.pipelineStep, lab.durations]);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setInterval(() => setLab(advanceTelemetry), 4600);
    return () => window.clearInterval(timer);
  }, [visible]);

  const samples = useMemo(() => chartPoints(lab), [lab]);
  const graph = useMemo(() => samples.map((value, index) =>
    `${(index * 100 / (samples.length - 1)).toFixed(2)},${(94 - value * .085).toFixed(2)}`
  ).join(" "), [samples]);

  const appendResponse = (input: string, reply: string, via: Message["via"]) => {
    setMessages((previous) => [
      ...previous.slice(-7),
      { id: ++messageId.current, kind: "user", text: input },
      { id: ++messageId.current, kind: "agent", text: reply, via },
    ]);
    window.requestAnimationFrame(() => msgBottomRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" }));
  };

  const runDemo = (input: string, forced?: LabIntent) => {
    const action = forced ?? inferLabIntent(input);
    const next = action ? runLabAction(lab, action) : lab;
    if (action) setLab((previous) => runLabAction(previous, action));
    appendResponse(input, localLabReply(action, next), "demo");
  };

  async function submitPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = prompt.trim().slice(0, 240);
    if (!input || busy) return;
    setPrompt("");

    // No network calls until the owner explicitly configures the separate
    // free-only Cloudflare Worker. The local lab always remains usable.
    if (!aiOnline) {
      runDemo(input);
      return;
    }
    setBusy(true);
    setRemoteUsed((count) => count + 1);
    const abort = new AbortController();
    activeAiRequest.current = abort;
    const timer = window.setTimeout(() => abort.abort(), 6500);
    try {
      const response = await fetch(aiEndpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input }), signal: abort.signal,
      });
      if (!response.ok) throw new Error("Worker unavailable");
      const result: unknown = await response.json();
      if (abort.signal.aborted || aiModeRef.current !== "online") {
        // The visitor switched to Offline while the request was in flight.
        runDemo(input);
        return;
      }
      if (!result || typeof result !== "object") throw new Error("Invalid result");
      const { action, reply } = result as { action?: unknown; reply?: unknown };
      const safe = VALID_INTENTS.includes(action as LabIntent) ? action as LabIntent : null;
      if (safe) setLab((previous) => runLabAction(previous, safe));
      appendResponse(input, typeof reply === "string" ? reply.slice(0, 250) : localLabReply(safe, lab), "cloudflare");
    } catch {
      if (abort.signal.aborted && aiModeRef.current === "offline") {
        // Manual OFF always wins; resolve this submitted prompt locally.
        runDemo(input);
      } else {
        const action = inferLabIntent(input);
        if (action) setLab((previous) => runLabAction(previous, action));
        appendResponse(input, "Cloudflare AI is unavailable or out of free quota. Switched to the local demo. " + localLabReply(action, lab), "demo");
        setAiBlocked(true);
        aiModeRef.current = "offline";
        setAiMode("offline");
      }
    } finally {
      window.clearTimeout(timer);
      if (activeAiRequest.current === abort) activeAiRequest.current = null;
      if (remoteUsed + 1 >= AI_TURN_LIMIT) {
        // These are convenience limits, not a billing boundary; the Free
        // Cloudflare plan and Worker-side kill switch remain mandatory.
        aiModeRef.current = "offline";
        setAiMode("offline");
      }
      setBusy(false);
    }
  }

  function openPanel(panel: Panel) {
    setFocusPanel(panel);
    scrollRef.current?.querySelector("#ops-" + panel)?.scrollIntoView?.({
      behavior: "smooth", block: "nearest", inline: "nearest",
    });
  }

  function restartLab() {
    // Restart the visual simulation without reloading the CV or granting
    // additional Cloudflare calls. AI owner status and per-visit cap persist.
    setLab(initialLab());
    setPrompt("");
    setMessages(INITIAL_MESSAGES);
    messageId.current = 0;
    setFocusPanel("agent");
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }

  return (
    <section className="ops-desktop" data-theme={theme} aria-label="AI Ops interactive desktop" aria-hidden={!visible}>
      <div className="ops-wallpaper" aria-hidden="true" />
      <header className="ops-menubar">
        <div className="ops-brand"><span className="ops-brand-symbol"><Layers size={16}/></span>
          <span>hossein<span className="ops-brand-muted"> / workspace</span></span>
          <span className="ops-brand-beta">LAB 01</span>
        </div>
        <div className="ops-menubar-right">
          <span className="ops-live"><span /> SIMULATED · NO LIVE SYSTEMS</span>
          <button type="button" className="ops-toolbar-action" onClick={onHome}
            aria-label="Back to CV home screen" title="Back to welcome screen">
            <House size={14} aria-hidden="true"/><span>HOME</span>
          </button>
          <button type="button" className="ops-toolbar-action" onClick={restartLab}
            disabled={busy} aria-label="Restart AI Ops playground" title="Restart this demo">
            <RotateCcw size={14} aria-hidden="true"/><span>RESTART</span>
          </button>
          <button type="button" className="ops-theme" onClick={onThemeToggle} aria-label="Toggle desktop light and dark theme">{theme === "dark" ? "LIGHT" : "DARK"}</button>
        </div>
      </header>

      <div ref={scrollRef} className="ops-scroll">
        <div className="ops-main">
          <div className="ops-intro">
            <div><p className="ops-kicker"><span>01</span> / A SMALL SPACE TO EXPERIMENT</p>
              <h1>AI & Platform <em>Playground.</em></h1>
              <p className="ops-intro-text">What happens when traffic spikes or a new version ships? Try it. Watch the system respond. Ask the little lab assistant.</p>
            </div>
            <div className="ops-intro-right"><span className="ops-intro-index">SYSTEM STATUS</span><div className="ops-overview-status"><span /> {isDeploying ? "PIPELINE RUNNING" : lab.pipelineStatus === "failed" ? "RELEASE BLOCKED" : lab.traffic === "surge" ? "AUTOSCALING" : "LAB HEALTHY"}</div><small>3 NODES / SANDBOX</small></div>
          </div>
          <div className="ops-dashboard">
            <article id="ops-monitoring" className={`ops-panel ops-monitoring ${focusPanel === "monitoring" ? "ops-panel-focused" : ""}`} aria-label="Observability dashboard">
              <div className="ops-panel-header"><div className="ops-panel-title"><Activity size={17}/><span>Observability</span><span className="ops-panel-sub">/ DEMO-WEB</span></div><span className="ops-panel-indicator"><i/> LIVE SIM</span></div>
              <div className="ops-metrics">
                <div className="ops-metric"><span>REQUESTS / SEC</span><strong>{metrics.rps.toLocaleString()}</strong><small><ArrowUpRight size={12}/> RPS</small></div>
                <div className="ops-metric"><span>P95 LATENCY</span><strong>{metrics.p95}<sub>ms</sub></strong><small>HTTP response</small></div>
                <div className="ops-metric"><span>ERROR RATE</span><strong>{metrics.errors}</strong><small>5xx · simulated</small></div>
                <div className="ops-metric"><span>CPU USAGE</span><strong>{metrics.cpu}<sub>%</sub></strong><small>Across 3 nodes</small></div>
              </div>
              <div className="ops-chart-top"><span>Traffic over time</span><span className="ops-chart-range">LAST 5 MINUTES <ChevronRight size={12}/></span></div>
              <div className="ops-chart">
                <div className="ops-chart-grid" aria-hidden="true"><span>1.0k</span><span>500</span><span>0</span></div>
                <svg aria-label="Simulated request-rate history" role="img" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs><linearGradient id="ops-chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--ops-accent)" stopOpacity=".27"/><stop offset="100%" stopColor="var(--ops-accent)" stopOpacity=".01"/></linearGradient></defs>
                  <path d="M0 25H100 M0 55H100 M0 85H100" stroke="var(--ops-grid)" strokeWidth=".45" strokeDasharray="2,2" fill="none"/>
                  <polygon points={`0,100 ${graph} 100,100`} fill="url(#ops-chart-fill)"/>
                  <polyline points={graph} stroke="var(--ops-accent)" strokeWidth="1.3" fill="none" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="ops-chart-footer"><span>−5 MIN</span><span>−3 MIN</span><span>−1 MIN</span><span>NOW</span></div>
              <div className="ops-traffic-control"><span><Zap size={14}/> TRAFFIC SCENARIO</span><div className="ops-pills"><button type="button" aria-pressed={lab.traffic === "normal"} onClick={() => setLab((p) => runLabAction(p, "normalize"))}>Normal</button><button type="button" aria-pressed={lab.traffic === "surge"} onClick={() => setLab((p) => runLabAction(p, "surge"))}>Surge ↗</button></div></div>
            </article>

            <article id="ops-cluster" className={`ops-panel ops-cluster ${focusPanel === "cluster" ? "ops-panel-focused" : ""}`} aria-label="Kubernetes cluster visualizer">
              <div className="ops-panel-header"><div className="ops-panel-title"><Boxes size={17}/><span>Kubernetes</span></div><span className="ops-panel-indicator"><i/> SANDBOX</span></div>
              <div className="ops-cluster-head">
                <div><span className="ops-cluster-caption">WORKLOAD</span><strong>demo-web</strong><small>Deployment · {lab.version}</small></div>
                <div className="ops-replica-count"><strong>{metrics.ready}<span>/{metrics.replicas}</span></strong><small>READY PODS</small></div>
              </div>
              <div className="ops-node-grid">
                {NODE_NAMES.map((name, index) => {
                  const pods = metrics.podsPerNode[index];
                  return (
                    <div key={name} className="ops-node">
                      <div className="ops-node-head"><Server size={13}/><span>{name}</span><i/></div>
                      <div className={`ops-cpu-fans ${lab.traffic === "surge" ? "ops-cpu-fans-busy" : ""}`} aria-label={`${pods} animated CPU fan indicator${pods === 1 ? "" : "s"} on ${name}`}>
                        {Array.from({ length: pods }, (_, fan) => (
                          <span key={fan} className="ops-fan-shell" title="Synthetic CPU load · rotating cooling fan">
                            <span className="ops-fan-rotor" aria-hidden="true"><i/><i/><i/><i/></span>
                          </span>
                        ))}
                      </div>
                      <div className="ops-pods">{Array.from({ length: pods }, (_, p) => <span className={`ops-pod ${isDeploying && lab.pipelineStep === 3 && index === 2 && p === 0 ? "ops-pod-updating" : ""}`} key={p} title="demo-web pod (simulated)"><Cpu size={11}/></span>)}</div>
                    </div>
                  );
                })}
              </div>
              <div className="ops-capacity">
                <div><span>CPU</span><span>{metrics.cpu}%</span></div><div className="ops-capacity-track"><i style={{ width: metrics.cpu + "%" }}/></div>
                <div><span>MEMORY</span><span>{metrics.ram}%</span></div><div className="ops-capacity-track"><i style={{ width: metrics.ram + "%" }}/></div>
              </div>
              <div className="ops-cluster-foot"><span><CircleDot size={12}/> 3 NODES READY</span><span>HPA {metrics.replicas} REPLICAS</span></div>
            </article>

            <article id="ops-pipeline" className={`ops-panel ops-pipeline ${focusPanel === "pipeline" ? "ops-panel-focused" : ""}`} aria-label="CI/CD pipeline simulation">
              <div className="ops-panel-header"><div className="ops-panel-title"><GitBranch size={17}/><span>CI / CD</span><span className="ops-panel-sub">/ DELIVERY</span></div><span className="ops-panel-indicator"><i/> SIMULATED</span></div>
              <div className="ops-pipeline-overview"><div><span className="ops-cluster-caption">DEPLOYED VERSION</span><strong>{lab.version}</strong><small>demo-web · main</small>
                {lab.candidateVersion && <div className={`ops-candidate ops-candidate-${lab.pipelineStatus}`} aria-live="polite">
                  {lab.pipelineStatus === "running" ? "BUILDING" : lab.pipelineStatus === "failed" ? "FAILED" : "SHIPPED"} CANDIDATE {lab.candidateVersion}
                </div>}</div>
                <button className="ops-run" type="button" onClick={() => setLab((p) => runLabAction(p, "deploy"))} disabled={isDeploying}>
                  <Play size={13} fill="currentColor"/>{isDeploying ? "RUNNING..." : lab.pipelineStatus === "failed" ? "FIX & RETRY" : lab.attempt > 0 ? "RUN NEXT" : "RUN DEMO"}
                </button>
              </div>
              <div className="ops-stages">
                {PIPELINE_STAGES.map((stage, index) => {
                  const done = lab.pipelineStatus === "success" || lab.pipelineStep > index;
                  const active = lab.pipelineStatus === "running" && lab.pipelineStep === index;
                  const failed = lab.pipelineStatus === "failed" && lab.failedStage === index;
                  return <div className={`ops-stage ${done ? "ops-stage-done" : ""} ${active ? "ops-stage-active" : ""} ${failed ? "ops-stage-failed" : ""}`} key={stage}>
                    <div className="ops-stage-icon">{failed ? <X size={13}/> : done ? <Check size={13}/> : active ? <span className="ops-stage-pulse"/> : <span className="ops-stage-index">{index + 1}</span>}</div><span>{stage}</span>
                  </div>;
                })}
              </div>
              <div className="ops-event-feed"><div className="ops-event-title">RECENT ACTIVITY <span>LOCAL EVENTS ONLY</span></div>
                {lab.events.slice(0, 4).map((ev) => <div className="ops-event" key={ev.id}><span className={`ops-event-dot ops-event-${ev.kind}`}/><span>{ev.message}</span></div>)}
              </div>
            </article>

            <article id="ops-agent" className={`ops-panel ops-agent ${focusPanel === "agent" ? "ops-panel-focused" : ""}`} aria-label="AI lab assistant">
              <div className="ops-panel-header"><div className="ops-panel-title"><Sparkles size={17}/><span>Workspace Agent</span></div><span className="ops-ai-status" aria-live="polite">{aiOnline ? "CLOUDFLARE AI · OWNER ENABLED" : "OFFLINE DEMO"}</span></div>
              <div className="ops-ai-mode-control" role="status" aria-live="polite">
                <span>AI AVAILABILITY</span>
                <span className={`ops-ai-mode-label ${aiOnline ? "ops-ai-mode-label-online" : ""}`}>
                  <span className="ops-ai-mode-dot" aria-hidden="true"/>
                  {aiOnline ? "AI ENABLED BY SITE OWNER" : "OFFLINE · OWNER CONTROLLED"}
                </span>
              </div>
              <div className="ops-ai-intro"><div className="ops-avatar"><Sparkles size={21}/></div><div><strong>Ask me to try something.</strong><p>{aiOnline ? "Cloudflare AI was enabled by the site owner. Quick actions remain local." : "Offline demo: commands run locally; only the site owner can enable Cloudflare AI."}</p></div></div>
              <div className="ops-ai-chips">{SAMPLE_ACTIONS.map((item) => <button key={item.label} type="button" onClick={() => runDemo(item.input, item.action)}>{item.label}<ArrowUpRight size={13}/></button>)}</div>
              <div className="ops-messages" role="log" aria-live="polite">{messages.slice(-5).map((message) =>
                <div className={`ops-msg ops-msg-${message.kind}`} key={message.id}><span>{message.kind === "agent" ? "LAB" : "YOU"}</span><p>{message.text}</p></div>
              )}<div ref={msgBottomRef}/></div>
              <form className="ops-agent-form" onSubmit={submitPrompt}><label htmlFor="ops-agent-input" className="sr-only">Ask the ops lab assistant</label><input id="ops-agent-input" value={prompt} onChange={(event) => setPrompt(event.target.value)} disabled={busy} maxLength={240} placeholder="Try: increase traffic, deploy, show status..." autoComplete="off"/><button type="submit" disabled={!prompt.trim() || busy} aria-label="Send command to ops lab"><Send size={16}/></button></form>
              <div className="ops-ai-foot"><ShieldCheck size={13}/> {aiOnline
                ? `Cloudflare AI · owner enabled · ${AI_TURN_LIMIT - Math.min(remoteUsed, AI_TURN_LIMIT)} requests left this visit`
                : !isAiConfigured
                  ? "Offline · $0 AI usage · Cloudflare not connected yet"
                  : aiBlocked
                    ? "Offline · Cloudflare unavailable or quota exhausted for this visit"
                    : remoteUsed >= AI_TURN_LIMIT
                      ? "Offline · visit limit reached · no more AI requests"
                      : "Offline · Cloudflare controlled by site owner"}</div>
            </article>
          </div>

          <footer className="ops-footer"><span>CRAFTED FOR CURIOSITY, NOT PRODUCTION</span><span><HeartPulse size={13}/> ALL FIGURES ARE SYNTHETIC</span></footer>
        </div>
      </div>

      <nav className="ops-dock" aria-label="Desktop apps">
        <button className="ops-dock-main" type="button" onClick={onRestore} aria-label="Restore CV terminal" title="Restore terminal"><Terminal size={21}/><span>TERMINAL</span><i/></button>
        <div className="ops-dock-divider"/>
        <button type="button" onClick={() => openPanel("monitoring")} aria-label="Go to Monitoring" title="Monitoring"><Activity size={19}/></button>
        <button type="button" onClick={() => openPanel("cluster")} aria-label="Go to Kubernetes" title="Kubernetes"><Boxes size={19}/></button>
        <button type="button" onClick={() => openPanel("pipeline")} aria-label="Go to CI/CD" title="CI/CD"><Workflow size={19}/></button>
        <button type="button" onClick={() => openPanel("agent")} aria-label="Go to AI assistant" title="AI assistant"><Sparkles size={19}/></button>
        <div className="ops-dock-divider"/>
        <a href="/resume/" aria-label="Open resume" title="Read CV"><FileText size={19}/></a>
        <button className="ops-dock-reset" type="button" title="Restart simulated lab" aria-label="Reset demo workspace" disabled={busy} onClick={restartLab}><RotateCcw size={17}/></button>
      </nav>
      <div className="ops-corner" aria-hidden="true">LAB / 2026 <ArrowRight size={12}/></div>
    </section>
  );
}
