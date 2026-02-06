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
  run: async (interaction: any, client: any) => {
    await interaction.deferReply();

    function catCom(category: string) {
      let list: any[] = [];
      for (const command of client.commands) {
        if (command[1].category !== category) continue;
        if (command[1].data.options?.[0]) {
          const allTier1 = client.application.commands.cache
            .find((com: any) => com.name === command[1].data.name)
            .options.every((element: any) => element.type === 1);

          command[1].data.options.forEach((element: any) => {
            if (
              client.application.commands.cache
                .find((com: any) => com.name === command[1].data.name)
                .options.find((opt: any) => (opt.name = element.name)).type !==
              1
            )
              return;
            let data = {
              name: `</${command[1].data.name} ${element.name}:${client.application.commands.cache.find((com: any) => com.name === command[1].data.name).id}>`,
              value: element.description || "---",
              inline: true,
            };
            list.push(data);
          });

          if (allTier1) {
            continue;
          }
        }

        let data: any = {};
        data = {
          name: `</${command[1].data.name}:${client.application.commands.cache.find((com: any) => com.name === command[1].data.name).id}>`,
          value: command[1].data.description || "---",
          inline: true,
        };
        list.push(data);
      }
      return list;
    }
    let catmenu: any[] = [];
    client.categoriesArray.forEach((cat: string) => {
      if (cat == "context-menu") return;
      return catmenu.push({
        label: cat,
        description: `${cat} commands!`,
        value: cat,
      });
    });
    let catfield: any[] = [];
    client.categoriesArray.forEach((cat: string) => {
      if (cat == "context-menu") return;
      return catfield.push({
        name: cat,
        value: `${cat} commands!`,
        inline: true,
      });
    });
    const catSelect = new StringSelectMenuBuilder()
      .setCustomId("starter")
      .setPlaceholder("Make a selection!")
      .setOptions(catmenu);
    const row = new ActionRowBuilder().addComponents(catSelect);
    const catembed = new EmbedBuilder()
      .setTitle("Help - Categories:")
      .setFields(catfield)
      .setColor("Random");

    const message = await interaction.editReply({
      embeds: [catembed],
      components: [row],
    });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 300_000,
      filter: (i: any) => i.user.id === interaction.user.id,
    });
    collector.on("end", async () => {
      row.components.forEach((comp: any) => comp.setDisabled(true));
      if (!(await interaction.fetchReply().catch(() => false))) return;
      await interaction.editReply({ components: [row] });
    });

    collector.on("collect", async (response: any) => {
      await response.deferUpdate();
      const fieds = catCom(response.values[0]);

      const comembed = new EmbedBuilder()
        .setTitle(
          `Help - ${response.values[0].charAt(0).toUpperCase() + response.values[0].slice(1)} category`,
        )
        .setFields(fieds)
        .setColor("Random");
      response.editReply({ embeds: [comembed] });
    });
  },
};
