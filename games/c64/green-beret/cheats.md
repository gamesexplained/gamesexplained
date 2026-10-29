# Green Beret — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Nine lives | `POKE 947,9`: `lives` (`$03B3`) set to 9 in play; the status line shows it at the next death | live: from `work/play-stage1.vsf`, two deaths later `lives` was 7 and the status line read `LIVES 7` |
| The hero cannot be killed | `POKE 3105,96` and `POKE 15459,96`: an `RTS` at `player_killed` (`$0C21`) and at `mine_check` (`$3C63`) | live: used to keep the hero alive through the jet's timing test (`facts.md`, Live tests); the end-of-stage fights still need the enemies killed to end |
| The hero hangs in mid-air | no poke: hold key 1 during a jump (`irq_player` skips the hero's movement and the scroll while it is down) | live, and on the Discoveries page |
