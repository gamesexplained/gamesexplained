# RoboCop — cheats

Pokes and words that change the game within its own parameters. Each
names the variable or routine it uses and whether it has been tested
live. Untested pokes are labelled as candidates.

| Effect | Poke or input | Status |
|---|---|---|
| Skip to level two (stages four to seven), score cleared | type SUEDEHEAD on level one's title (level-1 `$F69E`, keys at `$F695`) | live, 17 November 2026 |
| Skip to level three (stages eight and nine), score cleared | type DISAPPOINTED on level two's title (level-2 `$B892`, keys at `$B886`) | live, 17 November 2026 |
| Start level two at stage six or seven | stop at `$80C5` (stage five's start) and set the program counter to `$814F` or `$8191` | live, 17 November 2026: both stages build and play |
| Full power in level one | power is `$07BA` (24 is full) | candidate |
