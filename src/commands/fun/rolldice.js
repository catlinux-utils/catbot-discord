import { SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("rolldice")
    .setDescription("Rolls a dice.")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  run: async (interaction) => {
    const roll = Math.floor(Math.random() * 6) + 1;
    await interaction.reply("You rolled a " + roll);
  },
};
