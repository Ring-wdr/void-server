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
  NestJS (Coming soon)
  Nitro (Coming soon)
  Express (Coming soon)
```

Fastify is the first supported runtime profile. Other frameworks are shown as coming-soon entries so future profile support has a stable place to land.

or from a local checkout:

```bash
npm install
npm run build
npm start
```

## What It Does

- Opens a terminal framework selector.
- Prints Fastify/Pino-style startup and request logs.
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

Fastify and Pino are development dependencies only. Runtime code is built from TypeScript and uses Node.js built-ins.

## License

MIT
