{
  description = "catbot-discord dev shell (canvas + opus)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        packages = with pkgs; [
          nodejs
          python3
          gnumake
          gcc
          pkg-config
          libuuid
          cairo
          pango
          libjpeg
          giflib
          librsvg
          fontconfig
          freetype
          yt-dlp
          libopus
          ffmpeg
          glib
          harfbuzz

        ];

        shellHook = ''
          export LD_LIBRARY_PATH="${
            pkgs.lib.makeLibraryPath [
              pkgs.libuuid
              pkgs.cairo
              pkgs.glib
              pkgs.pango
              pkgs.libjpeg
              pkgs.giflib
              pkgs.librsvg
              pkgs.fontconfig
              pkgs.freetype
              pkgs.harfbuzz

            ]
          }:$LD_LIBRARY_PATH"

          echo "✅ Flake dev shell with canvas support loaded"
        '';
      };
    };
}
