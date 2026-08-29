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
  joinVoiceChannel,
  type VoiceConnection,
  EndBehaviorType,
  AudioReceiveStream,
} from "@discordjs/voice";
import { mkdirSync, existsSync } from "fs";
import path from "path";
import { spawn } from "child_process";
import prism from "prism-media";

interface RecordingSession {
  connection: VoiceConnection;
  receivers: Map<
    string,
    { stream: AudioReceiveStream; ffmpeg: any; decoder: any }
  >;
  folderPath: string;
  name: string;
}

const activeRecordings = new Map<string, RecordingSession>();

export default {
  data: new SlashCommandBuilder()
    .setName("voicerecorder")
    .setDescription("Record voice channel audio")
    .addSubcommand((sub) =>
      sub
        .setName("start")
        .setDescription("Start recording the voice channel")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Voice channel to record")
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Name of the recording session (folder name)")
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("stop").setDescription("Stop recording the voice channel"),
    ),
  ownerOnly: true,

  run: async (interaction: ChatInputCommandInteraction, client: Client) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (!guildId) {
      return interaction.editReply({
        content: "This command can only be used in a guild",
      });
    }

    if (subcommand === "start") {
      const channel =
        interaction.options.getChannel("channel") ||
        (interaction.member &&
          (interaction.member as GuildMember).voice.channel);

      if (!channel) {
        return interaction.editReply({
          content: "You need to be in a voice channel or specify one",
        });
      }

      if (!(channel instanceof VoiceChannel)) {
        return interaction.editReply({
          content: "That channel is not a voice channel",
        });
      }

      const permissions = channel.permissionsFor(interaction.guild!.members.me);
      if (
        !permissions ||
        !permissions.has([
          PermissionsBitField.Flags.Connect,
          PermissionsBitField.Flags.Speak,
        ])
      ) {
        return interaction.editReply({
          content: "I don't have permission to connect to this voice channel",
        });
      }

      if (activeRecordings.has(guildId)) {
        return interaction.editReply({
          content:
            "Already recording in this server. Stop the current recording first.",
        });
      }

      const sessionName =
        interaction.options.getString("name") ||
        `session-${new Date().toISOString().replace(/[:.]/g, "-")}`;
      const folderPath = path.join(process.cwd(), "recordings", sessionName);

      try {
        if (!existsSync(folderPath)) {
          mkdirSync(folderPath, { recursive: true });
        }

        const connection = joinVoiceChannel({
          channelId: channel.id,
          guildId: guildId,
          adapterCreator: interaction.guild!.voiceAdapterCreator,
          selfDeaf: false,
          selfMute: false,
        });

        const session: RecordingSession = {
          connection,
          receivers: new Map(),
          folderPath,
          name: sessionName,
        };

        activeRecordings.set(guildId, session);

        const receiver = connection.receiver;

        receiver.speaking.on("start", (userId: string) => {
          const currentSession = activeRecordings.get(guildId);
          if (!currentSession || currentSession.receivers.has(userId)) return;

          const user = client.users.cache.get(userId);
          const userName = user ? user.username : userId;
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const mp3Path = path.join(
            currentSession.folderPath,
            `${userName}-${timestamp}.mp3`,
          );

          const audioStream = receiver.subscribe(userId, {
            end: {
              behavior: EndBehaviorType.AfterSilence,
              duration: 1000,
            },
          });

          const opusDecoder = new prism.opus.Decoder({
            frameSize: 960,
            channels: 2,
            rate: 48000,
          });

          const ffmpeg = spawn("ffmpeg", [
            "-loglevel",
            "verbose",
            "-f",
            "s16le",
            "-ar",
            "48000",
            "-ac",
            "2",
            "-i",
            "pipe:0",
            "-codec:a",
            "libmp3lame",
            "-b:a",
            "128k",
            mp3Path,
          ]);

          audioStream.pipe(opusDecoder).pipe(ffmpeg.stdin);

          currentSession.receivers.set(userId, {
            stream: audioStream,
            ffmpeg,
            decoder: opusDecoder,
          });

          ffmpeg.stderr.on("data", (data) => {
            console.log(`[FFmpeg ${userName}] ${data.toString()}`);
          });

          ffmpeg.on("error", (err) => {
            console.error(`FFmpeg error for user ${userName}:`, err);
          });

          audioStream.on("end", () => {
            if (ffmpeg.stdin) ffmpeg.stdin.end();
            currentSession.receivers.delete(userId);
            console.log(`Finished recording segment for ${userName}`);
          });

          console.log(`Started recording ${userName} to ${mp3Path}`);
        });

        const voiceStateHandler = (
          oldState: VoiceState,
          newState: VoiceState,
        ) => {
          if (newState.member?.id === client.user?.id) {
            if (!newState.channelId) {
              stopRecording(guildId);
              client.off(Events.VoiceStateUpdate, voiceStateHandler);
            } else if (newState.channelId !== channel.id) {
              stopRecording(guildId);
              client.off(Events.VoiceStateUpdate, voiceStateHandler);
            }
          }
        };

        client.on(Events.VoiceStateUpdate, voiceStateHandler);

        return interaction.editReply({
          content: `✅ Started recording in **${channel.name}**. Files are being saved to \`recordings/${sessionName}\`.`,
        });
      } catch (error) {
        console.error("Error starting recording:", error);
        activeRecordings.delete(guildId);
        return interaction.editReply({
          content: "Failed to start recording. Make sure FFmpeg is installed.",
        });
      }
    } else if (subcommand === "stop") {
      const session = activeRecordings.get(guildId);
      if (!session) {
        return interaction.editReply({
          content: "No active recording in this server",
        });
      }

      stopRecording(guildId);

      return interaction.editReply({
        content: `✅ Stopped recording. Files saved in \`recordings/${session.name}\`.`,
      });
    }
  },
};

function stopRecording(guildId: string) {
  const session = activeRecordings.get(guildId);
  if (!session) return;

  for (const [userId, { stream, ffmpeg, decoder }] of session.receivers) {
    stream.destroy();
    decoder.destroy();
    if (ffmpeg.stdin) ffmpeg.stdin.end();
  }
  session.receivers.clear();

  session.connection.destroy();
  activeRecordings.delete(guildId);
  console.log(`Recording session ended for guild ${guildId}`);
}
