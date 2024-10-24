import {
  EmbedBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ComponentType,
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
        if (command[1].category !== category) continue;
        if (command[1].data.options[0]) {
          const allTier1 = client.application.commands.cache
            .find((com) => com.name === command[1].data.name)
            .options.every((element) => element.type === 1);

          command[1].data.options.forEach((element) => {
            if (
              client.application.commands.cache
                .find((com) => com.name === command[1].data.name)
                .options.find((opt) => (opt.name = element.name)).type !== 1
            )
              return;
            let data = {
              name: `</${command[1].data.name} ${element.name}:${
                client.application.commands.cache.find(
                  (com) => com.name === command[1].data.name
                ).id
              }>`,
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
          name: `</${command[1].data.name}:${
            client.application.commands.cache.find(
              (com) => com.name === command[1].data.name
            ).id
          }>`,
          value: command[1].data.description || "---",
          inline: true,
        };
        list.push(data);
      }
      return list;
    }
    let catmenu = [];
    client.categoriesArray.forEach((cat) => {
      if (cat == "context-menu") return;
      return catmenu.push({
        label: cat,
        description: `${cat} commands!`,
        value: cat,
      });
    });
    const catSelect = new StringSelectMenuBuilder()
      .setCustomId("starter")
      .setPlaceholder("Make a selection!")
      .setOptions(catmenu);
    const row = new ActionRowBuilder().addComponents(catSelect);
    const catembed = new EmbedBuilder()
      .setTitle("Help")
      .setFields(commandList)
      .setColor("Random");

    const message = await interaction.editReply({
      embeds: [catembed],
      components: [row],
    });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 300_000,
      filter: (i) => i.user.id === interaction.user.id,
    });
    collector.on("end", async () => {
      row.components.forEach((comp) => comp.setDisabled(true));
      if (!(await interaction.fetchReply().catch(() => false))) return;
      await interaction.editReply({ components: [row] });
    });

    collector.on("collect", async (response) => {
      await response.deferUpdate();
      const fieds = catCom(response.values[0]);

      const comembed = new EmbedBuilder()
        .setTitle("Help")
        .setFields(fieds)
        .setColor("Random");
      response.editReply({
        embeds: [comembed],
      });
    });
  },
};
