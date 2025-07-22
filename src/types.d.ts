import { Collection } from "discord.js";
import MusicSystem from "./utils/music-system.ts";

// Define logger interface for type safety
interface Loggers {
  success: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  startup: (message: string, ...args: any[]) => void;
}

declare module "discord.js" {
  interface Client {
    logs: Loggers;
    musicsystem: MusicSystem;
    config: Record<string, any>;
    commands: Collection<string, any>;
  }
}
