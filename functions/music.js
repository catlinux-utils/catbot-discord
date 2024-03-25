const {
  ButtonBuilder,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonStyle,
} = require("discord.js");
const { DisTube } = require("distube");
const { SpotifyPlugin } = require("@distube/spotify");

const pauseButton = new ButtonBuilder()
  .setCustomId("pause")
  .setLabel("Pause")
  .setStyle(ButtonStyle.Secondary);

const resumeButton = new ButtonBuilder()
  .setCustomId("resume")
  .setLabel("Resume")
  .setStyle(ButtonStyle.Secondary);

const skipButton = new ButtonBuilder()
  .setCustomId("skip")
  .setLabel("Skip")
  .setStyle(ButtonStyle.Danger);

const stopButton = new ButtonBuilder()
  .setCustomId("stop")
  .setLabel("Stop")
  .setStyle(ButtonStyle.Primary);

const volumeUpButton = new ButtonBuilder()
  .setCustomId("volumeUp")
  .setLabel("Volume Up")
  .setStyle(ButtonStyle.Success);

const volumeDownButton = new ButtonBuilder()
  .setCustomId("volumeDown")
  .setLabel("Volume Down")
  .setStyle(ButtonStyle.Danger);

const repeat = new ButtonBuilder()
  .setCustomId("repeat")
  .setLabel("Repeat")
  .setStyle(ButtonStyle.Danger);

const shuffle = new ButtonBuilder()
  .setCustomId("shuffle")
  .setLabel("Shuffle")
  .setStyle(ButtonStyle.Danger);

const row1 = new ActionRowBuilder().addComponents(
  pauseButton,
  resumeButton,
  skipButton,
  stopButton
);

const row2 = new ActionRowBuilder().addComponents(
  volumeUpButton,
  volumeDownButton,
  shuffle,
  repeat
);

module.exports = (client) => {
  client.distube = new DisTube(client, {
    emitNewSongOnly: true,
    leaveOnFinish: true,
    emitAddListWhenCreatingQueue: false,
    plugins: [new SpotifyPlugin()],
  });

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

  client.distube
    .on("playSong", (queue, song) =>
      queue.textChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setDescription(
              `🎶 | Playing \`${song.name}\` - \`${
                song.formattedDuration
              }\`\nRequested by: ${song.user}\n${status(queue)}`
            ),
        ],
        components: [row1, row2],
      })
    )
    .on("addSong", (queue, song) =>
      queue.textChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setDescription(
              `🎶 | Added ${song.name} - \`${song.formattedDuration}\` to the queue by ${song.user}`
            ),
        ],
      })
    )
    .on("addList", (queue, playlist) =>
      queue.textChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setDescription(
              `🎶 | Added \`${playlist.name}\` playlist (${
                playlist.songs.length
              } songs) to queue\n${status(queue)}`
            ),
        ],
      })
    )
    .on("error", (channel, e) => {
      if (channel)
        channel.send(
          `⛔ | An error encountered: ${e.toString().slice(0, 1974)}`
        );
      else console.error(e);
    })
    .on("empty", (channel) =>
      channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setDescription(
              "⛔ |Voice channel is empty! Leaving the channel..."
            ),
        ],
      })
    )
    .on("searchNoResult", (message, query) =>
      message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setDescription("`⛔ | No result found for `${query}`!`"),
        ],
      })
    )
    .on("finish", (queue) =>
      queue.textChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setDescription("🏁 | Queue finished!"),
        ],
      })
    );
};
