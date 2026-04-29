# NestJS Log Fixtures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make NestJS `middle` and `heavy` logs feel like real DI-rich projects while keeping the shipped runtime lightweight.

**Architecture:** Add dev-only NestJS fixture source under `test/fixtures/nestjs` as an observation harness that is never compiled into `dist`. Strengthen profile tests first, then expand `src/profiles/nestjs.ts` with static event catalogs shaped by those fixtures. Keep the simulator formatter and runtime dependency boundary unchanged.

**Tech Stack:** TypeScript, Node.js built-in test runner, NestJS dev dependencies, existing simulator profile API.

---

### Task 1: Strengthen NestJS Profile Tests

**Files:**
- Modify: `test/nestjs-profile.test.ts`

- [ ] **Step 1: Add failing assertions for richer middle and heavy logs**

Replace the existing middle and heavy tests in `test/nestjs-profile.test.ts` with:

```ts
test("nestjs middle mode emits typical API service lifecycle logs", () => {
  const logs = runProfile("middle", 3).join("\n");

  assert.match(logs, /LOG \[InstanceLoader\] ConfigModule dependencies initialized/);
  assert.match(logs, /LOG \[InstanceLoader\] DatabaseModule dependencies initialized/);
  assert.match(logs, /LOG \[DatabaseService\] Database pool ready/);
  assert.match(logs, /LOG \[CacheService\] Cache store warmed/);
  assert.match(logs, /LOG \[HealthController\] Mapped \{\/health, GET\} route/);
  assert.match(logs, /LOG \[SchedulerOrchestrator\] Registered 2 recurring jobs/);
  assert.match(logs, /LOG \[RequestLogger\] GET \/api\/users 200/);
});

test("nestjs heavy mode emits DI-rich enterprise platform logs", () => {
  const logs = runProfile("heavy", 8).join("\n");

  const initializedModules = logs.match(/LOG \[InstanceLoader\] .* dependencies initialized/g) ?? [];
  assert.ok(initializedModules.length >= 12, `expected many initialized modules, got ${initializedModules.length}`);

  assert.match(logs, /LOG \[InstanceLoader\] BillingModule dependencies initialized/);
  assert.match(logs, /LOG \[InstanceLoader\] InventoryModule dependencies initialized/);
  assert.match(logs, /LOG \[DatabaseService\] Primary pool opened/);
  assert.match(logs, /LOG \[MigrationRunner\] Schema migrations verified/);
  assert.match(logs, /LOG \[RbacService\] Role hierarchy indexed/);
  assert.match(logs, /LOG \[PolicyDecisionPoint\] Policy bundle warmed/);
  assert.match(logs, /LOG \[QueueWorker\] invoices queue consuming/);
  assert.match(logs, /LOG \[OutboxDispatcher\] Outbox relay caught up/);
  assert.match(logs, /LOG \[OpenTelemetryModule\] Trace exporter connected/);
  assert.match(logs, /LOG \[AuditPipeline\] Immutable audit stream ready/);
  assert.match(logs, /LOG \[SloMonitor\] Latency and error-budget monitors armed/);
  assert.match(logs, /LOG \[RequestLogger\] POST \/api\/orders 201/);
  assert.match(logs, /LOG \[DatabaseService\] query orders\.insert completed/);
  assert.match(logs, /LOG \[QueueWorker\] processed invoice\.capture/);
  assert.match(logs, /LOG \[TraceSampler\] Span batch exported/);
  assert.match(logs, /LOG \[AuditPipeline\] Audit envelope committed/);
});
```

- [ ] **Step 2: Update the test helper so runtime rotations can be sampled**

Replace the current `runProfile` helper with:

```ts
function runProfile(mode: "simple" | "middle" | "heavy", ticks = 1): string[] {
  const profile = createNestjsProfile(mode);
  const logs: string[] = [];
  let tick: () => void = () => {};

  const simulator = createSimulator(profile, {
    logger: (line) => logs.push(line),
    now: () => new Date("2026-04-29T00:00:00.000Z"),
    hostname: "devbox",
    pid: 4242,
    setInterval: (callback) => {
      tick = callback;
      return 1;
    },
    clearInterval: () => {}
  });

  simulator.start();
  for (let index = 0; index < ticks; index += 1) {
    tick();
  }
  simulator.stop("SIGINT");

  return logs;
}
```

- [ ] **Step 3: Run the focused tests and verify they fail**

Run: `npm run build && node --test test/nestjs-profile.test.ts`

Expected: FAIL with missing middle/heavy log assertions.

- [ ] **Step 4: Commit the failing tests only**

```bash
git add test/nestjs-profile.test.ts
git commit -m "test: require richer NestJS profile logs"
```

### Task 2: Add Dev-Only NestJS Fixture Source

**Files:**
- Create: `test/fixtures/nestjs/log-fixtures.ts`
- Modify: `test/nestjs-profile.test.ts`

- [ ] **Step 1: Create fixture source with real Nest decorators and lifecycle providers**

Create `test/fixtures/nestjs/log-fixtures.ts`:

```ts
import "reflect-metadata";
import { Controller, Get, Injectable, Logger, Module, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";

@Injectable()
class FixtureLogger {
  readonly lines: string[] = [];

  log(context: string, message: string): void {
    this.lines.push(`${context}: ${message}`);
    new Logger(context).log(message);
  }
}

@Injectable()
class DatabaseService implements OnApplicationBootstrap, OnModuleDestroy {
  constructor(private readonly logger: FixtureLogger) {}

  onApplicationBootstrap(): void {
    this.logger.log("DatabaseService", "Primary pool opened");
    this.logger.log("MigrationRunner", "Schema migrations verified");
  }

  onModuleDestroy(): void {
    this.logger.log("DatabaseService", "Primary pool drained");
  }
}

@Injectable()
class CacheService implements OnApplicationBootstrap {
  constructor(private readonly logger: FixtureLogger) {}

  onApplicationBootstrap(): void {
    this.logger.log("CacheService", "Cache store warmed");
  }
}

@Injectable()
class PolicyService implements OnApplicationBootstrap {
  constructor(private readonly logger: FixtureLogger) {}

  onApplicationBootstrap(): void {
    this.logger.log("RbacService", "Role hierarchy indexed");
    this.logger.log("PolicyDecisionPoint", "Policy bundle warmed");
  }
}

@Injectable()
class PlatformService implements OnApplicationBootstrap {
  constructor(private readonly logger: FixtureLogger) {}

  onApplicationBootstrap(): void {
    this.logger.log("QueueWorker", "invoices queue consuming");
    this.logger.log("OutboxDispatcher", "Outbox relay caught up");
    this.logger.log("OpenTelemetryModule", "Trace exporter connected");
    this.logger.log("AuditPipeline", "Immutable audit stream ready");
    this.logger.log("SloMonitor", "Latency and error-budget monitors armed");
  }
}

@Controller()
class AppController {
  @Get()
  getRoot(): string {
    return "ok";
  }
}

@Controller("health")
class HealthController {
  @Get()
  getHealth(): string {
    return "ready";
  }
}

@Module({ providers: [FixtureLogger], exports: [FixtureLogger] })
class SharedFixtureModule {}

@Module({ imports: [SharedFixtureModule], providers: [DatabaseService], exports: [DatabaseService] })
class DatabaseModule {}

@Module({ imports: [SharedFixtureModule], providers: [CacheService] })
class CacheModule {}

@Module({ controllers: [HealthController] })
class HealthModule {}

@Module({ imports: [SharedFixtureModule], providers: [PolicyService] })
class SecurityModule {}

@Module({ imports: [SharedFixtureModule], providers: [PlatformService] })
class PlatformModule {}

@Module({ imports: [DatabaseModule], providers: [] })
class UsersModule {}

@Module({ imports: [DatabaseModule], providers: [] })
class OrdersModule {}

@Module({ imports: [DatabaseModule], providers: [] })
class BillingModule {}

@Module({ imports: [DatabaseModule], providers: [] })
class InventoryModule {}

@Module({ imports: [DatabaseModule], providers: [] })
class NotificationsModule {}

@Module({
  imports: [SharedFixtureModule],
  controllers: [AppController]
})
export class SimpleFixtureAppModule {}

@Module({
  imports: [SharedFixtureModule, DatabaseModule, CacheModule, HealthModule, UsersModule, OrdersModule]
})
export class MiddleFixtureAppModule {}

@Module({
  imports: [
    SharedFixtureModule,
    DatabaseModule,
    CacheModule,
    HealthModule,
    SecurityModule,
    PlatformModule,
    UsersModule,
    OrdersModule,
    BillingModule,
    InventoryModule,
    NotificationsModule
  ]
})
export class HeavyFixtureAppModule {}
```

- [ ] **Step 2: Add a test that proves fixtures stay dev-only**

Add this test to `test/nestjs-profile.test.ts`:

```ts
test("nestjs observation fixtures use real Nest decorators outside shipped runtime", () => {
  const fixtureSource = readFileSync("test/fixtures/nestjs/log-fixtures.ts", "utf8");

  assert.match(fixtureSource, /from "@nestjs\/common"/);
  assert.match(fixtureSource, /class HeavyFixtureAppModule/);
  assert.match(fixtureSource, /class DatabaseService implements OnApplicationBootstrap/);
  assert.match(fixtureSource, /class PlatformService implements OnApplicationBootstrap/);
});
```

- [ ] **Step 3: Run the focused tests**

Run: `npm run build && node --test test/nestjs-profile.test.ts`

Expected: fixture dev-only test passes, richer log tests still fail until Task 3.

- [ ] **Step 4: Commit fixture source**

```bash
git add test/fixtures/nestjs/log-fixtures.ts test/nestjs-profile.test.ts
git commit -m "test: add NestJS log observation fixtures"
```

### Task 3: Expand NestJS Simulator Events

**Files:**
- Modify: `src/profiles/nestjs.ts`

- [ ] **Step 1: Replace middle and heavy event catalogs**

Update `src/profiles/nestjs.ts` so `middleStartup`, `heavyStartup`, `runtimeByMode.heavy`, and shutdown include the events required by Task 1. Keep the exported `NestjsLogMode` and `createNestjsProfile` signatures unchanged.

Use these event groups:

```ts
const middleStartup: readonly RuntimeEvent[] = [
  ...simpleStartup,
  { level: 30, context: "InstanceLoader", message: "ConfigModule dependencies initialized" },
  { level: 30, context: "InstanceLoader", message: "DatabaseModule dependencies initialized" },
  { level: 30, context: "InstanceLoader", message: "UsersModule dependencies initialized" },
  { level: 30, context: "InstanceLoader", message: "OrdersModule dependencies initialized" },
  { level: 30, context: "DatabaseService", message: "Database pool ready primary=postgres replicas=1" },
  { level: 30, context: "CacheService", message: "Cache store warmed namespace=api ttl=60s" },
  { level: 30, context: "HealthController", message: "Mapped {/health, GET} route" },
  { level: 30, context: "SchedulerOrchestrator", message: "Registered 2 recurring jobs" },
  { level: 30, context: "Bootstrap", message: "Startup checks completed in 184ms" }
];
```

```ts
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
```

```ts
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
```

- [ ] **Step 2: Run the focused tests**

Run: `npm run build && node --test test/nestjs-profile.test.ts`

Expected: PASS.

- [ ] **Step 3: Commit simulator event expansion**

```bash
git add src/profiles/nestjs.ts
git commit -m "feat: enrich NestJS simulator logs"
```

### Task 4: Update README and Package Verification

**Files:**
- Modify: `README.md`
- Test: `test/nestjs-profile.test.ts`

- [ ] **Step 1: Update README NestJS section**

Replace the short NestJS logger paragraph in `README.md` with:

```md
`simple` prints logs similar to a generated Nest template. `middle` adds a normal API service shape with configuration, feature modules, database readiness, cache warmup, health routes, scheduler startup, and request logs. `heavy` is grounded by dev-only NestJS fixture projects and expands into an enterprise-style API platform with many DI providers, database pools, migrations, auth/RBAC policy warmup, queues, outbox, telemetry, audit, and SLO monitoring.
```

- [ ] **Step 2: Run full verification**

Run: `npm test`

Expected: PASS.

Run: `npm run pack:dry`

Expected: package contents include `bin`, `dist`, `README.md`, and `LICENSE`, and do not include `test/fixtures`.

- [ ] **Step 3: Commit docs**

```bash
git add README.md
git commit -m "docs: describe richer NestJS profiles"
```

### Task 5: Final Review

**Files:**
- Review: `src/profiles/nestjs.ts`
- Review: `test/nestjs-profile.test.ts`
- Review: `test/fixtures/nestjs/log-fixtures.ts`
- Review: `README.md`

- [ ] **Step 1: Check git status**

Run: `git status --short`

Expected: no unstaged or staged changes.

- [ ] **Step 2: Summarize commits and verification**

Run: `git log --oneline -4`

Expected: includes commits for test requirements, fixtures, implementation, and docs.

Report the exact verification commands and whether they passed.
