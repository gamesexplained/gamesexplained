# Stunt Car Racer — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Draws more of the track ahead: 8.2 pieces a pass against 4.0, and a pass takes 8.8 frames against 7.1 | `$173E` = 6 (the count in `LDA #$02` at `$173D`, DRAW_VIEW) | live, 4 November 2026 |
| A league race's start-line crossings: fewer is a shorter race | `$C354` (set to 4 by CLEAR_RACE at `$3E77`, so the poke has to go to `$3E78`) | candidate |
