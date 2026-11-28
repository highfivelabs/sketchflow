# Changelog

## Unreleased

- The flow file is checked whole before Chrome opens: unknown keys, values
  of the wrong kind, a path of one shape, a badge or note with no `at` or
  `text`. Errors say where they are (`step 2, flow 1: ...`), and a flow
  with a mistake writes nothing.
- A name two shapes share lists their element ids.
- A flow through three or more shapes no longer cuts the corner at a shape
  between: the token crosses it from the arrow it came in on to the arrow
  it leaves by.
- `via` on a path of three or more shapes is an error; it was ignored.
- A step that names no shape (no `focus`, flows, badges or notes at a
  shape) no longer dims the whole diagram.
- Badges and notes on the same side of the same shape in a step stack
  outward instead of drawing over each other.
- `draw` draws each box's lines one after another, along their length; all
  of a box's sides used to draw at once, in a fraction of its turn. The
  last element now finishes as the first step starts, instead of the
  draw-in ending on a pause.
- A flow without `title` no longer leaves an empty row at the top of the
  caption bar.
- `from`/`to` in a flow, never documented, is no longer accepted; use
  `path`.
- `sketchflow --version`.
- An option given without its value (`--formats` at the end) is a usage
  error (exit 2), not a crash.
- Errors name the flow once, and a missing flow or scene says
  "no such file" / "no scene file" instead of Node's ENOENT text.
- A successful render prints nothing on stderr; `SKETCHFLOW_DEBUG=1` shows
  the browser's messages, and a failed render prints them.
- Specs, behaviors and checks (`spec/`, `PROGRESSIVE.md`, `task check`):
  the project now follows the Spectacle method. CI runs the checks.
- GIFs from gifski are encoded at `--quality 100`: at its default, faint
  ghosts of faded text stayed on screen. Tested with gifski 1.34.0.
- The deploy example draws itself in, and its title matches the diagram's.

## 0.1.0 (2026-11-26)

First release.

- Compiles an Excalidraw scene and a YAML flow (captions, token flows along
  arrows, camera zooms, focus, badges, typed notes) into one animated SMIL
  SVG with a single clock.
- Formats made from that SVG: `html` (a player with play, pause, step and
  scrub), `mp4` (H.264), `webm` (VP9) and `gif`.
- GIFs use [gifski](https://gif.ski) when it is on the PATH, else ffmpeg's
  palettegen/paletteuse; `--gif-encoder gifski|ffmpeg` chooses.
- `draw: true` (or seconds) draws the diagram in before the first step.
