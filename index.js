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

fs.readdirSync("./functions").forEach(async (handler) => {
  await import(`./functions/${handler}`).then((module) => {
    module.default(client);
  });
});

client.login(process.env.token);
