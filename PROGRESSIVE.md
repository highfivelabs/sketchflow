# Progressive build

sketchflow is built level by level with the Spectacle method
(`spec/README.md`). Each level is a full cycle: questions, rules,
behaviors, checks, the builder's confirmation, the freeze, code, green.
A level starts only when the one before it is green.

v0.1 (HFL-780) was built before the method. It is treated as the spike
the specs catch up to: each level writes behaviors for what v0.1 already
does, finds where it falls short, and fixes the code to match.

## Levels

| Level | Establishes | Specs | Status |
| --- | --- | --- | --- |
| L0 Frame | The CLI's contract (arguments, output, exit codes, `--version`); the flow file's required keys, defaults and errors; one animated SVG with one clock, the same bytes every run, and a quiet stderr | `cli.md`, `flow-file.md`, `svg.md` | Green; behaviors waiting on the builder (`asks/L0.md`) |
| L1 Shape | Reading the diagram: shapes, labels, naming by label or id, ambiguous and missing names, arrows; every key of the flow file validated, with errors in the flow's terms | `scene.md`, `flow-file.md` | Not started |
| L1.5 Timeline | When things happen: step length, the camera's moves and its return at the loop's end, flow timing, notes and `keep` | `steps.md` R1, R2, R7 | Not started |
| L2 Rules | What a step shows, one small level each: L2.1 flows and `via`; L2.2 zoom and focus; L2.3 badges and notes; L2.4 draw-in; L2.5 captions and typing | `steps.md` | Not started |
| L3 Outputs | The HTML player's controls; MP4, WebM and GIF from the SVG's frames; ffmpeg and gifski; widths and frame rates; reference frames compared within a tolerance | `outputs.md` | Not started |
| L4 Docs | sketchflow in use: a GitHub Action or `npx` recipe that rebuilds flows in CI, the walkthroughs in our public docs, an examples gallery, and the 1.0 freeze of the flow format | new specs | Not started |

## Running a level

1. Read `spec/README.md`, then the level's specs.
2. Write the level's rules and behaviors. A question only the builder can
   settle goes into `asks/<level>.md`; don't decide it silently.
3. Write the checks, each named for its behaviors (`cli.md#B3 ...`).
   Run them and see the new ones fail.
4. Ask the builder to confirm the behaviors (`asks/<level>.md`), then
   freeze the level's check files (`node harness/guard.js --freeze ...`).
5. Change the code until `task check` is green.
6. Append the level's line to `results/sketchflow.jsonl`.

One level per session. Stop at the level's exit: `task check` green and
the asks written down.
