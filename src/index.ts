import { Client, GatewayIntentBits, Collection, Options } from "discord.js";
import fs from "node:fs";
import MusicSystem from "./utils/music-utils/music-system.ts";
import logger from "./utils/logging.ts";

import "dotenv/config";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
  sweepers: {
    ...Options.DefaultSweeperSettings,
    messages: {
      interval: 300,
      lifetime: 300,
    },
    users: {
      interval: 300,
      lifetime: 7200,
      filter: () => (user) => user.id !== user.client.user.id,
    },
  },
});

client.logs = logger;

client.musicsystem = new MusicSystem(client);

client.commands = new Collection<string, any>();

fs.readdirSync(`${process.cwd()}/src/functions`).forEach(async (handler) => {
  await import(`${process.cwd()}/src/functions/${handler}`).then((module) => {
    module.default(client);
  });
});

client.login(process.env.token);
