import fs from "fs";
import { SlashCommandBuilder } from "discord.js";

export default async (client) => {
  client.commandArray = [];
  const commandFolders = fs.readdirSync(`${process.cwd()}/commands`);
  for (const folder of commandFolders) {
    const commandFiles = fs
      .readdirSync(`${process.cwd()}/commands/${folder}`)
      .filter((file) => file.endsWith(".js"));
    for (const file of commandFiles) {
      const command = await import(
        `${process.cwd()}/commands/${folder}/${file}`
      );
      client.commands.set(command.default.data.name, command.default);
      if (command.default.data instanceof SlashCommandBuilder) {
        client.commandArray.push(command.default.data.toJSON());
      } else {
        client.commandArray.push(command.default.data);
      }
    }
  }

  client.on("ready", async () => {
    await client.application.commands
      .set(client.commandArray)
      .catch(console.error);
  });
};
