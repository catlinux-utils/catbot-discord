import { type Client, type Message } from "discord.js";
import { runSkynet } from "../utils/skynet.ts";

export default function skynet(client: Client) {
  client.on("messageCreate", async (message: Message) => {
    if (message.author.bot) return;
    if (!client.user) return;
    if (!message.mentions.users.has(client.user.id)) return;
    if (!client.owners?.includes(message.author.id)) return;

    const prompt = message.content
      .replace(new RegExp(`<@!?${client.user.id}>`, "g"), "")
      .trim();
    if (!prompt) return;

    const replyMsg = await message.reply("Loading...");

    try {
      await runSkynet(prompt, {
        updateReply: async (payload) => {
          try {
            await replyMsg.edit(payload);
          } catch {
            // rate-limited or deleted; ignore
          }
        },
        onError: (err) => client.logs.error("[skynet-ai] error:", err),
      });
    } catch (error) {
      client.logs.error("[skynet-ai] OpenRouter error:", error);
      try {
        await replyMsg.edit("Wystąpił błąd podczas komunikacji ze Skynetem.");
      } catch {
        // ignore
      }
    }
  });
}
