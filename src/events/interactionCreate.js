import "dotenv/config";

export default (client) => {
  client.on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      if (command.ownerOnly) {
        if (!client.owners.includes(interaction.user.id)) {
          return interaction.reply({
            content: "You are not allowed to use this command",
            ephemeral: true,
          });
        }
      }

      try {
        await command.run(interaction, client);
      } catch (error) {
        console.log(error);
        await interaction.reply({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      }
    }
    if (interaction.isContextMenuCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      if (command.ownerOnly) {
        if (!client.owners.includes(interaction.user.id)) {
          return interaction.editReply({
            content: "You are not allowed to use this command",
            ephemeral: true,
          });
        }
      }
      try {
        await command.run(interaction, client).catch((error) => {
          console.log(error);
        });
      } catch (error) {
        console.log(error);
        await interaction.editReply({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      }
    }
  });
};
