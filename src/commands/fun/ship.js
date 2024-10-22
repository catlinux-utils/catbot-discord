import { SlashCommandBuilder } from "discord.js";
import canvafy from "canvafy";

export default {
  data: new SlashCommandBuilder()
    .setName("ship")
    .setDescription("Shows the probability of two users being lovers!")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The 1st user you want to ship!")
        .setRequired(true)
    )
    .addUserOption((option) =>
      option
        .setName("member")
        .setDescription("The 2nd user you want to ship!")
        .setRequired(true)
    )
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  run: async (interaction) => {
    await interaction.deferReply();
    const user = interaction.options.getUser("user");
    const member = interaction.options.getUser("member");
    const userAvatar = user.displayAvatarURL({
      forceStatic: true,
      size: 1024,
      extension: "png",
    });
    const memberAvatar = member.displayAvatarURL({
      forceStatic: true,
      size: 1024,
      extension: "png",
    });

    const ship = await new canvafy.Ship()
      .setAvatars(userAvatar, memberAvatar)
      .setBorder("#f0f0f0")
      .setBackground(
        "image",
        "https://img.freepik.com/premium-vector/heart-cartoon-character-seamless-pattern-pink-background-pixel-style_618978-1727.jpg"
      )
      .setOverlayOpacity(0.5)
      .build();

    await interaction.editReply({
      content: `Probability of <@${user.id}> & <@${member.id}> being lovers!`,
      files: [{ attachment: ship, name: `ship.png` }],
    });
  },
};
