import { ContextMenuCommandBuilder, ApplicationCommandType } from "discord.js";

export default {
  data: new ContextMenuCommandBuilder()
    .setName("petpet")
    .setDescription("pet user")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2])
    .setType(ApplicationCommandType.User),
  ownerOnly: true,
  run: async (interaction, client) => {
    await interaction.deferReply();
    let list = "Guilds:\n";
    client.guilds.cache.forEach((guild) => {
      list += ` - ${guild.name} (${guild.id}) - ${guild.memberCount} Members - Owner: ${guild.ownerId}\n`;
    });

    await interaction.editReply({ content: list, ephemeral: true });
  },
};
