import fs from "node:fs";
import {
  SlashCommandBuilder,
  type Client,
  type ApplicationCommandDataResolvable,
} from "discord.js";
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
      // determine command name safely
      let commandName: string;
      if (command.data instanceof SlashCommandBuilder) {
        commandName = command.data.name;
        client.commandArray.push(command.data.toJSON());
      } else if (
        command.data &&
        typeof (command.data as any).name === "string"
      ) {
        commandName = (command.data as any).name;
        client.commandArray.push(
          command.data as ApplicationCommandDataResolvable,
        );
      } else {
        commandName = file.replace(/\.[jt]s$/, "");
        client.commandArray.push(
          command.data as ApplicationCommandDataResolvable,
        );
      }

      client.commands.set(commandName, command);
    }
  }
  client.logs.info(`Loaded ${client.commandArray?.length ?? 0} commands`);

  client.on("clientReady", async () => {
    await client.application.commands
      .set(client.commandArray)
      .catch(console.error);
  });
}
