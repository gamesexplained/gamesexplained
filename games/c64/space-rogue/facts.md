# Space Rogue — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshots named in `orientation.md`.

The game is eight parts, and each has its own facts, listing and symbols
under `parts/<id>/`: `parts/title/facts.md`, `parts/intro/facts.md`,
`parts/engine/facts.md`, `parts/flight/facts.md`, `parts/nav/facts.md`,
`parts/station/facts.md`, `parts/hive/facts.md` and
`parts/ending/facts.md`. An address is always an address in the part
named with it. This file holds what spans the parts.

## Build

The 1989 Origin Systems release on two disk sides, from the C64
Preservation Project's G64 images (`orientation.md`, "The image"). Every
file loads through the KERNAL's LOAD; there is no fast loader and no disk
protection in the code that runs. The protection is the manual question
(intro `password_check`, `$74D2`).

| Part | Program | Entry | Interrupt | Screen |
|---|---|---|---|---|
| title | `TITLE` | `$2000` | its own, line `$50` | bitmap, banks 1 and 3 |
| intro | `INTRO` | `$6800` | its own, line `$50` | bitmap, banks 1 and 3 |
| engine | `SR`, `INIT`, `MAIN`, `SPB`, `EXTERN`, `FONT` | `$0400` | `$0EA0`, line `$32` | bitmap `$C000`, a second at `$4000` |
| flight | `SEG0`, `END`, models | the engine's | the engine's | the engine's |
| nav | `NAV.TIL`, `Qn` | data | | |
| station | `SEG1`, `SEG1A`, `LAND.TIL`, `Lnn`, `TALK` | engine `$A49A` | the engine's | the engine's |
| hive | `HCODE`, `H.TIL`, `H.MAP` | `$5700` | the engine's | the engine's |
| ending | `WON`, `F1`-`F3.PAC` | `$6800` | its own, line `$50` | bitmap, banks 1 and 3 |

## How one part leads to the next

- `BOOT`, a BASIC program, pokes 40 bytes to `$C000`, which load `TITLE`
  and jump to `$2000` (`orientation.md`).
- A key in the title loads `INTRO` over `SHIP` and jumps to `$6800`
  (title `title_exit`, `$2F5A`). A wrong manual answer loads `TITLE`
  again (intro `access_denied_key`, `$7965`).
- The intro loads `SR` to `$0400` and jumps there with A = 'N' or 'O'
  (intro `run_sr`, `$8251`). `SR` loads `INIT` to `$E900` and runs it
  (engine `sr_setup`, `$14CB`), which loads the rest of the engine, then
  `SAVED` for an old game, and `SEG0` (flight `init_game`, `$E900`).
- Docking loads `SEG1` over `SEG0` and `SEG1A` over the models and
  `INIT` (engine `load_seg1`, `$1507`); leaving loads `SEG0` and `END`
  back (engine `dock`, `$7094`).
- A HIVE! cabinet loads `HCODE` over `TALK` (station `act_hive`,
  `$AAD6`).
- Navigation's STATUS loads `SEG1` and then `SEG0` again for one page
  (engine `nav_status`, `$2694`).
- Docking in system 9 loads `WON` over `MAIN` (engine `load_won`,
  `$1532`); its last page loads `TITLE` (ending `story_end`, `$7D8F`).
- Death loads `END` and runs its `game_over` (engine `player_destroyed`,
  `$1B90`), which loads `TITLE`.

## Memory layout

In play the processor port is `$34`, all RAM, and the I/O and KERNAL
are banked in only around the code that needs them (engine
`bank_all_ram`, `$0E85`).

| Range | Holds |
|---|---|
| `$0400`-`$3FFF` | `SR`: the game state `$0403`-`$0801` (what `SAVED` holds) and the engine's code |
| `$4000`-`$50FF` | a packed picture while it is unpacked, then a tile set (`NAV.TIL`, `LAND.TIL`, `H.TIL`) |
| `$5100`-`$56FF` | a system map (`Qn`), a base map (`Lnn`) or the HIVE! island (`H.MAP`) |
| `$5700`-`$61FF` | `TALK` at a base, or `HCODE` |
| `$6400`-`$A4FF` | `MAIN` |
| `$A500`-`$BCFF` | `SEG0` in flight, `SEG1` at a base |
| `$BD00`-`$BEFF` | `SPB`, the disk text's block counts |
| `$BF00`-`$BFFF` | a decoded disk text |
| `$C000`-`$E3FF` | the bitmap and screen matrix on show |
| `$E400`-`$EAFF` | the models and `INIT`/`END` in flight, `SEG1A` at a base |
| `$EB00`-`$F1FF` | `EXTERN`, the bitmap tables |
| `$F200`-`$F5FF` | `FONT` |
| `$F600`-`$F9FF` | the disk text's two block buffers |

The title, the intro and the ending are programs of their own and use
`$4000`-`$67FF` and `$C000`-`$E7FF` as two display buffers. `END` is
`INIT`'s 512 bytes under another name.

## Shared code

- The title, the intro and the ending carry one library at three
  addresses: banking, `load_inline`, the keyboard and interrupt, text,
  the wipes and scrolls, the picture copiers and dissolves, the
  unpacker, the effect player and the Morse (intro `$6838`-`$7432`,
  ending `$6843`-`$743D`; the title, `$2042`-`$2A1C`, lacks the wipes
  and scrolls). `print_inline` is in the intro (`$7884`) and the ending
  (`$743E`).
- All three have `bitmap_mode`'s raster bug (title `$2823`, intro
  `$6FD7`, ending `$6FE2`): it can move their interrupt to line `$150`,
  which never comes. The engine's interrupt is set up by a different
  routine (engine `setup_irq`, `$0E22`).
- The bases and HIVE! share the chart drawer (engine `draw_chart`,
  `$8658`), the map entries' layout at `$5510`-`$5617` and the tile
  layout of `$4000`-`$50FF`; HIVE!'s chasing Manchi use the bases' guard
  routine (station `move_chase`, `$A785`).

## Timing

- The engine's main loop moves the world once a pass and skips drawing
  when it falls three frames behind (engine `frame_skip3`, `$A470`), so
  the game runs at the same speed however much is on screen.
- The title's, the intro's and the ending's `pause` waits about 0.86
  seconds, or until a key, whatever its caller asks: it calls
  `clear_key` first, which leaves A at `$FF`, so its 26-cycle loop
  always runs 255 + 254 + ... + 1 = 32,640 times (intro `$68D6`).
- A HELM step takes 5 hours, 7 diagonally (engine `step_hours`,
  `$29CA`).

## Controls

The engine reads its own keyboard, the C128's extra keys included
(engine `keyscan`, `$0EF5`), and two joysticks in flight: the one in
port 2 steers and fires, and pushing the one in port 1 forward or back
changes the speed (engine `joystick_speed`, `$242C`, reads port 1's up
and down bits; `joystick_eased`, `$A3B1`, reads port 2). The flight keys are in `parts/engine/facts.md`. Menus take the
cursor keys, W/X/A/D, the numeric keys or the joystick, with Return,
space or fire to choose (engine `key_direction`, `$A33F`). F1 is a pause
everywhere the engine reads keys (engine `key_escape`, `$1438`; hive
`hive_shoot`, `$5ADC`).

## Graphics

- Every screen is a multicolour bitmap. The engine draws its 3D view
  into a hidden buffer and flips (engine `flip_buffers`, `$8ED3`); the
  charts and the bases are 16-by-16-pixel tiles (engine `draw_chart`).
- Pictures are packed with one run-length format everywhere (engine
  `unpack_picture`, `$1C1D`; intro `unpack_picture`, `$712D`).
- The 3D maths is done in base-2 logarithms (flight `log_add`, `$B392`).

## Mechanics

- The galaxy: nine system maps, `Q0`-`Q7` and `Q9`, each 32 × 32 sectors
  (nav `system_grid`, `$5100`); twelve base maps `L00`-`L70` on side 2.
- Malir gates link the systems; a jump needs enough of the wormhole's
  rings passed (engine `gate_jump`, `$7134`).
- Docking anywhere in system 9 wins (engine `dock`, `$7094`); a talk
  script with plot flag 8 takes the player there (station `talk_end`,
  `$E7C7`).
- The plot runs on 32 flags (engine `plot_flags`, `$078E`), set and
  tested by the 32 talk scripts (station `talk_var`, `$E801`), and ten
  rumours the bartender tells (engine `rumour_states`, `$0784`).

## Data tables

- The disk text: 4,105 Huffman-coded texts in 115 blocks of 512 bytes
  from disk block `$01AD`, numbered from `$C000` (the sum of `SPB`'s
  counts, engine `$BD00`); a talk script's 64 texts
  start at `$C000` + 64 × its number (engine `resolve_text`, `$9BB7`;
  station `talk_script`, `$E569`).
- The object types (engine `type_flags` to `type_rank`,
  `$08D5`-`$0C85`) and the tactics (`$0C86`-`$0CF5`).

## Sound

There is no music. The engine plays 14 effects on the SID and an engine
hum whose pitch follows the speed (engine `sound_step`, `$10D2`). The
intro plays five effects and the Morse; the title plays only the
Sunracer's engine, the effect player's second sound (title
`sound_frame`, `$2429`); the ending is silent.

## The listing's error rate

Seed 20261015, population 2,304 distinct comments over all eight parts
(a comment the title, the intro and the ending share word for word
counted once), drawn in proportion to each part's share. The 60 were
checked against the snapshots by gpt-6.1-sol at high reasoning effort,
through the Codex CLI, which wrote none of them (`work/reports/`): 9
were wrong, 15.0 % (Wilson 95 % interval 8.1 % to 26.1 %), a lower bound
on the true rate, since a checker misses some. All nine were wrong in a
detail. The pause routine's length was said to follow A, where
`clear_key` sets A to `$FF` first, so every pause is 32,640 turns of
its loop. The title's colour-block height was said to be the rows a
shape covers, where it is the shape's height over 8, a row short when
the shape starts part-way down one. QUERY was said to put the system's
name and coordinates in its text buffer, where it prints them directly,
and to take the first entry with a message, where it searches from the
last. The attacker record left out the path where a missile's launcher
is recorded. The HELM spoiling chance was given as A/2 in 100 on the
first cargo slot, where the roll runs from 0 to 100 and the hold is
searched from its last slot. Two sound fields were misread: a voice's
timer at zero said to mean silence, where voice 1 then plays the engine
hum, and the voices' frequencies said to be the SID's, where they are
the effects' before the mask. Two zero-page bytes were named for the
model drawer alone, where `trace_beam` counts its steps in one and HELM
keeps its stop flag in the other. All nine were corrected, with 28
comments that said the same: the 16 other zero-page bytes the model
drawer shares with other routines, the pause in the intro and the
ending and the comments that cite a pause's argument or length, two
more rolls (the merchant's offer, out of 101, and `pick_ship`'s rank
roll, from 0 to the rank), the sound mask, which masks frequencies and
not gates, the HELM encounter's wait, 20 ticks of a tenth of a second
and not 20 frames, and HELM's rule for stopping. Seven more, on the
function keys (F1 gives ESC and F7 `$1F`; the C128's HELP gives
nothing) and the joysticks (the speed comes from port 1), were
corrected from what writing this file found, and three from what the
pages' ports found when they were run against the game's code: each
tile's left pixel byte is at `$4080` + `$100` × row and its right at
`$4000` (the engine and the three tile sets had them the other way
round), `pick_ship` takes any of a class's four entries one time in
four and otherwise one from the player's rank (said to reach the third
and fourth only from a halved rank roll), and the HIVE! mound wait can
be 92, where it was said to stop at 91. No audit has been done.

## Live tests

- *Live*, 14 October 2026: two clean boots out of two hung at "Old or
  New Game?" with the raster interrupt stopped; clearing bit 7 of
  `$D011` with the machine paused brought it back each time
  (`orientation.md`).
- *Live*, 14 October 2026: N, a name and Return gave the story's first
  page; the engine asked for side 2 and started aboard the derelict.
- *Live*, 14 October 2026: N in flight opened Navigation Control;
  charting to 13, 19 and HELM gave "Ship has arrived at destination".
- *Live*, 14 October 2026: calling the docking routine (engine `$7094`)
  near Hiathra gave "Docking privileges at Hiathra granted" and the
  cargo check's "found everything in order"; calling the HIVE! handler
  (station `$AAD6`) gave the cabinet's menu and "MOUNDS: 03" on drop 1;
  the same docking call with `$071D` = 9 loaded `WON`.
- *Live*, 15 October 2026: O at "Old or New Game?", then "zz" and Return
  to the manual question, gave "ACCESS DENIED" with the border grey and
  a band of stars recoloured (`reference/denied-answer.png`); the shown
  buffer, `$4000`, matched what `unpack_picture`'s rules give for
  `SPACE` with "zz" and a zero at `$BF00` laid over the question's
  picture, byte for byte outside the two lines of text.

Tests for a later run, each from a snapshot named in `orientation.md`:

- F1 in flight pauses until a key; F7 switches between CF and NF.
- In HIVE!, being caught on drop 5 pays 8 credits; on drop 4, nothing.
- A base's cargo check finds contraband about one visit in two.
