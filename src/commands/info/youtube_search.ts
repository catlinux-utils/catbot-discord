import {
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
} from "discord.js";
import { Client as YouTubeClient } from "youtubei";

const youtube = new YouTubeClient();

export default {
  data: new SlashCommandBuilder()
    .setName("youtube")
    .setDescription("YouTube search")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Query to search")
        .setRequired(true),
    )
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  run: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    let length = 0;
    const emoji = await interaction.client.application.emojis.fetch(
      "1298353951426482249",
    );

    const query = interaction.options.getString("query");
    const videos = await youtube.search(query, { type: "video" });
    length++;
    const nextButton = new ButtonBuilder()
      .setCustomId("next")
      .setLabel("Next")
      .setStyle(ButtonStyle.Primary);
    const prevButton = new ButtonBuilder()
      .setCustomId("prev")
      .setLabel("Previous")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true);

    const row = new ActionRowBuilder()
      .addComponents(prevButton)
      .addComponents(nextButton);

    const message = await interaction.editReply({
      content: `${emoji.toString()} [${length}/${videos.items.length}] Search: ${query}\nhttps://www.youtube.com/watch?v=${videos.items[0].id}`,
      components: [row],
    });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300_000,
      filter: (i: ButtonInteraction) => i.user.id === interaction.user.id,
    });
    collector.on("end", async () => {
      row.components.forEach((button: ButtonBuilder) =>
        button.setDisabled(true),
      );
      if (!(await interaction.fetchReply().catch(() => false))) return;
      await interaction.editReply({ components: [row] });
    });
    collector.on("collect", async (response: ButtonInteraction) => {
      if (response.customId === "next") {
        await response.deferUpdate();
        length++;
        prevButton.setDisabled(false);
        if (length === videos.items.length) {
          nextButton.setDisabled(true);
        }
        response.editReply({
          content: `${emoji.toString()} [${length}/${videos.items.length}] Search: ${query}\n https://www.youtube.com/watch?v=${videos.items[length - 1].id}`,
          components: [row],
        });
      } else if (response.customId === "prev") {
        await response.deferUpdate();
        length--;
        nextButton.setDisabled(false);
        if (length === 1) {
          prevButton.setDisabled(true);
        }
        response.editReply({
          content: `${emoji.toString()} [${length}/${videos.items.length}] Search: ${query}\nhttps://www.youtube.com/watch?v=${videos.items[0].id}`,
          components: [row],
        });
      }
    });
  },
};
