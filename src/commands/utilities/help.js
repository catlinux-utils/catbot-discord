import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Help command")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  run: async (interaction) => {
    let list = [];
    for (const command of interaction.client.application.commands.cache) {
      let data = new Object();
      data = {
        name: `</${command[1].name}:${command[1].id}>`,
        value: command[1].description,
        inline: true,
      };
      list.push(data);
    }
    const embed = new EmbedBuilder()
      .setTitle("Help")
      .setFields(list)
      .setColor("Random");
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
