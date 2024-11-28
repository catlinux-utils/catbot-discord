import { SlashCommandBuilder, EmbedBuilder, channelMention } from "discord.js";
import {
  createAudioResource,
  joinVoiceChannel,
  createAudioPlayer,
  NoSubscriberBehavior,
  AudioPlayerStatus,
} from "@discordjs/voice";
import { getYouTubeStreamUrl } from "../../utils/music-url-scrape.js";
import { MusicClient } from "youtubei";
const music = new MusicClient();

export default {
  data: new SlashCommandBuilder()
    .setName("music")
    .setDescription("Music system")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("play")
        .setDescription("Play song")
        .addStringOption((option) =>
          option
            .setName("query")
            .setDescription("Provide name of the song")
            .setRequired(true)
        )
    ),
  ownerOnly: true,

  run: async (interaction, client) => {
    const subcommand = interaction.options.getSubcommand();
    const voiceChannel = interaction.member.voice.channel;
    await interaction.deferReply();

    const embed = new EmbedBuilder();

    if (!voiceChannel) {
      embed.setColor("Red").setDescription("You must be in a vc");
      return interaction.editReply({ embeds: [embed], ephemeral: true });
    }

    if (
      !interaction.member.voice.channel.id ==
      interaction.guild.members.me.voice.channel?.id
    ) {
      embed
        .setColor("Red")
        .setDescription(
          `You can't use the music system as its already active in ${channelMention(
            interaction.guild.members.me.voice.channel.id
          )}`
        );
      return interaction.editReply({ embeds: [embed], ephemeral: true });
    }

    try {
      switch (subcommand) {
        case "play": {
          let query = interaction.options.getString("query");
          if (!query.startsWith("https://www.youtube.com/watch?v=")) {
            await music.search(query).then((res) => {
              query = "https://www.youtube.com/watch?v=" + res[0].items[0].id;
            });
          }

          const url = await getYouTubeStreamUrl(query);
          let musicplayer = client.musicplayers.get(interaction.guildId);

          if (!musicplayer) {
            musicplayer = createAudioPlayer({
              behaviors: {
                noSubscriber: NoSubscriberBehavior.Idle,
              },
            });

            const connection = await joinVoiceChannel({
              channelId: interaction.member.voice.channel.id,
              guildId: interaction.guild.id,
              adapterCreator: interaction.guild.voiceAdapterCreator,
            });
            connection.subscribe(musicplayer);
            client.musicplayers.set(interaction.guildId, musicplayer);
          }

          const resource = createAudioResource(url, { inlineVolume: true });
          resource.volume.setVolume(0.3);
          await musicplayer.play(resource);

          musicplayer.on(AudioPlayerStatus.Idle, () => {
            client.musicplayers.delete(interaction.guildId);
            musicplayer?.playable[0]?.destroy();
            musicplayer?.stop();
          });
          return await interaction.editReply({
            content: "🎶 Request received.",
          });
        }
      }
    } catch (err) {
      console.log(err);

      embed.setColor("Red").setDescription("   | Something went wrong...");

      return interaction.editReply({ embeds: [embed], ephemeral: true });
    }
  },
};
