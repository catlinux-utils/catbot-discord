import { SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("allusers")
    .setDescription("show all users")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  ownerOnly: true,
  run: async (interaction) => {
    let userlist = "Users:\n";
    interaction.client.users.cache.forEach((user) => {
      userlist += ` - ${user.username} (${user.id})\n`;
    });
    await interaction.reply({ content: userlist, ephemeral: true });
  },
};
