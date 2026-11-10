# Aztec Challenge — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

The game has no cheat keys or codes of its own: nothing reads the keyboard
in play but RUN/STOP, and the menu reads only F1 and F3 (`$1B1A`).

| Effect | Poke | Status |
|---|---|---|
| Start on any level: on the scorecard, before pressing fire, set player 1's level digit | `POKE 3,48+n` (n = 1-7; player 2: address 4) | live: every level reached this way (`orientation.md`) |
| Start in any phase, phase 4 being the night | `POKE 5,48+n` (n = 1-4; player 2: address 6) | live: all seven levels played in phase 4 |
| Win the Gauntlet at once: in play, set the progress stage to 8 and the step counter to 1 | `POKE 69,8: POKE 70,1` | live: the level ended won, 1,010 points with no life lost |
| Forget the lives lost on this level | `POKE 2,0` | candidate: `$02` is read only at `$1300` and by each level's count of losses |
