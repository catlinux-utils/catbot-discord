import { Collection, Events } from "discord.js";

export default async (client) => {
  client.musicplayers = new Collection();
  client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    const oldChannel = oldState.channel;
    const newChannel = newState.channel;
    const guild = newState.guild;
    const musicplayer = client.musicplayers.get(guild.id);

    if (oldChannel?.id && newChannel?.id && oldChannel?.id !== newChannel?.id) {
      const chan = client.channels.cache.get(oldChannel.id);

      if (chan && chan.members.size === 1) {
        musicplayer?.playable[0]?.destroy();
        musicplayer?.stop();
      }
    } else if (oldChannel && !newChannel) {
      const channelMembers = oldChannel.members.size;
      if (channelMembers === 1) {
        musicplayer?.playable[0]?.destroy();
        musicplayer?.stop();
      }
    }
  });
};
