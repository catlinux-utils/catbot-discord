import {
  EmbedBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ComponentType,
  type ChatInputCommandInteraction,
  type Client,
  type StringSelectMenuInteraction,
  ButtonBuilder,
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Help command")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  run: async (interaction: ChatInputCommandInteraction, client: Client) => {
    await interaction.deferReply();

    function catCom(category: string) {
      const list: { name: string; value: string; inline?: boolean }[] = [];
      for (const [, command] of client.commands) {
        if (command.category !== category) continue;
        const data = command.data as {
          name?: string;
          options?: { name: string; description?: string }[];
          description?: string;
        };
        if (data.options?.[0]) {
          const appCommand = client.application.commands.cache.find(
            (com) => com.name === data.name,
          );
          const allTier1 =
            appCommand?.options?.every((element) => element.type === 1) ??
            false;

          data.options.forEach((element) => {
            const cmdOption = appCommand?.options.find(
              (opt) => opt.name === element.name,
            );
            if (!cmdOption || cmdOption.type !== 1) return;
            const item = {
              name: `</${data.name} ${element.name}:${appCommand?.id}>`,
              value: element.description || "---",
              inline: true,
            };
            list.push(item);
          });

          if (allTier1) {
            continue;
          }
        }

        const item = {
          name: `</${data.name}:${client.application.commands.cache.find((com) => com.name === data.name)?.id}>`,
          value: data.description || "---",
          inline: true,
        };
        list.push(item);
      }
      return list;
    }
    const catmenu: { label: string; description: string; value: string }[] = [];
    client.categoriesArray?.forEach((cat) => {
      if (cat == "context-menu") return;
      return catmenu.push({
        label: cat,
        description: `${cat} commands!`,
        value: cat,
      });
    });
    const catfield: { name: string; value: string; inline?: boolean }[] = [];
    client.categoriesArray?.forEach((cat) => {
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
      filter: (i: StringSelectMenuInteraction) =>
        i.user.id === interaction.user.id,
    });
    collector.on("end", async () => {
      row.components.forEach((comp) =>
        (comp as ButtonBuilder).setDisabled(true),
      );
      if (!(await interaction.fetchReply().catch(() => false))) return;
      await interaction.editReply({ components: [row] });
    });

    collector.on("collect", async (response: StringSelectMenuInteraction) => {
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
