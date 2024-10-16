import { SlashCommandBuilder } from "discord.js";
export default {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Show balance")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  ownerOnly: true,
  run: async (interaction, client) => {
    const balance = client.database.data.economy.balance.find(
      (entry) => entry.id === interaction.user.id
    ).balance;
    await interaction.reply(`<@${interaction.user.id}>'s balance: ${balance}`);
  },
};
