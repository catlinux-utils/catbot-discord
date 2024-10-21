import { Client, GatewayIntentBits, Collection } from "discord.js";
import fs from "fs";

import "dotenv/config";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.commands = new Collection();
client.utils = {};

fs.readdirSync(`${process.cwd()}/src/utils`).forEach(async (handler) => {
  await import(`${process.cwd()}/src/utils/${handler}`).then((module) => {
    client.utils[handler.split(".")[0]] = module.default;
  });
});

fs.readdirSync(`${process.cwd()}/src/functions`).forEach(async (handler) => {
  await import(`${process.cwd()}/src/functions/${handler}`).then((module) => {
    module.default(client);
  });
});

client.login(process.env.token);
