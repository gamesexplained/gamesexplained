# Gradius — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "Correct every comment the sample found wrong, and every other comment that says the same thing": the sample found one comment calling the stage routines every-frame; grepping for the same belief corrected eight more (all stageN_frame routines and stage_routines), and three more for the power-up bar's row.
- `70-minisite`: "with a button for every tune the game stores, unused ones too": the two tunes never play in the game, and I would have left them to a note; the player on the Overview runs the game's own driver for both.

## What was changed in the kit

None. The run changed no file under `kit/`.

## Candidates

- **A table entry is not proof the entry is used.** `map_starts` has an
  entry for every stage, and stage 6's points at stage 2's map, so the
  listing, `facts.md` and `features.md` all said stage 6 reuses stage 2's
  map. It reads as right and is wrong: stage 6's event list never runs the
  event that turns the scenery on, and the stage is open space. It was
  caught only when the Levels page drew each stage's scenery from the
  events and found none for stage 6, and a screenshot agreed. A skill
  would say: when a per-level table gives every level a value, check that
  the code path which reads it runs on each level before writing that
  the level uses it. No other game folder shows the same mistake yet.

## Maintainer asks

None.

## What cost the most time

Screenshots taken on the default PAL machine were garbled because this
game is timed for NTSC; a line in `kit/skills/c64/steps` saying to try the
other video standard when the playfield draws as garbage in a game that
boots cleanly would have saved about half an hour.

## Tools and system

- VICE 3.14.0 (x64sc, MCP server) and regenerator2000 on Linux x86_64 in
  a cloud container.
- Met, and already recorded in `kit/skills/c64/tool-vice-mcp`
  ("Switching the video standard sticks"): after switching VICE to NTSC,
  snapshots saved on PAL (`work/loading-screen.vsf`) failed to load with
  only "Failed to load snapshot". I booted the disk again in NTSC instead.
