---
title: What a step shows
kind: feature
---
# What a step shows

Each step is a moment in the walkthrough: a caption, and what moves,
lights up or appears on the diagram. Behaviors come at L1.5 and L2
(`PROGRESSIVE.md`).

## Rules
- **R1.** A step's caption types itself out in the caption bar at the
  flow's `typing` speed, with the step's number and the step count.
- **R2.** `zoom` names shapes (or `all`) the camera fits, with `zoomPad`
  room around them (default 50), easing there over 0.9 s. The camera stays
  until a later step moves it, and at the end of the loop it returns to
  where the first step began.
- **R3.** `focus` names shapes to light; the rest of the diagram dims.
  Without `focus`, every shape the step's flows, badges and notes name is
  lit.
- **R4.** `flows` are tokens that run one after another. A flow's `path`
  is two or more shapes; its `label` rides with the token; `color`
  defaults to red. A hop follows the arrow drawn between its shapes;
  without one it follows `via` bends (scene coordinates) or a straight
  line.
- **R5.** `badges` appear once the step's flows are done, `at` a shape on
  a `side` (default bottom).
- **R6.** `write` notes type themselves out in the diagram's font, `at` a
  shape (with `side`) or a point, after the flows unless `when: start`.
  `keep: true` keeps a note to the end of the loop.
- **R7.** A step lasts at least `seconds` (default 3), and always long
  enough for its camera, flows, notes and caption, plus a pause.
- **R8.** `draw` draws the diagram in, element by element, before the
  first step: strokes along their length, fills and text faded in.

## Behaviors
- Written at L1.5 and L2.

## Assumptions
- None yet.

## Open questions
- None yet.
