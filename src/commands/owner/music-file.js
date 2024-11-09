import { SlashCommandBuilder, ChannelType } from "discord.js";
import { createAudioResource, joinVoiceChannel } from "@discordjs/voice";

export default {
  data: new SlashCommandBuilder()
    .setName("music-file")
    .setDescription("Play music file")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildVoice)
    ),
  ownerOnly: true,
  run: async (interaction, client) => {
    interaction.deferReply();
    const channel = interaction.options.getChannel("channel");
    if (!channel) return interaction.editReply("Wrong channel");
    if (client.voice?.connections?.size > 0)
      return interaction.editReply("Bot already in voice channel");
    const connection = joinVoiceChannel({
      channelId: interaction.channel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
    });
    try {
      connection;
      connection.subscribe(client.musicplayer);
      const resource = createAudioResource(
        `${process.cwd()}/src/resources/windows.mp3`
      );
      await client.musicplayer.play(resource);
      connection.destroy();
    } catch (error) {
      console.log(error);
    }
    await interaction.reply("User bot do usług szefie");
  },
};
