# Rampage — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`
(`work/entry.vsf`, the hand-over at `$8314`).

## Build

Activision's European disk of 1987, as a G64 bit image
(`orientation.md`). Seven of its files stay in memory: `PART4`
(`$0400`-`$4000`), `PART8` (`$4000`-`$67FF`), `PART5` (`$6800`-`$CBFF`),
`PART3` (copied to the RAM under the I/O area, `$D000`-`$DFFF`), `PART7`
(`$E000`-`$F5FF`) and the second half of the last loader stage, the music
driver at `$0200`-`$03FF`. Nothing is loaded once the game runs.

The program carries no version number and no credit. The newspaper
screen's bottom line reads `PRESS FIRE TO JOIN THE ACTION`.

## Memory layout

| Thing | Where |
|---|---|
| Zero page variables: controls, the monsters' positions, frames and states, helicopters, pointers | `$02`-`$A5` |
| Music driver: entries, variables, the tune table, the code | `$0200`-`$0575` |
| Tune 0, three voices | `$0576`-`$09E6` |
| The first voice of a second tune, never played | `$09E7`-`$0AFF` |
| Scenery: 25 rows of 79 characters (two skylines, the ground, the street and the weak road's pieces) | `$0B00`-`$12B6` |
| Colour of every character: the city's set, the text set | `$1300`, `$1400` |
| Tile address tables for the monsters' pictures | `$1500`-`$1BFF` |
| Six frame tables: 38 frames of 36 tile numbers, three characters facing left and right | `$1C00`-`$3C0F` |
| `block_chars`: the four characters of each of 200 building blocks | `$3C10`-`$3F2F` |
| Six sets of 256 monster tiles, 8 bytes a tile | `$4000`-`$6FFF` |
| Twenty pictures of 8 by 8 characters for the text screens | `$7000`-`$74FF` |
| The six building maps, 64 bytes each, working copies | `$7500`-`$767F` |
| Interrupt handlers and the sprite multiplexer | `$7800`-`$80D4` |
| Level start, the blimp, sound effects | `$80D5`-`$8313` |
| `game_start`, the main loop, the monsters' states, vehicles, helicopters | `$8314`-`$8ED7` |
| Controls, level tables, `frame_work`, drawing the city, status lines, scores, energy | `$8ED8`-`$9DF7` |
| Bullets, window things, punches on buildings | `$9DF8`-`$A825` |
| Text screens: items, newspaper, game over; headlines and texts | `$A826`-`$B280` |
| Collapsing buildings, the computer's play, building the monsters' pictures | `$B281`-`$B51F` |
| Three unrolled routines that copy a monster's picture into its sprites | `$B520`-`$CB12` |
| The monsters' picture buffers, 48 rows of 6 bytes each | `$CCA0`, `$CDC0`, `$CEE0` |
| 64 sprite shapes (helicopters, blimp, vehicles, wrecks) in the RAM under the I/O area | `$D000`-`$DFFF` |
| The city's character set | `$E000`-`$E7FF` |
| The character set of the status lines and text screens | `$E800`-`$EFFF` |
| Four sprite shapes: a helicopter's explosion | `$F000`-`$F0FF` |
| The monsters' sprite shapes, built as the game runs | `$F280`-`$F3FF`, `$FC00`-`$FEFF` |
| The two screens | `$F400`, `$F800` |

Banking: `game_start` writes `$25` to `$01`, which the processor port
reads back as `$35`: all RAM with the I/O chips in. The video chip uses
bank `$C000`-`$FFFF`. The game owns the hardware vectors at
`$FFFA`-`$FFFF`: NMI `nmi_handler` (`$7800`), reset `reset_rti`
(`$785C`), IRQ `irq_top` (`$789A`) and its successors.

Many variables live inside the code, as the operand of the instruction
that uses them: a handler's sprite Y, a copy loop's source address. The
listing names each one where it lies.

## Timing

- `irq_top` runs once a frame at raster line 0 and counts `frame_count`
  (`$02`) down twice. *Live:* 5,998 runs in 6,000 frames.
- **A pass of the main loop takes about ten frames.** `main_loop`
  (`$8487`) does a whole pass of rules and redraws the whole screen, then
  waits for `frame_count` to change. *Live:* 576 passes in 6,000 frames
  with three monsters on screen (10.4 frames a pass, about 4.8 passes a
  second on a PAL machine).
- Each pass runs every monster's state routine three times: once from
  `main_loop` and twice from `frame_work` (`run_monsters`, `$9DFE`). A
  "step" below is one of those runs, so there are about fourteen steps a
  second.
- Helicopters, the street vehicle and the rotor animation move from the
  interrupt (`last_irq`, `$7B4A`), once a frame or once every two.
- The newspaper screen stays up for a fixed count, about 15,000 turns of
  `join_screen_tick` (`join_wait`, `$AA84`), whoever joins.

## Controls

`read_inputs` (`$8F1C`) fills five bytes for each monster.

| Monster | Controls |
|---|---|
| first (George unless changed) | joystick in port 2 |
| second (Lizzie) | joystick in port 1 |
| third (Ralph) | keys: `,` left, `/` right, `@` up, `:` down, `=` fire |

- A monster nobody joined as is steered by `ai_input` (`$B380`): out of
  256 calls about 6 press fire alone, 50 choose new directions and 200
  keep the old ones, with fire pressed about two times in nine.
- RUN/STOP, once let go, resets the game to the title. Q and the
  Commodore key are read every pass and never looked at. A pause loop
  exists (`pause_wait`, `$8FEC`) and nothing sets the flag that enters
  it.
- On the newspaper screen before the first level, up and down on port 2
  rotate the three characters round the three players, and up and down
  on port 1 swap the second and third (`join_screen_tick`, `$AC36`).
- The COLLECT ITEMS screen ends on any of the three fire buttons
  (`wait_fire`, `$AA97`).

## Graphics

**Screens.** Two text screens, `$F400` and `$F800`, drawn by turns:
every pass redraws the hidden one from nothing (scenery, buildings,
status lines, window things, weak road) and `flip_screens` (`$929D`)
shows it and copies each cell's colour from `city_colours` into colour
memory. Rows 0 to 2 are the status lines in the text character set;
`nmi_handler` switches to the city's set on CIA 2's timer A, about 73
lines down.

**The monsters.** Each monster is a picture 48 pixels (24 multicolour
pixels) wide and 48 lines tall, made of 36 tiles in six rows of six. A
frame is 36 tile numbers (`george_left_frames` and the five tables after
it); a tile is 8 bytes from the character's own set of 256. There are 38
frames for each character and each facing. `build_monster_frame`
(`$B3F6`) copies the tiles into the monster's buffer whenever its state
routine has run, and `irq_top` copies one monster's buffer into its
sprite shapes each frame (`compose_0`, `compose_1`, `compose_2`), so a
monster's sprites are refreshed every third frame.

**The sprite multiplexer.** Sprites 2 to 7 are the monsters, two side by
side for each. A picture needs three rows of sprites, so each pair is
moved down twice in a frame. `last_irq` (line `$F9`) works out, for each
monster, three lines at which to change the pair (Y + `$12`, `$23`,
`$32`), sorts all nine, and writes them into the operands of nine
handlers, `irq_row_1` to `irq_row_9`. When two lines are within two of
each other it turns the first handler's `BIT` into a `JMP`, so that one
interrupt does both. A sprite's shape number is changed a few lines
before the sprite has finished, so the shape it is changed to carries
the tail of the row above: the middle shape's lines 17 to 20 repeat the
buffer's rows 17 to 20, and the bottom shape's lines 13 to 20 hold rows
34 to 41.

**Sprites 0 and 1** do three jobs a frame: at the top of the screen two
helicopters crossing the status lines (or the blimp, while it carries
the monsters in); from timer A's interrupt the two mid-screen
helicopters; from timer B's, about 215 lines down, the two halves of the
street vehicle at Y `$E4`.

**Buildings.** A building is a map of block codes, a block being two
characters by two (`block_chars`, `$3C10`). Six templates
(`template_0`-`template_5`, `$9A0D`) are copied into the level's maps.
A punch changes a block's code through `damage_code` (`$A73F`): a window
half breaks, a wall piece becomes one of four holes. A falling
building's codes each have `$64` added, which gives the ruined form of
the same block.

## Mechanics

**Monster states** (`state_lo`, `state_hi`; `run_monster`, `$84D5`):

| State | Routine | What it is |
|---|---|---|
| 1 | `state_on_foot` | on the street or a roof: walk 4 pixels a step, jump, punch, start a climb |
| 2 | `state_punch` | punch from the street, held while fire is down |
| 3 | `state_climb` | on a wall: 4 pixels a step up or down; fire alone lets go |
| 4 | `state_climb_punch` | punch from a wall, held while fire is down |
| 5 | `state_jump` | 17 steps of 4 pixels along, the height from `jump_dy` |
| 7 | `state_knocked` | punched by another monster: 9 steps back, a hit each step, then a fall |
| 9 | `state_shrink` | out of energy: 63 steps of the change back to a human |
| 10 | `state_walk_off` | the human walks off the screen |
| 11 | `state_wait` | no control pressed |
| 12 | `state_fall` | 8 pixels a step, a hit each step |
| 14 | `state_eat` | 21 steps of chewing |
| 15 | `state_gone` | out of the game |

States 6 and 8 are a bare `RTS` and state 13 a second eating animation;
nothing sets any of the three.

**Punches.** A punch from the street (state 2) is tested against the
other monsters, the vehicle and the helicopters, never a building. Only
a punch from a wall (state 4) reaches a building: on every pass that
finds a monster in state 4, `eat_or_damage` (`$A5BA`) looks for a window
thing where the punch lands and then `damage_building` (`$A62F`) changes
the block there.

**Energy.** Each monster starts a game with 56 (`start_energy`). Hits are
flags: however many land in a pass they count once (`hit_flag`), and
every second counted hit costs one energy (`apply_damage_one`,
`$9B9B`). Energy is never given back, by eating or by a new level.
What hits: a bullet, each step of a fall or a knock-back, standing in
the weak road's hole, and a building that falls while it is the one the
monster last climbed.

- *Live:* a monster ate for 70 frames with its energy at 40 before and
  after, and no score added.
- **A building hurts whoever climbed it last, wherever they are.**
  `collapse_buildings` (`$B281`) throws into a fall every monster whose
  `climb_building` is the falling building's number, on every pass the
  building sinks. `climb_building` is set when a climb starts and never
  cleared, not even by a new level. *Live:* George, standing on the
  street, lost 5 energy while building 0 fell with `climb_building` 0,
  and 1 with it set to another building.
- **The third monster cannot be shot.** `move_bullets` tests each bullet
  against three boxes; the third box's hit sets the second monster's
  flag (`bullet_hits_third`, `$9F66`). *Live:* a bullet at column 25,
  row 21, inside the third monster's box, set `hit_by_bullet_1` while
  the second monster stood nine columns away.

**Status lines.** Row 0 a name, row 1 a score, row 2 the word `DAMAGE`
(`draw_status`, `$994A`). `energy_bars` (`$9C62`) colours energy / 8 + 1
of its letters white from the left and the rest red, so the word turns
red from the right once energy is under 40. Out of energy, the name
becomes `GAME` and the word `OVER`.

- When the first player's energy is 0, `energy_bars` skips the second
  player's letters: the second word shows all red whatever that
  monster's energy. *Live:* colours all 2 with energy 50.

**Score.** Six digits; `add_100` (`$98F2`) is the only routine that
changes one, and `damage_building` its only caller that is reached: 100
for each punch that changes a block. The tens and units never change. A
score that passes 999,900 carries into a character past `9`.

**Buildings and the end of a level.** Each building has a strength, the
damaging punches it can take (`type_strength`: 10, 12, 8, 4, 10, 9 by
type). At 0 it crumbles for 15 passes and then loses a row of height
each pass (`collapse_buildings`). Every sixteenth pass `end_of_pass`
(`$926F`) looks for a building still standing; with none, the level
number goes up, wrapping from 20 to 0, and the newspaper screen leads to
the next level. `game_start` runs again for every level.

- `draw_rubble` (`$B2DF`) sets the screen's fine scroll to a random 0-7
  on each pass a building has no strength, which shakes the city, and
  nothing sets it back until the next level. *Live:* `$D016` read `$D8`
  before any building fell, `$DB` and `$DF` after one had.

**Window things.** `spawn_window_thing` (`$A0CF`) puts one thing a pass
at a place taken from a counter; it stays only where a punch has opened
a hole. Twelve kinds: eleven things and a person. A person turns and
fires a bullet every eighth time it is drawn (`person_fire`, `$9FCE`).
Eating any of them does the same thing: the chewing animation.

**Helicopters.** Two fly set paths in the middle of the screen
(`heli_paths`, eight paths chosen at random). Helicopter A fires while
on a diagonal (`heli_fire`, `$9E26`); B never does. A punch near one
sends it down path 8, the explosion.

- The explosion's shapes have the rotor's frame added like any other
  shape. *Live:* an exploding helicopter showed shapes `C1 C2 C2 C3 C3
  C2 C2 C1 C1 C0`, then `C0 C2 C2 C3 C3 C4 C4 C3 C3 C2 C2`, then `C2 C2
  C3 C3 C4 C4 C5 C5 C4 C4 C3 C3`; `$C4` and `$C5` are blank.

**Vehicles.** `new_vehicle` (`$8CA9`) picks one of sixteen: cars, trams
and tanks, from the left or the right, one or two units a frame. A punch
with down and fire wrecks a car or a tank and makes a tram drive faster
(`punch_vehicle`, `$8B40`). Vehicles do no harm.

- Vehicle 15 is the right-facing car started at the right edge with a
  step of -1. *Live:* forced, it crossed the screen backwards.
- The wreck's second frame takes its left half from the first frame's
  right half (`$79`) and its right half from shape `$BB`, which is
  `$EEC0`, part of the text character set (`wreck_shapes_l`,
  `wreck_shapes_r`). *Live:* seen on screen.

**The weak road.** On levels 3, 11 and 19 (`level_init` gives the road to levels where `level` + 1 has bit 2 set, and `weak_road` does nothing on the second scenery) a stretch
of street, X `$2C`-`$43`, gives way when a falling monster lands on it
(`weak_road`, `$9858`). A monster in the hole is hurt every step.

**Demo.** With no player joined, `demo_mode` is 1: the computer plays
all three, nothing loses energy, a fire button returns to the title.

- **Hidden names.** In demo mode on the nineteenth level (`level` =
  `$12`) the three names read `RHONA`, `I LOVE`, `YOU`
  (`secret_names`, `$90E4`). *Live:* with the level set to `$12` before
  `level_init` ran (`reference/hidden-names.png`). Reaching it without a
  poke needs the computer to clear eighteen levels alone; in a
  twelve-minute run in the emulator's warp mode it brought down one
  building of the first level's three.

## Data tables

**Alphabets.** Status lines and headlines: A is character `$09`, space
`$51`, full stop `$4A`, digits `$40`-`$49`. Text screens (items,
instructions): A is `$23`, space `$00`.

**Building types** (`type_columns`, `type_rows`, `type_strength`,
`type_top_y`):

| Type | Blocks wide | Rows of characters | Strength |
|---|---|---|---|
| 0 | 4 | 8 | 10 |
| 1 | 5 | 14 | 12 |
| 2 | 4 | 10 | 8 |
| 3 | 4 | 6 | 4 |
| 4 | 5 | 10 | 10 |
| 5 | 4 | 12 | 9 |

**Levels** (`level_types`, `level_columns`): each level lists its
buildings as a type and a first screen column. Levels with bit 2 of the
number set use the second scenery (`draw_scenery_alt`, `$9746`).

| Level | Scenery | Buildings (type at column) |
|---|---|---|
| 0 | first | 0 at 10, 1 at 4, 2 at 26 |
| 1 | first | 4 at 4, 5 at 12, 0 at 24, 0 at 6, 2 at 18 |
| 2 | first | 2 at 4, 1 at 16, 0 at 30, 5 at 6, 3 at 20 |
| 3 | first, weak road | 4 at 2, 5 at 16, 0 at 10, 0 at 28 |
| 4 | second | 4 at 26, 2 at 4, 0 at 20 |
| 5 | second | 5 at 10, 3 at 22, 0 at 4, 2 at 16, 1 at 28 |
| 6 | second | 4 at 8, 5 at 22, 1 at 4, 1 at 26 |
| 7 | second | 0 at 6, 0 at 18, 5 at 12, 3 at 30 |
| 8 | first | 3 at 26, 5 at 16, 3 at 4, 1 at 22, 2 at 10 |
| 9 | first | 5 at 14, 4 at 26, 1 at 6, 0 at 30 |
| 10 | first | 3 at 26, 2 at 4, 5 at 10 |
| 11 | first, weak road | 2 at 30, 0 at 18, 0 at 6, 5 at 24, 3 at 12, 4 at 0 |
| 12 | second | 3 at 20, 5 at 6, 0 at 30, 1 at 16, 2 at 4 |
| 13 | second | 0 at 28, 0 at 10, 5 at 16, 4 at 2 |
| 14 | second | 0 at 20, 2 at 4, 4 at 26 |
| 15 | second | 1 at 28, 2 at 16, 0 at 4, 3 at 22, 5 at 10 |
| 16 | first | 1 at 26, 1 at 4, 5 at 22, 4 at 8 |
| 17 | first | 0 at 30, 0 at 12, 5 at 18, 3 at 6 |
| 18 | first | 2 at 10, 1 at 22, 3 at 4, 5 at 16, 3 at 28 |
| 19 | first, weak road | 0 at 30, 1 at 6, 4 at 26, 5 at 14 |

The tables have entries for levels 20 and 21, both a single building,
which `end_of_pass` never lets the level number reach.

**Headlines** (`headline_lo`, `headline_hi`): `READY FOR ACTION` for a
player not joined; `...CURED.... GO BACK TO NORMAL LIFE` for one who is
out; for one playing, one of eight by (strip + level) EOR 3 AND 7:

| | Headline |
|---|---|
| 0 | HINT... WANT TO EAT. WELL PUNCH SLOWER |
| 1 | HINT... JUMP WHEN YOU SEE DUST CLOUDS |
| 2 | SPOUSE OF MUTANT FILES LEGAL ACTION |
| 3 | OVER GROWING CONCERN OVER MEGA VITAMIN |
| 4 | EX?ERIMENTAL VITAMIN HAS ILL EFFECTS (the P is byte `$FB`, a piece of a picture; *live*, `reference/headline-misspelt.png`) |
| 5 | WOMAN FINDS LAKE TO BE RADIOACTIVE. |
| 6 | UNUSUAL FOOD ADDITIVE MAY BE RECALLED |
| 7 | SUSPECTED.. POLLUTION OF WATER SUPPLY |

**Text nothing prints:** `MISS YOU` and `CUDDLE WHUMP FLUMP DUNKS`
(`unused_text`), `THEN PRESS FIRE` (`unused_then_fire`), `ONE`, `TWO`,
`THREE` (`unused_numbers`), `HIGH SCORE` and `GAME SCORE`
(`unused_high_score`, `unused_game_score`).

**Code nothing reaches:** `update_sound`, `high_score_update`,
`high_score_print`, `print_hex` (a hexadecimal printer and six test
bytes), `set_level_lists`, `strengthen_all`, `test_shot`, `test_thing`,
`add_500`, `street_punch_back`, `text_random`, `bad_state` (flashes the
border on a state number out of range), `climb_cell_tests` (a list of
wall characters that a `JMP` at `$87D7` skips, so a climb is never
refused for what is beside the monster).

**Left in the file.** The building maps at `$7500`-`$763F` hold a game
in progress, from before the program was saved: lit windows, a broken
one, and two buildings whose codes are all in their ruined forms.
`climb_building` holds 1, 1 and 2.

**Other slips.**

- `compose_0`, `compose_1` and `compose_2` each load the wrong byte once
  (`$B556`, `$BCA7`, `$C3F8`): the fourth byte of the picture's second
  line is taken from its first byte. The two differ only in frames `$18`
  and `$19` facing left, the raised fist, which loses one byte of its
  second line.
- `damage_code` gives roof ends the values `$88`, `$89` and `$8A`, and
  `damage_building` keeps only the low three bits, so they become blocks
  `$54`, `$55` and `$56`, pieces of wall and window, where `$5C`, `$5D`
  and `$5E` follow on from the roof pieces before them.
- `damage_building` joins a new hole to one above it, but never to one
  below: the pointer it would use, `below_ptr`, is never given its low
  byte.
- `eat_or_damage` means to test a square of four characters for
  something to eat; a missing `TAY` makes it three in a row.
- `flip_screens`' copy for `$F800` reads row 21's characters from the
  other screen (`$F748` at `$93A5`), so that row's colours can be a pass
  out of date.
- `random_window` takes eight buildings in turn and there are six maps;
  turns 6 and 7 look at `$2980` and `$32C0`, inside two frame tables. No
  byte there holds a window code, so nothing is changed. *Live:* the
  frame tables were unchanged after 576 passes.

## Sound

**Music.** The driver at `$0200` (`play_frame`, `$0312`) is called once
a frame on the text screens only (`music_irq`, `$AD3B`); there is no
music in play. A voice's data is pairs of a length (an index into
`durations`) and a note (bits 3-6 the note, 0-2 the octave, bit 7 a
slide), with commands of `$80` and over: repeats, and writes to a SID
register or a driver variable. A 0 sends the voice back to its start.

- `tune_pointers` (`$0298`) lists three tunes. `start_tune` (`$AD0B`)
  starts with `LDX #$00`, so tune 0 always plays. *Live:* the COLLECT
  ITEMS screen called it with X = 1 and the newspaper with X = 2.
- Tune 1's first voice is whole at `$09E7`-`$0AFF`. Its other voices
  (`$0B0B`, `$0BF8`) and tune 2's three (`$0CF3`, `$0E12`, `$0F51`) point
  into the scenery rows.

**Effects.** `start_sound` (`$822F`) starts effect A on voice X from an
eight-byte record (`sfx_records`, `$82EC`): one write of the frequency,
envelope and control, with the filter on. Three are used:

| Effect | When |
|---|---|
| 0 | a punch damages a building; the weak road gives way |
| 1 | the helicopter fires; a building falls (voice 2) |
| 2 | a bullet hits a monster; a building falls (voice 1) |

`update_sound` (`$82AC`), which would sweep each effect's pitch and
filter and end it on time, is never called, so each effect is a single
burst that dies by its own envelope. *Live:* no run of it in 6,000
frames of play, in which `start_sound` ran 66 times. Effects 3 and 4 are
never started.

## The listing's error rate

## Live tests

All on VICE 3.14.0 (vice-mcp), 13 November 2026, from `work/entry.vsf`
or `work/play-day1.vsf`; the scripts are `work/scripts/t*.py`.

| Test | Result |
|---|---|
| Non-stopping checkpoints on 30 routines over 6,000 frames of play with random input (`t2.py`) | `irq_top` 5,998, `main_loop` 576, `start_sound` 66, `update_sound` 0, `add_100` 18; the unreached routines listed above all 0 |
| Memory after that run compared with the hand-over | scenery, colour tables, frame tables, blocks, tiles and pictures unchanged |
| Stop at `start_tune` from the hand-over, twice (`t1.py`, `t6.py`) | X = 1 on the items screen, X = 2 on the newspaper |
| Stop at `$9F66` in play (`t4.py`) | bullet in the third monster's box; `hit_by_bullet_1` went 0 to 1 |
| Stop at `state_eat` and watch until the state ends (`t3b.py`) | 70 frames; energy and scores unchanged |
| Level set to `$12` at `level_init` with nobody joined (`t5b.py`) | names `RHONA`, `I LOVE`, `YOU` |
| Level set to 7 at `newspaper_screen`, George joined (`t6.py`) | headline 4 with the wrong character |
| Bit 6 of `vehicle_flags` set with a vehicle on screen (`t15.py`) | shapes `$78/$79`, `$79/$BB`, `$7A/$7B`, `$7C/$7D` twice, `$FC` |
| A = 15 after `new_vehicle`'s random number (`t16.py`) | shape `$6A`, X falling by 1 a frame |
| Energy 1 and a hit for the first player (`t12.py`) | state 9 for 210 frames, 10 for 400, then 15; second word all red |
| Helicopter A put on path 8 (`t19.py`) | the shape sequence above |
| `building_strength` 0 for building 0, George on the street (`t18.py`) | 9 hits with `climb_building` 0, 1 with 5; `$D016` `$DF` after |
