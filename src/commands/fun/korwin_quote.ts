import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import korwin from "../../json/korwin_quotes.json" with { type: "json" };

export default {
  data: new SlashCommandBuilder()
    .setName("korwin-cytat")
    .setDescription("Cytaty Janusza Korwin-Mikkego")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  run: async (interaction: ChatInputCommandInteraction) => {
    const getRandomElement = <T>(arr: T[]) =>
      arr[Math.floor(Math.random() * arr.length)];

    const data = korwin as { quotes?: string[] };
    const quote = getRandomElement(data.quotes ?? []);

    await interaction.reply(quote);
  },
};
