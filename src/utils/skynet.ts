import OpenAI from "openai";
import { AttachmentBuilder } from "discord.js";

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

export interface RunSkynetHooks {
  /**
   * Push an updated reply to the user. Called with partial text while the
   * model streams, and once with the final text (or a placeholder + file
   * payload when the response is too long for Discord).
   */
  updateReply: (payload: {
    content: string;
    files?: AttachmentBuilder[];
  }) => Promise<void> | void;
  /**
   * Optional error sink. If omitted, errors are re-thrown so the caller's
   * try/catch handles them.
   */
  onError?: (err: unknown) => void;
}

export const SKYNET_MODEL = "minimax/minimax-m3:free";

/**
 * Runs a single Skynet turn: streams a reply from the model and pushes
 * partial updates to the caller via {@link hooks}.
 *
 * The caller is responsible for any "Loading..." placeholder / deferReply
 * lifecycle before invoking this function.
 */
export async function runSkynet(
  prompt: string,
  hooks: RunSkynetHooks,
): Promise<void> {
  const stream = await openai.chat.completions.create({
    model: SKYNET_MODEL,
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
        await hooks.updateReply({ content: reply });
      } catch {
        // rate-limited or deleted; ignore
      }
    }
  }

  if (!reply) {
    await hooks.updateReply({
      content: "Brak odpowiedzi z modelu. Spróbuj ponownie.",
    });
    return;
  }

  if (reply.length <= 2000) {
    await hooks.updateReply({ content: reply });
  } else {
    await hooks.updateReply({
      content: "Odpowiedź jest zbyt dluga - wysylam jako plik:",
      files: [
        new AttachmentBuilder(Buffer.from(reply, "utf-8"), {
          name: "skynet-response.txt",
        }),
      ],
    });
  }
}