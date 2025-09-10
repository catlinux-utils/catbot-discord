import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface PlaylistItem {
  title: string;
  uploader: string;
  duration: number;
  webpage_url: string;
}

interface YouTubeInfo {
  type: "video" | "playlist" | "video_with_playlist";
  title?: string;
  uploader?: string;
  duration?: number;
  webpage_url?: string;
  playlist_title?: string;
  playlist_id?: string;
  playlist_count?: number;
  playlist_items?: PlaylistItem[];
  error?: string;
}

/**
 * Fetches YouTube video and/or playlist metadata.
 * @param url - The YouTube video or playlist URL to fetch metadata for.
 * @returns A promise resolving to a YouTubeInfo object or error.
 */
export async function getYouTubeInfo(url: string): Promise<YouTubeInfo> {
  try {
    let urlObj: URL;
    try {
      urlObj = new URL(url);
      if (
        !urlObj.hostname.includes("youtube.com") &&
        !urlObj.hostname.includes("youtu.be")
      ) {
        throw new Error("Invalid YouTube URL");
      }
    } catch {
      throw new Error("Invalid URL format");
    }

    const hasVideo = urlObj.searchParams.has("v");

    const command = `yt-dlp --playlist-items 1:20 --simulate --no-warnings --skip-download --flat-playlist --dump-single-json "${url}"`;
    const { stdout, stderr } = await execAsync(command);

    if (!stdout || stderr.includes("ERROR")) {
      throw new Error(
        `yt-dlp metadata error: ${stderr || "No output received"}`
      );
    }

    const jsonOutput = JSON.parse(stdout);

    const result: YouTubeInfo = {
      type: "video",
      title: "Unknown Title",
      uploader: "Unknown Uploader",
      duration: 0,
      webpage_url: url,
    };

    if (jsonOutput.entries) {
      const playlistInfo = jsonOutput;
      const videos = playlistInfo.entries || [];

      result.type = hasVideo ? "video_with_playlist" : "playlist";
      result.playlist_title = playlistInfo.title || "Unknown Playlist";
      result.playlist_id =
        playlistInfo.id || urlObj.searchParams.get("list") || "Unknown ID";
      result.playlist_count = videos.length;

      result.playlist_items = videos.slice(0, 20).map((video: any) => ({
        title: video.title || "Unknown Title",
        uploader: video.uploader || "Unknown Uploader",
        duration: video.duration || 0,
        webpage_url: video.url || url,
      }));

      if (result.type === "video_with_playlist" && videos.length > 0) {
        const videoInfo = videos[0];
        result.title = videoInfo.title || "Unknown Title";
        result.uploader = videoInfo.uploader || "Unknown Uploader";
        result.duration = videoInfo.duration || 0;
        result.webpage_url = videoInfo.url || url;
      }
    } else {
      result.type = "video";
      result.title = jsonOutput.title || "Unknown Title";
      result.uploader = jsonOutput.uploader || "Unknown Uploader";
      result.duration = jsonOutput.duration || 0;
      result.webpage_url = jsonOutput.url || url;
    }

    return result;
  } catch (error: any) {
    return {
      type: "video",
      error: error.message || "Failed to fetch YouTube metadata",
    };
  }
}
