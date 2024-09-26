import {
  EmbedBuilder,
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
} from "discord.js";
import axios from "axios";

export default {
  data: new SlashCommandBuilder()
    .setName("cats")
    .setDescription("Cats images.")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  run: async (interaction) => {
    const { image, title } = await getRandomCat();

    function getRandomCat() {
      return new Promise(async (resolve, reject) => {
        let image;
        let title;
        do {
          const response = await axios.get(
            "https://api.reddit.com/r/cats/random/.json"
          );
          const responseData = response.data[0].data.children[0].data;

          image = responseData.url_overridden_by_dest;
          title = responseData.title;
        } while (
          !image ||
          image.startsWith("https://v.redd.it/") ||
          image.includes("/gallery/")
        );

        resolve({ image, title });
      });
    }
    const embed = new EmbedBuilder()
      .setTitle(`${title}`)
      .setImage(image)
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
      time: 300_000,
      filter,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "next") {
        await i.deferUpdate();
        const { image, title } = await getRandomCat();
        const embed = new EmbedBuilder()
          .setTitle(`${title}`)
          .setImage(image)
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
