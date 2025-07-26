import { getAllAudioBase64 } from "@sefinek/google-tts-api";
import Groq from "groq-sdk";

import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
} from "@discordjs/voice";

import { PassThrough } from "stream";

export default (client) => {
  client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.content.startsWith("?ait ")) return;

    if (!client.owners.includes(message.member.id)) return;

    const args = message.content.slice("?ait ".length).trim();
    if (!args) return;

    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) return;

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });
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
        model: "llama3-70b-8192",
      });
      const text = ai.choices[0]?.message?.content;
      await message.reply(text);
      const audiobase = await getAllAudioBase64(text, {
        lang: "pl",
        slow: false,
        host: "https://translate.google.com",
        timeout: 10000,
      });

      const audioBuffers = audiobase.map((base64) =>
        Buffer.from(base64.base64, "base64")
      );
      const combinedBuffer = Buffer.concat(audioBuffers);

      const audioStream = new PassThrough();
      audioStream.end(combinedBuffer);

      const player = createAudioPlayer();
      const resource = createAudioResource(audioStream);
      player.play(resource);
      connection.subscribe(player);

      player.on("error", (error) => {
        client.logs.error("Player error:", error);
        connection.destroy();
      });
    } catch (error) {
      client.logs.error("Error:", error);
    }
  });
};
