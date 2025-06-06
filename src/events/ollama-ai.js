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
      model: "gemma3:4b-it-q8_0",
      messages: [{ role: "user", content: command }],
      stream: true,
    });
    let fullMessage = "";
    let timer = 0;
    for await (const part of response) {
      fullMessage += part.message.content;
      if (fullMessage.length <= 2000) {
        timer += 1;
        if (timer === 15) {
          await msg.edit(fullMessage);
          timer = 0;
        }
      }
      if (part.done) {
        if (fullMessage.length <= 2000) {
          await msg.edit(fullMessage);
        } else {
          await msg.edit("Response is too long. Sending as a file...");
          await message.channel.send({
            files: [
              {
                attachment: Buffer.from(fullMessage),
                name: "response.txt",
              },
            ],
          });
        }
      }
    }
  });
};
