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
} from "@discordjs/voice";
import {
  Client,
  EmbedBuilder,
  TextChannel,
  VoiceChannel,
  CommandInteraction,
} from "discord.js";

import { MusicClient } from "youtubei";
const music = new MusicClient();

interface Queue {
  textChannel: TextChannel;
  voiceChannel: VoiceChannel;
  connection: VoiceConnection | null;
  songs: string[];
  volume: number;
  playing: boolean;
  player: AudioPlayer;
  resource: AudioResource | null;
}

class MusicSystem {
  private queue: Map<string, Queue>;

  constructor(client: Client) {
    this.queue = new Map();

    client.on("voiceStateUpdate", (oldState, newState) => {
      const oldChannel = oldState.channel;
      const newChannel = newState.channel;
      if (!newChannel && oldChannel && oldChannel.members.size === 1) {
        const serverQueue = this.queue.get(oldChannel.guild.id);
        if (serverQueue) {
          serverQueue.player.stop();
        }
      }
    });
  }

  async play(
    voiceChannel: VoiceChannel,
    query: string,
    { textChannel }: { textChannel: TextChannel }
  ) {
    const serverQueue = this.queue.get(voiceChannel.guild.id);

    if (!serverQueue) {
      const queueConstruct: Queue = {
        textChannel,
        voiceChannel,
        connection: null,
        songs: [query],
        volume: 5,
        playing: true,
        player: createAudioPlayer({
          behaviors: { noSubscriber: NoSubscriberBehavior.Stop },
        }),
        resource: null,
      };

      this.queue.set(voiceChannel.guild.id, queueConstruct);

      queueConstruct.songs.push(query);

      try {
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: voiceChannel.guild.id,
          adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });
        queueConstruct.connection = connection;
        connection.subscribe(queueConstruct.player);
        await this.playSong(queueConstruct.songs[0], queueConstruct);
      } catch (err) {
        console.log(err);
        this.queue.delete(voiceChannel.guild.id);
        return;
      }
    } else {
      serverQueue.songs.push(query);
    }
  }

  async playSong(song: string, queueConstruct: Queue) {
    if (!song.startsWith("https://www.youtube.com/watch?v=")) {
      const results = await music.search(song);
      if (results[0].items.length === 0) return;
      song = `https://www.youtube.com/watch?v=${results[0].items[0].id}`;
    }
    const streamUrl = await getYouTubeStreamUrl(song);
    if (!streamUrl) return;
    const resource = createAudioResource(streamUrl, { inlineVolume: true });
    queueConstruct.resource = resource;

    (queueConstruct.resource as any).volume.setVolume(
      queueConstruct.volume / 10
    );
    queueConstruct.player.play(resource);

    queueConstruct.player.once(AudioPlayerStatus.Idle, () => {
      queueConstruct.songs.shift();
      const channelMembers = queueConstruct.voiceChannel.members.size;
      if (channelMembers === 1) {
        queueConstruct.connection?.destroy();
        this.queue.delete(queueConstruct.voiceChannel.guild.id);
        return;
      }
      if (queueConstruct.songs.length > 0) {
        this.playSong(queueConstruct.songs[0], queueConstruct);
      } else {
        if (queueConstruct.connection) {
          queueConstruct.connection.destroy();
        }
        this.queue.delete(queueConstruct.voiceChannel.guild.id);
      }
    });

    const songEmbed = new EmbedBuilder()
      .setTitle("Now Playing")
      .setDescription(`**${song}**`)
      .setColor("Blue");

    queueConstruct.textChannel.send({ embeds: [songEmbed] });
  }

  async stop(interaction: CommandInteraction) {
    if (!interaction.guild) return;
    const serverQueue = this.queue.get(interaction.guild.id);
    if (!serverQueue) return interaction.reply("No queue to stop!");
    serverQueue.songs = [];
    serverQueue.player.stop();
  }

  async skip(message) {
    const serverQueue = this.queue.get(message.guild.id);
    if (!serverQueue) return message.channel.send("No queue to skip!");
    serverQueue.player.stop();
  }

  async pause(message) {
    const serverQueue = this.queue.get(message.guild.id);
    if (!serverQueue) return message.channel.send("No queue to pause!");
    serverQueue.player.pause();
  }

  async resume(message) {
    const serverQueue = this.queue.get(message.guild.id);
    if (!serverQueue) return message.channel.send("No queue to resume!");
    serverQueue.player.unpause();
  }
  async volume(message, volume) {}
}

export default MusicSystem;
