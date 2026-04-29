import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { Logger } from "@nestjs/common";
import { createNestjsProfile } from "../src/profiles/nestjs.ts";
import { createSimulator } from "../src/runtime/simulator.ts";

test("nestjs simple mode emits template-style Nest logger lines", () => {
  const logs = runProfile("simple");

  assert.ok(logs.some((line) => /\[Nest\] 4242\s+-/.test(line)));
  assert.ok(logs.some((line) => line.includes("LOG [NestFactory] Starting Nest application...")));
  assert.ok(logs.some((line) => line.includes("LOG [InstanceLoader] AppModule dependencies initialized")));
  assert.equal(logs.join("\n").includes("void-server"), false);
});

test("nestjs middle mode emits startup-oriented service logs", () => {
  const logs = runProfile("middle").join("\n");

  assert.match(logs, /LOG \[ConfigService\] Loaded environment profile startup/);
  assert.match(logs, /LOG \[HealthIndicator\] Readiness probe registered at \/health/);
  assert.match(logs, /LOG \[NestApplication\] Nest application successfully started/);
});

test("nestjs heavy mode emits enterprise-oriented platform logs", () => {
  const logs = runProfile("heavy").join("\n");

  assert.match(logs, /LOG \[OpenTelemetryModule\] Trace exporter connected/);
  assert.match(logs, /LOG \[AuthzPolicyModule\] Policy bundle warmed/);
  assert.match(logs, /LOG \[AuditPipeline\] Immutable audit stream ready/);
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

test("runtime source does not import dev-only NestJS dependencies", () => {
  const sourceFiles = collectFiles("src", ".ts");

  for (const file of sourceFiles) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /from ["']@nestjs\/(?:common|core|platform-express)["']/);
    assert.doesNotMatch(source, /import\(["']@nestjs\/(?:common|core|platform-express)["']\)/);
  }
});

function runProfile(mode: "simple" | "middle" | "heavy"): string[] {
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
  tick();
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
