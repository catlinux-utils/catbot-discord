import type {
  Collection,
  Client as DiscordClient,
  CommandInteraction,
  AutocompleteInteraction,
  ContextMenuCommandInteraction,
  Interaction,
} from "discord.js";
import type MusicSystem from "./utils/music-utils/music-system.ts";
import type { ApplicationCommandDataResolvable } from "discord.js";

// Define logger interface for type safety
export interface Loggers {
  success: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  startup: (message: string, ...args: unknown[]) => void;
}

export type InteractionLike =
  | CommandInteraction
  | ContextMenuCommandInteraction
  | AutocompleteInteraction
  | Interaction;

export interface BotCommand {
  data: unknown;
  run: (
    interaction: InteractionLike,
    client: DiscordClient,
  ) => Promise<void> | void;
  autocomplete?: (
    interaction: AutocompleteInteraction,
    client: DiscordClient,
  ) => Promise<void> | void;
  ownerOnly?: boolean;
  category?: string;
}

declare module "discord.js" {
  interface Client {
    logs: Loggers;
    musicsystem: MusicSystem;
    config: Record<string, unknown>;
    commands: Collection<string, BotCommand>;
    commandArray?: ApplicationCommandDataResolvable[];
    categoriesArray?: string[];
    owners?: string[];
  }
}
