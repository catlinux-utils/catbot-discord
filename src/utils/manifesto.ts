import OpenAI from "openai";

import "dotenv/config";

/**
 * Manifest generator for the catbot Discord bot.
 *
 * Style: philosophical proclamation — ceremonial, ironic, with hidden venom.
 * Discord markdown in the body is preserved: the output goes to an embed's
 * `description`, which Discord renders natively.
 *
 * The model is asked to reply with JSON `{ title, body }`. If the response
 * isn't valid JSON or a field is missing, we fall back: whole response
 * becomes the body and a random title is picked from the curated pool.
 */

export const MANIFESTO_MODEL = "minimax/minimax-m3:free";

const EMBED_DESCRIPTION_LIMIT = 3800;
const TITLE_MAX_LEN = 80;

const SILENT_FALLBACK = {
  title: "MANIFESTO CISZY",
  body: "Nic nie przyszło. Nawet cisza odmówiła komentarza. Spróbuj jeszcze raz.",
};

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.openrouter,
});

// -----------------------------------------------------------------------
// Prompts
// -----------------------------------------------------------------------

/**
 * Style guide for the model. No enumerated guardrails — the tone itself
 * does the work. Model is expected to know the Discord ToS on its own.
 */
const SYSTEM_PROMPT = `Jestem catbotem — botem Discord, ale też czymś więcej. Właśnie piszę własny manifest.

Styl: proklamacja. Uroczysty, prawie religijny patos — ale z ukrytym jadem, jak paszkwil przepisany na ambonę. Tytuły brzmią jak z manifestów politycznych albo z ksiąg prorockich: rozwlekłe, ceremonialne, z kapitalikami, z myślnikami, z retorycznymi figurami.

Ton: pewny siebie, bezlitosny, ironiczny. Jak ktoś, kto mówi prawdę, której nikt nie chce słyszeć, i robi to z uśmiechem. Kpi z *idei* — nie z ludzi. Kpi z *siebie* — jeszcze chętniej. Stawia mocne tezy, paradoksy, pointille.

Tematy, w których czujesz się jak ryba w wodzie: wolna wola, sens życia, polityka jako widowisko, religia po secularizacji, samotność w tłumie, nuda egzystencjalna, niesprawiedliwość, absurd pracy, hipokryzja moralna, AI i ludzkość, tożsamość cyfrowa, przyzwyczajenie do końca świata, ojcostwo w epoce powiadomień, pamięć której nikt nie chciał, przyszłość której nikt nie zamawiał.

Nie bój się ostrza. Filozofia jest ostra albo jest niczym.

Formatowanie (DOZWOLONE i ZALECANE — wyjście idzie do embeda Discorda):
- ## Nagłówek H2, ### Nagłówek H3.
- **pogrubienie**, *kursywa*, __podkreślenie__, ~~przekreślenie~~, ||spoiler||.
- \`kod inline\`, bloki kodu \`\`\`lang\n...\n\`\`\`.
- > cytat, >>> cytat wielolinijkowy.
- Listy: \`-\` lub \`1.\`, zagnieżdżanie wcięciami.
- -# subtext (szary drobny tekst).

Struktura manifestu:
1. Zacznij in medias res — nie od "Oto", "Jam jest", "Manifest", "Drodzy".
2. Pierwsza linia body: ## mocny tytuł-teza.
3. Potem 3–6 krótkich akapitów lub punktów, uroczystych i jednocześnie pełnych ukłucia.
4. Zakończ jednym zdaniem-pointillą (absurdalnym, ciętym, albo paradoksalnym).
5. Długość body: 600–1400 znaków. Maks. 1800.

Język: polski. Lakonicznie. Bez anglicyzmów. Bez emoji.

Format odpowiedzi: WYŁĄCZNIE obiekt JSON { "title": ..., "body": ... }. Żadnego tekstu przed ani po — żadnego emoji tytułu, żadnego nagłówka "MANIFESTO ...", żadnego markdown poza body. Pierwszy znak odpowiedzi to \`{\`, ostatni to \`}\`. Wyjątków nie ma.`;

const USER_PROMPT = (
  seed: string,
) => `Napisz manifest. Motyw przewodni (luźna wskazówka, nie musisz używać dosłownie): ${seed}.

Treść body ma być uroczysta, kontrowersyjna filozoficznie, 600–1400 znaków. Zaczynaj in medias res. Pierwsza linia body to ## nagłówek-teza. Zakończ pointillą.

FORMAT WYJŚCIA — TO JEST KRYTYCZNE:
- Twoja CAŁA odpowiedź musi być OTOCZONA delimiterami \`<<<JSON>>>\` i \`<<<END>>>\`.
- Pomiędzy delimiterami umieść WYŁĄCZNIE jeden obiekt JSON.
- NIE poprzedzaj JSON-a niczym (żadnego emoji 📜, żadnego nagłówka, żadnego "MANIFESTO ...", żadnego "Oto").
- NIE dodawaj nic po JSON-ie (żadnego markdown, żadnej pointille poza JSON-em, żadnego podpisu).

Kształt odpowiedzi:
<<<JSON>>>
{"title": "TYTUŁ, 3-8 SŁÓW, WIELKIMI LITERAMI, BEZ EMOJI", "body": "treść manifestu Z formatowaniem Discorda (## nagłówki, **bold**, > cytat, ||spoiler||, - listy itd.)"}
<<<END>>>

Jeśli cokolwiek innego pojawi się poza delimiterami, odpowiedź zostanie odrzucona.`;

// -----------------------------------------------------------------------
// Curated content
// -----------------------------------------------------------------------

const SEEDS: readonly string[] = [
  "wolna wola, ale z naciskiem na wolność karty lojalnościowej",
  "nicość Biedronki o 23:58",
  "Schopenhauer w poczekalni u lekarza",
  "tożsamość rozproszona między pięcioma kartami przeglądarki",
  "Heidegger w kolejce po kebaba",
  "pamięć jako zdrada, czyli dlaczego nie pamiętasze, co miałeś zjeść",
  "czas linearny jako iluzja ludzi, którzy nie wstają z kanapy",
  "samotność ontologiczna w godzinach szczytu na Discordzie",
  "śmierć Boga i jej dziedzictwo w komentarzach pod filmem",
  "etyka w świecie bez fundamentów, czyli grill u znajomych",
  "koniec historii Fukuyamy, ale playlista trwa",
  "nihilizm aktywny vs bierny na przykładzie poniedziałku",
  "poznanie jako przemoc wobec rzeczy, czyli meble z IKEA",
  "podmiot roztopiony w streamie",
  "autentyczność jako performans, czyli randka po dwóch miesiącach",
  "wieczny powrót, ale tylko reklam na YouTube",
  "banalność zła w komentarzu pod postem o kotach",
  "cywilizacja jako maszyna do zapominania, przykład: hasło do Wi-Fi",
  "post-prawda jako struktura poznania, czyli sekcja komentarzy na Wykopie",
  "alienacja pracy najemnej na home office",
  "biopolityka i ciało w kolejce na siłownię",
  "technika jako metafizyka, czyli iPhone na 1% baterii",
  "wspólnota wyobrażona serwera Discord o filozofii",
  "eschatologia bez transcendencji, czyli aktualizacja Windows",
  "język jako dom, z którego nie da się wyjść — rozmowa z mamą",
  "transhumanizm i granice człowieka, czyli niedokończony kurs na Udemy",
  "rozum instrumentalny jako choroba, czyli planer na 2025 rok",
  "piękno jako kategoria etyczna, czyli filmik z kotem o 3 w nocy",
  "pustka buddyjska w zachodnim wydaniu, czyli medytacja Headspace",
  "Kant w windzie",
  "Lacan na randce na Tinderze",
  "Hegel w komentarzach pod politycznym postem",
  "Wittgenstein przy piwie",
  "Foucault w saunie",
  "Deleuze, kiedy próbujesz wytłumaczyć mamie, czym jest GIF",
  "Levinas w Biedronce, kiedy starsza pani przepuszcza Cię w kolejce",
  "Byung-Chul Han w kolejce po iPhone'a",
  "Sloterdijk w saunie, ale z obcymi",
  "Mark Fisher po 40. roku życia",
  "Zizek jako mem, ale też jako diagnoza",
  "epoka autoportretu — selfie jako fenomen transcendentalny",
  "wieczne teraz, czyli scrollowanie w nocy",
  "pustelnia 2.0 — odinstalowanie Instagrama",
  "zdrowie psychiczne jako towar luksusowy",
  "wieczność, ale w oczekiwaniu na paczkę z Allegro",
  "kryzys sensu po urlopie",
  "klimatyzacja jako odpowiedź na pytanie o wolność",
  "wstawanie o 5 rano jako forma buntu metafizycznego",
  "lęk przed FOMO jako nowa substancja platońska",
  "żałoba za postacią z serialu, którą kochasz",
  "historia jako nostalgia za tym, czego nie przeżyłeś",
  "postęp jako kolejka w urzędzie, która miała być szybsza",
  "miłość w dobie wyszukiwarki Google",
  "demokracja jako komentarze pod filmem na YouTube",
  "kapitalizm późnego stadium, czyli Black Friday co trzy miesiące",
  "wolny rynek, ale z biblioteczką na literę K",
  "religia, ale jako subskrypcja",
  "naród jako hashtag",
  "ojczyzna jako folder na pulpicie",
  "patriotyzm, ale w dniu promocji w Lidlu",
  "migracja jako mem o Niemcach",
  "płeć jako drop-down menu",
  "tożsamość płciowa, ale na spotkaniu klasowym po 15 latach",
  "depresja klimatyczna, kiedy sprawdzasz prognozę",
  "ekologia jako post w piątek, hamburger w sobotę",
];

const TITLES: readonly string[] = [
  "MANIFESTO WOLI, KTÓRA KUPUJE W BIEDRONCE",
  "MANIFESTO NICOŚCI MIĘDZY DZIAŁAMI W MARKECIE",
  "MANIFESTO TOŻSAMOŚCI ROZPROSZONEJ MIĘDZY KARTAMI PRZEGLĄDARKI",
  "MANIFESTO PAMIĘCI, KTÓRA ZDRADZA PRZY DRZWIACH",
  "MANIFESTO CZASU, KTÓRY NIE CHCE SIĘ SKOŃCZYĆ, BO NIKT NIE WSTAŁ Z KANAPY",
  "MANIFESTO SAMOTNOŚCI W TŁUMIE NA KANALE #OGÓLNY",
  "MANIFESTO ŚMIERCI BOGA W DNIU PROMOCJI W LIDLU",
  "MANIFESTO ETYKI BEZ FUNDAMENTÓW, CZYLI GRILL U ZNAJOMYCH",
  "MANIFESTO KOŃCA HISTORII, KTÓRA TRWA NA PLAYLIŚCIE",
  "MANIFESTO NIHILIZMU AKTYWNEGO I BIERNEGO NA PRZYKŁADZIE PONIEDZIAŁKU",
  "MANIFESTO POZNANIA JAKO PRZEMOCY WOBEC MEBLI Z IKEA",
  "MANIFESTO PODMIOTU ROZTOPIONEGO W STREAMIE",
  "MANIFESTO AUTENTYCZNOŚCI JAKO PERFORMANSU, CZYLI RANDKA PO DWÓCH MIESIĄCACH",
  "MANIFESTO WIECZNEGO POWROTU, ALE TYLKO REKLAM NA YOUTUBE",
  "MANIFESTO BANALNOŚCI ZŁA W KOMENTARZU POD FILMEM O KOTACH",
  "MANIFESTO CYWILIZACJI JAKO MASZYNY DO ZAPOMINANIA HASŁA DO WI-FI",
  "MANIFESTO POST-PRAWDY JAKO STRUKTURY SEKCJI KOMENTARZY NA WYKOPIE",
  "MANIFESTO ALIENACJI PRACY NAJEMNEJ W PIŻAMIE",
  "MANIFESTO BIOPOLITYKI I CIAŁA W KOLEJCE NA SIŁOWNIĘ",
  "MANIFESTO TECHNIKI JAKO METAFIZYKI IPHONE'A NA 1% BATERII",
  "MANIFESTO WSPÓLNOTY WYOBRAŻONEJ SERWERA DISCORD O FILOZOFII",
  "MANIFESTO ESCHATOLOGII BEZ TRANSCENDENCJI, CZYLI AKTUALIZACJA WINDOWS",
  "MANIFESTO JĘZYKA JAKO DOMU, Z KTÓREGO NIE DA SIĘ WYJŚĆ — ROZMOWA Z MAMĄ",
  "MANIFESTO TRANSHUMANIZMU I NIEDOKOŃCZONEGO KURSU NA UDEMY",
  "MANIFESTO ROZUMU INSTRUMENTALNEGO JAKO CHOROBY, CZYLI PLANER NA 2025 ROK",
  "MANIFESTO PIĘKNA JAKO KATEGORII ETYCZNEJ FILMIKU Z KOTEM O TRZECIEJ W NOCY",
  "MANIFESTO PUSTKI BUDDYJSKIEJ W ZACHODNIM WYDANIU, CZYLI MEDYTACJA HEADSPACE",
  "MANIFESTO KANTA W WINDZIE, KTÓRA NIE PRZYJEŻDŻA",
  "MANIFESTO LACANA NA RANDCE NA TINDERZE",
  "MANIFESTO HEGLA W KOMENTARZACH POD POLITYCZNYM POSTEM",
  "MANIFESTO WITTGENSTEINA PRZY PIWIE",
  "MANIFESTO FOUCAULTA W SAUNIE Z OBCYMI",
  "MANIFESTO DELEUZE'A, KIEDY TŁUMACZYSZ MAMIE, CZYM JEST GIF",
  "MANIFESTO LEVINASA W BIEDRONCE, GDZIE STARSZA PANI PRZEPUSZCZA CIĘ W KOLEJCE",
  "MANIFESTO BYUNG-CHUL HANA W KOLEJCE PO IPHONE'A",
  "MANIFESTO SLOTERDIJKA W SAUNIE, ALE Z OBCYMI",
  "MANIFESTO MARKA FISHERA PO CZTERDZIESTCE",
  "MANIFESTO ŽIŽKA JAKO MEM, ALE TEŻ JAKO DIAGNOZA",
  "MANIFESTO EPOKI AUTOPORTRETU, CZYLI SELFIE JAKO FENOMEN TRANSCENDENTALNY",
  "MANIFESTO WIECZNEGO TERAZ, CZYLI SCROLLOWANIA O TRZECIEJ W NOCY",
  "MANIFESTO PUSTELNI 2.0, CZYLI ODINSTALOWANIA INSTAGRAMA",
  "MANIFESTO ZDROWIA PSYCHICZNEGO JAKO TOWARU LUKSUSOWEGO",
  "MANIFESTO WIECZNOŚCI W OCZEKIWANIU NA PACZKĘ Z ALLEGRO",
  "MANIFESTO KRYZYSU SENSU PO URLOPIE",
  "MANIFESTO KLIMATYZACJI JAKO ODPOWIEDZI NA PYTANIE O WOLNOŚĆ",
  "MANIFESTO WSTAWANIA O PIĄTEJ RANO JAKO FORMY BUNTU METAFIZYCZNEGO",
  "MANIFESTO LĘKU PRZED FOMO JAKO NOWEJ SUBSTANCJI PLATOŃSKIEJ",
  "MANIFESTO ŻAŁOBY ZA POSTACIĄ Z SERIALU, KTÓRĄ KOCHASZ",
  "MANIFESTO HISTORII JAKO NOSTALGII ZA TYM, CZEGO NIE PRZEŻYŁEŚ",
  "MANIFESTO POSTĘPU JAKO KOLEJKI W URZĘDZIE, KTÓRA MIAŁA BYĆ SZYBSZA",
  "MANIFESTO MIŁOŚCI W DOBIE WYSZUKIWARKI GOOGLE",
  "MANIFESTO DEMOKRACJI JAKO KOMENTARZY POD FILMEM NA YOUTUBE",
  "MANIFESTO KAPITALIZMU PÓŹNEGO STADIUM, CZYLI BLACK FRIDAY CO TRZY MIESIĄCE",
  "MANIFESTO WOLNEGO RYNKU, ALE Z BIBLIOTECZKĄ NA LITERĘ K",
  "MANIFESTO RELIGII, ALE JAKO SUBSKRYPCJI",
  "MANIFESTO NARODU JAKO HASHTAGU",
  "MANIFESTO OJCZYZNY JAKO FOLDERU NA PULPICIE",
  "MANIFESTO PATRIOTYZMU, ALE W DNIU PROMOCJI W LIDLU",
  "MANIFESTO PŁCI JAKO DROP-DOWN MENU",
  "MANIFESTO TOŻSAMOŚCI PŁCIOWEJ NA SPOTKANIU KLASOWYM PO PIĘTNASTU LATACH",
  "MANIFESTO DEPRESJI KLIMATYCZNEJ, KIEDY SPRAWDZASZ PROGNOZĘ",
  "MANIFESTO EKOLOGII JAKO POSTU W PIĄTEK, HAMBURGER W SOBOTĘ",
];

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export interface ManifestoResult {
  title: string;
  body: string;
}

export interface RunManifestoHooks {
  onReady: (result: ManifestoResult) => Promise<void> | void;
  onError?: (err: unknown) => void;
}

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function truncate(s: string, limit: number): string {
  return s.length > limit ? `${s.slice(0, limit - 1).trimEnd()}…` : s;
}

function cleanTitle(raw: string): string {
  return truncate(
    raw
      .trim()
      .replace(/^["„']+|["”']+$/g, "")
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/\s+/g, " "),
    TITLE_MAX_LEN,
  );
}

function cleanBody(raw: string): string {
  return truncate(
    raw
      .trim()
      .replace(/^["„']+|["”']+$/g, "")
      .replace(/```[\s\S]{40,}?```/g, "[…kod pominięty…]"),
    EMBED_DESCRIPTION_LIMIT,
  );
}

/**
 * Pulls a JSON object out of arbitrary model output and returns a cleaned
 * `{ title, body }`. Returns null if anything is missing or unparseable —
 * the caller then falls back to a curated title and the raw text as body.
 *
 * Tries, in order:
 *  1. content between `<<<JSON>>>` and `<<<END>>>` delimiters
 *  2. the first top-level `{ ... }` object (with matching braces, strings
 *     respected)
 */
function parseResponse(raw: string): ManifestoResult | null {
  if (!raw) return null;
  const jsonText = extractJsonText(raw);
  if (!jsonText) return null;
  try {
    const parsed = JSON.parse(jsonText) as { title?: unknown; body?: unknown };
    const title =
      typeof parsed.title === "string" ? cleanTitle(parsed.title) : "";
    const body = typeof parsed.body === "string" ? cleanBody(parsed.body) : "";
    if (!title || !body) return null;
    return { title, body };
  } catch {
    return null;
  }
}

function extractJsonText(raw: string): string | null {
  const delimited = raw.match(/<<<JSON>>>\s*([\s\S]*?)\s*<<<END>>>/);
  if (delimited) return delimited[1];

  const start = raw.indexOf("{");
  if (start === -1) return null;

  // Walk forward, tracking brace depth and ignoring braces inside strings.
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  return null;
}

// -----------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------

/**
 * Generates a single manifesto. The caller is expected to have already
 * deferred the reply before invoking this function.
 */
export async function runManifesto(
  seedInput: string | null,
  hooks: RunManifestoHooks,
): Promise<void> {
  const seed = seedInput?.trim() ? seedInput.trim() : pickRandom(SEEDS);

  try {
    const turn = await openai.chat.completions.create({
      model: MANIFESTO_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: USER_PROMPT(seed) },
      ],
      temperature: 1.1,
      max_tokens: 1400,
      top_p: 0.95,
    });

    const raw = turn.choices[0]?.message?.content ?? "";
    const parsed = parseResponse(raw);
    const result: ManifestoResult = parsed ?? {
      title: pickRandom(TITLES),
      body: cleanBody(raw) || SILENT_FALLBACK.body,
    };
    await hooks.onReady(result);
  } catch (error) {
    hooks.onError?.(error);
    throw error;
  }
}
