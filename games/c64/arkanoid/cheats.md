# Arkanoid — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Lives never go down | `POKE 39801,189` (`$9B79` = `$BD`: `STA $0936,X` becomes `LDA $0936,X` in the lost-life path) | live: three lost balls left the lives at 3 |
| Lives for player 1 (BCD, `$99` means none) | `POKE 2358,<n>` (`$0936`) | candidate: written by `$F1D2`, `$9B73`, `$A882`, `$FAA5` |
| Start the next round from round r | in play, `POKE 2365,r-2` (`$093D`, the 0-based round index of player 1) and `POKE 1109,1` (`$0455`, bricks left): the next brick broken ends the round | live: rounds 2, 3, 4, 10, 18 and 33 reached |
| Round 33, Doh | as above with `POKE 2365,31` | live |
| Speed of the ball | `POKE 570,<n>` (`$023A`, steps a frame, at most 11) | candidate: read every frame by `$ADB3` |

The published `SYS 4096` that goes with the lives poke lands in unused leftover
code in this image (`$1000`); the poke works on a game that is already running.
