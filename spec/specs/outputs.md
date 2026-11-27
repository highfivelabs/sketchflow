---
title: The other formats
kind: feature
---
# The other formats

The HTML player, MP4, WebM and GIF are all made from the animated SVG, so
they show exactly what it shows. Behaviors come at L3 (`PROGRESSIVE.md`).

## Rules
- **R1.** `html` is a page holding the SVG with controls on its own clock:
  play, pause, the previous and next step, and a scrubber.
- **R2.** `mp4` (H.264), `webm` (VP9) and `gif` are frames of the SVG, each
  taken by pausing it and setting its time, at the flow's `fps`.
- **R3.** Video and GIF need ffmpeg on the PATH; without it the flow fails
  with a message saying so. The SVG and HTML need only Chrome.
- **R4.** GIFs are encoded by gifski when it is on the PATH (or chosen with
  `--gif-encoder`), else by ffmpeg's palettegen and paletteuse.

## Behaviors
- Written at L3.

## Assumptions
- None yet.

## Open questions
- None yet.
