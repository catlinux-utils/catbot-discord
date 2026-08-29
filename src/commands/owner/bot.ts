import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ComponentType,
  version as djsVersion,
  type ChatInputCommandInteraction,
  type Client,
  type ButtonInteraction,
} from "discord.js";
import os from "node:os";
import process from "node:process";

const COLLECTOR_TIMEOUT_MS = 5 * 60 * 1000;

type PanelId =
  "overview" | "system" | "guilds" | "users" | "music" | "commands";

interface PanelDef {
  id: PanelId;
  label: string;
  emoji: string;
  style: ButtonStyle;
}

// Discord limits each action row to 5 components, so the 6 panels are
// split into two rows of 3.
const PANELS_TOP: readonly PanelDef[] = [
  {
    id: "overview",
    label: "Overview",
    emoji: "📊",
    style: ButtonStyle.Primary,
  },
  { id: "system", label: "System", emoji: "🖥️", style: ButtonStyle.Secondary },
  {
    id: "commands",
    label: "Commands",
    emoji: "🛠️",
    style: ButtonStyle.Secondary,
  },
];
const PANELS_BOTTOM: readonly PanelDef[] = [
  { id: "guilds", label: "Guilds", emoji: "🏠", style: ButtonStyle.Success },
  { id: "users", label: "Users", emoji: "👥", style: ButtonStyle.Success },
  { id: "music", label: "Music", emoji: "🎵", style: ButtonStyle.Danger },
];
const PANEL_GROUPS: readonly (readonly PanelDef[])[] = [
  PANELS_TOP,
  PANELS_BOTTOM,
];

function isKnownPanelId(id: PanelId): boolean {
  return (
    PANELS_TOP.some((p) => p.id === id) ||
    PANELS_BOTTOM.some((p) => p.id === id)
  );
}

const REFRESH_BUTTON: PanelDef = {
  id: "overview", // unused for refresh
  label: "Refresh",
  emoji: "🔄",
  style: ButtonStyle.Secondary,
};
const CLOSE_BUTTON: PanelDef = {
  id: "overview", // unused for close
  label: "Close",
  emoji: "🚪",
  style: ButtonStyle.Danger,
};

function customId(panel: PanelId): string {
  return `dashboard:${panel}`;
}
const REFRESH_ID = "dashboard:refresh";
const CLOSE_ID = "dashboard:close";

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  return parts.join(" ");
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

function loadAvg(): string {
  const loads = os.loadavg();
  if (!loads || loads.length === 0) return "n/a";
  return loads.map((l) => l.toFixed(2)).join(" / ");
}

function cpuModelLine(): string {
  const model = os.cpus()[0]?.model ?? "Unknown CPU";
  const cores = os.cpus().length;
  return `${model} (${cores} cores)`;
}

function processMemory(): NodeJS.MemoryUsage {
  return process.memoryUsage();
}

function countChannels(client: Client): {
  total: number;
  text: number;
  voice: number;
  stage: number;
  forum: number;
} {
  let total = 0;
  let text = 0;
  let voice = 0;
  let stage = 0;
  let forum = 0;
  for (const guild of client.guilds.cache.values()) {
    for (const channel of guild.channels.cache.values()) {
      total += 1;
      switch (channel.type) {
        case 0:
          text += 1;
          break;
        case 2:
          voice += 1;
          break;
        case 13:
          stage += 1;
          break;
        case 15:
          forum += 1;
          break;
        default:
          break;
      }
    }
  }
  return { total, text, voice, stage, forum };
}

function topGuilds(client: Client, limit = 5): string {
  const sorted = [...client.guilds.cache.values()].sort(
    (a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0),
  );
  if (sorted.length === 0) return "No guilds";
  return sorted
    .slice(0, limit)
    .map(
      (g, i) =>
        `\`${i + 1}.\` **${g.name}** — ${g.memberCount ?? "?"} members (\`${g.id}\`)`,
    )
    .join("\n");
}

function musicQueues(client: Client): {
  active: number;
  totalSongs: number;
  totalSeconds: number;
} {
  // Access the private queue map from the MusicSystem instance.
  const system = client.musicsystem as unknown as {
    queue?: Map<
      string,
      { songs: Array<{ duration?: number }>; playing: boolean }
    >;
  };
  const queue = system?.queue;
  if (!queue) return { active: 0, totalSongs: 0, totalSeconds: 0 };
  let active = 0;
  let totalSongs = 0;
  let totalSeconds = 0;
  for (const q of queue.values()) {
    if (q.playing) active += 1;
    totalSongs += q.songs.length;
    for (const song of q.songs) {
      if (typeof song.duration === "number") totalSeconds += song.duration;
    }
  }
  return { active, totalSongs, totalSeconds };
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0s";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (secs || parts.length === 0) parts.push(`${secs}s`);
  return parts.join(" ");
}

function getCategories(client: Client): string[] {
  const seen = new Set<string>();
  for (const cmd of client.commands.values()) {
    if (cmd.category) seen.add(cmd.category);
  }
  return [...seen].sort();
}

function buildPanelEmbed(panel: PanelId, client: Client): EmbedBuilder {
  const mem = processMemory();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const wsPing = client.ws.ping;
  const uptime = formatUptime(client.uptime ?? 0);
  const ts = new Date();

  if (panel === "overview") {
    const channels = countChannels(client);
    const emojiCount = client.emojis.cache.size;
    const userCache = client.users.cache.size;
    const guildCount = client.guilds.cache.size;
    const description = [
      `🤖 **Bot**: ${client.user?.tag ?? "?"} (\`${client.user?.id ?? "?"}\`)`,
      `⏱️ **Uptime**: ${uptime}`,
      `📡 **WS Ping**: ${wsPing}ms`,
      `🏠 **Guilds**: ${guildCount}`,
      `👥 **Cached users**: ${userCache}`,
      `💬 **Channels**: ${channels.total} (text ${channels.text} • voice ${channels.voice} • stage ${channels.stage} • forum ${channels.forum})`,
      `😄 **Emojis cached**: ${emojiCount}`,
      `🧠 **RSS**: ${formatBytes(mem.rss)} • **Heap used**: ${formatBytes(mem.heapUsed)}`,
      `🟢 **Node**: ${process.version} • **discord.js**: v${djsVersion}`,
    ].join("\n");
    return new EmbedBuilder()
      .setTitle("📊 Bot Overview")
      .setDescription(description)
      .setColor("Blue")
      .setTimestamp(ts);
  }

  if (panel === "system") {
    const description = [
      `**Platform**: ${os.platform()} (${os.release()})`,
      `**Arch**: ${os.arch()}`,
      `**Hostname**: ${os.hostname()}`,
      `**CPU**: ${cpuModelLine()}`,
      `**Load avg**: ${loadAvg()}`,
      `**Uptime (host)**: ${formatUptime(os.uptime() * 1000)}`,
      `**Memory**: ${formatBytes(usedMem)} / ${formatBytes(totalMem)} (free ${formatBytes(freeMem)})`,
      `**Process RSS**: ${formatBytes(mem.rss)}`,
      `**Process Heap**: ${formatBytes(mem.heapUsed)} / ${formatBytes(mem.heapTotal)}`,
      `**External**: ${formatBytes(mem.external)}`,
      `**Array buffers**: ${formatBytes(mem.arrayBuffers)}`,
      `**Node**: ${process.version}`,
      `**PID**: ${process.pid}`,
    ].join("\n");
    return new EmbedBuilder()
      .setTitle("🖥️ System Resources")
      .setDescription(description)
      .setColor("Purple")
      .setTimestamp(ts);
  }

  if (panel === "guilds") {
    const guilds = [...client.guilds.cache.values()];
    const totalMembers = guilds.reduce(
      (acc, g) => acc + (g.memberCount ?? 0),
      0,
    );
    const avgMembers =
      guilds.length > 0 ? Math.round(totalMembers / guilds.length) : 0;
    const largeGuilds = guilds.filter(
      (g) => (g.memberCount ?? 0) >= 100,
    ).length;
    const description = [
      `**Total guilds**: ${guilds.length}`,
      `**Total members (sum)**: ${totalMembers}`,
      `**Average members / guild**: ${avgMembers}`,
      `**Guilds with 100+ members**: ${largeGuilds}`,
      "",
      `**Top ${Math.min(5, guilds.length)} by member count:**`,
      topGuilds(client, 5),
    ].join("\n");
    return new EmbedBuilder()
      .setTitle("🏠 Guild Statistics")
      .setDescription(description)
      .setColor("Green")
      .setTimestamp(ts);
  }

  if (panel === "users") {
    const users = [...client.users.cache.values()];
    const total = users.length;
    const bots = users.filter((u) => u.bot).length;
    const humans = total - bots;
    const description = [
      `**Cached users**: ${total}`,
      `**Humans**: ${humans}`,
      `**Bots**: ${bots}`,
      `**Bot ratio**: ${total > 0 ? ((bots / total) * 100).toFixed(1) : "0"}%`,
    ].join("\n");
    return new EmbedBuilder()
      .setTitle("👥 User Cache")
      .setDescription(description)
      .setColor("Orange")
      .setTimestamp(ts);
  }

  if (panel === "music") {
    const status = musicQueues(client);
    const description = [
      `**Active queues**: ${status.active}`,
      `**Songs queued (total)**: ${status.totalSongs}`,
      `**Total queue length**: ${formatDuration(status.totalSeconds)}`,
      status.active === 0
        ? "_No music playing anywhere._"
        : "_Music is currently playing in some servers._",
    ].join("\n");
    return new EmbedBuilder()
      .setTitle("🎵 Music System")
      .setDescription(description)
      .setColor("Red")
      .setTimestamp(ts);
  }

  // panel === "commands"
  const categories = getCategories(client);
  const ownerCount = [...client.commands.values()].filter(
    (c) => c.ownerOnly,
  ).length;
  const description = [
    `**Loaded commands**: ${client.commands.size}`,
    `**Owner-only**: ${ownerCount}`,
    `**Categories**: ${categories.length > 0 ? categories.join(", ") : "none"}`,
  ].join("\n");
  return new EmbedBuilder()
    .setTitle("🛠️ Commands")
    .setDescription(description)
    .setColor("Yellow")
    .setTimestamp(ts);
}

function buildPanelRows(
  activePanel: PanelId,
): ActionRowBuilder<ButtonBuilder>[] {
  return PANEL_GROUPS.map((group) => {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (const panel of group) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(customId(panel.id))
          .setLabel(panel.label)
          .setEmoji(panel.emoji)
          .setStyle(panel.style)
          .setDisabled(panel.id === activePanel),
      );
    }
    return row;
  });
}

function buildControlRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(REFRESH_ID)
      .setLabel(REFRESH_BUTTON.label)
      .setEmoji(REFRESH_BUTTON.emoji)
      .setStyle(REFRESH_BUTTON.style),
    new ButtonBuilder()
      .setCustomId(CLOSE_ID)
      .setLabel(CLOSE_BUTTON.label)
      .setEmoji(CLOSE_BUTTON.emoji)
      .setStyle(CLOSE_BUTTON.style),
  );
}

export default {
  data: new SlashCommandBuilder()
    .setName("dashboard")
    .setDescription("Owner dashboard with useful runtime information")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  ownerOnly: true,
  run: async (interaction: ChatInputCommandInteraction, client: Client) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let activePanel: PanelId = "overview";

    const message = await interaction.editReply({
      embeds: [buildPanelEmbed(activePanel, client)],
      components: [...buildPanelRows(activePanel), buildControlRow()],
    });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: COLLECTOR_TIMEOUT_MS,
      filter: (i: ButtonInteraction) => i.user.id === interaction.user.id,
    });

    const updateDashboard = async (nextPanel: PanelId) => {
      activePanel = nextPanel;
      await interaction.editReply({
        embeds: [buildPanelEmbed(activePanel, client)],
        components: [...buildPanelRows(activePanel), buildControlRow()],
      });
    };

    const disableAll = async () => {
      const panelRows = buildPanelRows(activePanel);
      const controlRow = buildControlRow();
      for (const row of panelRows) {
        row.components.forEach((btn) => btn.setDisabled(true));
      }
      controlRow.components.forEach((btn) => btn.setDisabled(true));
      if (!(await interaction.fetchReply().catch(() => false))) return;
      await interaction.editReply({
        components: [...panelRows, controlRow],
      });
    };

    collector.on("collect", async (btn: ButtonInteraction) => {
      // Anything collected here is from the author (filter), but ignore
      // anything that isn't one of our IDs to be defensive.
      const id = btn.customId;
      const panelPart = id.startsWith("dashboard:")
        ? (id.slice("dashboard:".length) as PanelId)
        : null;
      if (
        id !== REFRESH_ID &&
        id !== CLOSE_ID &&
        !(panelPart && isKnownPanelId(panelPart))
      ) {
        return;
      }

      // Acknowledge the interaction immediately so the button doesn't time out.
      if (id === CLOSE_ID) {
        collector.stop("closed");
        if (!(await btn.deferUpdate().catch(() => null))) return;
        await disableAll();
        return;
      }

      if (id === REFRESH_ID) {
        if (!(await btn.deferUpdate().catch(() => null))) return;
        await interaction.editReply({
          embeds: [buildPanelEmbed(activePanel, client)],
          components: [...buildPanelRows(activePanel), buildControlRow()],
        });
        return;
      }

      // Panel-switch button.
      if (!(await btn.deferUpdate().catch(() => null))) return;
      await updateDashboard(panelPart as PanelId);
    });

    collector.on("end", async () => {
      await disableAll();
    });
  },
};
