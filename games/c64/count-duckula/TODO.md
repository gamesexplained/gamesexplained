# Count Duckula — follow-ups

Silver requirements are complete. No Play tab was requested.

- Gold requires a human to review and curate every authored section. Copy remains agent-draft.
- The listing lacks the byte at $35C4, which the up-exit code reads. Fill it from the game image; until then the kit's machine model cannot climb from room to room (facts.md, "World and movement").
- The winning screen's NDOR was shown by setting the win flag $2DF7; a playthrough to the keyhole would show it in normal play.
- The second mummy's frame reads the first mummy's phase ($4A2B). Find a room with two mummies where this shows in play before calling it a bug.
- The score digit at $4C2E is never selected by any score request, so it always shows 0. Check whether the panel draws it.
- initialise_mummies sets each mummy's first shapes from its direction flag ($4839-$486C) the opposite way to the walking code ($4A3A): flag 0 gives $44 there and $4A here. Watch a room entry frame by frame to see whether a mummy first appears facing the wrong way.
- Only the first mummy is tested for being present ($489F); the second mummy's code at $493A runs on every call. Find whether that moves an absent second mummy.
- The retained music start-offset table supports values beyond the requested theme. Establish whether any other selection is a valid composition before describing additional tunes.

Possible later project, only if requested: a separately verified JavaScript Play tab.
