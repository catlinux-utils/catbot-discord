import fs from "fs";

export default async (client) => {
  const { log } = client.utils.logging;
  const events = fs.readdirSync(`${process.cwd()}/src/events`);
  for (const event of events) {
    const eventHandler = await import(`${process.cwd()}/src/events/${event}`);
    eventHandler.default(client);
  }
  log(`Loaded ${events.length} events`);
};
