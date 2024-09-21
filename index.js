const { Client, GatewayIntentBits, Collection } = require(`discord.js`);
const fs = require("fs");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.commands = new Collection();

require("dotenv").config();

const functions = fs
  .readdirSync("./functions")
  .filter((file) => file.endsWith(".js"));

(async () => {
  for (file of functions) {
    require(`./functions/${file}`)(client);
  }
  client.login(process.env.token);
})();
