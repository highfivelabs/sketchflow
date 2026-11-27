# Decisions

Facts about how sketchflow is built, and why. Newest last. Numbers are
never reused.

- **D1.** (2026-11-27, HFL-785) sketchflow uses the Spectacle method with
  its own small harness, not bundt's `harness/` and `platform/`. Those are
  a Go web-app stack of about 140 MB; sketchflow is a ~700-line Node CLI.
  The harness is `node --test` for checks, `harness/guard.js` for the
  coverage and freeze guards, and `task check` to run both. `UPSTREAM.md`
  says what was taken.
- **D2.** (2026-11-27, HFL-785) The method's text is restated in
  `spec/README.md` rather than copied, because this repository is public
  and the upstream text includes internal product material.
- **D3.** (2026-11-27, HFL-785) Checks run the real thing: the CLI as a
  child process, real Chrome and, at L3, real ffmpeg. Chrome comes from
  `SKETCHFLOW_CHROME` or an installed Google Chrome, as for users.
- **D4.** (2026-11-27, HFL-785) Specs live in `spec/` (project) and
  `spec/specs/` (one file per part), as in `spec-format.md`'s layout,
  without `design.md` and `people.md`: sketchflow has no screens of its own
  beyond the player, and no accounts.
