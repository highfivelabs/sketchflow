---
title: CLI
kind: feature
---
# CLI

The `sketchflow` command renders one or more flow files. It is what
people, CI and agents run, so its output and exit codes are a contract.

## Rules
- **R1.** `sketchflow <flow>...` renders each flow in turn and prints the
  path of every file it wrote on stdout, one per line.
- **R2.** `-h` or `--help` prints the usage on stderr and exits 0.
- **R3.** Run with no flow, with an option it does not know, or with an
  option missing its value, it prints what is wrong and the usage on
  stderr, renders nothing, and exits 2.
- **R4.** When a flow fails, sketchflow prints `<flow>: <what went wrong>`
  on stderr, naming the flow once, and goes on to the next flow. If any
  flow failed it exits 1; otherwise 0.
- **R5.** `--formats a,b` replaces the flow's own `formats`. A format it
  does not know fails that flow with a message listing the formats it
  does know.
- **R6.** `--out <dir>` writes the files into that folder, creating it if
  needed. Without it, files go beside the flow file.
- **R7.** Chrome is found from `--chrome <path>`, else the
  `SKETCHFLOW_CHROME` environment variable, else an installed Google
  Chrome.
- **R8.** `--gif-encoder gifski|ffmpeg` picks the GIF encoder. Without
  it, gifski is used when it is on the PATH, else ffmpeg.
- **R9.** `--version` prints `sketchflow <version>` on stdout and exits 0.

## Examples
- R1: `sketchflow examples/deploy/deploy.flow.yaml --formats svg` prints
  `.../examples/deploy/deploy.svg`.
- R3: `sketchflow --formats` prints "--formats needs a value" and the usage,
  and exits 2.
- R4: `sketchflow missing.flow.yaml good.flow.yaml` prints an error for
  `missing.flow.yaml`, renders `good.flow.yaml`, and exits 1.

## Behaviors
- **B1.** (R2, L0, assumed A1) `sketchflow --help` prints the usage on stderr and exits 0
- **B2.** (R3, L0, assumed A1) `sketchflow` with no flow prints the usage on stderr and exits 2
- **B3.** (R3, L0, assumed A1) `sketchflow --frobnicate x.flow.yaml` prints "unknown option --frobnicate" and the usage, renders nothing, and exits 2
- **B4.** (R3, L0, assumed A1) `sketchflow x.flow.yaml --formats` prints "--formats needs a value" and the usage, and exits 2
- **B5.** (R1, L0, assumed A1) Rendering the deploy example as SVG prints the SVG's path on stdout, and that file exists
- **B6.** (R4, L0, assumed A1) Given a missing flow and then the deploy example, sketchflow prints one error line that starts with the missing flow's name, still writes the example's SVG, and exits 1
- **B7.** (R5, L0, assumed A1) `--formats svg,png` fails the flow with a message naming "png" and listing svg, html, mp4, webm and gif
- **B8.** (R6, L0, assumed A1) `--out` into a folder that does not exist yet creates it and writes the files there
- **B9.** (R9, L0, assumed A2) `sketchflow --version` prints `sketchflow ` followed by the version in package.json, and exits 0

## Assumptions
- **A1.** (likely, cheap) What v0.1's README and code do is what the builder wants.
- **A2.** (likely, cheap) The CLI has a `--version`; v0.1 had none.

## Open questions
- Should `--chrome` also be readable from the flow file? (No for now: a
  flow file should render the same on any machine.)
