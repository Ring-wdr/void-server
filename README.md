# void-server

`void-server` is a terminal framework runtime simulator.

It lets you choose a framework profile and then prints logs that look like the selected framework is running. The shipped runtime does not open a port, register routes, start a worker pool, connect to a database, or run application logic.

The first profile is Fastify.

## Usage

```bash
npx void-server
```

Select a framework:

```text
*  Select framework runtime
> Fastify (Recommended) (Fast Node.js server runtime)
  NestJS (Dev-only Nest logger simulator)
  Nitro (Coming soon)
  Express (Coming soon)
```

Fastify is the recommended runtime profile. NestJS is also available as a terminal-only logger simulator. Nitro and Express are shown as coming-soon entries so future profile support has a stable place to land.

When NestJS is selected, choose a logger level:

```text
*  Select NestJS logger level
> simple (Template bootstrap logger)
  middle (Startup service logger)
  heavy (Enterprise platform logger)
```

`simple` prints logs similar to a generated Nest template. `middle` adds a normal API service shape with configuration, feature modules, database readiness, cache warmup, health routes, scheduler startup, and request logs. `heavy` is grounded by dev-only NestJS fixture projects and expands into an enterprise-style API platform with many DI providers, database pools, migrations, auth/RBAC policy warmup, queues, outbox, telemetry, audit, and SLO monitoring.

or from a local checkout:

```bash
npm install
npm run build
npm start
```

## What It Does

- Opens a terminal framework selector.
- Prints Fastify/Pino-style startup and request logs.
- Prints NestJS-style terminal logger output in simple, middle, or heavy mode.
- Keeps the process alive until `Ctrl+C`.
- Exposes small profile and simulator APIs for tests or controlled demos.

## What It Does Not Do

- No HTTP listener.
- No route handling.
- No middleware.
- No worker runtime.
- No persistence.
- No internal business logic.

## Development

```bash
npm test
npm run pack:dry
```

Fastify, Pino, and NestJS packages are development dependencies only. Tests use them to keep simulated output grounded in real framework packages, but runtime source does not import those packages and published package contents exclude development-only source, tests, and docs.

## License

MIT
