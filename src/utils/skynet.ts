import OpenAI from "openai";
import { AttachmentBuilder } from "discord.js";
import { search, SafeSearchType } from "duck-duck-scrape";

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
- \`***pogrubienie i kursywa***\` nie działa - wybierz jedno.

Narzędzia: jeśli potrzebujesz aktualnych informacji z sieci (wydarzenia, wersje, dokumentacja), wywołaj funkcję \`web_search\` z zapytaniem. Korzystaj z niej oszczędnie, tylko gdy wiedza z treningu może być nieaktualna lub niewystarczająca. Odpowiedź zawsze formułuj własnymi słowami, cytując źródła.`;

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Przeszukuje sieć za pomocą DuckDuckGo i zwraca listę wyników (tytuł, URL, fragment). Używaj do aktualnych informacji, dokumentacji API, nowych wersji, wydarzeń.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Zapytanie wyszukiwarki w języku naturalnym.",
          },
          max_results: {
            type: "number",
            description: "Maksymalna liczba wyników (1-10). Domyślnie 5.",
          },
        },
        required: ["query"],
      },
    },
  },
];

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

async function runWebSearch(
  query: string,
  maxResults: number,
  onError?: (msg: string, err: unknown) => void,
): Promise<string> {
  try {
    const results = await search(query, {
      safeSearch: SafeSearchType.MODERATE,
    });
    const items = (results.results ?? []).slice(0, maxResults);
    if (!items.length) return "Brak wyników wyszukiwania.";
    return items
      .map((r, i) =>
        `[${i + 1}] ${r.title}\n${r.url}\n${r.description ?? ""}`.trim(),
      )
      .join("\n\n");
  } catch (error) {
    onError?.("[skynet] DDG search error:", error);
    return `Błąd wyszukiwania: ${(error as Error).message}`;
  }
}

/**
 * Runs a single Skynet turn: tool-calling loop (up to 3 rounds) followed by
 * a streamed final answer, pushed to the caller via {@link hooks}.
 *
 * The caller is responsible for any "Loading..." placeholder / deferReply
 * lifecycle before invoking this function.
 */
export async function runSkynet(
  prompt: string,
  hooks: RunSkynetHooks,
): Promise<void> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ];

  // Tool-calling loop: up to 3 rounds, non-streaming for tool turns.
  for (let i = 0; i < 3; i++) {
    const turn = await openai.chat.completions.create({
      model: SKYNET_MODEL,
      messages,
      tools: TOOLS,
      tool_choice: "auto",
    });

    const choice = turn.choices[0];
    const toolCalls = choice.message?.tool_calls;

    if (!toolCalls || toolCalls.length === 0) {
      // No more tool calls -> this is the final answer. Stream it.
      messages.push(choice.message!);
      break;
    }

    messages.push(choice.message!);

    for (const call of toolCalls) {
      if (call.type !== "function" || call.function.name !== "web_search") {
        continue;
      }
      let args: { query: string; max_results?: number } = { query: prompt };
      try {
        args = JSON.parse(call.function.arguments);
      } catch {
        // bad JSON, treat whole prompt as query
      }
      const query = args.query?.trim() || prompt;
      const maxResults = Math.min(Math.max(args.max_results ?? 5, 1), 10);
      const result = await runWebSearch(query, maxResults, (msg, err) =>
        hooks.onError ? hooks.onError(err) : console.error(msg, err),
      );
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: result,
      });
    }
  }

  // Stream the final assistant turn.
  const stream = await openai.chat.completions.create({
    model: SKYNET_MODEL,
    messages,
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