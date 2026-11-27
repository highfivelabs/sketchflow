# spec/

What sketchflow does, in plain English. sketchflow is built with the
Spectacle method: specs first, then behaviors with permanent IDs, then
checks written before the code they check, frozen once the builder has
confirmed them. `../UPSTREAM.md` names the method's source;
`../decisions.md` records where this repository departs from it.

## Read in this order

1. `project.md`: what sketchflow is, who it is for, how settled each part is.
2. `../PROGRESSIVE.md`: the levels (L0 to L4) and where the build is.
3. `specs/`: one file per part of the tool.
4. `../asks/`: questions only the builder can settle.

## File structure

Every file under `spec/` has this shape:

```markdown
---
title: CLI
kind: feature
---
# CLI

One short paragraph: what this is for.

## Rules
- **R1.** One or two sentences.

## Examples
- R1: a concrete case.

## Behaviors
- **B1.** (R1, L0, assumed A1) One check the rule is held to.

## Assumptions
- **A1.** (likely, cheap) Something taken as true until the builder says.

## Open questions
- Something the builder has not decided.
```

- Rules are `R1`, `R2`, ... and behaviors `B1`, `B2`, ... within their
  file. A number is never reused, even after its rule or behavior is
  dropped: a dropped one stays, struck through, with why.
- A behavior's brackets name the rules it checks, the level that brought
  it in, and either `confirmed` (the builder confirmed this sentence) or
  `assumed` with the assumptions it rests on.
- A behavior is referred to as `<file>#B<n>`, for example `cli.md#B3`.

## Checks

Each behavior has at least one check in `test/`. A check names the
behaviors it covers at the start of its test name:

```js
test("cli.md#B1 --help prints the usage and exits 0", ...)
```

Checks use no mocks: they run the real CLI, real Chrome and real ffmpeg.

`task check` runs every check and the guards (`harness/guard.js`):

- every behavior in `spec/` has a check, and every check names a behavior
  that exists;
- every frozen check file (`harness/frozen.json`) is unchanged.

## Freezing

When the builder has confirmed a level's behaviors (`asks/`), its check
files are frozen: `node harness/guard.js --freeze <file>...` records their
hashes. After the freeze nobody edits, skips or weakens a frozen check to
make a build pass. A check that turns out wrong becomes an ask, and only
the builder's answer unfreezes it.

## Results

One line of JSON per event, appended to `../results/sketchflow.jsonl`:

```json
{"id": "sketchflow-L0", "kind": "level", "level": "L0", "behaviors": 18, "green": true, "frozen": false, "notes": ""}
```
