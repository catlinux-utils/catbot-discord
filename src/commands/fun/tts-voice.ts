import { SlashCommandBuilder } from "discord.js";

import { getAudioBase64 } from "@sefinek/google-tts-api";

import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
} from "@discordjs/voice";

import { PassThrough } from "node:stream";

export default {
  data: new SlashCommandBuilder()
    .setName("tts-voice")
    .setDescription("Speak tts in voide channel")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2])
    .addStringOption((option) =>
      option.setName("text").setDescription("Text for say").setRequired(true),
    ),
  run: async (interaction, client) => {
    await interaction.deferReply();
    const args = interaction.options.getString("text");

    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) return;

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      const audio = await getAudioBase64(args, {
        lang: "pl",
        slow: false,
        host: "https://translate.google.com",
        timeout: 10000,
      });

      const audioBuffer = Buffer.from(audio, "base64");

      const audioStream = new PassThrough();
      audioStream.end(audioBuffer);

      const player = createAudioPlayer();
      const resource = createAudioResource(audioStream);
      player.play(resource);
      connection.subscribe(player);

      player.on("error", (error) => {
        client.logs.error("Player error:", error);
        connection.destroy();
      });
      return await interaction.editReply("ok");
    } catch (error) {
      client.logs.error("Error:", error);
    }
  },
};
