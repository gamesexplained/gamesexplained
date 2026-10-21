# Tycoon Tex — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Unlimited lives: a death takes nothing off TYCOONS | `$249D` = `$AD` and `$24A0` = `$A5` (the two `DEC` instructions at the end of `tex_death`, for the digit on the screen and for `lives`, become loads) (Plus/4 World) | live: nine deaths running right on level 2, TYCOONS still 3 |
| Invulnerability: enemies and breaks do not kill Tex | `$1EB7` = `$00` and `$1EEC` = `$00` (the `LDA #$01` before `tex_hit` in `draw_tex` and in `check_hole` load 0) (Plus/4 World) | live: no death in 1,500 frames of level 2, running or standing, five times |
| A level needs less filling | `$2255` = the number of % COMPLETED cells, `$1A` (26) as loaded (the `CMP` in `add_completed`) (Plus/4 World) | live: with 2, level 2 was complete after 522 frames of running |
| Start on any level | `$2A0B` = `$20 $E3 $36` and `$36E3` = `$A9 nn $85 $62 $CA $60`, where `nn` is the level before the one wanted, in decimal digits (`$09` for level 10, `$19` for 20): `start_game` calls a patch in the unused bytes at `cheat_space` that sets `level` (Plus/4 World) | live: with `$09` the game began on level 10 with all four enemies |
| Finish the level at once | `$9D` = `$01` in play (`level_done`; the main loop runs `level_complete`) (Plus/4 World) | live |
| Restart the game from its first instruction, keeping the high scores | `G 1800` in the machine-language monitor (`start`) (Plus/4 World) | traced |
| Choose the difficulty's speed directly | `$68` = the main loop's pause (24, 16 or 8 for EASY, HARD and IMPOSSIBLE) and `$69` = passes for each eighth of pressure (24, 19 or 14), in play; `next_level` sets them again at the next level | live |
