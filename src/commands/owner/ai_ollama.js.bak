import { SlashCommandBuilder } from "discord.js";
import ollama from "ollama";

export default {
  data: new SlashCommandBuilder()
    .setName("ai_ollama")
    .setDescription("Ollama AI")
    .addStringOption((option) =>
      option
        .setName("model")
        .setDescription("Choose an Ollama model")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName("input")
        .setDescription("Your input for the AI")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("ephemeral")
        .setDescription("Whether or not the echo should be ephemeral")
        .setRequired(false)
    )
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  ownerOnly: true,
  run: async (interaction) => {
    const model = interaction.options.getString("model");
    const input = interaction.options.getString("input");
    const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;

    const msg = await interaction.reply({
      content: "Loading...",
      flags: ephemeral ? ["Ephemeral"] : [],
    });
    const response = await ollama.chat({
      model: model,
      messages: [{ role: "user", content: input }],
      stream: true,
    });
    let fullMessage = "";
    let timer = 0;
    for await (const part of response) {
      fullMessage += part.message.content;
      if (fullMessage.length <= 2000) {
        timer += 1;
        if (timer === 15) {
          await msg.edit({
            content: fullMessage,
            flags: ephemeral ? ["Ephemeral"] : [],
          });
          timer = 0;
        }
      }
      if (part.done) {
        if (fullMessage.length <= 2000) {
          await msg.edit({
            content: fullMessage,
            flags: ephemeral ? ["Ephemeral"] : [],
          });
        } else {
          await msg.edit({
            content: "Response is too long. Sending as a file...",
            flags: ephemeral ? ["Ephemeral"] : [],
          });
          await msg.edit({
            files: [
              {
                attachment: Buffer.from(fullMessage),
                name: "response.txt",
              },
            ],
            flags: ephemeral ? ["Ephemeral"] : [],
          });
        }
      }
    }
  },
  autocomplete: async (interaction) => {
    const focusedValue = interaction.options.getFocused();
    const choices = await ollama
      .list()
      .then((data) => data.models.map((model) => model.name));
    const filtered = choices.filter((choice) =>
      choice.startsWith(focusedValue)
    );

    await interaction.respond(
      filtered.map((choice) => ({ name: choice, value: choice }))
    );
  },
};
