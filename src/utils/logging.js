import chalk from "chalk";
export const log = (message) => {
  console.log(chalk.green(`[SUCCESS] ${message}`));
};
export const error = (message) => {
  console.log(chalk.red(`[ERROR] ${message}`));
};
export const warn = (message) => {
  console.log(chalk.yellow(`[WARN] ${message}`));
};
export default { log, error, warn };
