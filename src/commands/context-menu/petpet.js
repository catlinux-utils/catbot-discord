import { ContextMenuCommandBuilder, ApplicationCommandType } from "discord.js";
import PetPetUtils from "../../utils/PetPetUtils.js";

export default {
  data: new ContextMenuCommandBuilder()
    .setName("PetPet")
    .setIntegrationTypes([0, 1])
    .setContexts([0])
    .setType(ApplicationCommandType.User),
  run: async (interaction) => {
    await interaction.deferReply();
    const user = interaction.targetUser;
    const avatar = user.avatarURL("gif", 2048);

    const gif = await PetPetUtils.createGif(avatar, "20");

    await interaction.editReply({
      files: [
        {
          name: "petpet.gif",
          contents: gif,
        },
      ],
    });
  },
};
