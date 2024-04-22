module.exports = {
  name: "do_nogi",
  description: "Bot do nogi",
  integration_types: [1],
  contexts: [0, 1, 2],
  run: async (interaction) => {
    await interaction.reply("User bot do usług szefie");
  },
};
