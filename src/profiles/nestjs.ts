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
  { level: 30, context: "InstanceLoader", message: "ConfigModule dependencies initialized" },
  { level: 30, context: "InstanceLoader", message: "DatabaseModule dependencies initialized" },
  { level: 30, context: "InstanceLoader", message: "CacheModule dependencies initialized" },
  { level: 30, context: "InstanceLoader", message: "HealthModule dependencies initialized" },
  { level: 30, context: "InstanceLoader", message: "UsersModule dependencies initialized" },
  { level: 30, context: "InstanceLoader", message: "OrdersModule dependencies initialized" },
  { level: 30, context: "ConfigService", message: "Loaded environment profile startup" },
  { level: 30, context: "DatabaseService", message: "Database pool ready primary=postgres replicas=1" },
  { level: 30, context: "CacheService", message: "Cache store warmed namespace=api ttl=60s" },
  { level: 30, context: "HealthController", message: "Mapped {/health, GET} route" },
  { level: 30, context: "SchedulerOrchestrator", message: "Registered 2 recurring jobs" },
  { level: 30, context: "Bootstrap", message: "Startup checks completed in 184ms" }
];

const heavyStartup: readonly RuntimeEvent[] = [
  ...simpleStartup,
  { level: 30, context: "InstanceLoader", message: "ConfigModule dependencies initialized" },
  { level: 30, context: "InstanceLoader", message: "DatabaseModule dependencies initialized" },
  { level: 30, context: "InstanceLoader", message: "CacheModule dependencies initialized" },
  { level: 30, context: "InstanceLoader", message: "HealthModule dependencies initialized" },
  { level: 30, context: "InstanceLoader", message: "UsersModule dependencies initialized" },
  { level: 30, context: "InstanceLoader", message: "OrdersModule dependencies initialized" },
  { level: 30, context: "InstanceLoader", message: "BillingModule dependencies initialized" },
  { level: 30, context: "InstanceLoader", message: "InventoryModule dependencies initialized" },
  { level: 30, context: "InstanceLoader", message: "NotificationsModule dependencies initialized" },
  { level: 30, context: "InstanceLoader", message: "AdminModule dependencies initialized" },
  { level: 30, context: "InstanceLoader", message: "AuthModule dependencies initialized" },
  { level: 30, context: "InstanceLoader", message: "RbacModule dependencies initialized" },
  { level: 30, context: "InstanceLoader", message: "QueueModule dependencies initialized" },
  { level: 30, context: "InstanceLoader", message: "OutboxModule dependencies initialized" },
  { level: 30, context: "InstanceLoader", message: "SchedulerModule dependencies initialized" },
  { level: 30, context: "InstanceLoader", message: "OpenTelemetryModule dependencies initialized" },
  { level: 30, context: "InstanceLoader", message: "AuditModule dependencies initialized" },
  { level: 30, context: "InstanceLoader", message: "SloModule dependencies initialized" },
  { level: 30, context: "DatabaseService", message: "Primary pool opened host=db.internal size=24" },
  { level: 30, context: "DatabaseService", message: "Replica pool opened host=db-ro.internal size=12" },
  { level: 30, context: "MigrationRunner", message: "Schema migrations verified version=2026042901" },
  { level: 30, context: "RbacService", message: "Role hierarchy indexed tenants=48 roles=312" },
  { level: 30, context: "PolicyDecisionPoint", message: "Policy bundle warmed rules=924" },
  { level: 30, context: "QueueWorker", message: "invoices queue consuming concurrency=8" },
  { level: 30, context: "OutboxDispatcher", message: "Outbox relay caught up lag=0ms" },
  { level: 30, context: "OpenTelemetryModule", message: "Trace exporter connected endpoint=otel-collector:4318" },
  { level: 30, context: "AuditPipeline", message: "Immutable audit stream ready topic=audit.events" },
  { level: 30, context: "SloMonitor", message: "Latency and error-budget monitors armed" }
];

const runtimeByMode: Record<NestjsLogMode, readonly RuntimeEvent[]> = {
  simple: [{ level: 30, context: "NestApplication", message: "Application heartbeat accepted" }],
  middle: [
    { level: 30, context: "RequestLogger", message: "GET /api/users 200 +18ms requestId=req-1024" },
    { level: 30, context: "DatabaseService", message: "query users.findMany completed duration=9ms rows=25" },
    { level: 30, context: "SchedulerOrchestrator", message: "published api.metrics snapshot duration=14ms" }
  ],
  heavy: [
    { level: 30, context: "RequestLogger", message: "POST /api/orders 201 +47ms requestId=req-8fb2 tenant=acme" },
    { level: 30, context: "DatabaseService", message: "query orders.insert completed duration=12ms rows=1" },
    { level: 30, context: "QueueWorker", message: "processed invoice.capture jobId=job-418 duration=83ms" },
    { level: 30, context: "PolicyDecisionPoint", message: "Authorization decision cached tenant=acme scope=orders:write" },
    { level: 30, context: "TraceSampler", message: "Span batch exported traceId=7f3c8b2a9d01 spans=42" },
    { level: 30, context: "AuditPipeline", message: "Audit envelope committed partition=security offset=1842" },
    { level: 30, context: "SloMonitor", message: "SLO snapshot p95=118ms errorRate=0.002 budget=99.2%" },
    { level: 30, context: "HealthAggregator", message: "Readiness snapshot database=up queue=up cache=up telemetry=up" }
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
      { level: 30, context: "QueueWorker", message: "Pausing queue consumers" },
      { level: 30, context: "DatabaseService", message: "Closing database pools" },
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
