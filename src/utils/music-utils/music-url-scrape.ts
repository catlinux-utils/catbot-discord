import { execFile } from "child_process";

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function getYouTubeStreamUrl(videoUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!videoUrl || typeof videoUrl !== "string" || !isValidUrl(videoUrl)) {
      return reject(new Error("A valid HTTP/HTTPS video URL is required"));
    }

    // Allow only trusted hosts to reduce risk of arbitrary command usage
    const allowedHosts = ["youtube.com", "youtu.be"];
    try {
      const parsed = new URL(videoUrl);
      const hostname = parsed.hostname.toLowerCase();
      const ok = allowedHosts.some(
        (h) => hostname === h || hostname.endsWith(`.${h}`),
      );
      if (!ok) {
        return reject(
          new Error("Unsupported host; only youtube.com / youtu.be allowed"),
        );
      }
    } catch (err) {
      return reject(new Error("Invalid URL provided"));
    }

    const args = ["--get-url", "--format", "bestaudio", videoUrl];
    const opts = { timeout: 15000, maxBuffer: 10 * 1024 * 1024 } as any;

    execFile("yt-dlp", args, opts, (error, stdout, stderr) => {
      if (error) {
        const msg = (stderr && stderr.toString().trim()) || error.message;
        return reject(new Error(`yt-dlp failed: ${msg}`));
      }

      const out = (stdout && stdout.toString().trim()) || "";
      const streamUrl = out.split("\n")[0];
      if (!streamUrl) {
        return reject(new Error("Failed to retrieve stream URL."));
      }

      resolve(streamUrl);
    });
  });
}
