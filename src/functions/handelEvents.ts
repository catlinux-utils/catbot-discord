import fs from "node:fs";
import type { Client } from "discord.js";

export default async function handelEvents(client: Client): Promise<void> {
  const events = fs.readdirSync(`${process.cwd()}/src/events`);
  for (const event of events) {
    const eventHandler = await import(`${process.cwd()}/src/events/${event}`);
    if (eventHandler && typeof eventHandler.default === "function") {
      eventHandler.default(client as any);
    }
  }
  client.logs?.info?.(`Loaded ${events.length} events`);
}
