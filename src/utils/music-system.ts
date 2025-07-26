import { getYouTubeStreamUrl } from "./music-url-scrape.js";
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
} from "discord.js";
import { MusicClient, Client as YoutubeClient } from "youtubei";

interface Song {
  url: string;
  id?: string;
  title?: string;
  duration?: number;
}

interface Queue {
  textChannel: TextChannel;
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
  private youtube: YoutubeClient;
  private music: MusicClient;
  private client: Client;

  constructor(client: Client) {
    this.queue = new Map();
    this.youtube = new YoutubeClient();
    this.music = new MusicClient();
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
      radio = false,
    }: {
      textChannel: TextChannel;
      interaction?: CommandInteraction;
      radio?: boolean;
    }
  ): Promise<void> {
    const guildId = voiceChannel.guild.id;
    let songs: Song[] = [];

    if (!query) {
      await this.sendError(interaction, "Please provide a valid query or URL");
      return;
    }

    const playlistRegex =
      /^(https?:\/\/)?(www\.)?(youtube\.com|music\.youtube\.com)\/(?:(watch\?v=([^&]+)&list=([^&]+))|(playlist\?list=([^&]+)))/;
    const match = query.match(playlistRegex);

    try {
      if (match) {
        const videoId = match[5];
        const playlistId = match[6];
        songs = await this.getPlaylistSongs(playlistId, videoId);
      } else {
        songs = await this.getSingleSong(query);
      }

      if (songs.length === 0) {
        await this.sendError(interaction, "No valid songs found");
        return;
      }

      if (radio && songs.length === 1) {
        const similarSongs = await this.getSimilarSongs(songs[0]);
        console.log(similarSongs);
        songs.push(...similarSongs);
      }

      await this.addToQueue(
        guildId,
        voiceChannel,
        textChannel,
        songs,
        interaction
      );
    } catch (err) {
      this.client.logs.error("Error processing play request", err);
      await this.sendError(interaction, "Failed to process the request");
    }
  }

  private async getPlaylistSongs(
    playlistId: string,
    videoId?: string
  ): Promise<Song[]> {
    const songs: Song[] = [];
    try {
      const playlist = await this.youtube.getPlaylist(playlistId);
      if (!playlist || !playlist.videos || playlist.videoCount === 0) {
        return songs;
      }
      await playlist.videos.next(0);
      // If a specific video ID is provided, fetch and add it first
      if (videoId) {
        try {
          const video = await this.youtube.getVideo(videoId);
          if (video && video.title && video.duration) {
            songs.push({
              url: `https://www.youtube.com/watch?v=${video.id}`,
              id: video.id,
              title: video.title,
              duration: video.duration,
            });
          }
        } catch (err) {
          this.client.logs.error(`Error fetching video ${videoId}`, err);
        }
      }

      // Add remaining playlist videos, excluding the specific video if already added
      playlist.videos.items.forEach((video) => {
        if (video.id !== videoId) {
          songs.push({
            url: `https://www.youtube.com/watch?v=${video.id}`,
            id: video.id,
            title: video.title,
            duration: video.duration,
          });
        }
      });

      // Shuffle the remaining songs (excluding the first one if videoId was provided)
      if (songs.length > 1 && videoId) {
        const firstSong = songs[0];
        const remainingSongs = songs
          .slice(1)
          .sort(() => Math.random() - 0.5)
          .slice(0, 100);
        return [firstSong, ...remainingSongs];
      }

      return songs.sort(() => Math.random() - 0.5);
    } catch (err) {
      this.client.logs.error("Error fetching playlist", err);
      return [];
    }
  }

  private async getSingleSong(query: string): Promise<Song[]> {
    const urlRegex =
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|music\.youtube\.com)\/(watch\?v=|shorts\/)?([^&]+)/;

    if (query.match(urlRegex)) {
      return [{ url: query }];
    }

    try {
      const results = await this.music.search(query);
      if (results[0]?.items.length === 0) {
        return [];
      }

      return [
        {
          url: `https://www.youtube.com/watch?v=${results[0].items[0].id}`,
          id: results[0].items[0].id,
          title: results[0].items[0].title,
          duration: results[0].items[0].duration,
        },
      ];
    } catch (err) {
      this.client.logs.error("Error searching for song", err);
      return [];
    }
  }

  private async getSimilarSongs(song: Song): Promise<Song[]> {
    try {
      if (!song.id) return [];

      const related = await this.youtube.getVideo(song.id);
      if (!related?.related?.items) return [];

      return related.related.items
        .filter((item) => item.type === "video" && item.id && item.title)
        .slice(0, 20)
        .map((item) => ({
          url: `https://www.youtube.com/watch?v=${item.id}`,
          id: item.id,
          title: item.title,
          duration: item.duration,
        }));
    } catch (err) {
      this.client.logs.error("Error fetching similar songs", err);
      return [];
    }
  }

  private async addToQueue(
    guildId: string,
    voiceChannel: VoiceChannel,
    textChannel: TextChannel,
    songs: Song[],
    interaction?: CommandInteraction
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
    textChannel: TextChannel,
    songs: Song[]
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
      const streamUrl = await getYouTubeStreamUrl(song.url);
      if (!streamUrl) {
        await this.handleSongError(queue, "Failed to get stream URL");
        return;
      }

      const resource = createAudioResource(streamUrl, { inlineVolume: true });
      queue.resource = resource;
      resource.volume?.setVolume(queue.volume / 10);
      queue.player.play(resource);

      queue.player.once(AudioPlayerStatus.Idle, () =>
        this.handleSongEnd(queue)
      );
      queue.player.on("error", (error) => {
        this.client.logs.error("player error", error);
      });
      await this.sendNowPlayingEmbed(queue, song);
    } catch (err) {
      this.client.logs.error("Error playing song", err);
      await this.handleSongError(queue, "Failed to play song");
    }
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
    errorMessage: string
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
    interaction?: CommandInteraction
  ): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle(songs.length > 1 ? "Added Playlist to Queue" : "Added to Queue")
      .setDescription(
        songs.length > 1
          ? `Added ${songs.length} songs from playlist`
          : `**${songs[0].title || songs[0].url}**`
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
        }`
      )
      .setColor("Blue");

    await queue.textChannel.send({ embeds: [embed] });
  }

  private async sendError(
    interaction: CommandInteraction | undefined,
    message: string
  ): Promise<void> {
    const serverQueue = interaction?.guild?.id
      ? this.queue.get(interaction.guild.id)
      : undefined;
    if (interaction) {
      await interaction.followUp({ content: message, ephemeral: true });
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
    serverQueue.player.stop();
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
        ephemeral: true,
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
        ephemeral: true,
      });
      return;
    }

    const serverQueue = this.queue.get(interaction.guild.id);
    if (!serverQueue) {
      await interaction.reply({
        content: "No queue to resume!",
        ephemeral: true,
      });
      return;
    }

    if (serverQueue.player.state.status === AudioPlayerStatus.Playing) {
      await interaction.reply({
        content: "The player is already playing!",
        ephemeral: true,
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
        ephemeral: true,
      });
      return;
    }

    if (volume < 0 || volume > 10) {
      await interaction.reply({
        content: "Volume must be between 0 and 10",
        ephemeral: true,
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
        ephemeral: true,
      });
      return;
    }

    const serverQueue = this.queue.get(interaction.guild.id);
    if (!serverQueue || serverQueue.songs.length === 0) {
      await interaction.reply({
        content: "The queue is empty!",
        ephemeral: true,
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
              }`
          )
          .join("\n")
      )
      .setColor("Blue");

    await interaction.editReply({ embeds: [embed] });
  }

  async loop(interaction: CommandInteraction): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({
        content: "This command must be used in a server!",
        ephemeral: true,
      });
      return;
    }

    const serverQueue = this.queue.get(interaction.guild.id);
    if (!serverQueue) {
      await interaction.reply({
        content: "No queue to loop!",
        ephemeral: true,
      });
      return;
    }

    serverQueue.loop = !serverQueue.loop;
    await interaction.editReply(
      `Loop ${serverQueue.loop ? "enabled" : "disabled"}`
    );
  }
}

export default MusicSystem;
