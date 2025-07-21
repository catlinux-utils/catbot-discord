import { SlashCommandBuilder, EmbedBuilder, channelMention } from "discord.js";

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
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("stop").setDescription("Stop song")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("pause").setDescription("Pause song")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("skip").setDescription("Skip song")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("volume")
        .setDescription("Change volume")
        .addIntegerOption((option) =>
          option
            .setName("value")
            .setDescription("Volume level (0-10)")
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(10)
        )
    ),
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
          `You can't use the music system as it's already active in ${channelMention(
            interaction.guild.members.me.voice.channel.id
          )}`
        );
      return interaction.editReply({ embeds: [embed], ephemeral: true });
    }

    try {
      switch (subcommand) {
        case "play": {
          const query = interaction.options.getString("query");
          await client.musicsystem.play(voiceChannel, query, {
            textChannel: interaction.channel,
          });
          return await interaction.editReply({
            content: "🎶 Request received.",
          });
        }
        case "stop": {
          await client.musicsystem.stop(interaction);
          return await interaction.editReply({
            content: "🎶 Request received.",
          });
        }
        case "pause": {
          await client.musicsystem.pause(interaction);
          return await interaction.editReply({
            content: "🎶 Request received.",
          });
        }
        case "skip": {
          await client.musicsystem.skip(interaction);
          return await interaction.editReply({
            content: "🎶 Request received.",
          });
        }
        case "volume": {
          const volume = interaction.options.getInteger("value");
          await client.musicsystem.volume(interaction, volume);
          return await interaction.editReply({
            content: "🎶 Request received.",
          });
        }
      }
    } catch (err) {
      console.log(err);
      embed.setColor("Red").setDescription("Something went wrong...");
      return interaction.editReply({ embeds: [embed], ephemeral: true });
    }
  },
};
