# Changelog

## 0.1.0 (2026-11-26)

First release.

- Compiles an Excalidraw scene and a YAML flow (captions, token flows along
  arrows, camera zooms, focus, badges, typed notes) into one animated SMIL
  SVG with a single clock.
- Formats made from that SVG: `html` (a player with play, pause, step and
  scrub), `mp4` (H.264), `webm` (VP9) and `gif`.
- GIFs use [gifski](https://gif.ski) when it is on the PATH, else ffmpeg's
  palettegen/paletteuse; `--gif-encoder gifski|ffmpeg` chooses.
- `draw: true` (or seconds) draws the diagram in before the first step.
