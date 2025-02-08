import ollama from "ollama";

export default (client) => {
  if (!client.config.ollama_ai) return;
  client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.content.startsWith("?ai ")) return;

    if (!client.owners.includes(message.member.id)) {
      return;
    }

    const command = message.content.slice(4).trim();
    const msg = await message.reply("Loading...");
    const response = await ollama.chat({
      model: "catbot",
      messages: [{ role: "user", content: command }],
      stream: true,
    });
    let fullMessage = "";
    let timer = 0;
    for await (const part of response) {
      fullMessage += part.message.content;
      timer += 1;
      if (timer === 5) {
        await msg.edit(fullMessage);
        timer = 0;
      }
    }
  });
};
