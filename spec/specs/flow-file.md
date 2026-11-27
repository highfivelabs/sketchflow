---
title: The flow file
kind: feature
---
# The flow file

A flow is a YAML file next to its diagram. It names the diagram and lists
the steps. People and agents write it by hand, so its mistakes have to be
reported plainly, in the file's own terms.

## Rules
- **R1.** `scene` names the `.excalidraw` file, relative to the flow file.
  It is required.
- **R2.** `steps` is a list of at least one step, and every step has a
  `caption`. A step's other keys are in `steps.md`.
- **R3.** The files written are named by `output`, or else by the flow
  file's name without `.flow.yaml`, `.yaml` or `.yml`.
- **R4.** `formats` lists what to write, from `svg`, `html`, `mp4`, `webm`
  and `gif`. The default is `svg` and `html`.
- **R5.** `title` is shown above the captions. It is optional.
- **R6.** Timing and size settings are optional and have defaults:
  `typing` (caption characters a second, 55; 0 shows the caption at once),
  `writing` (note characters a second, 28), `fps` (frames a second for
  video, 12), `mp4.width` and `webm.width` (1600), `gif.width` (1100) and
  `gif.fps` (8).
- **R7.** `draw: true` (3 seconds) or a number of seconds draws the diagram
  in before the first step.
- **R8.** An error in a flow says what is wrong in the flow's terms: the
  key, and the step by its number counting from 1.

## Examples
- R3: `deploy.flow.yaml` writes `deploy.svg`; `hosted-watcher.yaml` writes
  `hosted-watcher.svg`; `output: intro` writes `intro.svg`.
- R8: a second step with no caption fails with "step 2 has no caption".

## Behaviors
- **B1.** (R1, R8, L0, assumed A1) A flow without `scene` fails with a message saying it has no scene
- **B2.** (R1, L0, assumed A1) A flow whose `scene` is in another folder is found relative to the flow file, not the working folder
- **B3.** (R2, R8, L0, assumed A1) A flow with an empty `steps` list fails with "a flow needs at least one step"
- **B4.** (R2, R8, L0, assumed A1) A flow whose second step has no caption fails with "step 2 has no caption"
- **B5.** (R3, L0, assumed A1) `x.flow.yaml` writes `x.svg`, `x.yaml` writes `x.svg`, and `output: y` writes `y.svg`
- **B6.** (R4, L0, assumed A1) A flow with no `formats`, rendered without `--formats`, writes exactly an SVG and an HTML file

## Assumptions
- **A1.** (likely, cheap) What v0.1's README and code do is what the builder wants.

## Open questions
- Should a key sketchflow does not know (a typo such as `focuss`) be an
  error? v0.1 ignores it. See `asks/L0.md`, question 2.
