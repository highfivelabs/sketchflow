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
- **R9.** A key sketchflow does not know, at the top level or in a step,
  is an error naming the key and, in a step, the step: "step 3: unknown
  key focuss". Behaviors at L1 (builder, 2026-11-27, `asks/L0.md` 2).
- **R10.** `title` is optional. A flow whose diagram already has its title
  drawn in leaves it out (builder, 2026-11-27, `asks/L0.md` 3).
- **R11.** Inside a step, an error names the entry by its list and its
  number counting from 1: `step 2, flow 1` (in `flows`), `step 2, badge 1`
  (in `badges`), `step 2, note 1` (in `write`).
- **R12.** Every key's value has a kind: a number, a list, `true`, a shape
  name, one of a set of words. A value of the wrong kind is an error naming
  the key and the kind it must be.
- **R13.** A flow needs a `path` of two or more shapes; a badge needs `at`
  and `text`; a note needs `at` (a shape or `[x, y]`) and `text`.
- **R14.** A flow file is checked whole, names included, before anything
  is rendered, so a flow with a mistake writes nothing.

## Examples
- R3: `deploy.flow.yaml` writes `deploy.svg`; `hosted-watcher.yaml` writes
  `hosted-watcher.svg`; `output: intro` writes `intro.svg`.
- R8: a second step with no caption fails with "step 2 has no caption".
- R12: `typing: fast` fails with "typing must be a number".

## Behaviors
- **B1.** (R1, R8, L0, confirmed) A flow without `scene` fails with a message saying it has no scene
- **B2.** (R1, L0, confirmed) A flow whose `scene` is in another folder is found relative to the flow file, not the working folder
- **B3.** (R2, R8, L0, confirmed) A flow with an empty `steps` list fails with "a flow needs at least one step"
- **B4.** (R2, R8, L0, confirmed) A flow whose second step has no caption fails with "step 2 has no caption"
- **B5.** (R3, L0, confirmed) `x.flow.yaml` writes `x.svg`, `x.yaml` writes `x.svg`, and `output: y` writes `y.svg`
- **B6.** (R4, L0, confirmed) A flow with no `formats`, rendered without `--formats`, writes exactly an SVG and an HTML file
- **B7.** (R9, L1, assumed A1) A top-level key `titel` fails with "unknown key titel"
- **B8.** (R9, L1, confirmed) A third step with the key `focuss` fails with "step 3: unknown key focuss"
- **B9.** (R9, R11, L1, assumed A1) An unknown key in a flow, a badge or a note fails naming the entry: "step 2, flow 1: unknown key colour", "step 1, badge 1: unknown key txt", "step 1, note 1: unknown key colour"
- **B10.** (R12, L1, assumed A1) `typing: fast` fails with "typing must be a number", and `draw: soon` with "draw must be true or a number of seconds"
- **B11.** (R12, L1, assumed A1) `formats: svg` fails with "formats must be a list", and `steps: go` with "steps must be a list"
- **B12.** (R12, R11, L1, assumed A1) A second step with `zoom: 3` fails with "step 2: zoom must be all, a shape or a list of shapes"
- **B13.** (R12, R11, L1, assumed A1) A badge with `side: middle` fails with "step 1, badge 1: side must be bottom, top, left or right"
- **B14.** (R13, R11, L1, assumed A1) A flow whose `path` names one shape fails with "step 1, flow 1: path needs two or more shapes"
- **B15.** (R13, R11, L1, assumed A1) A badge with no `text` fails with "step 1, badge 1 has no text", and a note with no `at` with "step 1, note 1 has no at"
- **B16.** (R14, L1, assumed A1) A flow with a mistake in its last step fails without opening Chrome and writes nothing: it fails even when the Chrome named by `--chrome` does not exist
- **B17.** (R9, R12, L1, assumed A1) A flow that uses every key in the README's two key tables renders

## Assumptions
- **A1.** (confirmed 2026-11-27 for L0; likely for L1) What v0.1's README and code do is what the builder wants, except where an ask says otherwise (`asks/L1.md`).

## Open questions
- None.
