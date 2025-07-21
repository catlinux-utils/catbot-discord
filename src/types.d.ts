import { Collection } from "discord.js";
import MusicSystem from "./utils/music-system.ts";

declare module "discord.js" {
  interface Client {
    logs: (...args: any[]) => void;
    musicsystem: MusicSystem;
    config: Record<string, any>;
    commands: Collection<string, any>;
  }
}
