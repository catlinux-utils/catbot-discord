import fs from "node:fs";
import { SlashCommandBuilder, type Client } from "discord.js";
import type { BotCommand } from "../types.d.ts";

export default async function handelCommands(client: Client): Promise<void> {
  client.commandArray = [];
  client.categoriesArray = [];
  const commandFolders = fs.readdirSync(`${process.cwd()}/src/commands`);
  for (const folder of commandFolders) {
    const commandFiles = fs
      .readdirSync(`${process.cwd()}/src/commands/${folder}`)
      .filter((file) => file.endsWith(".js") || file.endsWith(".ts"));
    client.categoriesArray.push(folder);
    for (const file of commandFiles) {
      const command = (
        await import(`${process.cwd()}/src/commands/${folder}/${file}`)
      ).default as unknown as BotCommand;
      command.category = folder;
      // store typed command
      client.commands.set(
        (command as any).data?.name ?? file.replace(/\.[jt]s$/, ""),
        command,
      );
      if (command.data instanceof SlashCommandBuilder) {
        client.commandArray.push((command.data as any).toJSON());
      } else {
        client.commandArray.push(command.data as any);
      }
    }
  }
  client.logs.info(`Loaded ${client.commandArray?.length ?? 0} commands`);

  client.on("clientReady", async () => {
    await client.application.commands
      .set(client.commandArray as any)
      .catch(console.error);
  });
}
