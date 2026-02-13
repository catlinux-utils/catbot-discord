import { getYouTubeStreamUrl } from "./music-url-scrape.ts";
import {
  createAudioResource,
  joinVoiceChannel,
  createAudioPlayer,
  NoSubscriberBehavior,
  AudioPlayerStatus,
  VoiceConnection,
  AudioPlayer,
  AudioResource,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import {
  Client,
  EmbedBuilder,
  TextChannel,
  VoiceChannel,
  CommandInteraction,
  MessageFlags,
  type GuildTextBasedChannel,
} from "discord.js";
import { getYouTubeInfo } from "./yt-dlp-info.ts";

interface Song {
  url: string;
  title?: string;
  duration?: number;
}

interface Queue {
  textChannel: GuildTextBasedChannel;
  voiceChannel: VoiceChannel;
  connection: VoiceConnection | null;
  songs: Song[];
  volume: number;
  playing: boolean;
  player: AudioPlayer;
  resource: AudioResource | null;
  loop: boolean;
}

class MusicSystem {
  private queue: Map<string, Queue>;
  private client: Client;
  private readonly MAX_PLAYLIST_ITEMS = 50;
  private readonly RETRIES = 2;
  private readonly BACKOFF_BASE = 500; // ms

  constructor(client: Client) {
    this.queue = new Map();
    this.client = client;

    client.on("voiceStateUpdate", (oldState, newState) => {
      const guildId = oldState.guild.id;
      const serverQueue = this.queue.get(guildId);

      if (!serverQueue) return;

      const oldChannel = oldState.channel;
      const newChannel = newState.channel;

      if (!newChannel && oldChannel && oldChannel.members.size === 1) {
        this.stopQueue(guildId);
      }
    });
  }

  async play(
    voiceChannel: VoiceChannel,
    query: string,
    {
      textChannel,
      interaction,
    }: {
      textChannel: GuildTextBasedChannel;
      interaction?: CommandInteraction;
    },
  ): Promise<void> {
    const guildId = voiceChannel.guild.id;
    let songs: Song[] = [];

    if (!query) {
      await this.sendError(interaction, "Please provide a valid query or URL");
      return;
    }

    try {
      const info = await this.retryAsync(
        () => getYouTubeInfo(query),
        this.RETRIES,
        this.BACKOFF_BASE,
      );
      if (info.playlist_items) {
        info.playlist_items.forEach((data) => {
          songs.push({
            url: data.webpage_url,
            title: data.title,
            duration: data.duration,
          });
        });
      } else {
        songs.push({
          url: info.webpage_url,
          title: info.title,
          duration: info.duration,
        });
      }

      if (songs.length === 0) {
        await this.sendError(interaction, "No valid songs found");
        return;
      }

      // Limit playlist size to avoid abuse
      if (songs.length > this.MAX_PLAYLIST_ITEMS) {
        this.client.logs.warn(
          `Playlist too large (${songs.length}), truncating to ${this.MAX_PLAYLIST_ITEMS}`,
        );
        songs = songs.slice(0, this.MAX_PLAYLIST_ITEMS);
      }

      await this.addToQueue(
        guildId,
        voiceChannel,
        textChannel,
        songs,
        interaction,
      );
    } catch (err) {
      this.client.logs.error("Error processing play request", err);
      await this.sendError(interaction, "Failed to process the request");
    }
  }

  private async addToQueue(
    guildId: string,
    voiceChannel: VoiceChannel,
    textChannel: GuildTextBasedChannel,
    songs: Song[],
    interaction?: CommandInteraction,
  ): Promise<void> {
    let serverQueue = this.queue.get(guildId);

    if (!serverQueue) {
      serverQueue = this.createQueue(voiceChannel, textChannel, songs);
      this.queue.set(guildId, serverQueue);
      await this.setupVoiceConnection(serverQueue);
    } else {
      serverQueue.songs.push(...songs);
      await this.sendSongAddedEmbed(serverQueue, songs, interaction);
    }
  }

  private createQueue(
    voiceChannel: VoiceChannel,
    textChannel: GuildTextBasedChannel,
    songs: Song[],
  ): Queue {
    return {
      textChannel,
      voiceChannel,
      connection: null,
      songs,
      volume: 5,
      playing: true,
      player: createAudioPlayer({
        behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
      }),
      resource: null,
      loop: false,
    };
  }

  private async setupVoiceConnection(queue: Queue): Promise<void> {
    try {
      const connection = joinVoiceChannel({
        channelId: queue.voiceChannel.id,
        guildId: queue.voiceChannel.guild.id,
        adapterCreator: queue.voiceChannel.guild.voiceAdapterCreator,
      });

      queue.connection = connection;
      connection.subscribe(queue.player);

      connection.on(VoiceConnectionStatus.Disconnected, () => {
        this.client.logs.error("Voice connection disconnected", {
          guildId: queue.voiceChannel.guild.id,
        });
        this.stopQueue(queue.voiceChannel.guild.id);
      });

      await this.playSong(queue.songs[0], queue);
    } catch (err) {
      this.client.logs.error("Error establishing voice connection", err);
      this.queue.delete(queue.voiceChannel.guild.id);
      await queue.textChannel.send("Failed to join voice channel");
    }
  }

  private async playSong(song: Song, queue: Queue): Promise<void> {
    try {
      const streamUrl = await this.retryAsync(
        () => getYouTubeStreamUrl(song.url),
        this.RETRIES,
        this.BACKOFF_BASE,
      );
      if (!streamUrl) {
        await this.handleSongError(queue, "Failed to get stream URL");
        return;
      }

      const resource = createAudioResource(streamUrl, {
        inlineVolume: true,
      });
      queue.resource = resource;
      resource.volume?.setVolume(queue.volume / 10);
      queue.player.play(resource);

      queue.player.once(AudioPlayerStatus.Idle, () =>
        this.handleSongEnd(queue),
      );
      queue.player.on("error", (error) => {
        this.client.logs.error("Player error", error);
      });
      await this.sendNowPlayingEmbed(queue, song);
    } catch (err) {
      this.client.logs.error("Error playing song", err);
      await this.handleSongError(queue, "Failed to play song");
    }
  }

  private async retryAsync<T>(
    fn: () => Promise<T>,
    retries = 2,
    backoffBase = 500,
  ): Promise<T> {
    let attempt = 0;
    let lastError: any;
    while (attempt <= retries) {
      try {
        if (attempt > 0) this.client.logs.info(`Retry attempt ${attempt}`);
        return await fn();
      } catch (err) {
        lastError = err;
        attempt += 1;
        if (attempt > retries) break;
        const wait = backoffBase * Math.pow(2, attempt - 1);
        await new Promise((res) => setTimeout(res, wait));
      }
    }
    throw lastError;
  }

  private async handleSongEnd(queue: Queue): Promise<void> {
    const guildId = queue.voiceChannel.guild.id;

    if (queue.loop && queue.songs.length > 0) {
      queue.songs.push(queue.songs[0]);
    }

    queue.songs.shift();

    if (queue.voiceChannel.members.size <= 1) {
      this.stopQueue(guildId);
      return;
    }

    if (queue.songs.length > 0) {
      await this.playSong(queue.songs[0], queue);
    } else {
      this.stopQueue(guildId);
    }
  }

  private async handleSongError(
    queue: Queue,
    errorMessage: string,
  ): Promise<void> {
    await queue.textChannel.send(errorMessage);
    queue.songs.shift();

    if (queue.songs.length > 0) {
      await this.playSong(queue.songs[0], queue);
    } else {
      this.stopQueue(queue.voiceChannel.guild.id);
    }
  }

  private async sendSongAddedEmbed(
    queue: Queue,
    songs: Song[],
    interaction?: CommandInteraction,
  ): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle(songs.length > 1 ? "Added Playlist to Queue" : "Added to Queue")
      .setDescription(
        songs.length > 1
          ? `Added ${songs.length} songs from playlist`
          : `**${songs[0].title || songs[0].url}**`,
      )
      .setColor("Blue");

    if (interaction) {
      await interaction.reply({ embeds: [embed] });
    } else {
      await queue.textChannel.send({ embeds: [embed] });
    }
  }

  private async sendNowPlayingEmbed(queue: Queue, song: Song): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("Now Playing")
      .setDescription(
        `**${song.title || song.url}**${
          song.duration
            ? `\nDuration: ${this.formatDuration(song.duration)}`
            : ""
        }`,
      )
      .setColor("Blue");

    await queue.textChannel.send({ embeds: [embed] });
  }

  private async sendError(
    interaction: CommandInteraction | undefined,
    message: string,
  ): Promise<void> {
    const serverQueue = interaction?.guild?.id
      ? this.queue.get(interaction.guild.id)
      : undefined;
    if (interaction) {
      await interaction.followUp({
        content: message,
        flags: MessageFlags.Ephemeral,
      });
    } else if (serverQueue) {
      await serverQueue.textChannel.send(message);
    }
  }

  private formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  private stopQueue(guildId: string): void {
    const serverQueue = this.queue.get(guildId);
    serverQueue?.player.stop();
    serverQueue?.connection?.destroy();
    this.queue.delete(guildId);
  }

  async stop(interaction: CommandInteraction): Promise<void> {
    if (!interaction.guild) {
      await interaction.editReply({
        content: "This command must be used in a server!",
      });
      return;
    }

    const serverQueue = this.queue.get(interaction.guild.id);
    if (!serverQueue) {
      await interaction.editReply({
        content: "No queue to stop!",
      });
      return;
    }

    this.stopQueue(interaction.guild.id);
    await interaction.editReply("Stopped the queue and disconnected");
  }

  async skip(interaction: CommandInteraction): Promise<void> {
    if (!interaction.guild) {
      return;
    }

    const serverQueue = this.queue.get(interaction.guild.id);
    if (!serverQueue) {
      await interaction.editReply({
        content: "No queue to skip!",
      });
      return;
    }

    serverQueue.player.stop();
    await interaction.editReply("Skipped the current song");
  }

  async pause(interaction: CommandInteraction): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({
        content: "This command must be used in a server!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const serverQueue = this.queue.get(interaction.guild.id);
    if (!serverQueue) {
      await interaction.editReply({
        content: "No queue to pause!",
      });
      return;
    }

    if (serverQueue.player.state.status === AudioPlayerStatus.Paused) {
      await serverQueue.textChannel.send({
        content: "The player is already paused!",
      });
      return;
    }

    serverQueue.player.pause();
    await serverQueue.textChannel.send("Paused the player");
  }

  async resume(interaction: CommandInteraction): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({
        content: "This command must be used in a server!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const serverQueue = this.queue.get(interaction.guild.id);
    if (!serverQueue) {
      await interaction.reply({
        content: "No queue to resume!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (serverQueue.player.state.status === AudioPlayerStatus.Playing) {
      await interaction.reply({
        content: "The player is already playing!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    serverQueue.player.unpause();
    await interaction.editReply("Resumed the player");
  }

  async volume(interaction: CommandInteraction, volume: number): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({
        content: "This command must be used in a server!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (volume < 0 || volume > 10) {
      await interaction.reply({
        content: "Volume must be between 0 and 10",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const serverQueue = this.queue.get(interaction.guild.id);
    if (!serverQueue) {
      await interaction.editReply({
        content: "No queue to change volume!",
      });
      return;
    }

    serverQueue.volume = volume;
    if (serverQueue.resource) {
      serverQueue.resource.volume?.setVolume(volume / 10);
    }
    await interaction.editReply(`Set volume to ${volume}`);
  }

  async queueList(interaction: CommandInteraction): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({
        content: "This command must be used in a server!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const serverQueue = this.queue.get(interaction.guild.id);
    if (!serverQueue || serverQueue.songs.length === 0) {
      await interaction.reply({
        content: "The queue is empty!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("Current Queue")
      .setDescription(
        serverQueue.songs
          .map(
            (song, index) =>
              `${index + 1}. ${song.title || song.url}${
                song.duration ? ` (${this.formatDuration(song.duration)})` : ""
              }`,
          )
          .join("\n"),
      )
      .setColor("Blue");

    await interaction.editReply({ embeds: [embed] });
  }

  async loop(interaction: CommandInteraction): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({
        content: "This command must be used in a server!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const serverQueue = this.queue.get(interaction.guild.id);
    if (!serverQueue) {
      await interaction.reply({
        content: "No queue to loop!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    serverQueue.loop = !serverQueue.loop;
    await interaction.editReply(
      `Loop ${serverQueue.loop ? "enabled" : "disabled"}`,
    );
  }
}

export default MusicSystem;
