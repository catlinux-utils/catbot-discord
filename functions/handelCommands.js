const { SlashCommandBuilder } = require("@discordjs/builders");
const fs = require("fs");

module.exports = async (client) => {
  client.commandArray = [];
  const commandFolders = fs.readdirSync("./commands");
  for (folder of commandFolders) {
    const commandFiles = fs
      .readdirSync(`./commands/${folder}`)
      .filter((file) => file.endsWith(".js"));
    for (const file of commandFiles) {
      const command = require(`../commands/${folder}/${file}`);
      if (command.data) {
        client.commands.set(command.data.name, command);
      } else {
        client.commands.set(command.name, command);
      }
      if (command.data instanceof SlashCommandBuilder) {
        client.commandArray.push(command.data.toJSON()); //for user commands
      } else {
        client.commandArray.push(command.data); //for normal commands
      }
    }
  }

  client.on("ready", async () => {
    await client.application.commands.set(client.commandArray);
  });
};
