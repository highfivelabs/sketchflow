# Upstream

sketchflow follows the Spectacle method as High Five Labs uses it
(`docs/spectacle.md` in the `highfivelabs/workspace` repository). The
method's full text lives in a private repository, so this public
repository keeps its own short version and records where it came from.

| | |
| --- | --- |
| Source | `highfivelabs/bundt`, `specs/spec-format.md` and `specs/README.md` |
| Commit | `c0c59a1` (2026-11-26) |
| Taken on | 2026-11-27 (HFL-785) |
| How | Restated, not copied: the file structure (rules, examples, behaviors with permanent IDs, assumptions, open questions), the freeze, asks and results |

## What was not taken

| Upstream | Why not here |
| --- | --- |
| `specs/decisions.md`, `blueprint.md`, `decision-points.md` | They are about Spectacle the product and its web-app architecture, and are internal |
| `harness/` (the `spectacle` CLI, MCP, TUI, skills) | A Go toolchain for building web apps. sketchflow's harness is `harness/guard.js` and `node --test` |
| `platform/` (Go, Postgres, web UI, design catalog, guards) | sketchflow is a Node CLI with no service, data or screens |

See `decisions.md`, D1.
