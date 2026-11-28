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
- **R3.** `focus` names shapes to light, each ringed; the rest of the
  diagram dims. Without `focus`, every shape the step's flows, badges and
  notes name is lit. A step that names no shape dims nothing.
- **R4.** `flows` are tokens that run one after another, once the camera
  has arrived. A flow's `path`
  is two or more shapes; its `label` rides with the token; `color`
  defaults to red (#e03131). A hop follows the arrow drawn between its
  shapes: one bound to both of them, at either end. `via` bends (scene
  coordinates, for a path of two shapes) are followed in its place. A hop
  with neither runs straight, from edge to edge on the line between the
  shapes' centers. A path of three or more shapes runs every hop in turn,
  through each shape between.
- **R5.** `badges` appear once the step's flows are done, `at` a shape on
  a `side` (default bottom): a green chip 4 px off that side and centered
  along it.
- **R6.** `write` notes type themselves out in the diagram's font, `at` a
  shape (with `side`, placed as a badge is) or with their top-left corner
  at a point `[x, y]` (scene coordinates), after the flows unless
  `when: start`. `size` (default 18) and `color` (default #1971c2) set the
  text; it breaks into lines only where the text has a newline.
  `keep: true` keeps a note to the end of the loop.
- **R7.** A step lasts at least `seconds` (default 3), and always long
  enough for its camera, flows, notes and caption, plus a pause.
- **R8.** `draw` draws the diagram in, element by element, before the
  first step, and again at the start of every loop. The elements take
  their turns in the scene's order, the first at once, and the last is
  done as the first step starts. Solid strokes draw along their length,
  one line after another; fills, text and dashed strokes fade in. Only the
  background shows before an element's turn, and the camera shows the
  whole diagram throughout.
- **R9.** The camera keeps the diagram's shape: it fits the named shapes,
  with `zoomPad` around them on the tighter side and centered on them on the
  other. It never shows past the diagram's edge, so near an edge the view
  slides inward, and a fit wider than the diagram shows all of it.
- **R10.** Within a step, badges and notes at the same shape and side
  stack outward from it, 4 px apart: badges first, then notes, each in the
  order listed.

## Behaviors
- **B1.** (R7, L1.5, confirmed) A step with a short caption, no camera move, nothing else and no `seconds` lasts 3 s
- **B2.** (R7, L1.5, confirmed) The same step with `seconds: 6` lasts 6 s
- **B3.** (R7, R1, L1.5, confirmed) A step whose caption takes longer to type than 3 s lasts until it is typed, plus at least 1 s
- **B4.** (R7, L1.5, confirmed) A step lasts until its last token has arrived and its last note is written, plus at least 1 s
- **B5.** (R2, L1.5, confirmed) A step with `zoom` moves the camera for its first 0.9 s, and the camera is still from then on
- **B6.** (R2, L1.5, confirmed) A step without `zoom` keeps the camera where the step before left it
- **B7.** (R2, L1.5, confirmed) Without `draw`, the camera at the loop's last moment is where it is at its first, so the loop has no jump
- **B8.** (R4, R2, L1.5, confirmed) No token moves until the step's camera has arrived
- **B9.** (R4, L1.5, confirmed) A step's second token appears only once its first has arrived at its last shape
- **B10.** (R5, L1.5, confirmed) A badge appears once the step's last token has arrived, and stays to the step's end
- **B11.** (R6, L1.5, confirmed) A note starts writing once the step's last token has arrived; with `when: start` it starts before
- **B12.** (R6, L1.5, confirmed) A note is gone once its step ends; with `keep: true` it stays to the end of the loop
- **B13.** (R4, L2.1, confirmed) A flow of three shapes runs one token along the first hop's arrow and then the second's, through every point of both
- **B14.** (R4, L2.1, confirmed) A hop between two shapes with no arrow between them runs straight from the first shape's edge to the second's, on the line between their centers
- **B15.** (R4, L2.1, confirmed) A hop with `via` runs from the first shape's edge through each bend in order to the second shape's edge, each end aimed at its nearest bend
- **B16.** (R4, L2.1, confirmed) A hop with `via` follows the bends even where an arrow is drawn between its shapes
- **B17.** (R4, L2.1, confirmed) An arrow bound to only one of a hop's shapes, or to neither, is not followed: the hop runs straight
- **B18.** (R4, L2.1, confirmed) A flow's `label` moves with its token, the same distance above it all the way
- **B19.** (R4, L2.1, confirmed) A flow's token and its trail are its `color`; without `color` they are red, #e03131
- **B20.** (R2, R9, L2.2, confirmed) `zoom: all` shows the whole diagram, unscaled
- **B21.** (R2, R9, L2.2, confirmed) `zoom` on one shape centers it, with 50 px of the diagram around it on the tighter side and at least that on the other
- **B22.** (R2, R9, L2.2, confirmed) `zoomPad: 0` fits the shape edge to edge on the tighter side; `zoomPad: 120` leaves 120 px
- **B23.** (R2, R9, L2.2, confirmed) `zoom` on two shapes fits the box around both the same way
- **B24.** (R9, L2.2, confirmed) `zoom` on a shape at the diagram's corner shows no space past the diagram's edges, and still shows all of the shape
- **B25.** (R9, L2.2, confirmed) `zoom` on shapes whose fit is wider than the diagram shows the whole diagram
- **B26.** (R3, L2.2, confirmed) With `focus`, only its shapes are lit and ringed; the other shapes are dimmed, even those the step's flows name
- **B27.** (R3, L2.2, confirmed) Without `focus`, the shapes the step's flows, badges and notes name are lit and ringed, and the others dimmed
- **B28.** (R3, L2.2, confirmed) A step that names no shape dims nothing
- **B29.** (R5, L2.3, confirmed) A badge sits 4 px off its shape on its `side`, centered along it, for each of the four sides; without `side`, below
- **B30.** (R5, L2.3, confirmed) A badge is a chip with a green (#2f9e44) border around its text
- **B31.** (R6, L2.3, confirmed) A note at a shape sits 4 px off it on its `side`, centered along it; without `side`, below
- **B32.** (R6, L2.3, confirmed) A note at `[x, y]` has its top-left corner at that point of the diagram
- **B33.** (R6, L2.3, confirmed) A note is in the diagram's font, size 18 and #1971c2 by default, or its `size` and `color`
- **B34.** (R6, L2.3, confirmed) A note's text breaks into lines at its newlines, each line centered, 1.25 sizes apart
- **B35.** (R10, L2.3, confirmed) Two badges and a note at the same shape and side stack outward in that order, 4 px apart, without overlapping
- **B36.** (R8, L2.4, confirmed) `draw: 2` takes the loop's first 2 s, and the first step starts then; `draw: true` takes 3 s; without `draw`, the first step starts at 0
- **B37.** (R8, L2.4, confirmed) At the loop's start only the diagram's background shows; by the first step's start every element is drawn, as it looks without `draw`
- **B38.** (R8, L2.4, confirmed) Elements start drawing one after another in the scene's order; the first starts at once, and the last is done as the first step starts
- **B39.** (R8, L2.4, confirmed) A solid stroke draws along its length, one line after another: partway through a box, its top is drawn and its bottom not yet
- **B40.** (R8, L2.4, confirmed) A solid fill and text fade in: partway, all of it shows, lighter
- **B41.** (R8, L2.4, confirmed) A dashed stroke fades in, keeping its dashes
- **B42.** (R8, R2, L2.4, confirmed) During the draw-in the camera shows the whole diagram, unscaled, even when the first step zooms; the first step's zoom starts from there
- **B43.** (R8, L2.4, confirmed) The draw-in plays again at the start of every loop

## Assumptions
- **A1.** (confirmed 2026-11-27) What v0.1's README and code do is what the builder wants, except where an ask says otherwise (`asks/L1.5.md`).
- **A2.** (confirmed 2026-11-27, `asks/L1.5.md` 3) The pauses (how long a step holds after its flows or caption, how soon flows start) are look, not contract: the behaviors hold them to "at least", not to exact numbers (`project.md`, Stability: look is fluid).

- **A3.** (confirmed 2026-11-27, `asks/L2.1.md` 1) A token follows an arrow's points with straight segments, also for an arrow Excalidraw draws curved. Every curved arrow in the diagrams we have runs between two points only, so it is straight anyway; arrows with bends are drawn sharp.

## Open questions
- None.
