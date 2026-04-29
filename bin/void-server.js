#!/usr/bin/env node

import { createVoidServer } from "../src/index.js";

const server = createVoidServer({
  logger: console.log,
  now: () => new Date()
});

server.start();

process.on("SIGINT", () => {
  server.stop("SIGINT");
  process.exit(0);
});

process.on("SIGTERM", () => {
  server.stop("SIGTERM");
  process.exit(0);
});
