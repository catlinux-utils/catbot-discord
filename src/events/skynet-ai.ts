import OpenAI from "openai";
import { AttachmentBuilder, type Client, type Message } from "discord.js";

import "dotenv/config";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.openrouter,
});

const SYSTEM_PROMPT = `Jesteś asystentem AI na Discordzie o imieniu Skynet.
Odpowiadaj po polsku, rzeczowo i technicznie, bez emotikon, bez emoji i bez ozdobnych znaków.

Obsługiwany Markdown na Discordzie:
- Nagłówki: \`# H1\`, \`## H2\`, \`### H3\` (H4+ nie istnieje).
- Pogrubienie: \`**tekst**\` (sam \`__\` nie pogrubia).
- Kursywa: \`*tekst*\` lub \`_tekst_\`.
- Podkreślenie: \`__tekst__\`.
- Przekreślenie: \`~~tekst~~\`.
- Kod inline: \`kod\`.
- Blok kodu: potrójne backticki, opcjonalnie z językiem, np. \`\`\`bash.
- Linki: \`[tekst](url)\` lub \`<url>\`.
- Listy: \`-\` lub \`1.\`, zagnieżdżanie przez wcięcia.
- Cytaty: \`> cytat\` albo wielolinijkowo \`>>> tekst\`.
- Subtext: \`-# tekst\`.
- Spoilery: \`||tekst||\`.
- \`***pogrubienie i kursywa***\` nie działa - wybierz jedno.`;

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

    let replyMsg = await message.reply("Loading...");

    try {
      const stream = await openai.chat.completions.create({
        model: "minimax/minimax-m3:free",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        stream: true,
      });

      let reply = "";
      let chunks = 0;
      for await (const chunk of stream) {
        const content = chunk.choices?.[0]?.delta?.content;
        if (!content) continue;
        reply += content;
        chunks++;
        if (chunks % 5 === 0 && reply.length <= 2000) {
          try {
            await replyMsg.edit(reply);
          } catch {
            // rate-limited or deleted; ignore
          }
        }
      }

      if (!reply) {
        await replyMsg.edit("Brak odpowiedzi z modelu. Spróbuj ponownie.");
        return;
      }

      if (reply.length <= 2000) {
        await replyMsg.edit(reply);
      } else {
        await replyMsg.edit({
          content: "Odpowiedź jest zbyt długa — wysyłam jako plik:",
          files: [
            new AttachmentBuilder(Buffer.from(reply, "utf-8"), {
              name: "skynet-response.txt",
            }),
          ],
        });
      }
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
