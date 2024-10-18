import DDG from "duck-duck-scrape";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("search")
    .setDescription("Search web")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2])
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Query to search")
        .setRequired(true)
    ),
  run: async (interaction) => {
    await interaction.deferReply();
    const query = interaction.options.getString("query");
    const results = (await DDG.search(query, { locale: "pl_PL", region: "pl" }))
      .results;
    let list = [];
    results.slice(0, 4).forEach((result, index) => {
      const data = {
        name: `${index + 1}. ${result.title} \n${result.url}`,
        value: result.description
          .replace(/<b>/g, "**")
          .replace(/<\/b>/g, "**")
          .normalize("NFC")
          .substring(0, 250),
      };
      list.push(data);
    });
    const embed = new EmbedBuilder()
      .setTitle(`Search: ${query}`)
      .setFields(list)
      .setFooter({
        text: "Powered by DuckDuckGo",
        icon: "https://duckduckgo.com/assets/icons/meta/DDG-icon_256x256.png",
      })
      .setColor("Random");

    await interaction.editReply({
      embeds: [embed],
    });
  },
};
