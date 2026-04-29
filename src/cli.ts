import { hostname } from "node:os";
import { stdin as input, stdout as output } from "node:process";
import { cancel, isCancel, select } from "@clack/prompts";
import { createFastifyProfile } from "./profiles/fastify.js";
import type { FrameworkProfile, Simulator } from "./profiles/types.js";
import { createSimulator } from "./runtime/simulator.js";

interface SelectableProfile {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly recommended?: boolean;
  readonly profile?: FrameworkProfile;
}

const profileChoices: readonly SelectableProfile[] = [
  {
    id: "fastify",
    label: "Fastify",
    hint: "Fast Node.js server runtime",
    recommended: true,
    profile: createFastifyProfile()
  },
  {
    id: "nestjs",
    label: "NestJS",
    hint: "Coming soon"
  },
  {
    id: "nitro",
    label: "Nitro",
    hint: "Coming soon"
  },
  {
    id: "express",
    label: "Express",
    hint: "Coming soon"
  }
];

export async function runCli() {
  const selected = await selectProfile(profileChoices);
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

async function selectProfile(choices: readonly SelectableProfile[]): Promise<FrameworkProfile> {
  const selected = await select<string>({
    message: "Select framework runtime",
    initialValue: choices[0]?.id,
    input,
    output,
    options: choices.map((choice) => ({
      label: choice.recommended ? `${choice.label} (Recommended)` : choice.label,
      value: choice.id,
      hint: choice.hint,
      disabled: !choice.profile
    }))
  });

  if (isCancel(selected)) {
    cancel("Operation cancelled", { output });
    process.exit(130);
  }

  const selectedChoice = choices.find((choice) => choice.id === selected && choice.profile);

  if (!selectedChoice?.profile) {
    cancel("Runtime profile is not available", { output });
    process.exit(1);
  }

  return selectedChoice.profile;
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
