import {
  SlashCommandBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
  type Client,
} from "discord.js";
import os from "node:os";

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
          subcommand.setName("uptime").setDescription("Show bot uptime"),
        ),
    )
    .addSubcommandGroup((subcommandgroup) =>
      subcommandgroup
        .setName("system")
        .setDescription("Show system info")
        .addSubcommand((subcommand) =>
          subcommand.setName("uptime").setDescription("Show system uptime"),
        ),
    ),
  ownerOnly: true,
  run: async (interaction: ChatInputCommandInteraction, client: Client) => {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();
    const subcommandGroup = interaction.options.getSubcommandGroup();
    switch (subcommandGroup) {
      case "info": {
        switch (subcommand) {
          case "uptime": {
            let totalSecs = client.uptime / 1000;
            const days = Math.floor(totalSecs / 86400);
            totalSecs %= 86400;
            const hrs = Math.floor(totalSecs / 3600);
            totalSecs %= 3600;
            const mins = Math.floor(totalSecs / 60);
            const seconds = Math.floor(totalSecs % 60);
            const uptime = `**${days}**d **${hrs}**h **${mins}**m **${seconds}**s`;
            const embed = new EmbedBuilder()
              .setTitle("Bot Uptime:")
              .setDescription(uptime)
              .setColor("Random")
              .setFooter({
                text: client.application.bot.username,
                iconURL: client.application.bot.displayAvatarURL(),
              });
            return await interaction.editReply({ embeds: [embed] });
          }
        }
        break;
      }
      case "system": {
        let totalSecs = os.uptime();
        const days = Math.floor(totalSecs / 86400);
        totalSecs %= 86400;
        const hrs = Math.floor(totalSecs / 3600);
        totalSecs %= 3600;
        const mins = Math.floor(totalSecs / 60);
        const seconds = Math.floor(totalSecs % 60);
        const uptime = `**${days}**d **${hrs}**h **${mins}**m **${seconds}**s`;
        const embed = new EmbedBuilder()
          .setTitle("System Uptime:")
          .setDescription(uptime)
          .setColor("Random")
          .setFooter({
            text: client.application.bot.username,
            iconURL: client.application.bot.displayAvatarURL(),
          });
        return await interaction.editReply({ embeds: [embed] });
      }
    }
  },
};
