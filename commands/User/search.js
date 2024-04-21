const DDG = require("duck-duck-scrape");
const { EmbedBuilder } = require("discord.js");
module.exports = {
    name: "search",
    description: "Search web",
    integration_types: [1],
    contexts: [0, 1, 2],
    options: [
      {
        name: "query",
        description: "Query to search",
        type: 3,
        required: true,
      },
    ],
  run: async(interaction)=> {
    const query = interaction.options.getString("query");
    const results = (await DDG.search(query, { locale: "pl_PL", region: "pl" }))
      .results;
    const embed = new EmbedBuilder()
      .setTitle(results[0].title)
      .setDescription(
        results[0].description.replace(/<b>/g, "**").replace(/<\/b>/g, "**")
      )
      .setURL(results[0].url)
      .setThumbnail(results[0].icon)
      .setFooter({
        text: "Powered by DuckDuckGo",
        icon: "https://duckduckgo.com/assets/icons/meta/DDG-icon_256x256.png",
      })
      .setColor("Random");
    await interaction.reply({ embeds: [embed] });
  },
};
