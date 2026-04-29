import { hostname } from "node:os";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createFastifyProfile } from "./profiles/fastify.js";
import type { FrameworkProfile, Simulator } from "./profiles/types.js";
import { createSimulator } from "./runtime/simulator.js";

const profiles = [createFastifyProfile()];

export async function runCli() {
  const selected = await selectProfile(profiles);
  const simulator = createSimulator(selected, {
    logger: console.log,
    now: () => new Date(),
    hostname: hostname(),
    pid: process.pid,
    setInterval,
    clearInterval
  });

  startUntilSignal(simulator);
}

async function selectProfile(availableProfiles: readonly FrameworkProfile[]) {
  output.write("Select framework runtime\n\n");

  availableProfiles.forEach((profile, index) => {
    output.write(`${index + 1}. ${profile.label}\n`);
  });

  const readline = createInterface({ input, output });

  try {
    const answer = await readline.question("\nFramework: ");
    const selectedIndex = Number.parseInt(answer.trim(), 10) - 1;
    return availableProfiles[selectedIndex] ?? availableProfiles[0];
  } finally {
    readline.close();
  }
}

function startUntilSignal(simulator: Simulator) {
  simulator.start();

  process.on("SIGINT", () => {
    simulator.stop("SIGINT");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    simulator.stop("SIGTERM");
    process.exit(0);
  });
}
