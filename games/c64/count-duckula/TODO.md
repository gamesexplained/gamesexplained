# Count Duckula — follow-ups

Silver requirements are complete. No Play tab was requested.

- A full audit of all listing comments is recommended. The first sample found one wrong detail among 80 comments (written 1/60, generated 0/20); the wording was corrected. This is a lower bound on the true error rate.
- Gold requires a human to review and curate every authored section. Copy remains agent-draft.
- The listing lacks the byte at $35C4, which the up-exit code reads. Fill it from the game image; until then the kit's machine model cannot climb from room to room (facts.md, "World and movement").
- The winning screen's NDOR was shown by setting the win flag $2DF7; a playthrough to the keyhole would show it in normal play.
- The second mummy's frame reads the first mummy's phase ($4A2B). Find a room with two mummies where this shows in play before calling it a bug.
- The precise original purpose of the small retained tails at $2DA7, $5B7A, $6800, and $BF90 remains open. They are explicitly labelled as retained data.
- The retained music start-offset table supports values beyond the requested theme. Establish whether any other selection is a valid composition before describing additional tunes.

Possible later project, only if requested: a separately verified JavaScript Play tab.
