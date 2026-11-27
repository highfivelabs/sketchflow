---
title: What a step shows
kind: feature
---
# What a step shows

Each step is a moment in the walkthrough: a caption, and what moves,
lights up or appears on the diagram. L1.5 holds when things happen; L2
holds what they look like (`PROGRESSIVE.md`).

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
- **R4.** `flows` are tokens that run one after another, once the camera
  has arrived. A flow's `path`
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
- **B1.** (R7, L1.5, assumed A1) A step with a short caption, no camera move, nothing else and no `seconds` lasts 3 s
- **B2.** (R7, L1.5, assumed A1) The same step with `seconds: 6` lasts 6 s
- **B3.** (R7, R1, L1.5, assumed A1) A step whose caption takes longer to type than 3 s lasts until it is typed, plus at least 1 s
- **B4.** (R7, L1.5, assumed A1) A step lasts until its last token has arrived and its last note is written, plus at least 1 s
- **B5.** (R2, L1.5, assumed A1) A step with `zoom` moves the camera for its first 0.9 s, and the camera is still from then on
- **B6.** (R2, L1.5, assumed A1) A step without `zoom` keeps the camera where the step before left it
- **B7.** (R2, L1.5, assumed A1) Without `draw`, the camera at the loop's last moment is where it is at its first, so the loop has no jump
- **B8.** (R4, R2, L1.5, assumed A1) No token moves until the step's camera has arrived
- **B9.** (R4, L1.5, assumed A1) A step's second token appears only once its first has arrived at its last shape
- **B10.** (R5, L1.5, assumed A1) A badge appears once the step's last token has arrived, and stays to the step's end
- **B11.** (R6, L1.5, assumed A1) A note starts writing once the step's last token has arrived; with `when: start` it starts before
- **B12.** (R6, L1.5, assumed A1) A note is gone once its step ends; with `keep: true` it stays to the end of the loop

## Assumptions
- **A1.** (likely) What v0.1's README and code do is what the builder wants, except where an ask says otherwise (`asks/L1.5.md`).
- **A2.** (likely) The pauses (how long a step holds after its flows or caption, how soon flows start) are look, not contract: the behaviors hold them to "at least", not to exact numbers (`project.md`, Stability: look is fluid).

## Open questions
- None yet.
