import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
  type Client,
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("emoji")
    .setDescription("Bot Emoji Manager")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2])
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("List all emoji"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add emoji")
        .addStringOption((option) =>
          option.setName("name").setDescription("Emoji name").setRequired(true),
        )
        .addAttachmentOption((option) =>
          option
            .setName("image")
            .setDescription("Emoji image")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove emoji")
        .addStringOption((option) =>
          option.setName("id").setDescription("Emoji id").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("edit")
        .setDescription("Edit emoji")
        .addStringOption((option) =>
          option.setName("id").setDescription("Emoji id").setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("New emoji name")
            .setRequired(true),
        ),
    ),
  ownerOnly: true,
  run: async (interaction: ChatInputCommandInteraction, client: Client) => {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "list": {
        const emojis = await client.application.emojis.fetch();
        const list: { name: string; value: string; inline?: boolean }[] = [];
        emojis.forEach((emoji) => {
          const data = {
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
        return await interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });
      }
      case "add": {
        const name = interaction.options.getString("name");
        const image = interaction.options.getAttachment("image");
        if (!image.contentType.startsWith("image")) {
          return await interaction.reply({
            content: "The file must be an image",
            flags: MessageFlags.Ephemeral,
          });
        }

        const emoji = await client.application.emojis.create({
          attachment: image.url,
          name: name,
        });
        return await interaction.reply(
          `Emoji ${emoji.toString()} has been created`,
        );
      }
      case "remove": {
        const id = interaction.options.getString("id");
        const emoji = await client.application.emojis.fetch(id);
        emoji.delete();
        return await interaction.reply(
          `Emoji ${emoji.toString()} has been deleted`,
        );
      }
      case "edit": {
        const id = interaction.options.getString("id");
        const name = interaction.options.getString("name");
        const emoji = await client.application.emojis.fetch(id);
        emoji.edit({ name: name });
        return await interaction.reply(
          `Emoji ${emoji.toString()} has been edited`,
        );
      }
    }
  },
};
