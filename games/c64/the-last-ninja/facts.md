# The Last Ninja — verified technical facts

## Tape chapters and resident code

- The six steady gameplay captures have chapter letters A through F
  at `$0805`. `$0804` gives the next letter. It is B through F for
  the first five captures and A in the Inner Sanctum.
- In the Wastelands, the main loop tests `$02AF` at `$BD4D`.
  Setting it to 1 took the game to its transition at `$CE80`. The
  same edit before each of the next four transitions let the game's
  loader bring in all six chapters across the two supplied tapes.
- Comparing all six play snapshots shows `$53F9–$9DFF` holds
  18,951 byte-identical bytes, including the IRQ entry at `$554D`.
  The 352 bytes at `$CE80–$CFDF` also match. The Wastelands loop
  waits at `$BD14`, while the Wilderness waits at `$BCBE`. The
  identical ranges establish shared bytes only. The precise memory
  ranges written by each tape load are open.
- Holding right on port 2 for 24 PAL frames changed sprite 1's
  coordinates in each capture.

| Chapter | Before | After |
|---|---|---|
| Wastelands | `$6C/$82` | `$84/$83` |
| Wilderness | `$18/$8E` | `$30/$8F` |
| Palace Gardens | `$18/$A0` | `$21/$A1` |
| Dungeons | `$18/$9E` | `$30/$9F` |
| Palace | `$55/$AF` | `$6D/$B0` |
| Inner Sanctum | `$9C/$98` | `$B0/$98` |
