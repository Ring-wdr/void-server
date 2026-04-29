import { hostname } from "node:os";
import { stdin as input, stdout as output } from "node:process";
import { cancel, isCancel, select } from "@clack/prompts";
import { createFastifyProfile } from "./profiles/fastify.js";
import { createNestjsProfile, type NestjsLogMode } from "./profiles/nestjs.js";
import type { FrameworkProfile, Simulator } from "./profiles/types.js";
import { createSimulator } from "./runtime/simulator.js";

interface SelectableProfile {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly recommended?: boolean;
  readonly profile?: FrameworkProfile;
  readonly enabled?: boolean;
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
    hint: "Dev-only Nest logger simulator",
    enabled: true
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
      disabled: !choice.profile && !choice.enabled
    }))
  });

  if (isCancel(selected)) {
    cancel("Operation cancelled", { output });
    process.exit(130);
  }

  const selectedChoice = choices.find((choice) => choice.id === selected);

  if (selectedChoice?.id === "nestjs") {
    return createNestjsProfile(await selectNestjsLogMode());
  }

  if (!selectedChoice?.profile) {
    cancel("Runtime profile is not available", { output });
    process.exit(1);
  }

  return selectedChoice.profile;
}

async function selectNestjsLogMode(): Promise<NestjsLogMode> {
  const selected = await select<NestjsLogMode>({
    message: "Select NestJS logger level",
    initialValue: "simple",
    input,
    output,
    options: [
      {
        label: "simple",
        value: "simple",
        hint: "Template bootstrap logger"
      },
      {
        label: "middle",
        value: "middle",
        hint: "Startup service logger"
      },
      {
        label: "heavy",
        value: "heavy",
        hint: "Enterprise platform logger"
      }
    ]
  });

  if (isCancel(selected)) {
    cancel("Operation cancelled", { output });
    process.exit(130);
  }

  return selected;
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
