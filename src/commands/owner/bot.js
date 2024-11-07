import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("bot")
    .setDescription("Bot Manager")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2])
    .addSubcommandGroup((subcommandgroup) =>
      subcommandgroup
        .setName("info")
        .setDescription("Show bot info")
        .addSubcommand((subcommand) =>
          subcommand.setName("uptime").setDescription("Show bot uptime")
        )
    ),
  ownerOnly: true,
  run: async (interaction, client) => {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();
    const subcommandGroup = interaction.options.getSubcommandGroup();
    switch (subcommandGroup) {
      case "info": {
        switch (subcommand) {
          case "uptime": {
            let totalSecs = client.uptime / 1000;
            let days = Math.floor(totalSecs / 86400);
            totalSecs %= 86400;
            let hrs = Math.floor(totalSecs / 3600);
            totalSecs %= 3600;
            let mins = Math.floor(totalSecs / 60);
            let seconds = Math.floor(totalSecs % 60);
            let uptime = `**${days}**d **${hrs}**h **${mins}**m **${seconds}**s`;
            const embed = new EmbedBuilder()
              .setTitle("Uptime:")
              .setDescription(uptime)
              .setColor("Random")
              .setFooter({
                text: client.application.bot.username,
                iconURL: client.application.bot.displayAvatarURL(),
              });
            return await interaction.editReply({ embeds: [embed] });
          }
        }
      }
    }
  },
};
