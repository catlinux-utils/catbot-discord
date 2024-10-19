import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("emoji")
    .setDescription("Bot Emoji Manager")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2])
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("List all emoji")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add emoji")
        .addStringOption((option) =>
          option.setName("name").setDescription("Emoji name").setRequired(true)
        )
        .addAttachmentOption((option) =>
          option
            .setName("image")
            .setDescription("Emoji image")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove emoji")
        .addStringOption((option) =>
          option.setName("id").setDescription("Emoji id").setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("edit")
        .setDescription("Edit emoji")
        .addStringOption((option) =>
          option.setName("id").setDescription("Emoji id").setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("New emoji name")
            .setRequired(true)
        )
    ),
  ownerOnly: true,
  run: async (interaction, client) => {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
      case "list": {
        const emojis = await client.application.emojis.fetch();
        let list = [];
        emojis.forEach((emoji) => {
          let data = new Object();
          data = {
            name: emoji.toString(),
            value: `${emoji.name}:${emoji.id}`,
            inline: true,
          };
          list.push(data);
        });
        const embed = new EmbedBuilder()
          .setTitle("Emoji list")
          .setFields(list)
          .setColor("Random");
        return await interaction.editReply({
          embeds: [embed],
          ephemeral: true,
        });
      }
      case "add": {
        const name = interaction.options.getString("name");
        const image = interaction.options.getAttachment("image");
        if (!image.contentType.startsWith("image")) {
          return await interaction.editReply({
            content: "The file must be an image",
            ephemeral: true,
          });
        }

        const emoji = await client.application.emojis
          .create({
            attachment: image.url,
            name: name,
          })
          .catch(console.error);
        return await interaction.editReply(
          `Emoji ${emoji.toString()} has been created`
        );
      }
      case "remove": {
        const id = interaction.options.getString("id");
        const emoji = await client.application.emojis
          .fetch(id)
          .catch(console.error);
        emoji.delete();
        return await interaction.editReply(
          `Emoji ${emoji.toString()} has been deleted`
        );
      }
      case "edit": {
        const id = interaction.options.getString("id");
        const name = interaction.options.getString("name");
        const emoji = await client.application.emojis
          .fetch(id)
          .catch(console.error);
        emoji.edit({ name: name });
        return await interaction.editReply(
          `Emoji ${emoji.toString()} has been edited`
        );
      }
    }
  },
};
