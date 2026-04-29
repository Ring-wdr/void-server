import type { FrameworkProfile, RuntimeEvent, Simulator, SimulatorOptions } from "../profiles/types.js";

export function createSimulator(profile: FrameworkProfile, options: SimulatorOptions): Simulator {
  let timer: unknown = null;
  let runtimeIndex = 0;

  function write(event: RuntimeEvent, extra: Record<string, unknown> = {}) {
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
