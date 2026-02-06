import { MessageFlags, type Client } from "discord.js";
import type { BotCommand } from "../types.d.ts";

export default function interactionCreate(client: Client) {
  client.on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      if (command.ownerOnly) {
        if (!client.owners.includes(interaction.user.id)) {
          return interaction.reply({
            content: "You are not allowed to use this command",
            flags: MessageFlags.Ephemeral,
          });
        }
      }

      try {
        await command.run(interaction, client);
      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
    if (interaction.isContextMenuCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      if (command.ownerOnly) {
        if (!client.owners.includes(interaction.user.id)) {
          return interaction.reply({
            content: "You are not allowed to use this command",
            flags: MessageFlags.Ephemeral,
          });
        }
      }
      try {
        await Promise.resolve(command.run(interaction, client)).catch(
          (error: any) => {
            console.error(error);
          },
        );
      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.autocomplete?.(interaction, client as any);
      } catch (error) {
        console.error(error);
      }
    }
  });
}
