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
    .setName("memes")
    .setDescription("Meme images.")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  run: async (interaction) => {
    await interaction.deferReply();
    const { image, title, tries } = await getRandomMeme();

    async function getRandomMeme() {
      let image;
      let title;
      let tries = 0;
      do {
        try {
          if (tries > 50) {
            return {
              image: "noimage",
              title: "notitle",
              tries: "notries",
            };
          }
          const response = await axios.get(
            "https://api.reddit.com/r/memes/random/.json"
          );
          const responseData = response.data[0].data.children[0].data;
          image = responseData.url_overridden_by_dest;
          title = responseData.title;
          tries += 1;
        } catch (error) {
          if (error.response && error.response.status === 429) {
            // Reddit rate limit exceeded
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }
          throw error;
        }
      } while (!image || (!image.endsWith(".jpeg") && !image.endsWith(".png")));
      return { image, title, tries };
    }

    const embed = new EmbedBuilder()
      .setTitle(`${title}`)
      .setImage(image)
      .setFooter({ text: ` From r/memes ${tries}` })
      .setColor("Random");

    const nextButton = new ButtonBuilder()
      .setCustomId("next")
      .setLabel("Next")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(nextButton);
    if (image === "noimage") {
      row.components.forEach((button) => button.setDisabled(true));
      await interaction.editReply({ components: [row] });
      return;
    }

    let message = await interaction.editReply({
      embeds: [embed],
      components: [row],
    });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300_000,
      filter: (i) => i.user.id === interaction.user.id,
    });

    collector.on("collect", async (response) => {
      if (response.customId === "next") {
        await response.deferUpdate();
        const { image, title, tries } = await getRandomMeme();
        if (image === "noimage") {
          row.components.forEach((button) => button.setDisabled(true));
          await interaction.editReply({ components: [row] });
          return;
        }
        const embed = new EmbedBuilder()
          .setTitle(`${title}`)
          .setImage(image)
          .setFooter({ text: ` From r/memes ${tries}` })
          .setColor("Random");
        response.editReply({
          embeds: [embed],
        });
      }
    });
    collector.on("end", async () => {
      row.components.forEach((button) => button.setDisabled(true));
      if (!(await interaction.fetchReply().catch(() => false))) return;
      await interaction.editReply({ components: [row] });
    });
  },
};
