const { EmbedBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  name: "meme",
  description: "Meme command.",
  run: async (interaction) => {
    const response = await axios.get(
      "https://api.reddit.com/r/memes/random/.json"
    );
    const responseData = response.data[0].data.children[0].data;

    const memeimage = responseData.url_overridden_by_dest;
    const memetitle = responseData.title;
    const memeEmbed = new EmbedBuilder()
      .setTitle(`${memetitle}`)
      .setImage(memeimage)
      .setFooter({ text: `From r/memes` })
      .setColor("Random");
    await interaction.reply({ embeds: [memeEmbed] });
  },
};
