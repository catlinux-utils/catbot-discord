const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const axios = require("axios");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("cats-facts")
    .setDescription("Cats facts.")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  run: async (interaction) => {
    const response = await axios.get("https://catfact.ninja/fact");
    const responseData = response.data.fact;
    const memeEmbed = new EmbedBuilder()
      .setDescription(`${responseData}`)
      .setFooter({ text: `From catfact.ninja` })
      .setColor("Random");
    await interaction.reply({ embeds: [memeEmbed] });
  },
};
