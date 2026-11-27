---
title: Reading the diagram
kind: feature
---
# Reading the diagram

A flow names the diagram's shapes in words, and sketchflow finds them
and the arrows between them in the `.excalidraw` file.

## Rules
- **R1.** A shape is a rectangle, ellipse, diamond or frame that is not
  deleted.
- **R2.** A shape's label is its bound text, or else the text that sits
  inside it and inside no smaller shape.
- **R3.** A flow names a shape by its element id, or by its label: the
  whole label or its first line, ignoring case and runs of spaces.
- **R4.** A name that matches two or more shapes is an error that says how
  many it matched and lists their element ids. A name that matches none is
  an error naming it. Either error says where in the flow the name is
  (`flow-file.md` R8), and a flow with one writes nothing.
- **R5.** The arrow between two shapes is the one bound to both, either
  way round. A token follows its points with straight segments.

## Examples
- R3: the shape labelled "deploy agent\nwatches the registry" is named
  `deploy agent`, `Deploy  Agent`, or its id.

## Behaviors
- **B1.** (R1, L1, assumed A1) A flow can name a rectangle, an ellipse, a diamond and a frame by their labels
- **B2.** (R1, R4, L1, assumed A1) A deleted shape's label names nothing: naming it fails with "no shape"
- **B3.** (R2, L1, assumed A1) Text bound to a shape labels that shape
- **B4.** (R2, R3, L1, assumed A1) Free text labels the smallest shape it sits in: in the deploy example `deploy agent` names the agent's box, not the cluster box around it (the SVG is the same, byte for byte, as with the agent's id, and differs from the cluster's)
- **B5.** (R3, L1, assumed A1) In the deploy example `deploy agent`, `Deploy  Agent`, the whole two-line label and the id `agent` all name the same shape: the SVGs are the same, byte for byte
- **B6.** (R3, L1, assumed A1) The id of a text or an arrow is not a shape's name: naming one fails with "no shape"
- **B7.** (R4, L1, assumed A1) A name two shapes share fails with where it is, "names 2 shapes", and both element ids, and writes nothing
- **B8.** (R4, L1, assumed A1) A name no shape has fails with where it is and `no shape "<name>"`, and writes nothing
- **B9.** (R5, L1, assumed A1) A hop between two shapes joined by an arrow follows the arrow's points; the hop the other way follows them in reverse

## Assumptions
- **A1.** (likely) What v0.1's README and code do is what the builder wants, except where an ask says otherwise (`asks/L1.md`).

## Open questions
- Should arrows drawn curved be followed along their curve? (`README.md`,
  Limits: v0.1 approximates them with straight segments.)
