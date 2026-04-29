import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("repository includes a reusable NestJS log observation command", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

  assert.equal(packageJson.scripts["observe:nest"], "node scripts/capture-nest-observation.mjs");
});

test("NestJS observation command can capture simple, middle, and heavy variants", () => {
  const script = readFileSync("scripts/capture-nest-observation.mjs", "utf8");

  assert.match(script, /@nestjs\/cli@latest/);
  assert.match(script, /simple/);
  assert.match(script, /middle/);
  assert.match(script, /heavy/);
  assert.match(script, /elapsedMs/);
  assert.match(script, /jsonl/);
  assert.match(script, /markdown/i);
  assert.match(script, /PORT/);
});
