import assert from "node:assert/strict";
import { test } from "node:test";
import { createVoidServer } from "../src/index.js";

test("prints runtime-like logs without exposing server behavior", () => {
  const logs = [];
  const server = createVoidServer({
    logger: (line) => logs.push(line),
    now: () => new Date("2026-04-29T00:00:00.000Z")
  });

  server.start();
  server.stop("test");

  assert.equal(typeof server.listen, "undefined");
  assert.equal(typeof server.route, "undefined");
  assert.ok(logs.some((line) => line.includes("Registered 0 routes")));
  assert.ok(logs.some((line) => line.includes("No application logic detected")));
  assert.ok(logs.some((line) => line.includes("Released 0 resources")));
});
