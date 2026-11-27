---
title: sketchflow
kind: project
---
# sketchflow

sketchflow animates a step-by-step flow over an Excalidraw diagram that
already exists. A short YAML file says what happens in each step: a
caption, the hops a message takes between shapes, where the camera goes,
and notes that type themselves out. sketchflow compiles that into one
animated SVG and makes the other formats (an HTML player, MP4, WebM and
GIF) from that SVG.

## Who uses it

- **People writing docs**: READMEs, architecture pages, public docs and
  slides. They want to show a sequence ("the request goes here, then
  here") without redrawing the diagram or editing video.
- **Agents writing docs**: coding agents that keep a repository's
  diagrams and walkthroughs current. The flow format is plain text so an
  agent can write it and a person can review it in a pull request.

## What it is, and is not

- A small open-source utility (Apache-2.0), published at
  `github.com/highfivelabs/sketchflow`. It is not a product.
- High Five Labs' public docs use it for walkthroughs, so it has to keep
  working when those docs are rebuilt.
- It never redraws a diagram or edits it. The `.excalidraw` file stays
  the source of the picture, and the flow follows the diagram when the
  layout changes.

## Parts

| Spec | Covers |
| --- | --- |
| `specs/cli.md` | The `sketchflow` command: arguments, output, exit codes |
| `specs/flow-file.md` | The flow file: its keys, defaults and errors |
| `specs/svg.md` | The animated SVG: one clock, steps you can seek to |
| `specs/scene.md` | Reading the diagram: naming shapes, finding arrows (L1) |
| `specs/steps.md` | What a step shows: flows, camera, focus, badges, notes, draw-in (L2) |
| `specs/outputs.md` | The HTML player, MP4, WebM and GIF (L3) |

## Stability
- format: settling (v0.x: the flow format may still change before 1.0)
- cli: settling
- look: fluid
- outputs: settling
