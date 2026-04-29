import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { Logger } from "@nestjs/common";
import { createNestjsProfile } from "../src/profiles/nestjs.ts";
import { createSimulator } from "../src/runtime/simulator.ts";

test("nestjs simple mode emits template-style Nest logger lines", () => {
  const logs = runProfile("simple");
  const plainLogs = logs.map(stripAnsi);

  assert.ok(plainLogs.some((line) => /\[Nest\] 4242\s+-/.test(line)));
  assert.ok(plainLogs.some((line) => line.includes("LOG [NestFactory] Starting Nest application...")));
  assert.ok(plainLogs.some((line) => line.includes("LOG [InstanceLoader] AppModule dependencies initialized +3ms")));
  assert.ok(plainLogs.some((line) => line.includes("LOG [RoutesResolver] AppController {/}: +2ms")));
  assert.ok(plainLogs.some((line) => line.includes("LOG [RouterExplorer] Mapped {/, GET} route +1ms")));
  assert.ok(plainLogs.some((line) => line.includes("LOG [NestApplication] Nest application successfully started +1ms")));
  assert.equal(plainLogs.join("\n").includes("void-server"), false);
});

test("nestjs simple mode emits captured watch-mode terminal preamble and warning", () => {
  const logs = runProfile("simple");
  const plainLogs = logs.map(stripAnsi);

  assert.ok(plainLogs.some((line) => /\[(?:AM|PM) \d{1,2}:\d{2}:\d{2}\] Starting compilation in watch mode\.\.\./.test(line)));
  assert.ok(plainLogs.some((line) => /\[(?:AM|PM) \d{1,2}:\d{2}:\d{2}\] Found 0 errors\. Watching for file changes\./.test(line)));
  assert.ok(plainLogs.some((line) => line.includes("[DEP0190] DeprecationWarning: Passing args to a child process with shell option true")));
  assert.ok(plainLogs.some((line) => line.includes("Use `node --trace-deprecation ...` to show where the warning was created")));
});

test("nestjs simple mode preserves Nest ConsoleLogger ANSI colors", () => {
  const logs = runProfile("simple");
  const nestFactoryLog = logs.find((line) => stripAnsi(line).includes("[NestFactory] Starting Nest application..."));

  assert.ok(nestFactoryLog);
  assert.match(nestFactoryLog, /\x1B\[32m\[Nest\] 4242  - \x1B\[39m/);
  assert.match(nestFactoryLog, /\x1B\[32m    LOG\x1B\[39m/);
  assert.match(nestFactoryLog, /\x1B\[38;5;3m\[NestFactory\] \x1B\[39m/);
  assert.match(nestFactoryLog, /\x1B\[32mStarting Nest application\.\.\.\x1B\[39m/);
});

test("nestjs simple mode clears the terminal before Nest application startup", () => {
  const logs = runProfile("simple");
  const nestFactoryLog = logs.find((line) => stripAnsi(line).includes("[NestFactory] Starting Nest application..."));

  assert.ok(nestFactoryLog);
  assert.ok(nestFactoryLog.startsWith("\x1B[2J\x1B[3J\x1B[H"));
});

test("nestjs middle mode emits typical API service lifecycle logs", () => {
  const logs = runProfile("middle", 3).map(stripAnsi).join("\n");

  assert.match(logs, /LOG \[InstanceLoader\] ConfigModule dependencies initialized/);
  assert.match(logs, /LOG \[InstanceLoader\] DatabaseModule dependencies initialized/);
  assert.match(logs, /LOG \[DatabaseService\] Database pool ready/);
  assert.match(logs, /LOG \[CacheService\] Cache store warmed/);
  assert.match(logs, /LOG \[HealthController\] Mapped \{\/health, GET\} route/);
  assert.match(logs, /LOG \[SchedulerOrchestrator\] Registered 2 recurring jobs/);
  assert.match(logs, /LOG \[RequestLogger\] GET \/api\/users 200/);
});

test("nestjs heavy mode emits DI-rich enterprise platform logs", () => {
  const logs = runProfile("heavy", 8).map(stripAnsi).join("\n");

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

test("nestjs profile keeps real Nest packages as dev-only test dependencies", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

  assert.equal(typeof Logger, "function");
  assert.ok(packageJson.devDependencies["@nestjs/common"]);
  assert.ok(packageJson.devDependencies["@nestjs/core"]);
  assert.ok(packageJson.devDependencies["@nestjs/platform-express"]);
  assert.equal(packageJson.dependencies?.["@nestjs/common"], undefined);
  assert.equal(packageJson.dependencies?.["@nestjs/core"], undefined);
  assert.equal(packageJson.dependencies?.["@nestjs/platform-express"], undefined);
});

test("nestjs observation fixtures use real Nest decorators outside shipped runtime", () => {
  const fixtureSource = readFileSync("test/fixtures/nestjs/log-fixtures.ts", "utf8");

  assert.match(fixtureSource, /from "@nestjs\/common"/);
  assert.match(fixtureSource, /class AppService/);
  assert.match(fixtureSource, /return "Hello World!"/);
  assert.match(fixtureSource, /class HeavyFixtureAppModule/);
  assert.match(fixtureSource, /class DatabaseService implements OnApplicationBootstrap/);
  assert.match(fixtureSource, /class PlatformService implements OnApplicationBootstrap/);
});

test("runtime source does not import dev-only NestJS dependencies", () => {
  const sourceFiles = collectFiles("src", ".ts");

  for (const file of sourceFiles) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /from ["']@nestjs\/(?:common|core|platform-express)["']/);
    assert.doesNotMatch(source, /import\(["']@nestjs\/(?:common|core|platform-express)["']\)/);
  }
});

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

function collectFiles(directory: string, extension: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      return collectFiles(path, extension);
    }

    return path.endsWith(extension) ? [path] : [];
  });
}

function stripAnsi(value: string): string {
  return value.replace(/\u001b\[[0-9;]*[A-Za-z]/g, "");
}
