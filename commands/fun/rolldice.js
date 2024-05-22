const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "rolldice",
  description: "Rolls a dice.",
  run: async (interaction) => {
    const roll = Math.floor(Math.random() * 6) + 1;
    await interaction.reply("You rolled a " + roll);
  },
};
