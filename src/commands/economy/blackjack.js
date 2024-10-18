import {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from "discord.js";

const cards = [
  { value: 2, name: "2" },
  { value: 3, name: "3" },
  { value: 4, name: "4" },
  { value: 5, name: "5" },
  { value: 6, name: "6" },
  { value: 7, name: "7" },
  { value: 8, name: "8" },
  { value: 9, name: "9" },
  { value: 10, name: "10" },
  { value: 10, name: "J" },
  { value: 10, name: "Q" },
  { value: 10, name: "K" },
  { value: 11, name: "A" },
];
const suits = ["♣", "♦", "♠", "♥"];

export default {
  data: new SlashCommandBuilder()
    .setName("blackjack")
    .setDescription("Play blackjack")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2])
    .addNumberOption((option) =>
      option
        .setName("cash")
        .setDescription("How much cash to bet")
        .setRequired(true)
    ),
  ownerOnly: true,
  run: async (interaction, client) => {
    const amount = interaction.options.getNumber("cash");

    const balance = client.database.data.economy.balance.find(
      (entry) => entry.id === interaction.user.id
    ).balance;
    if (balance < amount) {
      await interaction.reply("You don't have that much cash");
      return;
    }

    let player = {
      cards: [],
      total: 0,
    };
    let dealer = {
      cards: [],
      total: 0,
    };
    let usedCards = [];

    function getCard() {
      const randomcard = cards[Math.floor(Math.random() * cards.length)];
      const randomsuit = suits[Math.floor(Math.random() * suits.length)];
      const card = [randomcard, randomsuit];
      if (usedCards.includes(card)) {
        getCard();
      } else {
        usedCards.push(card);
        return card;
      }
    }

    const hitButton = new ButtonBuilder()
      .setCustomId("hit")
      .setLabel("Hit")
      .setStyle(ButtonStyle.Primary);

    const standButton = new ButtonBuilder()
      .setCustomId("stand")
      .setLabel("Stand")
      .setDisabled(true)
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(hitButton, standButton);

    const embed = new EmbedBuilder()
      .setTitle(`Blackjack`)
      .setColor("Random")
      .setDescription("Bet to start")
      .addFields(
        {
          name: "Your cards",
          value: `${player.cards ? player.cards : "No cards"}, total: ${
            player.total
          }`,
        },
        { name: "Dealer cards", value: "Not known" }
      );
    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
