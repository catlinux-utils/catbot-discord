import { SlashCommandBuilder } from "discord.js";
export default {
  data: new SlashCommandBuilder()
    .setName("changebal")
    .setDescription("Change balance")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2])
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User to change balance")
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName("amount")
        .setDescription("Amount to change balance")
        .setRequired(true)
    ),
  ownerOnly: true,
  run: async (interaction, client) => {
    const user = interaction.options.getUser("user");
    const amount = interaction.options.getNumber("amount");

    const balance = client.database.data.economy.balance;
    const existingEntry = balance.find((entry) => entry.id === user.id);

    if (!existingEntry) {
      balance.push({ id: user.id, balance: amount });
      await client.database.write();
    } else {
      existingEntry.balance = amount;
      await client.database.write();
    }

    await interaction.reply(`Changed balance of ${user} to ${amount}`);
  },
};
