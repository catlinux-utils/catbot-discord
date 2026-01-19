import { exec } from "node:child_process";

export async function getYouTubeStreamUrl(videoUrl) {
  return new Promise((resolve, reject) => {
    if (!videoUrl) {
      return reject(new Error("Video URL is required"));
    }
    exec(`yt-dlp --get-url ${videoUrl}`, (error, stdout, stderr) => {
      if (error) {
        return reject(
          new Error(
            `Error executing yt-dlp: ${stderr.trim() || error.message}`,
          ),
        );
      }
      console.log(error, stdout, stderr);
      const streamUrl = stdout.trim().split("\n")[0];
      console.log(streamUrl);
      if (!streamUrl) {
        return reject(new Error("Failed to retrieve stream URL."));
      }

      resolve(streamUrl);
    });
  });
}
