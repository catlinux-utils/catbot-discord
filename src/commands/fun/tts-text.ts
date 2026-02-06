import {
  SlashCommandBuilder,
  AttachmentBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getAllAudioBase64 } from "@sefinek/google-tts-api";

export default {
  data: new SlashCommandBuilder()
    .setName("tts-text")
    .setDescription("Tell text in tss")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2])
    .addStringOption((option) =>
      option.setName("text").setDescription("Text for say").setRequired(true),
    ),
  run: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    const args = interaction.options.getString("text");
    const audiobase = await getAllAudioBase64(args, {
      lang: "pl",
      slow: false,
      host: "https://translate.google.com",
      timeout: 10000,
    });
    const audioBuffers = audiobase.map((base64) =>
      Buffer.from(base64.base64, "base64"),
    );
    const combinedBuffer = Buffer.concat(audioBuffers);

    const attachment = new AttachmentBuilder(combinedBuffer, {
      name: "audio.mp3",
    });
    await interaction.editReply({ files: [attachment] });
  },
};
