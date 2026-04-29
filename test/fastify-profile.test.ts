import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import Fastify from "fastify";
import { createFastifyProfile } from "../src/profiles/fastify.ts";
import { createSimulator } from "../src/runtime/simulator.ts";

test("fastify profile emits believable pino-style runtime logs", () => {
  const profile = createFastifyProfile();
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
  tick();
  simulator.stop("SIGINT");

  const jsonLogs = logs.map((line) => JSON.parse(line));
  assert.ok(jsonLogs.some((entry) => entry.msg === "Server listening at http://127.0.0.1:3000"));
  assert.ok(jsonLogs.some((entry) => entry.msg === "incoming request"));
  assert.ok(jsonLogs.some((entry) => entry.msg === "request completed"));
  assert.ok(jsonLogs.every((entry) => entry.name === "fastify"));
  assert.ok(jsonLogs.every((entry) => entry.pid === 4242));
  assert.ok(jsonLogs.every((entry) => entry.hostname === "devbox"));
});

test("fastify profile request logs keep the same major fields as real Fastify logger output", async () => {
  const realLogs: string[] = [];
  const app = Fastify({
    logger: {
      level: "info",
      stream: {
        write: (line) => realLogs.push(line)
      }
    }
  });

  app.get("/health", async (_request, reply) => {
    return reply.code(204).send();
  });

  await app.ready();
  await app.inject({ method: "GET", url: "/health" });
  await app.close();

  const simulatedLogs: string[] = [];
  let tick: () => void = () => {};
  const simulator = createSimulator(createFastifyProfile(), {
    logger: (line) => simulatedLogs.push(line),
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
  tick();
  simulator.stop("test");

  const realRequestCompleted = realLogs.map((line) => JSON.parse(line)).find((entry) => entry.msg === "request completed");
  const simulatedRequestCompleted = simulatedLogs.map((line) => JSON.parse(line)).find((entry) => entry.msg === "request completed");

  assert.ok(realRequestCompleted);
  assert.ok(simulatedRequestCompleted);

  for (const key of ["level", "time", "pid", "hostname", "reqId", "res", "responseTime", "msg"]) {
    assert.ok(key in realRequestCompleted);
    assert.ok(key in simulatedRequestCompleted);
  }
});

test("runtime logs do not expose the package identity", () => {
  const profile = createFastifyProfile();
  const logs: string[] = [];
  const simulator = createSimulator(profile, {
    logger: (line) => logs.push(line),
    now: () => new Date("2026-04-29T00:00:00.000Z"),
    hostname: "devbox",
    pid: 4242,
    setInterval: () => 1,
    clearInterval: () => {}
  });

  simulator.start();
  simulator.stop("SIGTERM");

  assert.equal(logs.join("\n").includes("void-server"), false);
});

test("runtime source does not import dev-only framework dependencies", () => {
  const sourceFiles = collectFiles("src", ".ts");

  for (const file of sourceFiles) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /from ["'](?:fastify|pino)["']/);
    assert.doesNotMatch(source, /import\(["'](?:fastify|pino)["']\)/);
  }
});

test("cli lets the user select Fastify and hides package identity after selection", async () => {
  const output = await runCliUntilFirstRuntimeLog("\r");

  assert.match(output, /Fastify \(Recommended\).*Fast Node\.js server runtime/);
  assert.match(output, /Server listening at http:\/\/127\.0\.0\.1:3000/);
  assert.equal(output.includes("void-server"), false);
});

test("cli lets the user select NestJS simple logger mode", async () => {
  const output = await runCliForStagedInput({
    inputs: ["\u001b[B", "\r", "\r"],
    settle: (text) => text.includes("Starting Nest application...")
  });

  assert.match(output, /NestJS.*Dev-only Nest logger simulator/);
  assert.match(output, /simple.*Template bootstrap logger/);
  assert.match(output, /LOG \[NestFactory\] Starting Nest application\.\.\./);
  assert.equal(output.includes("void-server"), false);
});

test("cli renders unavailable profiles as disabled selector entries", async () => {
  const result = await runCliUntilExit("\u0003");

  assert.equal(result.code, 130);
  assert.match(result.output, /Fastify \(Recommended\).*Fast Node\.js server runtime/);
  assert.match(result.output, /NestJS/);
  assert.match(result.output, /Nitro.*Coming soon/);
  assert.match(result.output, /Express.*Coming soon/);
  assert.equal(result.output.includes("Server listening at http://127.0.0.1:3000"), false);
});

test("cli exits cleanly when cancelled before selecting a profile", async () => {
  const result = await runCliUntilExit("\u0003");

  assert.equal(result.code, 130);
  assert.match(result.output, /Select framework runtime/);
  assert.equal(result.output.includes("Server listening at http://127.0.0.1:3000"), false);
});

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

function runCliUntilFirstRuntimeLog(input: string): Promise<string> {
  return runCliForOutput({
    input,
    settle: (text) => text.includes("Server listening at http://127.0.0.1:3000")
  });
}

function runCliForOutput(options: { input: string; settle: (text: string) => boolean }): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["bin/void-server.js"], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"]
    });

    let output = "";
    let settled = false;
    const timeout = setTimeout(() => {
      finish(new Error("Timed out waiting for CLI runtime log"));
    }, 5000);

    function finish(error?: Error) {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      child.kill("SIGINT");

      if (error) {
        reject(error);
        return;
      }

      resolve(output);
    }

    let wroteInput = false;

    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");

      if (!wroteInput && output.includes("Select framework runtime")) {
        wroteInput = true;
        child.stdin.write(options.input);
      }

      if (options.settle(output)) {
        finish();
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
    });

    child.on("error", finish);
    child.on("exit", (code) => {
      if (!settled && code !== 0) {
        finish(new Error(`CLI exited before emitting runtime log: ${code}`));
      }
    });
  });
}

function runCliForStagedInput(options: { inputs: string[]; settle: (text: string) => boolean }): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["bin/void-server.js"], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"]
    });

    let output = "";
    let settled = false;
    let inputIndex = 0;
    const timeout = setTimeout(() => {
      finish(new Error("Timed out waiting for CLI runtime log"));
    }, 5000);

    function finish(error?: Error) {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      child.kill("SIGINT");

      if (error) {
        reject(error);
        return;
      }

      resolve(output);
    }

    function writeNextInput() {
      if (inputIndex >= options.inputs.length || settled) {
        return;
      }

      child.stdin.write(options.inputs[inputIndex]);
      inputIndex += 1;
      setTimeout(writeNextInput, 100);
    }

    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");

      if (inputIndex === 0 && output.includes("Select framework runtime")) {
        setTimeout(writeNextInput, 25);
      }

      if (options.settle(output)) {
        finish();
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
    });

    child.on("error", finish);
    child.on("exit", (code) => {
      if (!settled && code !== 0) {
        finish(new Error(`CLI exited before emitting runtime log: ${code}`));
      }
    });
  });
}

function runCliUntilExit(input: string): Promise<{ code: number | null; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["bin/void-server.js"], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"]
    });

    let output = "";
    let wroteInput = false;
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Timed out waiting for CLI exit"));
    }, 5000);

    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");

      if (!wroteInput && output.includes("Select framework runtime")) {
        wroteInput = true;
        child.stdin.write(input);
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("exit", (code) => {
      clearTimeout(timeout);
      resolve({ code, output });
    });
  });
}
