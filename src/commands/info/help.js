import {
  EmbedBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Help command")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  run: async (interaction, client) => {
    await interaction.deferReply();
    let commandList = [];
    for (const command of client.application.commands.cache) {
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
          commandList.push(data);
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
      commandList.push(data);
    }

    function catCom(category) {
      let list = [];
      for (const command of client.commands) {
        if (command.category != category) continue;
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
      return list;
    }
    let catmenu = [];
    client.categoriesArray.forEach((cat) => {
      return catmenu.push({
        label: cat,
        description: `${cat} commands!`,
        value: cat,
      });
    });
    const catSelect = new StringSelectMenuBuilder()
      .setCustomId("starter")
      .setPlaceholder("Make a selection!");
    const row = new ActionRowBuilder().addComponents(catSelect);
    const embed = new EmbedBuilder()
      .setTitle("Help")
      .setFields(commandList)
      .setColor("Random");

    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};
