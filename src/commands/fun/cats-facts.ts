import {
  EmbedBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import axios from "axios";
export default {
  data: new SlashCommandBuilder()
    .setName("cats-facts")
    .setDescription("Cats facts.")
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  run: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    const response = await axios.get("https://catfact.ninja/fact");
    const responseData = response.data.fact;
    const memeEmbed = new EmbedBuilder()
      .setDescription(`${responseData}`)
      .setFooter({ text: `From catfact.ninja` })
      .setColor("Random");
    await interaction.editReply({ embeds: [memeEmbed] });
  },
};
