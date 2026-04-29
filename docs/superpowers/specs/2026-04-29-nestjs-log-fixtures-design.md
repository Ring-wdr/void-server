# NestJS Log Fixtures Design

## Goal

Improve the NestJS simulator logs so each logger level feels like a real project size:

- `simple`: generated NestJS template bootstrap logs
- `middle`: ordinary API server logs with configuration, health, cache, database, and service providers
- `heavy`: enterprise API platform logs with many DI providers, database lifecycle, authorization, queues, scheduler, telemetry, audit, and SLO monitoring

The implementation should be grounded in dev-only NestJS sample applications, but the published runtime must remain a lightweight terminal simulator.

## Direction

Use dev-only NestJS fixtures as observation tools. The fixtures exist to answer: "What does this kind of NestJS app look like when its modules, services, and lifecycle hooks start?"

Runtime code will not import `@nestjs/*`, open sockets, register real routes, connect to databases, or run business logic. After observing the fixtures, the simulator profile will keep using static runtime events.

## Fixture Projects

Add three dev-only fixture apps under a non-published test or development path.

### Simple Fixture

The simple fixture represents a generated starter:

- `AppModule`
- `AppController`
- `AppService`
- one root route mapping

It should confirm that `simple` remains short and recognizable as a Nest template startup.

### Middle Fixture

The middle fixture represents a typical production API:

- `ConfigModule`
- `DatabaseModule` with a mock connection lifecycle
- repository-style providers
- `CacheModule`
- `HealthModule`
- `SchedulerModule`
- feature modules such as `UsersModule` and `OrdersModule`

It should produce a denser startup sequence without sounding like a large platform.

### Heavy Fixture

The heavy fixture represents an enterprise API platform:

- many feature modules, such as `UsersModule`, `OrdersModule`, `BillingModule`, `InventoryModule`, `NotificationsModule`, and `AdminModule`
- `DatabaseModule` with pool initialization, schema check, and migration readiness messages
- `AuthModule`, `RbacModule`, and policy providers
- queue and outbox providers
- scheduler providers
- OpenTelemetry-style tracing providers
- audit pipeline providers
- SLO and health aggregation providers

The heavy fixture should be intentionally DI-rich. The final simulator logs should include enough `InstanceLoader` and lifecycle messages that the user can feel many modules and providers came online.

## Runtime Profile Changes

Update `src/profiles/nestjs.ts` after fixture observation:

- keep `simple` close to the current template-style sequence
- expand `middle` with module dependency initialization, database readiness, cache warmup, health route setup, scheduler startup, and request-style runtime events
- expand `heavy` with a long startup sequence covering module dependency initialization, database pool lifecycle, migration readiness, auth and policy warmup, queue workers, outbox dispatcher, telemetry exporter, audit stream, and SLO monitors
- add richer runtime rotation for `heavy`, including request logs, DB query summaries, queue jobs, audit commits, trace exports, policy decisions, and health snapshots
- keep shutdown logs realistic for modules that would close resources

The simulator should still format lines through the existing NestJS formatter so runtime output remains terminal-style Nest logs.

## Testing

Keep the current safety tests:

- runtime logs must not expose `void-server`
- runtime source must not import `@nestjs/*`
- NestJS packages remain dev-only dependencies

Add stronger NestJS profile tests:

- `simple` includes template startup logs and stays compact
- `middle` includes database, cache, health, scheduler, and feature-module logs
- `heavy` includes many DI/module initialization logs
- `heavy` includes database pool, migration, auth, RBAC, queue, outbox, telemetry, audit, and SLO logs
- `heavy` runtime rotation includes request, database, queue, audit, trace, and policy-style events

If fixture execution is automated, keep it in tests or scripts that are not shipped in npm package contents.

## Documentation

Update the README so users understand that:

- NestJS profiles are terminal simulators
- the logs are grounded by dev-only NestJS fixtures
- `heavy` is intended to look like a large API platform with many DI providers and lifecycle systems

## Scope

In scope:

- dev-only fixture apps for observation
- richer NestJS simulator log sequences
- tests proving the runtime remains lightweight and logs are more realistic
- README updates

Out of scope:

- shipping NestJS in runtime dependencies
- starting a real HTTP server from the simulator
- connecting to a real database, queue, cache, or telemetry backend
- adding new framework profiles beyond NestJS
