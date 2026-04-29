import type { FrameworkProfile, RuntimeEvent, Simulator, SimulatorOptions } from "../profiles/types.js";

const CLEAR_SCREEN = "\x1B[2J\x1B[3J\x1B[H";

export function createSimulator(profile: FrameworkProfile, options: SimulatorOptions): Simulator {
  let timer: unknown = null;
  let runtimeIndex = 0;

  function write(event: RuntimeEvent, extra: Record<string, unknown> = {}) {
    if (event.terminal) {
      options.logger(withClearPrefix(event, formatTerminalEvent(event, options)));
      return;
    }

    if (profile.format === "nestjs") {
      options.logger(withClearPrefix(event, formatNestjsLog(event, extra, options)));
      return;
    }

    const entry = {
      level: event.level,
      time: options.now().getTime(),
      pid: options.pid,
      hostname: options.hostname,
      name: profile.loggerName,
      ...event.bindings,
      ...extra,
      msg: event.message
    };

    options.logger(withClearPrefix(event, JSON.stringify(entry)));
  }

  function writeNextRuntimeEvent() {
    const event = profile.runtime[runtimeIndex % profile.runtime.length];
    runtimeIndex += 1;
    write(event);
  }

  return {
    start() {
      for (const event of profile.startup) {
        write(event);
      }

      timer = options.setInterval(writeNextRuntimeEvent, profile.intervalMs);
    },

    stop(signal = "manual") {
      if (timer !== null) {
        options.clearInterval(timer);
        timer = null;
      }

      for (const event of profile.shutdown) {
        write(event, { signal });
      }
    }
  };
}

function withClearPrefix(event: RuntimeEvent, line: string): string {
  return event.clearBefore ? `${CLEAR_SCREEN}${line}` : line;
}

function formatNestjsLog(event: RuntimeEvent, extra: Record<string, unknown>, options: SimulatorOptions): string {
  const level = formatNestjsLevel(event.level);
  const formattedLogLevel = level.padStart(7, " ");
  const pidMessage = green(`[Nest] ${options.pid}  - `);
  const context = event.context ? yellow256(`[${event.context}] `) : "";
  const suffix = extra.signal ? ` (${String(extra.signal)})` : "";
  const timing = typeof event.elapsedMs === "number" ? yellow256(` +${event.elapsedMs}ms`) : "";
  const message = green(`${event.message}${suffix}`);

  return `${pidMessage}${formatNestTimestamp(options.now())} ${green(formattedLogLevel)} ${context}${message}${timing}`;
}

function formatTerminalEvent(event: RuntimeEvent, options: SimulatorOptions): string {
  switch (event.terminal) {
    case "typescript-watch-start":
    case "typescript-watch-success":
      return `[${gray(formatWatchTime(withOffset(options.now(), event.clockOffsetMs)))}] ${event.message}`;
    case "node-deprecation-warning":
      return `(node:${options.pid}) [DEP0190] ${event.message}`;
    case "node-deprecation-help":
      return event.message;
    case "blank":
    default:
      return "";
  }
}

function formatNestjsLevel(level: RuntimeEvent["level"]): string {
  switch (level) {
    case 10:
      return "VERBOSE";
    case 20:
      return "DEBUG";
    case 40:
      return "WARN";
    case 50:
      return "ERROR";
    case 30:
    default:
      return "LOG";
  }
}

function withOffset(date: Date, offsetMs = 0): Date {
  return new Date(date.getTime() + offsetMs);
}

function formatNestTimestamp(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function formatWatchTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function green(value: string): string {
  return `\x1B[32m${value}\x1B[39m`;
}

function yellow256(value: string): string {
  return `\x1B[38;5;3m${value}\x1B[39m`;
}

function gray(value: string): string {
  return `\x1B[90m${value}\x1B[0m`;
}
