const {
  EmbedBuilder,
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
  Integration,
} = require("discord.js");
const axios = require("axios");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("cats")
    .setDescription("Cats images.")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  run: async (interaction) => {
    const response = await axios.get(
      "https://api.reddit.com/r/cats/random/.json"
    );
    const responseData = response.data[0].data.children[0].data;

    const memeimage = responseData.url_overridden_by_dest;
    const memetitle = responseData.title;
    const embed = new EmbedBuilder()
      .setTitle(`${memetitle}`)
      .setImage(memeimage)
      .setFooter({ text: `From r/cats` })
      .setColor("Random");

    const nextButton = new ButtonBuilder()
      .setCustomId("next")
      .setLabel("Next")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(nextButton);

    let message = await interaction.reply({
      embeds: [embed],
      components: [row],
    });
    let filter = (i) => i.user.id === interaction.user.id;

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 15_000,
      filter,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "next") {
        const response = await axios.get(
          "https://api.reddit.com/r/cats/random/.json"
        );
        const responseData = response.data[0].data.children[0].data;

        const memeimage = responseData.url_overridden_by_dest;
        const memetitle = responseData.title;
        const embed = new EmbedBuilder()
          .setTitle(`${memetitle}`)
          .setImage(memeimage)
          .setFooter({ text: `From r/cats` })
          .setColor("Random");
        message.edit({
          embeds: [embed],
          components: [row],
        });
      }
    });
  },
};
