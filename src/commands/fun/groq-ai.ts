import {
  SlashCommandBuilder,
  AttachmentBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import Groq from "groq-sdk";

export default {
  data: new SlashCommandBuilder()
    .setName("groq-ai")
    .setDescription("Chat with AI")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2])
    .addStringOption((option) =>
      option.setName("text").setDescription("Text").setRequired(true),
    ),
  ownerOnly: true,
  run: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    const args = interaction.options.getString("text");
    const groq = new Groq({ apiKey: process.env.groq });

    const ai = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Odpowiadaj po polsku, krótko i zwięźle",
        },
        {
          role: "user",
          content: args,
        },
      ],
      model: "llama-3.3-70b-versatile",
    });
    const text = ai.choices[0]?.message?.content;
    await interaction.editReply({ content: text });
  },
};
