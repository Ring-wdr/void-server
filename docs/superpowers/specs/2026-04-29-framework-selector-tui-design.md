# Framework Selector TUI Design

## Goal

Improve the framework selection experience so it feels closer to modern JavaScript CLIs such as create-vite and create-next-app while keeping the published runtime lightweight.

## Inspiration

create-vite uses a clear interactive selection flow with framework choices, variants, color, and cancellation behavior. create-next-app emphasizes recommended defaults and a low-friction first path with optional configuration.

`void-server` should borrow those interaction patterns without adding prompt libraries to runtime dependencies.

## User Experience

Running `npx void-server` shows an interactive keyboard menu:

```text
? Select framework runtime

> Fastify     Fast Node.js server runtime
  NestJS      Dev-only Nest logger simulator
  Nitro       Coming soon
  Express     Coming soon

Up/Down navigate • Enter select • Ctrl+C cancel
```

Fastify is the recommended option. NestJS is enabled and opens a second selector for `simple`, `middle`, and `heavy` logger depth. Other frameworks appear as disabled "Coming soon" choices so the product direction is visible without pretending those profiles exist.

The selector may display the package identity before selection. After selection, runtime logs must continue to hide `void-server`.

## Runtime Constraints

The TUI must use Node.js built-ins only. It may use `readline.emitKeypressEvents`, raw mode, ANSI escape sequences, and streams. It must not add `@clack/prompts`, `prompts`, `inquirer`, or similar libraries as runtime dependencies.

The selector must work in testable stream injection mode so child-process tests can drive keypress input.

## Testing

Tests should verify:

- the menu renders framework choices and coming-soon disabled entries
- Enter selects Fastify and starts the runtime
- selecting NestJS opens the logger-depth selector before starting the runtime
- arrow-key navigation to a disabled entry does not start the runtime
- Ctrl+C cancels without leaving the process hanging
- runtime logs still do not expose `void-server`

## Scope

This change improves framework selection and supports the NestJS logger-depth selector. Nitro and Express remain out of scope.
