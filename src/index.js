import { Client, GatewayIntentBits, Collection } from "discord.js";
import fs from "fs";
import MusicSystem from "./utils/music-system.js";

import "dotenv/config";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.logs = (await import(`${process.cwd()}/src/utils/logging.js`)).default;
client.musicsystem = new MusicSystem(client);
client.config = (
  await import(`${process.cwd()}/config.json`, { with: { type: "json" } })
).default;

client.commands = new Collection();

fs.readdirSync(`${process.cwd()}/src/functions`).forEach(async (handler) => {
  await import(`${process.cwd()}/src/functions/${handler}`).then((module) => {
    module.default(client);
  });
});

client.login(process.env.token);
