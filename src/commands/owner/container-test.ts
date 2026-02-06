import {
  ContainerBuilder,
  UserSelectMenuBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
  FileBuilder,
  AttachmentBuilder,
  Colors,
  MediaGalleryBuilder,
} from "discord.js";
export default {
  data: new SlashCommandBuilder()
    .setName("container-test")
    .setDescription("test")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  ownerOnly: true,
  run: async (interaction) => {
    await interaction.deferReply();
    const container = new ContainerBuilder()
      .setAccentColor(Colors.DarkGold)
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          new UserSelectMenuBuilder()
            .setCustomId("exampleSelect")
            .setPlaceholder("Select users"),
        ),
      )
      .addSeparatorComponents((separator) => separator)
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent("1"),
          )
          .setButtonAccessory((button) =>
            button
              .setCustomId("start")
              .setLabel("start")
              .setStyle(ButtonStyle.Primary),
          ),
      )
      .addSectionComponents((section) =>
        section
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent("2"),
          )
          .setButtonAccessory((button) =>
            button
              .setCustomId("stop")
              .setLabel("stop")
              .setStyle(ButtonStyle.Primary),
          ),
      )
      .addFileComponents(new FileBuilder().setURL(`attachment://windows.mp3`))
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          (mediaGalleryItem) =>
            mediaGalleryItem
              .setDescription(
                "alt text displaying on an image from the AttachmentBuilder",
              )
              .setURL("https://i.imgur.com/AfFp7pu.png"),
          (mediaGalleryItem) =>
            mediaGalleryItem
              .setDescription(
                "alt text displaying on an image from the AttachmentBuilder",
              )
              .setURL("https://i.imgur.com/AfFp7pu.png"),
        ),
      );
    const file = new AttachmentBuilder("src/resources/windows.mp3");

    return await interaction.editReply({
      components: [container],
      files: [file],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
