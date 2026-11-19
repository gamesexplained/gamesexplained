# Super Wonder Boy in Monster Land — TODO

The game is at Silver: all 490,491 counted bytes have descriptions, every comment and every facts file has been audited on proven models, and a sample after the audit is recorded (`facts.md`, "Listing error rate"). That sample found 8 of 100 comments wrong, over the mark of three for its size; all eight were corrected with the notes that said the same things. A second sample would show whether the corrections brought the rate under the mark.

## Before Gold

- A person reads each tab, section by section, rewriting what reads as generated, cutting what is dull and adding what the run missed, and records the pass in `copy` (`AGENTS.md`, "Definition of done").

## Leads that stay open

- In loads 10, 28 and 29 a type-`$0F` creature that finds no free entity slot increments `$1BB0` (`$1AB1` plus X = `$FF`), the offset byte of the `BCS` at `$1BAF` in the resident display builder. The branch then lands on the `BPL` at `$1B63` instead of the `DEX` at `$1B62`, so the next time `$1B5B` meets an entity whose `$1AA0,X` is 6 or more it branches back to `$1B5D` with the same X, and nothing in that loop changes `$1AA0,X`. Read from the code, the game would hang there; see it in play (fill the 17 slots in one of those loads) before taking it to Discoveries.
- Load 19's second voice list at `$B455` points at `$B579` and then `$B600`; the sequencer ends a list at a zero low byte (`$22E9`), so the 110-byte pattern at `$B600`–`$B66E` never plays. Play it on the Sound section to hear what was cut.
- Every load's positive-type tables send types `$2D`–`$2F` to the first entity record, which is data; find whether any load can make an entity of those types.
- Load 22's flute trigger (`$9373`) copies the map's stride into its width, which opens the map's last 28 columns; the Maps tab could show the map before and after.
- The load-9 spot at column 43, row 6 (`$92F7`) makes the hero immune to enemy contact; Discoveries tells it from the code. Find whether play can reach it: the hero's highest jump near it ends at row 7.
- The hazard spots whose callback is `$72AB` (38, 31 of them in loads 19, 26 and 27) throw the hero back and start a recoil entity of type `$2B`; find whether it costs life.
- The key check at `$7960` takes the key and clears `$5284`, so the main loop goes to the tally; find what the player sees.
- In the two-player game the area setup at `$6C73` adds 8 to the first player's meter, while the first hourglass tick takes 8 from the selected player's. If it plays out that way, the second player starts each area a heart down and the first a heart up; see it in play with `$4DBC` set before taking it to Discoveries.
- The rectangle test at `$75E3` passes a box that ends where the other begins and fails one that begins at the other's computed right edge (`parts/resident/facts.md`). Find whether an enemy touches the hero a pixel sooner from one side in play.
- A wrong answer to the Sphinx runs `$BE38`; find what it costs.
- The six-step horizontal-input gate in loads 25–27 lets the hero's sideways speed change only on some passes; find what the player feels.
- The type-`$28` shape differs between loads 2–5 and 6–31; find what the object is.
- Load 19's `$9892` shows “Oh?”; no caller was found.
- Pages: the Graphics tab could name each creature on the sprite sheet from the load's messages, put the hero's walk, raised sword and attack frames in one moving row, and show the 17 room screens as a grid placed where the game uses them; How it works could draw the seven hourglass pictures from `$5127`–`$51B2`.

## For a later run

- Rebuilding the resident part's disassembler project needs its automatic labels carried into it first, or the export loses tracked bytes. The pre-audit maps are in each part's `work/` folder.
