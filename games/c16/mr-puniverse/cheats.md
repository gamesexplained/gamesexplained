# Mr Puniverse — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

All but the last two are Plus/4 World's, for this version of the game
(`orientation.md`), entered in the machine-language monitor.

| Effect | Poke | Status |
|---|---|---|
| Unlimited lives: a death takes nothing off the lives | `>3367 BD` (the `DEC lives,X` in `death` becomes `LDA lives,X`) | live: the lives stayed 8 after D |
| Unlimited energy: the EGY bar never moves | `>33AB AD` (the `DEC energy_count` in `energy_tick` becomes `LDA`) | live: a bar poked one step from empty stayed there for 700 frames |
| Invulnerability: nothing in `player_pass` or `clock_tick` kills him | `>25C5 60` (an `RTS` where the shared exit to `death` starts) | live: a force field poked into his cell did not kill him; without the poke it did |
| The number of vitamins that ends the game | `>281E C9 ##` (the `CMP #$19` in `collect_vitamin`; `##` in hex) | live: with `01`, room 0's vitamin ended the game |
| Walk left through walls, fast | `>2172 39` (the `SEC` in `move_left` becomes `AND $04E9,Y`, which swallows the `SBC #$04` after it) | live: left took him out of room 0's left wall to the row above's right end |
| Move the upper cannon of room 14 out of the way | `>15F3 B9` (the low byte of its address, in room 14's record: `$0DB2`, row 10 column 34, becomes `$0DB9`, row 11 column 1, inside the wall) | candidate: the record read in the emulator draws the cannon in the wall at the left; room 14 not played |
| Restart the game | `G 1AF4` (`entry`, the jump to `new_game`) | traced |
| Restart the game from BASIC after a break | `FORX=0TO3:POKE512+X,0:NEXT:SYS6900` | candidate: `SYS 6900` is `entry`; nothing in the game reads `$0200`-`$0203` |
| Start a room's play with the vitamin count you like | `$0355` = the count, before the vitamin is taken (`vitamin_count` for player 1, `$0356` for player 2) | live: 24, then one vitamin ended the game |
| Stand anywhere: put him in room *r*, at screen address *a* | `$0347` = *r*, `$0341`/`$0343` = *a*'s low and high bytes, then `G 32A5` (`room_start`) | live: every room test in `facts.md` |
