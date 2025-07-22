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

// Load config
client.config = (
  await import(`${process.cwd()}/config.json`, { with: { type: "json" } })
).default;

// Assign logger
client.logs = logger;

// Initialize music system
client.musicsystem = new MusicSystem(client);

// Initialize commands collection
client.commands = new Collection<string, any>();

// Load handlers
fs.readdirSync(`${process.cwd()}/src/functions`).forEach(async (handler) => {
  await import(`${process.cwd()}/src/functions/${handler}`).then((module) => {
    module.default(client);
  });
});

// Login to Discord
client.login(process.env.token);
