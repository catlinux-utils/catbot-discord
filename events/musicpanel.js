const { EmbedBuilder } = require("discord.js");
module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    if (!interaction.isButton()) return;
    const { member } = interaction;
    const voiceChannel = member.voice.channel;
    if (!voiceChannel) return;
    const queue = await client.distube.getQueue(voiceChannel);
    if (!queue) return;
    const song = queue.songs[0];

    const status = (queue) =>
      `Volume: \`${queue.volume}%\` | Filter: \`${
        queue.filters.names.join(", ") || "Off"
      }\` | Loop: \`${
        queue.repeatMode
          ? queue.repeatMode === 2
            ? "All Queue"
            : "This Song"
          : "Off"
      }\` | Autoplay: \`${queue.autoplay ? "On" : "Off"}\``;

    const filter = (i) =>
      [
        "pause",
        "resume",
        "skip",
        "stop",
        "volumeUp",
        "volumeDown",
        "shuffle",
        "repeat",
      ].includes(i.customId) && i.user.id === interaction.user.id;

    if (filter(interaction)) {
      const queue = client.distube.getQueue(interaction.guildId);
      if (!queue) return;

      if (interaction.customId === "pause") {
        if (!queue.pause) return;
        client.distube.pause(interaction.guild);
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor("Green")
              .setDescription(
                `🎶 | Paused \`${song.name}\` - \`${
                  song.formattedDuration
                }\`\nRequested by: ${song.user}\n${status(queue)}`
              ),
          ],
        });
      } else if (interaction.customId === "resume") {
        if (!queue.pause) {
        } else {
          client.distube.resume(interaction.guild);
          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor("Green")
                .setDescription(
                  `🎶 | Resumed \`${song.name}\` - \`${
                    song.formattedDuration
                  }\`\nRequested by: ${song.user}\n${status(queue)}`
                ),
            ],
          });
        }
      } else if (interaction.customId === "skip") {
        if (queue.songs.length <= 1) {
          await interaction.update({
            content: "⚠️ Not enough songs in the queue to skip.",
            ephemeral: true,
          });
        } else {
          client.distube.skip(interaction.guild);
          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor("Green")
                .setDescription(
                  `🎶 | Playing \`${song.name}\` - \`${
                    song.formattedDuration
                  }\`\nRequested by: ${song.user}\n${status(queue)}`
                ),
            ],
          });
        }
      } else if (interaction.customId === "stop") {
        client.distube.stop(interaction.guild);
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor("Green")
              .setDescription(`🎶 | Music stopped`),
          ],
        });
      } else if (interaction.customId === "volumeUp") {
        if (queue.volume >= 100) {
          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor("Green")
                .setDescription(
                  `🎶 | Playing \`${song.name}\` - \`${
                    song.formattedDuration
                  }\`\nRequested by: ${song.user}\n${status(queue)}`
                ),
            ],
          });
        } else {
          const newVolume = Math.min(queue.volume + 10, 100);
          client.distube.setVolume(interaction.guild, newVolume);
          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor("Green")
                .setDescription(
                  `🎶 | Playing \`${song.name}\` - \`${
                    song.formattedDuration
                  }\`\nRequested by: ${song.user}\n${status(queue)}`
                ),
            ],
          });
        }
      } else if (interaction.customId === "volumeDown") {
        if (queue.volume <= 0) {
          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor("Green")
                .setDescription(
                  `🎶 | Playing \`${song.name}\` - \`${
                    song.formattedDuration
                  }\`\nRequested by: ${song.user}\n${status(queue)}`
                ),
            ],
          });
        } else {
          const newVolume = Math.max(queue.volume - 10, 0);
          client.distube.setVolume(interaction.guild, newVolume);
          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor("Green")
                .setDescription(
                  `🎶 | Playing \`${song.name}\` - \`${
                    song.formattedDuration
                  }\`\nRequested by: ${song.user}\n${status(queue)}`
                ),
            ],
          });
        }
      } else if (interaction.customId === "shuffle") {
        if (!queue.songs.length || queue.songs.length === 1) {
        } else {
          client.distube.shuffle(interaction.guild);
          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor("Green")
                .setDescription(
                  `🎶 | Playing \`${song.name}\` - \`${
                    song.formattedDuration
                  }\`\nRequested by: ${song.user}\n${status(queue)}`
                ),
            ],
          });
        }
      } else if (interaction.customId === "repeat") {
        if (!queue.songs.length) {
        } else {
          const repeatMode = queue.repeatMode;
          client.distube.setRepeatMode(
            interaction.guild,
            repeatMode === 0 ? 1 : 0
          );
          await interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor("Green")
                .setDescription(
                  `🎶 | Playing \`${song.name}\` - \`${
                    song.formattedDuration
                  }\`\nRequested by: ${song.user}\n${status(queue)}`
                ),
            ],
          });
        }
      }
    }
  },
};
