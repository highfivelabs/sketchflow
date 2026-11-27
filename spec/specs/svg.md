---
title: The animated SVG
kind: feature
---
# The animated SVG

The SVG is what sketchflow makes. Every other format is made from it, so
it must play the same way everywhere and be seekable to any moment.

## Rules
- **R1.** A flow compiles into one SVG that plays by itself in an `<img>`,
  loops, and needs no script: the animation is SMIL.
- **R2.** The SVG has one clock. Every animation spans the whole loop and
  repeats with it, and the SVG holds no nested `<svg>` (a nested one runs
  a clock of its own). Pausing the SVG and setting its time shows exactly
  that moment.
- **R3.** The SVG records the loop's length and when each step starts, in
  its `data-sketchflow` attribute, so a player can step through it.
- **R4.** The diagram is Excalidraw's own export of the scene, never
  redrawn. Its fonts carry every character the flow draws.
- **R5.** The same flow, scene and sketchflow version give the same SVG,
  byte for byte, so a docs build that regenerates it changes nothing in
  git.
- **R6.** A render that succeeds prints nothing on stderr. Messages from
  the browser are shown only when the render fails or `SKETCHFLOW_DEBUG`
  is set.

## Examples
- R2: the deploy example's loop is about 23.6 s; seeking to half a second
  after step 3 starts shows step 3's caption and no other.

## Behaviors
- **B1.** (R1, R2, L0, confirmed) The deploy example compiles to an SVG with one root `<svg>` and no nested `<svg>`
- **B2.** (R2, L0, confirmed) Every animation in the deploy example's SVG repeats indefinitely and lasts exactly the loop recorded in `data-sketchflow`
- **B3.** (R2, R3, L0, confirmed) Paused and set to half a second after each step's recorded start, the deploy example shows that step's caption group and only that one
- **B4.** (R5, L0, confirmed) Rendering the deploy example twice gives the same SVG, byte for byte
- **B5.** (R6, L0, confirmed) Rendering the deploy example as SVG prints nothing on stderr

## Assumptions
- **A1.** (confirmed 2026-11-27) What v0.1's README and code do is what the builder wants.
- **A2.** (confirmed 2026-11-27) Browser console messages are noise to someone running the CLI. v0.1 printed them every run.

## Open questions
- None.
