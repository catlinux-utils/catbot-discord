import chalk from "chalk";

const loggerConfig = {
  success: { color: "green", prefix: "[SUCCESS]" },
  error: { color: "red", prefix: "[ERROR]" },
  warn: { color: "yellow", prefix: "[WARN]" },
  info: { color: "blue", prefix: "[INFO]" },
  startup: { color: "cyanBright", prefix: "[STARTUP]" },
};

const createLogger =
  ({ color, prefix }) =>
  (message) => {
    const date = new Date().toLocaleTimeString("en-US", { hour12: false });
    console.log(`${date} ${chalk[color](`${prefix} ${message}`)}`);
  };

export default Object.fromEntries(
  Object.entries(loggerConfig).map(([key, value]) => [key, createLogger(value)])
);
