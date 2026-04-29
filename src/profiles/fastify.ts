import type { FrameworkProfile } from "./types.js";

export function createFastifyProfile(): FrameworkProfile {
  return {
    id: "fastify",
    label: "Fastify",
    loggerName: "fastify",
    intervalMs: 3000,
    startup: [
      {
        level: 30,
        message: "Server listening at http://127.0.0.1:3000",
        bindings: { address: "127.0.0.1", port: 3000 }
      },
      {
        level: 30,
        message: "Server listening at http://[::1]:3000",
        bindings: { address: "::1", port: 3000 }
      }
    ],
    runtime: [
      {
        level: 30,
        message: "incoming request",
        bindings: {
          reqId: "req-1",
          req: {
            method: "GET",
            url: "/health",
            hostname: "localhost:3000",
            remoteAddress: "127.0.0.1",
            remotePort: 54321
          }
        }
      },
      {
        level: 30,
        message: "request completed",
        bindings: {
          reqId: "req-1",
          res: {
            statusCode: 204
          },
          responseTime: 1.42
        }
      }
    ],
    shutdown: [
      {
        level: 30,
        message: "close server"
      },
      {
        level: 30,
        message: "server closed"
      }
    ]
  };
}
