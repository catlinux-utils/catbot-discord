import { SlashCommandBuilder, Events, PermissionsBitField } from "discord.js";
import {
  createAudioResource,
  joinVoiceChannel,
  AudioPlayerStatus,
  createAudioPlayer,
  NoSubscriberBehavior,
} from "@discordjs/voice";

export default {
  data: new SlashCommandBuilder()
    .setName("music-radio")
    .setDescription("Play music radio"),
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
      "https://an01.cdn.eurozet.pl/ANTCLA.mp3?redirected=01",
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
