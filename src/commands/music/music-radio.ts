import {
  SlashCommandBuilder,
  Events,
  PermissionsBitField,
  MessageFlags,
  type ChatInputCommandInteraction,
  type Client,
  type VoiceState,
  GuildMember,
  VoiceChannel,
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
  run: async (interaction: ChatInputCommandInteraction, client: Client) => {
    await interaction.deferReply();

    const query =
      interaction.options.getString("query") ||
      "https://an01.cdn.eurozet.pl/ANTCLA.mp3?redirected=01";
    const skipChecks = interaction.options.getString("skip-checks");

    const channel =
      interaction.options.getChannel("channel") ||
      (interaction.member && (interaction.member as GuildMember).voice.channel);

    if (!channel && skipChecks !== "true")
      return interaction.reply({
        content: "You need to enter channel",
        flags: MessageFlags.Ephemeral,
      });
    if (
      !(channel as VoiceChannel)
        .permissionsFor(interaction.guild.members.me)
        .has([
          PermissionsBitField.Flags.Connect,
          PermissionsBitField.Flags.Speak,
        ]) &&
      skipChecks !== "true"
    )
      return interaction.reply({
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

    const handler = (oldState: VoiceState, newState: VoiceState) => {
      const oldVoice = oldState.channel as VoiceChannel | null;
      const newVoice = newState.channel as VoiceChannel | null;
      const connectedChannelId = connection.joinConfig.channelId;

      // Ignore events not related to our connected channel
      if (
        oldVoice?.id !== connectedChannelId &&
        newVoice?.id !== connectedChannelId
      )
        return;

      // Determine the relevant channel to inspect (the one we were in)
      const relevant =
        oldVoice?.id === connectedChannelId ? oldVoice : newVoice;
      if (!relevant) return;

      const botId = client.user?.id;
      if (!botId) return;

      // If bot is the only member left in the channel, stop and remove listener
      if (relevant.members.has(botId) && relevant.members.size === 1) {
        musicplayer.stop();
        client.off(Events.VoiceStateUpdate, handler);
      }
    };

    client.on(Events.VoiceStateUpdate, handler);

    musicplayer.on(AudioPlayerStatus.Idle, () => {
      connection.destroy();
    });

    await interaction.editReply("Playing sound");
  },
};
