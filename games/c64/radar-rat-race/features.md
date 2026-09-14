# Radar Rat Race — feature checklist

Technical facts live in `facts.md`; reusable method in
`../../docs/c64-re-playbook.md`; agent rules in `../../CLAUDE.md`.

**Read this before annotating code.** It is the list of things the game is
known to do, from external documentation
([c64-wiki](https://www.c64-wiki.com/wiki/Radar_Rat_Race)) and from the game's
own title screen, with our verification status against the V.02 binary.

**Treat any documented feature you cannot find in the binary as an open
question, never as absent.** This game stores text in two alphabets and names
a player ability in a control legend, so a feature can be present and still
invisible to a naive search.

Status words: **confirmed** = traced in the code; **live** = also observed in
the emulator; **differs** = the code does something other than the
documentation says.

## The cast

The wiki calls the player and the chasers mice. The game's own text says RAT
(MOVE RAT, BONUS RAT) and the artwork cannot tell a rat from a mouse, so
everywhere else in this project they are the rat (the player) and the red
rats (the chasers).

| Wiki name | What the code does | Our binding |
|---|---|---|
| **Blue mouse** | the player; the game's own text calls it the RAT | `player_x`/`player_y` (`$92`/`$93`); tiles `$40`–`$4F` in blue |
| **Red mice** | 3–7 chasers; contact kills the player | `red_rat_x`/`red_rat_y` (`$22`/`$2A`), count−1 in `$81`; the same tiles in red |
| **Black cats** | 8 or 16 static cats, shown only in the maze view; contact **kills the player** and stuns a red rat | `cat_x_table`/`cat_y_table` (`$C2`/`$D2`); tile `$58`–`$5B` |

## Features

| Feature | Status |
|---|---|
| F1 starts the game | **confirmed** — `attract_wait_for_f1` polls it at `$F000`; joystick-1 fire shares the bit |
| P / `;` / `.` / L = up / right / down / left | **confirmed** — `read_controls` (`$ED8D`), joystick first, keyboard only when the stick is idle |
| S (or joystick fire) releases the Star Screen | **confirmed** — a burst of 3 stars, dropped one cell **behind** the player, one per cell, each costing a unit of TIME |
| Star Screen temporarily disables followers | **confirmed** — a red rat landing on a star is stunned for 15 of its moves, then carries on |
| Collect all cheese to finish the round | **confirmed** — 10 cheese; the round ends when the 9 ordinary ones and the 2x one are gone |
| Cheese scores 100, then 200, rising per slice | **confirmed** — n-th cheese of a life scores n×100, the 10th 1,000; NEXT MEAL shows the next value; resets when a life is lost |
| "2×" cheese doubles | **confirmed** — meal slot 0 has a red "2x" corner; from it onwards every cheese scores double until the life ends, and X2 flashes on the HUD |
| Remaining time converts to points at round end | **confirmed** — `time_bonus` (`$F190`), 60 points per unit of TIME left |
| Extra life for 20,000 points | **confirmed** — once per game (`bonus_life_latch`); the title screen's own wording, BONUS RAT FOR 20000 PTS, doesn't promise more |
| Constant background melody | **confirmed** — Three Blind Mice, `music_tick` (`$EA2B`) |
| SPEED RUN bonus stage | **confirmed** — rounds 3, 7, 11 and 15 of every 15-round cycle: intro banner, 16 cats, frozen red rats until TIME runs out, no stars, faster player |
| GAME OVER banner | **confirmed** — `game_over_banner` (`$F328`), `str_game_over` (`$FD2B`) |
| Sound effects for cheese, crash, level complete, Star Screen | **confirmed** — every cue mapped to its trigger (see the sound table in `facts.md`) |
| Rounds add more red rats | **confirmed** — 3 → 7 across the 15-round table; red rats also get faster from round 8 |
| Rounds add more cheese | **differs** — always 10 |
| Black cats only delay | **differs**, **live** — in V.02 a cat kills the player (`player_collision_check`, `$F344`, treats cats and red rats identically); only red rats are delayed by cats. Placing the player on a cat during a SPEED RUN (red rats frozen elsewhere) cost a life and ended the SPEED RUN |
| Black cats hide behind corners | **confirmed** in effect — cats are never drawn on the radar, only in the 9×9-cell maze view |
| Radar | **confirmed**, **live** — cheese as character blips; the player and red rats as hardware sprites 0–7 |

## Beyond the documentation

Found in the code, not in the manual or wiki:

- The player never stops; at a wall it turns right, or left if right is
  blocked.
- Difficulty repeats every 15 rounds: round 16 plays like round 1.
- Running out of TIME never costs a life. It stops the stars and slows the
  player (in a SPEED RUN it releases the red rats).
- Being caught in a SPEED RUN ends it and moves on to the next round.
- Round 1's cats and cheese are placed before the title screen waits for F1.
- `new_hiscore_flag` (`$0217`) is set and never read.

## Open questions

1. Does a black cat kill the player in real play? The code is unambiguous;
   a live confirmation is still wanted.
2. What the two filler bytes `$08` at `$FF7D` and `$F1` at `$FF7F` are.
   Nothing reads them.

Answered: the first round after loading has the same layout every time. It
depends only on `prng_hi` (`$0219`), which the game never initialises, and two
independent boots in VICE (the saved snapshot and a fresh process) produced
byte-identical cheese and cat tables.
