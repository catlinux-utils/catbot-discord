const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cats")
    .setDescription("Cats command.")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  run: async (interaction) => {
    const response = await axios.get(
      "https://api.reddit.com/r/cats/random/.json"
    );
    const responseData = response.data[0].data.children[0].data;

    const memeimage = responseData.url_overridden_by_dest;
    const memetitle = responseData.title;
    const memeEmbed = new EmbedBuilder()
      .setTitle(`${memetitle}`)
      .setImage(memeimage)
      .setFooter({ text: `From r/cats` })
      .setColor("Random");
    await interaction.reply({ embeds: [memeEmbed] });
  },
};
