[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/naylafeb/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/naylafeb/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Ocean Drive — GTA-style Cover Art Studio

Turn your photos into a Vice City poster: a pop-out hero photo with focal
detection (the crop centres on whatever draws the eye — no library, no
network), a striped retro-chrome 3D title sitting over the art, five layouts,
eight colour grades, callouts, a seal stamp and auto cast tags, with a billing
block. Pick a post size (1080 × 1080, 1080 × 1350 or 1920 × 1080) and export
the cover as a PNG to share. Click the preview to focus the hero where you
clicked.

Everything runs offline from static files: photos are read on your own
machine and never uploaded, and every image, font and script the app loads is
a file under `app/`. The poster itself is drawn procedurally on a canvas —
sunset sky, striped sun, skyline, palm silhouettes — so no artwork, logo or
font is taken from any game.

## Try it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

## Enter

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This rebuilds `out/` with the app, the screenshots and `dossier.json`.
