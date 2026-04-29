#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MODES = new Set(["simple", "middle", "heavy"]);

const options = parseArgs(process.argv.slice(2));
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(repoRoot, options.outDir);
const projectParent = join(tmpdir(), "void-server-nest-observations");
const projectName = `nest-${options.mode}-${Date.now()}`;
const projectDir = join(projectParent, projectName);
const startedAt = new Date();

await mkdir(projectParent, { recursive: true });
await mkdir(outDir, { recursive: true });

console.log(`Generating official Nest CLI template for ${options.mode} observation...`);
await runChecked("npx", ["@nestjs/cli@latest", "new", projectName, "--package-manager", "npm", "--skip-git"], {
  cwd: projectParent
});

if (options.mode !== "simple") {
  await applyVariant(projectDir, options.mode);
}

const capture = await captureStart(projectDir, options);
const baseName = `nest-cli-${options.mode}-log`;
const jsonlPath = join(outDir, `${baseName}.jsonl`);
const markdownPath = join(outDir, `${baseName}.md`);

await writeFile(jsonlPath, capture.entries.map((entry) => JSON.stringify(entry)).join("\n") + "\n", "utf8");
await writeFile(markdownPath, renderMarkdown({ ...capture, mode: options.mode, startedAt, projectDir }), "utf8");

if (!options.keepProject) {
  await removeTempProject(projectDir);
}

console.log(`Wrote ${jsonlPath}`);
console.log(`Wrote ${markdownPath}`);

function parseArgs(args) {
  const parsed = {
    mode: "simple",
    outDir: "docs/observations",
    keepProject: false,
    timeoutMs: 30000
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (MODES.has(arg)) {
      parsed.mode = arg;
      continue;
    }

    if (/^\d+$/.test(arg)) {
      parsed.timeoutMs = Number(arg);
      continue;
    }

    if (!arg.startsWith("-")) {
      parsed.outDir = arg;
      continue;
    }

    if (arg === "--mode") {
      parsed.mode = readValue(args, ++index, arg);
      continue;
    }

    if (arg === "--out") {
      parsed.outDir = readValue(args, ++index, arg);
      continue;
    }

    if (arg === "--timeout-ms") {
      parsed.timeoutMs = Number(readValue(args, ++index, arg));
      continue;
    }

    if (arg === "--keep-project") {
      parsed.keepProject = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!MODES.has(parsed.mode)) {
    throw new Error(`--mode must be one of: ${Array.from(MODES).join(", ")}`);
  }

  if (!Number.isFinite(parsed.timeoutMs) || parsed.timeoutMs < 1000) {
    throw new Error("--timeout-ms must be a number >= 1000");
  }

  return parsed;
}

function readValue(args, index, flag) {
  const value = args[index];
  if (!value) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function printHelp() {
  console.log(`Capture real Nest CLI template logs with line timing.

Usage:
  npm run observe:nest -- simple
  npm run observe:nest -- middle
  npm run observe:nest -- heavy

  node scripts/capture-nest-observation.mjs --mode simple --out docs/observations

Options:
  --mode <simple|middle|heavy>  Variant to observe. Defaults to simple.
  --out <dir>                  Output directory. Defaults to docs/observations.
  --timeout-ms <ms>            Startup timeout. Defaults to 30000.
  --keep-project               Keep the generated temp project for inspection.
`);
}

async function runChecked(command, args, options) {
  const result = await runProcess(command, args, options);
  if (result.code !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.code}`);
  }
}

function runProcess(command, args, options) {
  return new Promise((resolveProcess, rejectProcess) => {
    const commandSpec = commandForPlatform(command, args);
    const child = spawn(commandSpec.command, commandSpec.args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ["ignore", "inherit", "inherit"]
    });

    child.on("error", rejectProcess);
    child.on("exit", (code, signal) => resolveProcess({ code, signal }));
  });
}

async function captureStart(projectDir, options) {
  const entries = [];
  const startedAtMs = Date.now();
  const buffers = { stdout: "", stderr: "" };

  const commandSpec = commandForPlatform("npm", ["run", "start:dev"]);
  const child = spawn(commandSpec.command, commandSpec.args, {
    cwd: projectDir,
    env: { ...process.env, FORCE_COLOR: "1", PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"]
  });

  function record(stream, chunk) {
    buffers[stream] += chunk.toString();
    const parts = buffers[stream].split(/\r?\n/);
    buffers[stream] = parts.pop() ?? "";

    for (const line of parts) {
      const entry = { stream, elapsedMs: Date.now() - startedAtMs, line };
      entries.push(entry);

      if (stripAnsi(line).includes("Nest application successfully started")) {
        setTimeout(() => stopProcessTree(child.pid), 300);
      }
    }
  }

  child.stdout.on("data", (chunk) => record("stdout", chunk));
  child.stderr.on("data", (chunk) => record("stderr", chunk));

  const timeout = setTimeout(() => stopProcessTree(child.pid), options.timeoutMs);

  const processResult = await new Promise((resolveProcess, rejectProcess) => {
    child.on("error", rejectProcess);
    child.on("exit", (code, signal) => resolveProcess({ code, signal }));
  });

  clearTimeout(timeout);

  for (const stream of ["stdout", "stderr"]) {
    if (buffers[stream]) {
      entries.push({ stream, elapsedMs: Date.now() - startedAtMs, line: buffers[stream] });
    }
  }

  entries.push({
    stream: "process",
    elapsedMs: Date.now() - startedAtMs,
    code: processResult.code,
    signal: processResult.signal
  });

  return {
    entries,
    cleanLines: entries
      .filter((entry) => typeof entry.line === "string")
      .filter((entry) => stripAnsi(entry.line).trim() !== "")
      .filter((entry) => !stripAnsi(entry.line).startsWith("> "))
      .map((entry) => ({ ...entry, line: stripAnsi(entry.line) }))
  };
}

function commandForPlatform(command, args) {
  if (process.platform !== "win32") {
    return { command, args };
  }

  return {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", [command, ...args].map(quoteWindowsArg).join(" ")]
  };
}

function quoteWindowsArg(value) {
  if (/^[A-Za-z0-9_./:@=-]+$/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '\\"')}"`;
}

function stopProcessTree(pid) {
  if (!pid) {
    return;
  }

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(pid), "/t", "/f"], { stdio: "ignore" });
    return;
  }

  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // The process may already have exited after successful startup.
    }
  }
}

async function removeTempProject(projectDir) {
  const resolvedTemp = resolve(tmpdir());
  const resolvedProject = resolve(projectDir);

  if (!resolvedProject.startsWith(resolvedTemp)) {
    throw new Error(`Refusing to remove non-temp project: ${resolvedProject}`);
  }

  await rm(resolvedProject, { recursive: true, force: true });
}

async function applyVariant(projectDir, mode) {
  await writeFile(join(projectDir, "src", "app.module.ts"), variantSource(mode), "utf8");
}

function variantSource(mode) {
  if (mode === "middle") {
    return `import { Controller, Get, Injectable, Logger, Module, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';

@Injectable()
class ConfigService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ConfigService.name);
  onApplicationBootstrap(): void {
    this.logger.log('Loaded environment profile startup');
  }
}

@Module({ providers: [ConfigService], exports: [ConfigService] })
class ConfigModule {}

@Injectable()
class DatabaseService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  onApplicationBootstrap(): void {
    this.logger.log('Database pool ready primary=postgres replicas=1');
  }
  onModuleDestroy(): void {
    this.logger.log('Database pool closed');
  }
}

@Module({ providers: [DatabaseService], exports: [DatabaseService] })
class DatabaseModule {}

@Injectable()
class CacheService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CacheService.name);
  onApplicationBootstrap(): void {
    this.logger.log('Cache store warmed namespace=api ttl=60s');
  }
}

@Module({ providers: [CacheService] })
class CacheModule {}

@Controller('health')
class HealthController {
  @Get()
  getHealth(): string {
    return 'ready';
  }
}

@Module({ controllers: [HealthController] })
class HealthModule {}

@Injectable()
class SchedulerOrchestrator implements OnApplicationBootstrap {
  private readonly logger = new Logger(SchedulerOrchestrator.name);
  onApplicationBootstrap(): void {
    this.logger.log('Registered 2 recurring jobs');
  }
}

@Module({ providers: [SchedulerOrchestrator] })
class SchedulerModule {}

@Module({ imports: [DatabaseModule] })
class UsersModule {}

@Module({ imports: [DatabaseModule] })
class OrdersModule {}

@Controller()
class AppController {
  @Get()
  getRoot(): string {
    return 'Hello World!';
  }
}

@Module({
  imports: [ConfigModule, DatabaseModule, CacheModule, HealthModule, SchedulerModule, UsersModule, OrdersModule],
  controllers: [AppController],
})
export class AppModule {}
`;
  }

  return `import { Controller, Get, Injectable, Logger, Module, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';

@Injectable()
class DatabaseService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  onApplicationBootstrap(): void {
    this.logger.log('Primary pool opened host=db.internal size=24');
    this.logger.log('Replica pool opened host=db-ro.internal size=12');
  }
  onModuleDestroy(): void {
    this.logger.log('Database pools closed');
  }
}

@Injectable()
class MigrationRunner implements OnApplicationBootstrap {
  private readonly logger = new Logger(MigrationRunner.name);
  onApplicationBootstrap(): void {
    this.logger.log('Schema migrations verified version=2026042901');
  }
}

@Module({ providers: [DatabaseService, MigrationRunner], exports: [DatabaseService] })
class DatabaseModule {}

@Injectable()
class CacheService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CacheService.name);
  onApplicationBootstrap(): void {
    this.logger.log('Cache cluster warmed shards=6');
  }
}

@Module({ providers: [CacheService] })
class CacheModule {}

@Injectable()
class PolicyDecisionPoint implements OnApplicationBootstrap {
  private readonly logger = new Logger(PolicyDecisionPoint.name);
  onApplicationBootstrap(): void {
    this.logger.log('Policy bundle warmed rules=924');
  }
}

@Injectable()
class RbacService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RbacService.name);
  onApplicationBootstrap(): void {
    this.logger.log('Role hierarchy indexed tenants=48 roles=312');
  }
}

@Module({ providers: [PolicyDecisionPoint, RbacService] })
class AuthModule {}

@Injectable()
class QueueWorker implements OnApplicationBootstrap {
  private readonly logger = new Logger(QueueWorker.name);
  onApplicationBootstrap(): void {
    this.logger.log('invoices queue consuming concurrency=8');
  }
}

@Module({ providers: [QueueWorker] })
class QueueModule {}

@Injectable()
class OutboxDispatcher implements OnApplicationBootstrap {
  private readonly logger = new Logger(OutboxDispatcher.name);
  onApplicationBootstrap(): void {
    this.logger.log('Outbox relay caught up lag=0ms');
  }
}

@Module({ providers: [OutboxDispatcher] })
class OutboxModule {}

@Injectable()
class OpenTelemetryModuleService implements OnApplicationBootstrap {
  private readonly logger = new Logger('OpenTelemetryModule');
  onApplicationBootstrap(): void {
    this.logger.log('Trace exporter connected endpoint=otel-collector:4318');
  }
}

@Module({ providers: [OpenTelemetryModuleService] })
class TelemetryModule {}

@Injectable()
class AuditPipeline implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuditPipeline.name);
  onApplicationBootstrap(): void {
    this.logger.log('Immutable audit stream ready topic=audit.events');
  }
}

@Module({ providers: [AuditPipeline] })
class AuditModule {}

@Injectable()
class SloMonitor implements OnApplicationBootstrap {
  private readonly logger = new Logger(SloMonitor.name);
  onApplicationBootstrap(): void {
    this.logger.log('Latency and error-budget monitors armed');
  }
}

@Controller('health')
class HealthController {
  @Get()
  getHealth(): string {
    return 'ready';
  }
}

@Module({ controllers: [HealthController], providers: [SloMonitor] })
class SloModule {}

@Module({ imports: [DatabaseModule] })
class UsersModule {}
@Module({ imports: [DatabaseModule] })
class OrdersModule {}
@Module({ imports: [DatabaseModule] })
class BillingModule {}
@Module({ imports: [DatabaseModule] })
class InventoryModule {}
@Module({ imports: [DatabaseModule] })
class NotificationsModule {}
@Module({ imports: [AuthModule] })
class AdminModule {}

@Controller()
class AppController {
  @Get()
  getRoot(): string {
    return 'Hello World!';
  }
}

@Module({
  imports: [
    DatabaseModule,
    CacheModule,
    AuthModule,
    QueueModule,
    OutboxModule,
    TelemetryModule,
    AuditModule,
    SloModule,
    UsersModule,
    OrdersModule,
    BillingModule,
    InventoryModule,
    NotificationsModule,
    AdminModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
`;
}

function renderMarkdown({ mode, startedAt, projectDir, entries, cleanLines }) {
  const command = `npx @nestjs/cli@latest new ${basename(projectDir)} --package-manager npm --skip-git`;
  const rows = cleanLines
    .map((entry) => `| ${entry.stream} | ${entry.elapsedMs}ms | \`${escapeTable(entry.line)}\` |`)
    .join("\n");

  return `# Nest CLI ${mode} Log Observation

Date: ${startedAt.toISOString()}

## Method

This observation was generated by the version-controlled command:

\`\`\`bash
npm run observe:nest -- ${mode}
\`\`\`

The command creates a fresh official Nest CLI template, optionally applies the ${mode} observation variant, starts it with \`PORT=0 FORCE_COLOR=1 npm run start:dev\` (\`nest start --watch\`), and records every stdout/stderr line with \`elapsedMs\`.

Underlying template command:

\`\`\`bash
${command}
\`\`\`

Generated temp project:

\`\`\`text
${projectDir}
\`\`\`

## Captured Terminal Lines

| stream | observed elapsed from command start | captured line |
| --- | ---: | --- |
${rows || "| - | - | No terminal lines captured. |"}

## Raw Capture

The sibling \`.jsonl\` file contains all captured lines, including npm wrapper output and the process exit entry.
`;
}

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}

function escapeTable(value) {
  return value.replaceAll("|", "\\|").replaceAll("`", "\\`");
}
