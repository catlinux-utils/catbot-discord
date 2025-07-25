import { getAudioBase64 } from "@sefinek/google-tts-api";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} from "@discordjs/voice";

import { PassThrough } from "stream";

export default (client) => {
  client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.content.startsWith("?tts ")) return;

    const args = message.content.slice("?tts".length).trim();
    if (!args) return;

    const voiceChannel = message.member?.voice?.channel;
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

      player.pause();
      setTimeout(() => {
        player.unpause();
      }, 1000);

      /*player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
      });*/

      player.on("error", (error) => {
        client.logs.error("Player error:", error);
        connection.destroy();
      });
    } catch (error) {
      client.logs.error("Error:", error);
    }
  });
};
