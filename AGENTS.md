# AGENTS.md — catbot-discord

Instrukcje dla agentów AI (i nowych kontrybutorów) pracujących nad projektem **catbot-discord** — botem Discord napisanym w TypeScript z użyciem `discord.js` v14.

## 1. Przegląd projektu

- **Typ:** bot Discorda (Node.js + TypeScript, ESM).
- **Biblioteka Discord:** `discord.js` v14 (slash commands, voice, context menus).
- **Wejście:** `src/index.ts` — tworzy klienta, ładuje handlery z `src/functions/`, loguje się tokenem z `process.env.token`.
- **Główne zależności:** `@discordjs/voice`, `groq-sdk`, `openai`, `ollama`, `@sefinek/google-tts-api`, `lowdb`, `skia-canvas`, `gifenc`, `opusscript`, `prism-media`, `sodium-native`.
- **Deployment:** kontener Docker — `docker compose up -d --build` (zob. `README.md`).
- **Licencja:** ISC (`package.json`) / GPLv3 wg `README.md` — nie dodawaj zależności ani zasobów niezgodnych z licencją.

## 2. Struktura katalogów

```
src/
  index.ts                  # entrypoint
  types.d.ts                # rozszerzenie typów discord.js Client + BotCommand
  commands/
    <kategoria>/            # fun, info, music, owner, context-menu, ...
      <komenda>.ts          # domyślny export obiektu BotCommand
  events/                   # zdarzenia discord.js (interactionCreate, ready, tts-ai)
  functions/                # handlery ładowane dynamicznie z src/index.ts
    handelCommands.ts       # rejestracja komend + rejestracja w Discordzie
    handelEvents.ts         # rejestracja eventów
  json/                     # statyczne zbiory danych (np. cytaty Korwin)
  resources/                # pliki audio/obrazów (mp3, gif-y itp.)
  utils/
    logging.ts              # logger (chalk)
    PetPetUtils.ts
    music-utils/            # music-system, yt-dlp-info, music-url-scrape
    skynet.ts               # helper dla komendy /skynet (OpenRouter)
    manifesto.ts            # helper dla komendy /manifesto (OpenRouter)
test.ts                     # odręczny plik testowy — NIE traktować jako test suite
```

Pliki `.bak` w `src/commands/` (`ai_ollama.js.bak`, `youtube_search.ts.bak`) to archiwa — **nie edytować**, nie brać z nich wzorca dla nowego kodu.

Helpery komend AI (OpenRouter / Groq) lądują w `src/utils/<nazwa>.ts` (bez sufiksu `Util` — nazwa pliku = nazwa helpera, np. `runManifesto` → `manifesto.ts`). Komenda leży w `src/commands/<kategoria>/<nazwa>.ts` o tej samej nazwie bazowej.

## 3. Konwencje kodu

### Język i moduły

- TypeScript ścisły (ESM), `"type": "module"`, `"module": "nodenext"`, `rewriteRelativeImportExtensions`, `verbatimModuleSyntax`, `erasableSyntaxOnly`.
- Importy relatywne **muszą** mieć rozszerzenie (np. `import logger from "./utils/logging.ts"`). `tsconfig` tego wymusza przez `rewriteRelativeImportExtensions`.
- Importy typów używają `import type { ... }`.
- Nie używaj `require` w `.ts` (ESM); `eslint.config.cjs` to wyjątek konfiguracyjny.

### Styl

- ESLint: `eslint:recommended`, `@typescript-eslint/recommended`, `prettier/recommended`. Reguła `prettier/prettier: error` — formatter **musi** przejść.
- Prettier — domyślna konfiguracja; przed commitem uruchom `npm run format`.
- Unikaj `any`; tam gdzie trzeba, użyj `unknown` + zwężanie typu (patrz wzorzec w `handelCommands.ts`).

### Wzorzec komendy (slash command)

Plik `src/commands/<kategoria>/<nazwa>.ts`:

```ts
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("nazwa")
    .setDescription("...")
    .setIntegrationTypes([0, 1]) // 0 = Guild, 1 = User install
    .setContexts([0, 1, 2]), // 0 = Guild, 1 = Bot DM, 2 = Private channel
  run: async (interaction: ChatInputCommandInteraction) => {
    await interaction.reply("...");
  },
};
```

Zasady:

- **Jeden domyślny export** typu `BotCommand` (zob. `src/types.d.ts`).
- Handler `run` dostaje `(interaction, client)`. Jeśli potrzebujesz klienta (np. `client.logs`, `client.musicsystem`) — dodaj drugi argument.
- Komendy owner-only ustawiają `ownerOnly: true`; sprawdzanie odbywa się w `interactionCreate` (`src/events/interactionCreate.ts`) — nie duplikuj logiki.
- Kategoria = folder nadrzędny (`fun`, `info`, `music`, `owner`, `context-menu`). Loader automatycznie ją wykrywa.

### Zdarzenia (events)

- `src/events/<nazwa>.ts` eksportuje **domyślnie funkcję** `(client) => void`, która rejestruje listenery.
- Nazwy zdarzeń discord.js v14: preferuj `clientReady` zamiast deprecated `ready` (już użyte w `handelCommands.ts`).

### Narzędzia (`utils/`)

- `logger` z `utils/logging.ts` dostępny jako `client.logs` — używaj `client.logs.info|warn|error|success|startup` zamiast `console.*`.
- Moduły w `utils/music-utils/` budują `MusicSystem` przypisywany do `client.musicsystem`. Nie twórz drugiej instancji.

### Styl helperów w `src/utils/`

- Helper w `utils/` musi być **reużywalny** (więcej niż jedno miejsce go woła) albo **wystarczająco złożony** (≥30 linii logiki, własna warstwa parsowania/buforowania). W przeciwnym razie trzymaj go inline w komendzie.
- Helper **nie importuje `discord.js`** — budowanie embeda to odpowiedzialność komendy. Helper zwraca czyste dane (`{ title, body }`, nie `EmbedBuilder`).
- Sekcje w pliku (`// ---` separatory) to sygnał, że plik robi za dużo. W plikach <150 linii trzymaj helpery bez sekcji — alfabetycznie albo po ważności.
- Eksportuj tylko to, co jest używane poza plikiem. Stałe konfiguracyjne (limity, temperatury) trzymaj **prywatne** (bez `export`) dopóki nie ma testów ani drugiego konsumenta.

## 4. Zmienne środowiskowe

Skopiuj `.env.example` do `.env` i uzupełnij:

| Zmienna      | Wymagana | Opis                                              |
| ------------ | -------- | ------------------------------------------------- |
| `token`      | tak      | Token bota Discord (bot token, NIE client secret) |
| `groq`       | nie      | Klucz Groq SDK (AI)                               |
| `openrouter` | nie      | Klucz OpenRouter (AI)                             |

`src/index.ts` czyta `dotenv/config` automatycznie.

## 5. Skrypty npm

| Polecenie            | Co robi                                |
| -------------------- | -------------------------------------- |
| `npm start`          | Uruchamia bota (`node ./src/index.ts`) |
| `npm run lint`       | ESLint nad `src/`                      |
| `npm run lint:fix`   | ESLint z auto-fix                      |
| `npm run format`     | Prettier --write całego repo           |
| `npm run type-check` | `tsc --noEmit`                         |

Przed commitem **zawsze**: `npm run format && npm run lint && npm run type-check`.

### Format commit message

Projekt używa [Conventional Commits](https://www.conventionalcommits.org/). Schemat:

```
<type>(<scope>)?: <krótki opis po polsku lub angielsku>
```

Dozwolone typy:

| Type       | Kiedy                                                                  |
| ---------- | ---------------------------------------------------------------------- |
| `feat`     | nowa komenda, helper, ficzer widoczny dla użytkownika                  |
| `fix`      | poprawka buga (zachowanie, a nie styl)                                 |
| `refactor` | zmiana kodu bez zmiany zachowania (uproszczenie, wydzielenie helpera)  |
| `docs`     | tylko dokumentacja (`AGENTS.md`, `README.md`, komentarze w `.d.ts`)    |
| `style`    | formatowanie, białe znaki, lint-fix bez zmiany logiki                  |
| `chore`    | zależności, konfiguracja, `package.json`, `.env.example`, `.gitignore` |
| `perf`     | optymalizacja wydajności                                               |
| `test`     | dodanie/poprawienie testów (jeśli kiedyś będą)                         |

Przykłady:

- `feat: komenda /manifesto z formatowaniem Discorda`
- `fix(manifesto): parser nie łapał zagnieżdżonych klamer w body`
- `refactor(utils/manifesto): inline'uj splitFirstHeading do buildEmbed`
- `docs: sekcja 'Styl helperów' w AGENTS.md`

Opcjonalne **scope** w nawiasach to kategoria lub nazwa pliku (np. `manifesto`, `skynet`, `interactionCreate`). Dla commitów obejmujących wiele plików — bez scope.

Stopka zawsze kończy się 🐱 (tradycja projektu). Np.: `feat: komenda /parasocial 🐱`.

## 6. Workflow dla agenta — checklist

1. **Przeczytaj kontekst.** Otwórz `src/index.ts`, `src/types.d.ts`, odpowiedni handler w `src/functions/` i istniejącą komendę z tej samej kategorii zanim coś zmienisz.
2. **Sprawdź `.env.example`** jeśli dodajesz nową integrację API — dodaj nową zmienną tam (oraz w `.env.example`, nigdy w `.env`).
3. **Nowa komenda:** utwórz plik w `src/commands/<kategoria>/<nazwa>.ts` wg wzorca z sekcji 3. Nie modyfikuj `handelCommands.ts` — loader jest automatyczny.
4. **Nowy event:** plik w `src/events/<nazwa>.ts` z domyślnym exportem funkcyjnym; rejestracja jest automatyczna.
5. **Type safety:** używaj typów z `discord.js`; jeśli potrzebujesz rozszerzyć `Client`, dodaj deklarację do `src/types.d.ts` (już są tam `logs`, `musicsystem`, `commands`, `commandArray`, `categoriesArray`, `owners`, `config`).
6. **Logi:** przez `client.logs.*`, nie `console.*`.
7. **Błędy:** łap i loguj przez `client.logs.error(err)` lub `.error(err.message, err)`. Nie zostawiaj pustych `catch {}`.
8. **Nie ruszaj:** `node_modules/`, `.env`, pliki `.bak`, `test.ts` (chyba że zadanie dotyczy wprost tego pliku), `Dockerfile`, `docker-compose.yml` (chyba że pytanie o deploy).
9. **Zweryfikuj:** uruchom `npm run type-check` i `npm run lint` nad zmienionymi plikami.
10. **Nie commituj** zmian jeśli nie zostały o to poproszone.

## 7. Częste pułapki

- **Brak rozszerzenia w imporcie** → błąd `tsc`. Zawsze `from "./foo.ts"`.
- `client.on("ready", ...)` w v14 → użyj `clientReady` (deprecated handler w v14).
- `interaction.reply()` drugi raz → użyj `interaction.followUp()` lub `interaction.editReply()`.
- `data` w `BotCommand` jest `unknown`; jeśli to nie `SlashCommandBuilder`, musisz sam zadbać o kształt `toJSON()`-owalny (patrz `handelCommands.ts`).
- Operacje głosowe wymagają `sodium-native` + `opusscript` — te zależności muszą działać w kontenerze (są w `Dockerfile`); nie dodawaj kodu głosowego bez sprawdzenia builda.
- Długie odpowiedzi AI (`groq`, `openai`, `ollama`) — rozważ `interaction.deferReply()`, bo slash commands mają 3 s timeout na pierwszą odpowiedź.

## 8. Dodawanie nowej integracji AI

- Groq: `groq-sdk` — klient wg docs, klucz z `process.env.groq`.
- OpenAI compatible: `openai` z `baseURL` dla OpenRouter (`process.env.openrouter`).
- Ollama: `ollama` (lokalny model, endpoint konfigurowalny w kodzie, nie w `.env`).
- Nie hardcoduj kluczy API. Każdy nowy provider dostaje zmienną w `.env.example`.

## 9. Zasady dla agenta

- **Nie wymyślaj API.** Jeśli nie znasz sygnatury — przeczytaj plik źródłowy lub `node_modules/<pkg>/dist/`.
- **Minimalne zmiany.** Nie refaktoruj „przy okazji" — tylko to, o co prosi użytkownik.
- **Upraszczanie na żądanie to pełnoprawne zadanie.** Gdy użytkownik mówi „uprość", „popraw kod", „wytnij niepotrzebne checki" — to cel sam w sobie. W tym trybie usuwaj dead code, inline'uj helpery jednorazowe, łącz podobne ścieżki fallbacku, ale **nie dodawaj nowych ficzerów** pod pretekstem „przy okazji".
- **Bez pytań retorycznych.** Jeśli czegoś nie wiesz, sprawdź w kodzie lub powiedz wprost, czego brakuje.
- **Komentuj po polsku lub po angielsku** — zgodnie z resztą pliku (większość istniejącego kodu jest po angielsku w nazwach i po polsku/angielsku w komunikatach).
- **Nie dodawaj testów jednostkowych** jeśli nie ma infrastructure (brak `vitest`/`jest` w projekcie); `test.ts` to playground, nie suite.
- **Nie aktualizuj wersji zależności** bez wyraźnej prośby.

---

Powodzenia — i nie zapomnij o 🐱 w commit message.
