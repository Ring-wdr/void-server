# Fastify Runtime Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript CLI that lets the user select `Fastify` and then prints believable Fastify/Pino-style runtime logs until shutdown.

**Architecture:** Runtime code uses Node.js built-ins only. Framework behavior is isolated in profile modules, with dev-only Fastify/Pino dependencies used by tests to validate log shape without shipping them in runtime code.

**Tech Stack:** Node.js >=20, TypeScript, node:test, Fastify/Pino as devDependencies only.

---

### File Structure

- `bin/void-server.js`: published executable that runs the compiled CLI.
- `src/cli.ts`: terminal selection menu and signal handling.
- `src/index.ts`: public API exports.
- `src/profiles/types.ts`: shared profile and simulator types.
- `src/profiles/fastify.ts`: Fastify-style profile events.
- `src/runtime/simulator.ts`: profile runner, timers, lifecycle control.
- `test/*.test.ts`: TypeScript tests executed after build.
- `tsconfig.json`: TypeScript build configuration.
- `package.json`: build scripts, runtime exports, dev dependencies, files list.

### Task 1: Add TypeScript Tooling

- [ ] Add `typescript`, `fastify`, and `pino` as devDependencies.
- [ ] Add `tsconfig.json` that emits ESM into `dist`.
- [ ] Change package runtime entries to `dist/index.js` and `bin/void-server.js`.
- [ ] Keep `fastify` and `pino` out of `dependencies`.
- [ ] Verify `npm run build` produces `dist`.

### Task 2: Write Failing Runtime Tests

- [ ] Add tests for the Fastify profile output.
- [ ] Add tests that runtime logs do not expose `void-server`.
- [ ] Add tests that runtime source files do not import `fastify` or `pino`.
- [ ] Run tests before implementation and confirm failure because TypeScript runtime modules do not exist yet.

### Task 3: Implement Simulator Runtime

- [ ] Add shared profile types.
- [ ] Add the Fastify profile with startup, runtime, and shutdown events.
- [ ] Add the simulator runner with deterministic clock/logger injection for tests.
- [ ] Run tests and confirm profile behavior passes.

### Task 4: Implement Selection CLI

- [ ] Add a Node built-in `readline/promises` menu.
- [ ] Keep the menu simple with `Fastify` as option 1.
- [ ] Start the selected profile and keep the process alive until signal shutdown.
- [ ] Update executable wrapper to run `dist/cli.js`.

### Task 5: Verify Shipping Surface

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `npm pack --dry-run`.
- [ ] Run `npm publish --dry-run --access public`.
- [ ] Confirm published files exclude `src`, `test`, and `docs`, while including `dist`, `bin`, `README.md`, and `LICENSE`.
