# Agent rules for sketchflow

This repository has no rules of its own yet. Add them above the generated section.

<!-- HFL-WORKSPACE: BEGIN (generated from highfivelabs/workspace sync/blocks/private.md by bin/sync-agents; edit it there) -->
## High Five Labs team rules

The team rules apply to every session here, as well as this file:
coord, Linear, draft pull requests, Notion, diagrams, and the Spectacle
method for substantial work. They live in `highfivelabs/workspace`. Read its
`AGENTS.md` before you start, unless it is already in your context: it is
`../AGENTS.md` in a local checkout under the `highfivelabs/` folder, and
otherwise
`gh api repos/highfivelabs/workspace/contents/AGENTS.md -H "Accept: application/vnd.github.raw"`.

The essentials, in case you can't read it:

- Start every piece of work in a new git worktree under
  `highfivelabs/.worktrees/`, branched from `origin/main`. Never make or
  switch branches in a repo's own checkout, which stays on `main`. When its PR
  merges, remove the worktree and its local branch; GitHub deletes the
  remote branch. In the workspace, `bin/sweep-merged` clears leftovers.
- Claim the Linear issue in coord before you edit (`coord claim HFL-n`), and
  put its key in the branch name and PR title.
- Open pull requests as drafts. Mark one ready only when it's finished and
  green, and put it back in draft before pushing to it again. Ready is how
  you ask a person to look; never leave a PR in draft for someone's review.
- Get a draft to ready within about 3 hours, and don't abandon it. If it has
  to stay in draft longer, post a PR comment saying what it waits on and
  when it should be ready.
- Substantial work (a new app, service, CLI or public API, new behavior a
  user can see, or more than about a day of work) uses the Spectacle method:
  workspace `docs/spectacle.md`.
<!-- HFL-WORKSPACE: END -->
