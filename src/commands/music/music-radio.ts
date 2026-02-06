import {
  SlashCommandBuilder,
  Events,
  PermissionsBitField,
  MessageFlags,
} from "discord.js";
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
    .setDescription("Play music radio")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Query to play")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("skip-checks")
        .setDescription("Skip checks")
        .addChoices([
          { name: "true", value: "true" },
          { name: "false", value: "false" },
        ]),
    )
    .addChannelOption((option) =>
      option.setName("channel").setDescription("Channel").setRequired(false),
    ),
  ownerOnly: true,
  run: async (interaction: any, client: any) => {
    await interaction.deferReply();

    const query =
      interaction.options.getString("query") ||
      "https://an01.cdn.eurozet.pl/ANTCLA.mp3?redirected=01";
    const skipChecks = interaction.options.getString("skip-checks");

    const channel =
      interaction.options.getChannel("channel") || interaction.member.voice.channel;

    if (!channel && skipChecks !== "true")
      return interaction.editReply({
        content: "You need to enter channel",
        flags: MessageFlags.Ephemeral,
      });
    if (
      !channel
        .permissionsFor(interaction.guild.members.me)
        .has(PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak) &&
      skipChecks !== "true"
    )
      return interaction.editReply({
        content: "I don't have permission to talk in this voice channel",
        flags: MessageFlags.Ephemeral,
      });
    const musicplayer = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Stop,
      },
    });

    const connection = await joinVoiceChannel({
      channelId: channel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
    });
    connection.subscribe(musicplayer);
    const resource = createAudioResource(query, { inlineVolume: true });
    await musicplayer.play(resource);

    client.on(Events.VoiceStateUpdate, async (oldState: any, newState: any) => {
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

    await interaction.editReply("Playing sound");
  },
};
