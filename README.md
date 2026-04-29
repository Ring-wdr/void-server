# void-server

`void-server` is a deliberately empty Node.js package that looks like a framework server runtime from the terminal.

It prints familiar startup and request-style logs, but it does not open a port, register routes, start a worker pool, connect to a database, or run application logic. It is a shell for demos, screenshots, fixtures, and tests that need believable runtime output without a real server behind it.

## Usage

```bash
npx void-server
```

or from a local checkout:

```bash
npm install
npm start
```

## What It Does

- Prints framework-like boot logs.
- Keeps the process alive until `Ctrl+C`.
- Exposes a tiny `createVoidServer()` API for tests or controlled demos.

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

## License

MIT
