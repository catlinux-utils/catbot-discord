import { SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("do_nogi")
    .setDescription("Bot do nogi")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  ownerOnly: true,
  run: async (interaction: any) => {
    await interaction.reply("User bot do usług szefie");
  },
};
