import fs from "node:fs";
import { SlashCommandBuilder } from "discord.js";

export default async (client) => {
  client.commandArray = [];
  client.categoriesArray = [];
  const commandFolders = fs.readdirSync(`${process.cwd()}/src/commands`);
  for (const folder of commandFolders) {
    const commandFiles = fs
      .readdirSync(`${process.cwd()}/src/commands/${folder}`)
      .filter((file) => file.endsWith(".js") || file.endsWith(".ts"));
    client.categoriesArray.push(folder);
    for (const file of commandFiles) {
      const command = await import(
        `${process.cwd()}/src/commands/${folder}/${file}`
      );
      command.default.category = folder;
      client.commands.set(command.default.data.name, command.default);
      if (command.default.data instanceof SlashCommandBuilder) {
        client.commandArray.push(command.default.data.toJSON());
      } else {
        client.commandArray.push(command.default.data);
      }
    }
  }
  client.logs.info(`Loaded ${client.commandArray.length} commands`);

  client.on("clientReady", async () => {
    await client.application.commands
      .set(client.commandArray)
      .catch(console.error);
  });
};
