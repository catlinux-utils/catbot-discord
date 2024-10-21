import fs from "fs";
import { log } from "../utils/logging.js";

export default async (client) => {
  const events = fs.readdirSync(`${process.cwd()}/src/events`);
  for (const event of events) {
    const eventHandler = await import(`${process.cwd()}/src/events/${event}`);
    eventHandler.default(client);
  }
  log(`Loaded ${events.length} events`);
};
