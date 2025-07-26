import fs from "node:fs";

export default async (client) => {
  const events = fs.readdirSync(`${process.cwd()}/src/events`);
  for (const event of events) {
    const eventHandler = await import(`${process.cwd()}/src/events/${event}`);
    eventHandler.default(client);
  }
  client.logs.info(`Loaded ${events.length} events`);
};
