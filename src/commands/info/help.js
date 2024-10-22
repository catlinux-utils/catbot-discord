import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Help command")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  run: async (interaction) => {
    await interaction.deferReply();
    let list = [];
    for (const command of interaction.client.application.commands.cache) {
      if (command[1].type !== 1) continue;

      if (command[1].options[0]) {
        const allTier1 = command[1].options.every(
          (element) => element.type === 1
        );

        command[1].options.forEach((element) => {
          if (element.type !== 1) return;

          let data = {
            name: `</${command[1].name} ${element.name}:${command[1].id}>`,
            value: element.description || "---",
            inline: true,
          };
          list.push(data);
        });

        if (allTier1) {
          continue;
        }
      }

      let data = new Object();
      data = {
        name: `</${command[1].name}:${command[1].id}>`,
        value: command[1].description || "---",
        inline: true,
      };
      list.push(data);
    }
    const embed = new EmbedBuilder()
      .setTitle("Help")
      .setFields(list)
      .setColor("Random");
    await interaction.editReply({ embeds: [embed] });
  },
};
