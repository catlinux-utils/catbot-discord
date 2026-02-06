import {
  SlashCommandBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
  type Client,
  type Guild,
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("allguilds")
    .setDescription("All guilds")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  ownerOnly: true,
  run: async (interaction: ChatInputCommandInteraction, client: Client) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    let list = "Guilds:\n";
    client.guilds.cache.forEach((guild: Guild) => {
      list += ` - ${guild.name} (${guild.id}) - ${guild.memberCount} Members - Owner: ${guild.ownerId}\n`;
    });

    await interaction.editReply({
      content: list,
    });
  },
};
