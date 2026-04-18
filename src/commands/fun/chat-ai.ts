import {
  SlashCommandBuilder,
  AttachmentBuilder,
  type ChatInputCommandInteraction,
  MessageFlags
} from "discord.js";
import Groq from "groq-sdk";

export default {
  data: new SlashCommandBuilder()
    .setName("chat-ai")
    .setDescription("Rozmawiaj z AI z kontekstem kanału (tylko Ty widzisz odpowiedź)")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2])
    .addStringOption((option) =>
      option.setName("text").setDescription("Twoja wiadomość").setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("limit")
        .setDescription("Ilość ostatnich wiadomości (domyślnie 10)")
        .setMinValue(1)
        .setMaxValue(100)
    ),
  ownerOnly: true,
  run: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const prompt = interaction.options.getString("text")!;
    const limit = interaction.options.getInteger("limit") ?? 10;
    const groq = new Groq({ apiKey: process.env.groq });

    const channelMessages = await interaction.channel?.messages.fetch({ limit });
    
    const history = channelMessages 
      ? Array.from(channelMessages.values())
          .filter(msg => msg.id !== interaction.id) 
          .reverse()
          .map((msg) => ({
            role: "user",
            content: `[${msg.author.username}]: ${msg.cleanContent}`,
          }))
      : [];
console.log(history)
    try {
      const ai = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "Jesteś asystentem AI na Discordzie. Odpowiadaj krótko i po polsku.",
          },
          ...history,
          { role: "user", content: `[${interaction.user.username}]: ${prompt}` },
        ],
        model: "llama-3.3-70b-versatile",
      });

      const response = ai.choices[0]?.message?.content || "Błąd generowania odpowiedzi.";

      if (response.length > 2000) {
        const attachment = new AttachmentBuilder(Buffer.from(response), { name: "odpowiedz.txt" });
        await interaction.editReply({ 
          content: "Odpowiedź jest zbyt długa, przesyłam plik:", 
          files: [attachment] 
        });
      } else {
        await interaction.editReply({ content: response });
      }

    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: "Wystąpił błąd podczas komunikacji z Groq API." });
    }
  },
};