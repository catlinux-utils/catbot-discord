import { ContextMenuCommandBuilder, ApplicationCommandType } from "discord.js";
import { createGif } from "../../utils/PetPetUtils.js";

export default {
  data: new ContextMenuCommandBuilder()
    .setName("PetPet")
    .setIntegrationTypes([0, 1])
    .setContexts([0])
    .setType(ApplicationCommandType.User),
  run: async (interaction, client) => {
    await interaction.deferReply();
    const user = interaction.targetUser;
    const avatar = await user.avatarURL({ extension: "png", size: 1024 });

    const gif = await createGif(avatar, "20");

    await interaction.editReply({
      files: [
        {
          name: "petpet.gif",
          attachment: gif,
        },
      ],
    });
  },
};
