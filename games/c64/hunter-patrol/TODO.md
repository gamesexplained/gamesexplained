# Hunter Patrol: TODO

Tier: **bronze**. The run was on a model the kit does not list as proven, so the game cannot be Silver until a maintainer has sampled the listing on a proven model (`kit/CHECKING.md`). Coverage is 28 %: 3,413 of 12,174 bytes.

## For Silver

- Describe the remaining code: the object routines at `$1A10-$1F8D`, the target run at `$2B00-$2E19`, the pickup of the stick at `$0D14`, and the enemy planes at `$2780-$2896`.
- Describe the data: sprite blocks at `$5000-$7FFF`, the tables at `$8000-$8FFF` and the screens at `$4000-$4FFF`.
- Answer every item of `media.json` (`kit/skills/core/12-media`).
- Sample 60 comments on a proven model (`kit/skills/core/60-verify`).
- A Music tab with the tune on the title screen: the driver at `$A000` is called by its own timer interrupt at `$AE03`; port it, or run it on the kit's 6502, and check it against the emulator's chip registers.

## Open questions

- What the flak is in the code, and how the game gets faster and the flak meaner at higher levels.
- Whether RESTORE restarts the game.
- What the trainer menu's three options change.
- The messages after a target run were read from the program, not seen in play.

## Ideas

- A route that wins a target run with 64 hits.
- A picture of the four kinds of defence at every size.
