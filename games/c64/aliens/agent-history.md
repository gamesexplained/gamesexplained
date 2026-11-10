# Aliens — agent history

- Snapshots of levels 3 to 6 came out byte-identical to the trainer menu snapshot at first. A snapshot save had left the emulator paused, so the next snapshot load stayed paused, the route's keys did nothing and the saved RAM was the menu's. The fix was to resume after each load and to delete an old snapshot of the same name before saving.
- Pressing RETURN once too often in play ended the level and went back to the trainer menu.
- The status code must be typed as key presses; the KERNAL buffer path did nothing.
- The Bronze steps ran on Sonnet 5.5; annotation and verify ran on Opus 5.5 at the contributor's request.
- Every stage file's 40-byte header at `$8000` was first typed as a split table of low and high bytes. It is 20 little-endian words (two entry points and 18 object-table addresses); the export lost bytes until it was retyped as addresses and exported with `--force`.
- The sample of seed 2611 found 12 of 80 comments wrong in a detail; all were corrected with the comments that repeated them.
- `facts.md` first said the trainer's key sets `$0202` and so withholds the ending. Reading the manual's skip instructions against the code showed the opposite: the game's own up-arrow and RESTORE sets it, and the trainer's Commodore key clears it. The same check found the listing calling `nmi_abort` unused, when `frame_tick` writes its low byte into the NMI vector with `LDX #$56`.
- The pages follow the contributor's story-first layout (Overview, Gameplay, Controls, Maps, Graphics, Music, Discoveries, About).
