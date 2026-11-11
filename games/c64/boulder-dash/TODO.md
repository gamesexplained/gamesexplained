# Boulder Dash — TODO

Tier: silver. The run was on `claude-sonnet-5-5`, which the kit has not proven, so a maintainer measured the listing on `claude-opus-5-5` (`kit/CHECKING.md`): a sample, an audit of all 358 comments and every claim in `facts.md`, and a second sample (`game.json`, `accuracy`).

For Gold, a human's pass over every section of the pages.

Open:

- Twelve short runs, 26 bytes in all, are missing from the listing (gap records at `$5140`, `$5240`, `$5340`, `$54CE`, `$6328`, `$6430`, `$6530`, `$6630`, `$6928`, `$6C28`, `$6D68`, `$6DE8`). A build of the listing from the contributor's snapshot would fill them; on the First Star disks they are all 0 except the five at `$54CE`, which are `$FF`.
- Header bytes 0, 22 and 23 have no reader.
- The black band of sprites under the status line in play: what it hides was not checked.
- Verify live the items marked "traced": the creatures' handlers, the magic wall bugs, the amoeba, RESTORE, two-player play.

Ideas:

- A Play tab: the cave rules are a small set of handlers, and the Maps tab already builds every cave.
- Compare with the Atari original's cave data, which the sources say the C64 game converts, and with the First Star disks, which are a different build of the same game.
- The sound effects the Music tab leaves out: the amoeba's hum, the walk and dig notes, the magic wall's notes and the time-bonus blips.
