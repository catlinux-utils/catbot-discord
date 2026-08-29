import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
} from "discord.js";
import { runSkynet } from "../../utils/skynet.ts";

export default {
  data: new SlashCommandBuilder()
    .setName("skynet")
    .setDescription("Zapytaj Skyneta (AI z dostepem do web_search)")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2])
    .addStringOption((option) =>
      option
        .setName("text")
        .setDescription("Twoja wiadomość do Skyneta")
        .setRequired(true),
    ),
  ownerOnly: true,
  run: async (interaction: ChatInputCommandInteraction, client: Client) => {
    await interaction.deferReply();

    const prompt = interaction.options.getString("text", true);

    try {
      await runSkynet(prompt, {
        updateReply: async (payload) => {
          try {
            await interaction.editReply(payload);
          } catch {
            // rate-limited or deleted; ignore
          }
        },
        onError: (err) => client.logs.error("[skynet-cmd] error:", err),
      });
    } catch (error) {
      client.logs.error("[skynet-cmd] OpenRouter error:", error);
      try {
        await interaction.editReply(
          "Wystąpił błąd podczas komunikacji ze Skynetem.",
        );
      } catch {
        // ignore
      }
    }
  },
};
