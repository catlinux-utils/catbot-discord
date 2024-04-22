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
      client.commands.set(command.name, command);
      client.commandArray.push(command);
    }
  }

  client.on("ready", async () => {
    await client.application.commands.set(client.commandArray);
  });
};
