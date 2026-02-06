import { getYouTubeInfo } from "./src/utils/music-utils/yt-dlp-info.ts";

async function main() {
  // Video with playlist
  const info = await getYouTubeInfo(
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLirAqAtlM-Y9RPT8W8gVv3oW3N_4RzzkB",
  );
  console.log(info);

  // Single video
  const videoInfo = await getYouTubeInfo(
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  );
  console.log(videoInfo);

  // Playlist only
  const playlistInfo = await getYouTubeInfo(
    "https://www.youtube.com/playlist?list=PLirAqAtlM-Y9RPT8W8gVv3oW3N_4RzzkB",
  );
  console.log(playlistInfo);

  // Invalid URL
  const invalidInfo = await getYouTubeInfo("https://example.com");
  console.log(invalidInfo);
}

main();
