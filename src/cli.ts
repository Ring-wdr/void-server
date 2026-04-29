import { hostname } from "node:os";
import { stdin as input, stdout as output } from "node:process";
import { createFastifyProfile } from "./profiles/fastify.js";
import type { FrameworkProfile, Simulator } from "./profiles/types.js";
import { createSimulator } from "./runtime/simulator.js";

interface SelectableProfile {
  readonly label: string;
  readonly description: string;
  readonly recommended?: boolean;
  readonly profile?: FrameworkProfile;
}

const profileChoices: readonly SelectableProfile[] = [
  {
    label: "Fastify",
    description: "Fast Node.js server runtime",
    recommended: true,
    profile: createFastifyProfile()
  },
  {
    label: "NestJS",
    description: "Coming soon"
  },
  {
    label: "Nitro",
    description: "Coming soon"
  },
  {
    label: "Express",
    description: "Coming soon"
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
  return new Promise((resolve) => {
    let selectedIndex = 0;
    let status = "";
    const canUseRawMode = input.isTTY && typeof input.setRawMode === "function";

    function render() {
      if (output.isTTY) {
        output.write("\x1B[2J\x1B[H");
      }

      output.write("? Select framework runtime\n\n");

      choices.forEach((choice, index) => {
        const marker = index === selectedIndex ? "> " : "  ";
        const recommended = choice.recommended ? "  Recommended" : "";
        const label = choice.label.padEnd(10);
        output.write(`${marker}${label} ${choice.description}${recommended}\n`);
      });

      if (status) {
        output.write(`\n${status}\n`);
      }

      output.write("\nUp/Down navigate - Enter select - Ctrl+C cancel\n");
    }

    function cleanup() {
      input.off("data", onData);

      if (canUseRawMode) {
        input.setRawMode(false);
      }

      input.pause();
    }

    function selectCurrent() {
      const choice = choices[selectedIndex];

      if (!choice.profile) {
        status = "This runtime profile is not available yet.";
        render();
        return;
      }

      cleanup();
      output.write("\n");
      resolve(choice.profile);
    }

    function move(delta: number) {
      selectedIndex = (selectedIndex + delta + choices.length) % choices.length;
      status = "";
      render();
    }

    function handleKey(key: string) {
      if (key === "\u0003") {
        cleanup();
        output.write("\n");
        process.exit(130);
      }

      if (key === "\u001B[A" || key === "k") {
        move(-1);
        return;
      }

      if (key === "\u001B[B" || key === "j") {
        move(1);
        return;
      }

      if (key === "\r" || key === "\n") {
        selectCurrent();
        return;
      }

      const numericChoice = Number.parseInt(key, 10);

      if (Number.isInteger(numericChoice) && numericChoice >= 1 && numericChoice <= choices.length) {
        selectedIndex = numericChoice - 1;
        selectCurrent();
      }
    }

    function onData(chunk: Buffer) {
      for (const key of parseKeys(chunk.toString("utf8"))) {
        handleKey(key);
      }
    }

    render();

    if (canUseRawMode) {
      input.setRawMode(true);
    }

    input.resume();
    input.on("data", onData);
  });
}

function parseKeys(inputText: string): string[] {
  const keys: string[] = [];
  let index = 0;

  while (index < inputText.length) {
    const sequence = inputText.slice(index, index + 3);

    if (sequence === "\u001B[A" || sequence === "\u001B[B") {
      keys.push(sequence);
      index += 3;
      continue;
    }

    keys.push(inputText[index]);
    index += 1;
  }

  return keys;
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
