import {
  EmbedBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
} from "discord.js";

import { runManifesto } from "../../utils/manifesto.ts";

/**
 * /manifesto – bot pisze własny manifest. Filozoficznie kontrowersyjny,
 * z formatowaniem Discorda (##, **, >, ||, listy itd.). Wyjście: embed.
 *
 *   /manifesto              → losowy seed
 *   /manifesto seed:<motyw> → użyj podanego motywu
 */
export default {
  data: new SlashCommandBuilder()
    .setName("manifesto")
    .setDescription(
      "Bot pisze własny manifest – filozoficznie kontrowersyjny, z formatowaniem Discorda.",
    )
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2])
    .addStringOption((option) =>
      option
        .setName("seed")
        .setDescription(
          "Opcjonalny motyw przewodni (np. 'wolna wola w erze algorytmów'). Domyślnie losowy.",
        )
        .setRequired(false),
    ),

  run: async (interaction: ChatInputCommandInteraction, client: Client) => {
    const seed = interaction.options.getString("seed");
    const logs = client.logs;

    await interaction.deferReply();

    try {
      await runManifesto(seed, {
        onReady: async (result) => {
          await interaction.editReply({
            embeds: [buildEmbed(result, interaction, client)],
          });
        },
        onError: (err) => logs?.error?.("[manifesto] error:", err),
      });
    } catch (error) {
      logs?.error?.("[manifesto] OpenRouter error:", error);
      try {
        await interaction.editReply(
          "Nie udało mi się skomponować manifestu. Wszechświat potrzebuje chwili.",
        );
      } catch {
        // interaction is gone — nothing to do
      }
    }
  },
};

// -----------------------------------------------------------------------
// Embed builder
// -----------------------------------------------------------------------

function buildEmbed(
  result: { title: string; body: string },
  interaction: ChatInputCommandInteraction,
  client: Client,
): EmbedBuilder {
  const { user, guild } = interaction;
  const member = guild?.members.cache.get(user.id);
  const avatar = member?.displayAvatarURL({ size: 256, extension: "png" });

  // Body is expected to start with `## …` (per the system prompt). Lift
  // that first heading into the footer as an italic epigraph so it
  // doesn't double up with the embed title.
  const headingMatch = /^#{2,3}\s+(.+)$/m.exec(result.body);
  const epigraph = headingMatch?.[1].trim() ?? null;
  const description = headingMatch
    ? result.body.replace(headingMatch[0], "").trimStart()
    : result.body;

  const guildName = guild?.name ?? "DM";
  const dateTag = `manifest #${new Date().toISOString().slice(0, 10)}`;
  const footerText = epigraph
    ? `catbot • ${guildName} • *${epigraph}* • ${dateTag}`
    : `catbot • ${guildName} • ${dateTag}`;

  return new EmbedBuilder()
    .setAuthor({ name: `${user.tag} zaintonował manifest`, iconURL: avatar })
    .setTitle(`📜 ${result.title}`)
    .setDescription(description)
    .setColor("Random")
    .setFooter({
      text: footerText,
      iconURL: client.user?.displayAvatarURL() ?? undefined,
    })
    .setTimestamp();
}
