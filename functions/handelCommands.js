const fs = require("fs");
const { SlashCommandBuilder } = require("discord.js");

module.exports = async (client) => {
  client.commandArray = [];
  const commandFolders = fs.readdirSync("./commands");
  for (folder of commandFolders) {
    const commandFiles = fs
      .readdirSync(`./commands/${folder}`)
      .filter((file) => file.endsWith(".js"));
    for (const file of commandFiles) {
      const command = require(`../commands/${folder}/${file}`);
      client.commands.set(command.data.name, command);
      if (command.data instanceof SlashCommandBuilder) {
        client.commandArray.push(command.data.toJSON());
      } else {
        client.commandArray.push(command.data);
      }
    }
  }

  client.on("ready", async () => {
    await client.application.commands
      .set(client.commandArray)
      .catch(console.error);
  });
};
