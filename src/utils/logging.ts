import chalk from "chalk";

interface LoggerConfig {
  // Explicitly list valid chalk color methods
  color: "green" | "red" | "yellow" | "blue" | "cyanBright";
  prefix: string;
}

interface Logger {
  (message: string, ...args: unknown[]): void;
}

interface Loggers {
  success: Logger;
  error: Logger;
  warn: Logger;
  info: Logger;
  startup: Logger;
}

const createLogger = ({ color, prefix }: LoggerConfig): Logger => {
  return (message: string, ...args: unknown[]) => {
    const date = new Date().toLocaleTimeString("en-US", { hour12: false });
    console.log(`${date} ${chalk[color](`${prefix} `)}${message}`, ...args);
  };
};

const loggers: Loggers = {
  success: createLogger({ color: "green", prefix: "[SUCCESS]" }),
  error: createLogger({ color: "red", prefix: "[ERROR]" }),
  warn: createLogger({ color: "yellow", prefix: "[WARN]" }),
  info: createLogger({ color: "blue", prefix: "[INFO]" }),
  startup: createLogger({ color: "cyanBright", prefix: "[STARTUP]" }),
};

export default loggers;
