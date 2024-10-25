import { SlashCommandBuilder } from "discord.js";
import korwin from "../../json/korwin_quotes.json" with { type: "json" };

export default {
  data: new SlashCommandBuilder()
    .setName("korwin-cytat")
    .setDescription("Cytaty Janusza Korwin-Mikkego")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  run: async (interaction) => {
    const getRandomElement = (arr) =>
      arr[Math.floor(Math.random() * arr.length)];

    const quote = getRandomElement(korwin.quotes);

    await interaction.reply(quote);
  },
};
