import { Client, GatewayIntentBits, Collection } from "discord.js";
import fs from "fs";
import MusicSystem from "./utils/music-system.ts";
import logger from "./utils/logging.ts";

import "dotenv/config";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.config = (
  await import(`${process.cwd()}/config.json`, { with: { type: "json" } })
).default;

client.logs = logger;

client.musicsystem = new MusicSystem(client);

client.commands = new Collection<string, any>();

fs.readdirSync(`${process.cwd()}/src/functions`).forEach(async (handler) => {
  await import(`${process.cwd()}/src/functions/${handler}`).then((module) => {
    module.default(client);
  });
});

client.login(process.env.token);
