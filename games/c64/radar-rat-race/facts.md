# Radar Rat Race — verified technical facts

Current truth for **this game**. Method and reusable C64 knowledge live in
`../../docs/c64-re-playbook.md`; agent rules live in `../../CLAUDE.md`. The feature
checklist and its verification status is `features.md`. Narrative
history, including wrong turns, is `history.md` — where
it disagrees with this file, this file wins.

Every routine and table named here carries a full description in
`annotations.jsonl`; this file is the overview. Unless marked *live*, a fact
comes from reading the code in `work/real_gameplay_confirmed.vsf`.

## Build

Identifies itself at `$FD7C`: **`COMMODORE V.02`**. The `.d64` holds exactly
one file (`RADAR RAT RACE`, 34 blocks). Qualify findings as V.02.

## Memory layout

| Thing | Where |
|---|---|
| 64KB RAM image in the snapshot | file offset **209**; `ram[addr] = data[209+addr]` |
| Colour RAM (1000 bytes, all ≤ 15) | file offset **70066**, in the VIC-II module |
| Screen RAM | `$0400`–`$07E7` |
| Charset (glyphs `$00`–`$7F` used) | `$3800` (`$D018=$1E`) |
| Radar sprite shapes | `$3C00` (pointer `$F0`), `$3C40` (pointer `$F1`) |
| Engine code | `$E037`–`$F561` |
| Mazes | `$F370`, `$F450` |
| Tables, strings, tunes | `$FC80`–`$FF25` |
| CPU vectors | `$FFFA`: NMI `$EE21` (an RTI), RESET `$E037`, IRQ `$EE10` |

The processor port is `$E5`: RAM at `$A000`–`$BFFF` and `$E000`–`$FFFF`, I/O
visible. `$3C80`–`$3FFF` is a byte-identical copy of `$FC80`–`$FFFF` that the
code never reads; the copies differ only at `$3E01`/`$FE01`, which is written
at run time. Render with a **white** background (`$D021=1` during play).

## Timing

The only clock is CIA1 timer A, latch `$411B` = 16,667 cycles: **about 59 Hz
on PAL** (61 Hz on NTSC). It is not the video frame rate. `irq_tick`
(`$EE10`) just sets `tick_flag` (`$7F`); every loop polls it. The main loop
clears the flag after each pass, so an overrunning pass drops a tick.

| Thing | Ticks | PAL seconds |
|---|---|---|
| Player move (half-cell) | 6, 4 in a SPEED RUN | |
| Red rat move | 6 (rounds 1–7), 5 (rounds 8–15) | |
| Grace before red rats move each life | 79 | 1.3 |
| One unit of TIME | 70, 35 in a SPEED RUN | |
| Full TIME bar (80 units) | 5,600 | 95 |
| Music loop | 320 | 5.4 |
| Pause before play / after death | 80 | 1.35 |

## Screen layout

| Region | Rows | Columns |
|---|---|---|
| TIME label and 10-cell bar | 1 | 3–19 (bar 10–19) |
| HI-SCORE / digits | 1 / 2 | 23 / 24–30 |
| SCORE / digits | 4 / 5 | 23 / 24–30 |
| Maze viewport (18×18 characters) | 3–20 | 3–20 |
| Radar panel (8×14 characters) | 8–21 | 23–30 |
| NEXT / MEAL / value, flashing X2 | 8 / 9 / 10 | 32–35, X2 at 37–38 |
| Spare-rat icons | 13–14 | 32 onwards |
| ROUND / number | 18 / 19 | 32 / 35–36 |
| Copyright | 23 | 3 |

*Live:* matches the reference screenshot `reference/gameplay-round1.png`.

## Two text alphabets

- **Inverted screen codes** for ordinary text: `A`–`Z` = `$01`–`$1A`, digits
  `$30`–`$39`, `$20` a solid block. Set pixels take the colour-RAM colour, so
  HUD text is white letters on a blue panel.
- **Bright banner glyphs**: `S`=`$1B` `P`=`$1C` `L`=`$1D` `;`=`$1E` `.`=`$1F`
  `C`=`$21` `E`=`$22` `D`=`$23` `R`=`$24` `U`=`$25` `N`=`$26` `O`=`$2B`
  `G`=`$3C` `A`=`$3D` `M`=`$3E` `V`=`$3F`. Used for GAME OVER, SPEED RUN, NO.,
  and the P / L / ; / . key diagram on the title screen.

## The maze

`maze_bitmap_a` (`$F370`) and `maze_bitmap_b` (`$F450`): **1 bit per cell,
32 × 56 cells, 4 bytes per row, 1 = wall**. Parameter set 0 (maze A) is used by
round indexes 0–2 and 7–10, set 1 (maze B) by 3–6 and 11–14.

`draw_maze_viewport` (`$E3E1`) paints a **9×9-cell window centred on the
player** into rows 3–20, columns 3–20, two characters per cell: `$7F` grey
wall, `$00` floor (white background), `$2A` yellow star glyph for anything
beyond the map edge. It runs on every player move and then draws cats, cheese,
the 2x marker and (while they are waiting or frozen) the red rats. The view
scrolls one character at a time.

**Two readers of one maze.** The red rats and the cheese placer test the bitmap
(`red_rat_can_step`, `place_meal_items`). The player's movement reads the
rendered screen one character beyond its tile (`read_screen_in_direction`,
probes `$059B`/`$05C5`/`$0613`/`$05C2`) and treats `$7F` and `$2A` as blocked.

## The cast is character graphics

2×2 tiles stamped at screen offsets `0, 1, 40, 41`:

| Codes | Graphic | Colour |
|---|---|---|
| `$40`–`$4F` | Rat facing up / right / down / left | player blue (6), red rats red (2) |
| `$50`,`$51`,`$52`,`$00` | Cheese wedge | yellow (7) |
| `$53` | Small "2x", put in the corner of the 2x cheese | red (2) |
| `$54`–`$57` | Star cluster (the Star Screen) | black |
| `$58`–`$5B` | Black cat | black |
| `$5C`–`$5F` | EEEK | |
| `$60`–`$63` | Radar blip: solid cell with a 4×4 hole in one corner | |
| `$64`–`$67` | Inverted rat = spare-rat icon | |
| `$77`–`$7E` | TIME bar cell fill levels | black |

**Hardware sprites are the radar's moving dots.** Sprite 0 = the player
(`$3C00`, 4×4 square, cyan); sprites 1–7 = the red rats (`$3C40`, 4×4 X,
purple), enabled to match the red rat count. Register = `(pos AND $FC)` + `$D0`
(X) / `$72` (Y), which lands world (0,0) on the radar's top-left pixel at one
pixel per half-cell. Cheese blips on the radar are characters. Cats never
appear on the radar. *Live:* `$D015=$0F` with three red rats; sprite 0 at
(236,190) for player (30,78).

## Actors

World coordinates are half-cells: X 0–63, Y 0–111. Everything that can be
eaten, stunned or collided with sits on even coordinates.

| Actor | State | Behaviour |
|---|---|---|
| Player | `player_x`/`player_y` (`$92`/`$93`), dir `$8F`, facing `$94` | Starts (`$1E`,`$64`). Never stops: the joystick picks between openings; at a wall it turns right, else left |
| Red rats | `red_rat_x`/`red_rat_y` (`$22`/`$2A`), count−1 in `$81` (3–7 red rats) | Spawn at `red_rat_spawn_x/y` (`$FDF3`/`$FDFA`), five at the bottom, two at the top. Greedy one-axis chase |
| Black cats | `cat_x_table`/`cat_y_table` (`$C2`/`$D2`), count−1 in `$0201` (8 or 16) | Static. **Kill the player on contact**; stun a red rat |

**Red rat AI** (`move_all_red_rats`, `$E088`): at each cell boundary,
`red_rat_chase_direction` suggests closing the gap to the player on one axis,
chosen per red rat by `red_rat_chase_axis` (`$FE01`) and flipped when level. The
suggestion is taken only if the bitmap says that cell is open; otherwise go
straight, else turn right, else turn left. Turning costs a move. No
pathfinding, no randomness.

**Collisions are exact position matches.** `player_collision_check`
(`$F344`) tests cats then red rats against the player, after the player moves and
again after the red rats move; any match sets `player_caught` (`$9A`).
`red_rat_hit_test` (`$E2A4`) stuns a red rat: **15** moves for a star, **7** for a
cat or another red rat. A stunned red rat spins in place. Nothing ever removes a
red rat.

*Live:* with the SPEED RUN red rats frozen at their spawn points, writing a cat's
coordinates into `player_x`/`player_y` cost a life (`lives` 2 → 1) and moved
play on to the next round (`round_index` 2 → 3), which is the caught-in-a-SPEED-RUN
path.

## Star Screen (the weapon)

Fire (joystick, or `S`) arms a burst of 3 (`star_burst_left`, `$96`). At each
following cell boundary `drop_star` (`$E910`) puts a star **one cell behind
the player**, provided the player didn't just turn, the cell behind isn't a
wall, TIME is above 0, and it isn't a SPEED RUN. Each star costs one unit of
TIME. The queue has 15 slots (`$52`/`$61`/`$70`); a star lives **50 player
move cycles** (about 5 s at the normal pace).

## Cheese, scoring, rounds

Ten cheese per round in `meal_x_table`/`meal_y_table` (`$AA`/`$B4`), placed
at round setup by `place_meal_items` (`$EEA8`) with `prng_next`: never in a
wall, never in the same radar cell as another cheese or a red rat spawn, never
exactly on a cat slot. **Slot 0 is the 2x cheese** (red "2x" corner). The
round is complete when `meals_remaining` (`$BE`, starts 9) is 0 and
`bonus_cheese_eaten` (`$BF`) is set.

| Event | Points |
|---|---|
| n-th cheese of this life, n = 1–9 | n × 100 (NEXT MEAL shows the next value) |
| 10th cheese of a life | 1,000 |
| Any cheese from the 2x cheese on (inclusive) | doubled until the life ends; X2 flashes |
| Each unit of TIME left at round end | 60 (6 ticks × 10) |

The score is BCD in `$E7`/`$E9`/`$EB`, displayed with a fixed trailing `0`.
**Bonus life: once per game**, when the middle byte is exactly `$20`
(20,000–20,990), latched by `bonus_life_latch` (`$99`). No single add exceeds
900, so the band cannot be skipped. The high score starts at 20,000.

Being caught resets the life (red rats to spawn, TIME 80, NEXT MEAL 100, doubling
off) but keeps the cheese already eaten.

## Round structure and SPEED RUN

`round_index` (`$E3`) runs 0–14 and wraps, so **round 16 plays exactly like
round 1**; `round_number_bcd` (`$E2`) is only the display.

| Index | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Round shown | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
| Red rats | 3 | 4 | 7 | 4 | 5 | 6 | 7 | 5 | 6 | 7 | 7 | 7 | 7 | 7 | 7 |
| Red rat move ticks | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 |
| Cats | 8 | 8 | 16 | 8 | 8 | 8 | 16 | 8 | 8 | 8 | 16 | 8 | 8 | 8 | 16 |
| Maze / cat template | A | A | A | B | B | B | B | A | A | A | A | B | B | B | B |
| SPEED RUN | | | ✓ | | | | ✓ | | | | ✓ | | | | ✓ |

Normal rounds keep a random 8 of the template's 16 cat positions
(`setup_cats`, `$EE57`). **A SPEED RUN** (`round_is_speed_run`, `$FF08`):
`speed_run_intro` (`$EB34`) plays first — yellow background, a red rat runs
across the maze window writing `SPEED  RUN` in its wake, then `NO.` and
`speed_run_number` (`$0210`). The round has all 16 cats, **red rats frozen at
their spawn points until TIME runs out**, no stars, the player moving every 4
ticks and TIME draining twice as fast. Being caught ends it (a life is still
lost) and moves to the next round.

**When TIME runs out** (checked every 40 ticks by `timeout_handler`, `$EAC0`):
no more stars; the player slows by one tick per check up to 18 ticks per move;
in a SPEED RUN the red rats are released. It never costs a life by itself.

## Randomness

`prng_next` (`$EE2E`): 11 shifts of a 16-bit register (`$0218`/`$0219`),
feedback `NOT(b15 XOR b1 XOR b0)` (65,534-state cycle), then a modulus by
repeated subtraction (exact only for divisors of 256) and ×2. Seeded `$11` at
power-on; `$0219` is never initialised. Stirred once per tick on the title
screen. **Round 1's layout is placed before the title screen waits**, at
power-on or game over, so the first game after loading always gets the same
round 1. *Live:* two separate boots gave identical meal and cat tables
(cheese X `3E 3C 0E 14 10 12 18 2A 20 28`, Y `04 36 00 1A 34 02 54 32 18 2C`).
A re-implementation of `prng_next`, `setup_cats` and `place_meal_items`
reproduces those tables exactly from `prng_lo=$11`, `prng_hi=$00`, and from no
other value of `prng_hi`; the artifact's placement demo runs that
implementation. Because nothing else calls `prng_next` during play, every later
round of the first game depends only on the number of ticks spent on the title
screen.

## Input

`read_controls` (`$ED8D`): joystick port 1 (`$DC01`) first; only if it is
completely idle, the keyboard.

| Input | Action |
|---|---|
| `P` / `.` / `L` / `;` | up / down / left / right |
| `S` or fire | release the Star Screen |
| `F1` | start, polled on the title screen at `$F000`; joystick-1 fire shares the same `$DC01` bit |

Directions: 0=up, 1=right, 2=down, 3=left. Controls are read only at cell
boundaries.

## Sound

`sid_register_init` (`$E01E`) sets every voice once: pulse wave, width
`$0800`, gate on, sustain 14, volume 0. **After that the only SID writes are
frequencies**, plus the volume set to 15 once when a game starts; frequency 0
is silence and a repeated pitch does not retrigger.

| Cue | Voice | Data | Rate |
|---|---|---|---|
| Three Blind Mice, background | 1 | `music_phrase_a` (`$FE5B`) ×3, `music_phrase_b` (`$FE6B`) ×1, each read backwards | 5 ticks/note |
| Game start fanfare (Three Blind Mice opening) | 1 | `tune_game_start` (`$FEAC`), backwards | 6 ticks/step |
| SPEED RUN intro | 1 | `tune_speed_run` (`$FE9C`), backwards | 10 ticks/note |
| Caught | 1 | rising sweep `$80`+4n | 1 tick/step, 16 steps |
| Star dropped | 2 | `$27xx` until the move countdown hits 3 | |
| Cheese eaten | 3 | `tune_cheese_eaten` (`$FE57`) | 4 ticks/note |
| 2x cheese | 3 | `tune_bonus_2x` (`$FE7B`), arpeggio | 1 tick/note |
| Low TIME (at 12) | 2+3 | `$1C`/`$2A`, four beeps | |
| Round complete | 3 | `tune_round_complete` (`$FE50`) | 12 ticks/note |
| Time bonus | 3 | `$80` blip per unit | |

Phrase A is `G C C B A B C G G`; stored high bytes only, so pitches are
approximate.

## Restarting the tools

```bash
script -q /tmp/r2000-tui.log ~/.cargo/bin/regenerator2000 --mcp-server radar-rat-race.regen2000proj
pkill -f "vice-mcp-gui/VICE.app"   # VICE, MCP on :6510
```

The project file holds every label and comment. To rebuild it from the
replay log instead: start the server on `work/real_gameplay_confirmed.vsf`,
run `python3 scripts/r2000_replay.py annotations.jsonl`, then
`python3 scripts/export_regen_project.py`.

Coverage: `python3 scripts/coverage.py [--top N] [--code] [--data]`.
Reference screenshots: `reference/`.
