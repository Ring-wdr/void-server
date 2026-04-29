# Nest Core Logger Research

Date: 2026-04-29

## Package Versions

The local implementation was checked against:

- `@nestjs/common@11.1.19`
- `@nestjs/core@11.1.19`
- `@nestjs/cli@11.0.21`

## ConsoleLogger Formatting

Nest's terminal log format comes from `@nestjs/common/services/console-logger.service.js`.

Key behavior:

- `printMessages()` builds `pidMessage`, `contextMessage`, `timestampDiff`, and padded uppercase log level before writing to stdout/stderr.
- `formatPid(pid)` returns `[Nest] ${pid}  - `.
- `formatContext(context)` wraps context as `[Context] ` and colors it with `yellow()` when colors are enabled.
- `formatMessage()` prints: pid, timestamp, colored log level, context, message, timestamp diff, newline.
- `stringifyMessage()` colors string messages by log level.
- `formatTimestampDiff()` returns ` +Nms` and colors that diff yellow when colors are enabled.

Color constants come from `@nestjs/common/utils/cli-colors.util.js`:

- green: `\x1B[32m...\x1B[39m`
- yellow context/diff: `\x1B[38;5;3m...\x1B[39m`
- gray watch timestamp is produced by TypeScript watch output, not Nest's `ConsoleLogger`.

## Core Bootstrap Log Order

Nest core emits the standard bootstrap logs from these paths:

- `@nestjs/core/constants.js`: `MESSAGES.APPLICATION_START` and `MESSAGES.APPLICATION_READY`
- `@nestjs/core/nest-factory.js`: `NestFactory` logger calls `Starting Nest application...` before dependency scanning and instance creation.
- `@nestjs/core/injector/instance-loader.js`: `InstanceLoader` logs `${ModuleName} dependencies initialized` for each non-internal module after providers/injectables/controllers are instantiated.
- `@nestjs/core/router/routes-resolver.js`: `RoutesResolver` logs `${ControllerName} {${path}}:`.
- `@nestjs/core/router/router-explorer.js`: `RouterExplorer` logs `Mapped {${path}, ${method}} route`.
- `@nestjs/core/nest-application.js`: `NestApplication` logs `Nest application successfully started` after modules, router, hooks, and bootstrap hooks finish.

## Watch Mode Lines

The first two lines in watch mode are TypeScript diagnostics, not Nest logger output:

- `Starting compilation in watch mode...`
- `Found 0 errors. Watching for file changes.`

They are defined in `typescript/lib/typescript.js` diagnostics.

The simulator can prefix selected terminal lines with `\x1B[2J\x1B[3J\x1B[H` to model the clear-screen behavior visible around watch-mode compilation/startup output.

## DeprecationWarning

`[DEP0190] DeprecationWarning: Passing args to a child process with shell option true...` is not produced by Nest. It is a Node.js child-process warning from wrappers that spawn commands with `shell: true` and argument arrays. The simulator keeps it as an observed terminal preamble line because it appeared in the target terminal output, but it should not be treated as Nest core behavior.
