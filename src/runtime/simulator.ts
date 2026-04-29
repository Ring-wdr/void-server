import type { FrameworkProfile, RuntimeEvent, Simulator, SimulatorOptions } from "../profiles/types.js";

export function createSimulator(profile: FrameworkProfile, options: SimulatorOptions): Simulator {
  let timer: unknown = null;
  let runtimeIndex = 0;

  function write(event: RuntimeEvent, extra: Record<string, unknown> = {}) {
    if (profile.format === "nestjs") {
      options.logger(formatNestjsLog(event, extra, options));
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

    options.logger(JSON.stringify(entry));
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

function formatNestjsLog(event: RuntimeEvent, extra: Record<string, unknown>, options: SimulatorOptions): string {
  const level = formatNestjsLevel(event.level);
  const context = event.context ? ` [${event.context}]` : "";
  const suffix = extra.signal ? ` (${String(extra.signal)})` : "";

  return `[Nest] ${options.pid}  - ${options.now().toLocaleString()}     ${level}${context} ${event.message}${suffix}`;
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
