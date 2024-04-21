const { EmbedBuilder } = require("discord.js");
require("dotenv").config();

module.exports = {
  data: {
    name: "guilds22",
    description: "All guilds",
    integration_types: [1],
    contexts: [0, 1, 2],
  },
  async execute(interaction, client) {
    if (interaction.user.id !== "779313277775380490") {
      return interaction.reply({ content: "You are not allowed to use this command" });
    }
    let list;
    client.guilds.cache.forEach((guild) => {
      list += `${guild.name} (${guild.id}) | ${guild.memberCount} Members | Owner: ${guild.ownerId}\n`;
    });

    await interaction.reply({ content: list });
  },
};
