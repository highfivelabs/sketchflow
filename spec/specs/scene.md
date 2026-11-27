---
title: Reading the diagram
kind: feature
---
# Reading the diagram

A flow names the diagram's shapes in words, and sketchflow finds them
and the arrows between them in the `.excalidraw` file. Behaviors come at
L1 (`PROGRESSIVE.md`).

## Rules
- **R1.** A shape is a rectangle, ellipse, diamond or frame that is not
  deleted.
- **R2.** A shape's label is its bound text, or else the text that sits
  inside it and inside no smaller shape.
- **R3.** A flow names a shape by its element id, or by its label: the
  whole label or its first line, ignoring case and runs of spaces.
- **R4.** A name that matches two or more shapes is an error that says how
  many it matched and suggests the element id. A name that matches none is
  an error naming it.
- **R5.** The arrow between two shapes is the one bound to both, either
  way round. A token follows its points with straight segments.

## Examples
- R3: the shape labelled "deploy agent\nwatches the registry" is named
  `deploy agent`, `Deploy  Agent`, or its id.

## Behaviors
- Written at L1.

## Assumptions
- None yet.

## Open questions
- Should arrows drawn curved be followed along their curve? (`README.md`,
  Limits: v0.1 approximates them with straight segments.)
