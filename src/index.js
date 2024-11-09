import { Client, GatewayIntentBits, Collection } from "discord.js";
import { createAudioPlayer, NoSubscriberBehavior } from "@discordjs/voice";
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

client.logs = (await import(`${process.cwd()}/src/utils/logging.js`)).default;

client.music;
client.musicplayer = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Pause,
  },
});

client.commands = new Collection();
client.utils = {};

fs.readdirSync(`${process.cwd()}/src/functions`).forEach(async (handler) => {
  await import(`${process.cwd()}/src/functions/${handler}`).then((module) => {
    module.default(client);
  });
});

client.login(process.env.token);
