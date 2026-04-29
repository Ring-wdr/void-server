export type RuntimeLevel = 10 | 20 | 30 | 40 | 50;

export interface RuntimeEvent {
  readonly level: RuntimeLevel;
  readonly message: string;
  readonly context?: string;
  readonly elapsedMs?: number;
  readonly bindings?: Record<string, unknown>;
}

export type LogFormat = "json" | "nestjs";

export interface FrameworkProfile {
  readonly id: string;
  readonly label: string;
  readonly loggerName: string;
  readonly format?: LogFormat;
  readonly intervalMs: number;
  readonly startup: readonly RuntimeEvent[];
  readonly runtime: readonly RuntimeEvent[];
  readonly shutdown: readonly RuntimeEvent[];
}

export interface TimerControls {
  setInterval(callback: () => void, ms: number): unknown;
  clearInterval(timer: unknown): void;
}

export interface SimulatorOptions extends TimerControls {
  readonly logger: (line: string) => void;
  readonly now: () => Date;
  readonly hostname: string;
  readonly pid: number;
}

export interface Simulator {
  start(): void;
  stop(signal?: string): void;
}
