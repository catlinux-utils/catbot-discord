import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  EmbedBuilder,
  time,
  TimestampStyles,
} from "discord.js";

export default {
  data: new ContextMenuCommandBuilder()
    .setName("User Info")
    .setIntegrationTypes([0, 1])
    .setContexts([0])
    .setType(ApplicationCommandType.User),
  run: async (interaction) => {
    await interaction.deferReply();
    const user = interaction.targetUser;

    const info = new EmbedBuilder()
      .setTitle(`${user.username}'s Info`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setColor("Random")
      .addFields(
        {
          name: "**Full Name:**",
          value: `\`\`\`${user.globalName}\`\`\``,
          inline: false,
        },
        {
          name: "**Users ID:**",
          value: `\`\`\`${user.id}\`\`\``,
          inline: false,
        },
        {
          name: "**Created On:**",
          value: `${time(user.createdAt, TimestampStyles.LongDate)}`,
          inline: false,
        }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [info] });
  },
};
