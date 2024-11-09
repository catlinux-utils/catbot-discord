import { SlashCommandBuilder, Events, PermissionsBitField } from "discord.js";
import {
  createAudioResource,
  joinVoiceChannel,
  AudioPlayerStatus,
  createAudioPlayer,
  NoSubscriberBehavior,
} from "@discordjs/voice";
import { MusicClient } from "youtubei";
import { extractStreamInfo } from "youtube-ext";

const musicClient = new MusicClient();

export default {
  data: new SlashCommandBuilder()
    .setName("music-yt")
    .setDescription("Play music from youtube")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Query to search")
        .setRequired(true)
    ),
  ownerOnly: true,
  run: async (interaction, client) => {
    await interaction.deferReply();
    if (!interaction.member.voice.channel)
      return interaction.editReply({
        content: "You need to enter channel",
        ephemeral: true,
      });
    if (
      !interaction.member.voice.channel
        .permissionsFor(interaction.guild.members.me)
        .has(PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak)
    )
      return interaction.editReply({
        content: "I don't have permission to talk in this voice channel",
        ephemeral: true,
      });

    const query = interaction.options.getString("query");
    const videos = await musicClient.search(query, {
      type: "video",
    });
    const result = await extractStreamInfo(
      `https://www.youtube.com/watch?v=${videos.items[0].id}`
    );

    const musicplayer = createAudioPlayer({
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
    const resource = createAudioResource(
      result.,
      { inlineVolume: true }
    );
    resource.volume.setVolume(0.3);
    await musicplayer.play(resource);

    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
      const oldChannel = oldState.channel;
      const newChannel = newState.channel;

      if (
        oldChannel?.id &&
        newChannel?.id &&
        oldChannel?.id !== newChannel?.id
      ) {
        const chan = client.channels.cache.get(oldChannel.id);

        if (chan && chan.members.size === 1) {
          musicplayer.stop();
        }
      } else if (oldChannel && !newChannel) {
        const channelMembers = oldChannel.members.size;
        if (channelMembers === 1) {
          musicplayer.stop();
        }
      }
    });

    musicplayer.on(AudioPlayerStatus.Idle, () => {
      connection.destroy();
    });

    await interaction.editReply("Playing radio");
  },
};
