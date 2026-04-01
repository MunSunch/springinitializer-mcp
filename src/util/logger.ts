const LEVELS = { debug: 0, info: 1, warn: 2, error: 3, off: 4 } as const;
type Level = keyof typeof LEVELS;

let currentLevel: number = LEVELS.info;
let output: (msg: string) => void = (msg) => process.stderr.write(msg + "\n");

function timestamp(): string {
  return new Date().toISOString();
}

function log(level: Level, message: string): void {
  if (LEVELS[level] >= currentLevel) {
    output(`${timestamp()} [${level.toUpperCase()}] ${message}`);
  }
}

export const logger = {
  debug: (msg: string) => log("debug", msg),
  info: (msg: string) => log("info", msg),
  warn: (msg: string) => log("warn", msg),
  error: (msg: string) => log("error", msg),

  setLevel(level: Level) {
    currentLevel = LEVELS[level];
  },

  useStdout() {
    output = (msg) => process.stdout.write(msg + "\n");
  },
};

// Initialize from environment
const envLevel = (process.env.LOG_LEVEL || "info").toLowerCase();
if (envLevel in LEVELS) {
  logger.setLevel(envLevel as Level);
}