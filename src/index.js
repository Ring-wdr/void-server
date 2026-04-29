const DEFAULT_SERVICE_NAME = "void-server";

export function createVoidServer(options = {}) {
  const logger = options.logger ?? console.log;
  const now = options.now ?? (() => new Date());
  const serviceName = options.serviceName ?? DEFAULT_SERVICE_NAME;
  let heartbeat = null;

  function line(level, message) {
    logger(`${now().toISOString()} ${level.padEnd(5)} [${serviceName}] ${message}`);
  }

  return {
    start() {
      line("INFO", "Booting Node.js runtime");
      line("INFO", "Loading framework adapter");
      line("INFO", "Registered 0 routes");
      line("INFO", "Mounted 0 middleware");
      line("INFO", "Listening on virtual://localhost:0");
      line("WARN", "No application logic detected");

      heartbeat = setInterval(() => {
        line("DEBUG", "Event loop idle; processed 0 requests");
      }, 5000);
    },

    stop(signal = "manual") {
      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }

      line("INFO", `Shutdown requested by ${signal}`);
      line("INFO", "Released 0 resources");
    }
  };
}
