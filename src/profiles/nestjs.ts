import type { FrameworkProfile, RuntimeEvent } from "./types.js";

export type NestjsLogMode = "simple" | "middle" | "heavy";

const simpleStartup: readonly RuntimeEvent[] = [
  { level: 30, context: "NestFactory", message: "Starting Nest application..." },
  { level: 30, context: "InstanceLoader", message: "AppModule dependencies initialized" },
  { level: 30, context: "RoutesResolver", message: "AppController {/}:" },
  { level: 30, context: "RouterExplorer", message: "Mapped {/, GET} route" },
  { level: 30, context: "NestApplication", message: "Nest application successfully started" }
];

const middleStartup: readonly RuntimeEvent[] = [
  ...simpleStartup,
  { level: 30, context: "ConfigService", message: "Loaded environment profile startup" },
  { level: 30, context: "CacheModule", message: "In-memory cache warmed for bootstrap checks" },
  { level: 30, context: "HealthIndicator", message: "Readiness probe registered at /health" },
  { level: 30, context: "Bootstrap", message: "Startup checks completed in 184ms" }
];

const heavyStartup: readonly RuntimeEvent[] = [
  ...middleStartup,
  { level: 30, context: "OpenTelemetryModule", message: "Trace exporter connected" },
  { level: 30, context: "AuthzPolicyModule", message: "Policy bundle warmed" },
  { level: 30, context: "QueueOrchestrator", message: "Priority queues attached with backpressure guards" },
  { level: 30, context: "AuditPipeline", message: "Immutable audit stream ready" },
  { level: 30, context: "SloMonitor", message: "Latency and error-budget monitors armed" }
];

const runtimeByMode: Record<NestjsLogMode, readonly RuntimeEvent[]> = {
  simple: [{ level: 30, context: "NestApplication", message: "Application heartbeat accepted" }],
  middle: [
    { level: 30, context: "RequestLogger", message: "GET /health 200 +2ms" },
    { level: 30, context: "Scheduler", message: "Startup metrics snapshot published" }
  ],
  heavy: [
    { level: 30, context: "TraceSampler", message: "Span batch exported traceId=7f3c8b2a9d01" },
    { level: 30, context: "PolicyDecisionPoint", message: "Authorization decision cached tenant=acme scope=read:metrics" },
    { level: 30, context: "AuditPipeline", message: "Audit envelope committed partition=security offset=1842" }
  ]
};

export function createNestjsProfile(mode: NestjsLogMode): FrameworkProfile {
  return {
    id: `nestjs-${mode}`,
    label: `NestJS ${mode}`,
    loggerName: "nestjs",
    format: "nestjs",
    intervalMs: mode === "heavy" ? 1500 : mode === "middle" ? 2500 : 3000,
    startup: startupForMode(mode),
    runtime: runtimeByMode[mode],
    shutdown: [
      { level: 30, context: "NestApplication", message: "Closing Nest application" },
      { level: 30, context: "NestApplication", message: "Nest application shutdown complete" }
    ]
  };
}

function startupForMode(mode: NestjsLogMode): readonly RuntimeEvent[] {
  switch (mode) {
    case "heavy":
      return heavyStartup;
    case "middle":
      return middleStartup;
    case "simple":
      return simpleStartup;
  }
}
