import { SlashCommandBuilder, MessageFlags } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("allguilds")
    .setDescription("All guilds")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  ownerOnly: true,
  run: async (interaction, client) => {
    await interaction.deferReply();
    let list = "Guilds:\n";
    client.guilds.cache.forEach((guild) => {
      list += ` - ${guild.name} (${guild.id}) - ${guild.memberCount} Members - Owner: ${guild.ownerId}\n`;
    });

    await interaction.editReply({
      content: list,
      flags: MessageFlags.Ephemeral,
    });
  },
};
