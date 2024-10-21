import chalt from "chalk";
export default {
  log: (message) => {
    console.log(chalt.green(`[SUCCESS] ${message}`));
  },
  error: (message) => {
    console.log(chalt.red(`[ERROR] ${message}`));
  },
  warn: (message) => {
    console.log(chalt.yellow(`[WARN] ${message}`));
  },
};
