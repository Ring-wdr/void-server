# Framework Runtime Simulator Design

## Goal

`void-server` should behave like a terminal-only framework runtime simulator. The package name may remain `void-server`, but once the CLI is running it should not reveal that identity in the displayed runtime logs.

The first supported framework profile is Fastify. NestJS is supported as a second terminal-only profile with selectable logger depth.

## User Experience

Running `npx void-server` opens a terminal selection menu. The initial menu offers `Fastify`. After the user selects it, the process prints framework-like startup and runtime logs until the user exits with `Ctrl+C`.

The active runtime output should look like a real Fastify/Pino application from the terminal. It should not expose `void-server`, fake implementation details, or "no logic" messaging during the simulation.

When the user selects `NestJS`, the CLI asks for one additional logger level:

- `simple`: generated-template-style Nest bootstrap logs
- `middle`: startup-service logs around configuration, health, cache, and bootstrap checks
- `heavy`: enterprise-style logs around tracing, authorization, queues, audit, and SLO monitoring

## Runtime Architecture

The shipped runtime must remain lightweight. Production code uses only Node.js built-ins such as `readline/promises`, `process`, `os`, and timers.

Framework-specific behavior lives behind profile modules. A profile defines:

- a display name
- selectable menu label
- startup log sequence
- repeating runtime event sequence
- shutdown log sequence

The CLI loads the selected profile and starts it. Profiles do not open network sockets, register routes, connect to databases, or import the actual framework package.

## Development Dependencies

Fastify, Pino, and NestJS packages may be installed as `devDependencies` only. Tests can use them to validate that the simulator keeps a believable framework-style shape.

Runtime source files and CLI files must not import `fastify`, `pino`, or `@nestjs/*` packages. Published package contents must remain limited to runtime files and documentation.

## Testing

Tests should verify:

- the Fastify profile emits Fastify/Pino-like JSON logs
- runtime logs do not mention `void-server`
- the CLI can render a selectable framework menu
- timers are cleaned up when the simulator stops
- runtime source files do not import dev-only framework dependencies
- package dry-run output remains small and excludes test/spec/source-only development files
- NestJS remains dev-only while the runtime emits simple, middle, and heavy Nest-style log profiles

## Scope

This design implements Fastify and NestJS profiles. Additional framework profiles such as Nitro or Express are intentionally left for later work.
