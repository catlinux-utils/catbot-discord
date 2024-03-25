const {
  Client,
  GatewayIntentBits,
  Collection,
  EmbedBuilder,
} = require(`discord.js`);
const { DisTube } = require("distube");
const { SpotifyPlugin } = require("@distube/spotify");
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
const eventFiles = fs
  .readdirSync("./events")
  .filter((file) => file.endsWith(".js"));
const commandFolders = fs.readdirSync("./commands");

(async () => {
  for (file of functions) {
    require(`./functions/${file}`)(client);
  }
  client.handleEvents(eventFiles);
  client.handleCommands(commandFolders, "./commands");
  client.login(process.env.token);
})();
