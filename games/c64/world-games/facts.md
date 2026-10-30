# World Games — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

This file holds what is true across the parts. Each part's own facts
are in `parts/<id>/facts.md`, and every address here names its part.

## Build

- Epyx's release of 1986, programmed by K-Byte, on a disk of two sides,
  from the C64 Preservation Project's PAL G64 images (`orientation.md`
  has the files and their MD5s). Side 1 holds the boot, the shell, its
  unpacker and the world records, the title, the menu, the travelogue
  and four events; side 2 holds the menu, the unpacker and the
  travelogue again, and the other four events.
- Every part but the shell is one file, packed with a byte-pair scheme
  and unpacked in place at `$1000` by the shell's unpacker at `$D000`
  (shell, `$D000`). Slalom has a second file, `J`, not packed, which the
  shell copies to `$E000` (shell, `$0A03`).
- Side 2's travelogue differs from side 1's only in its first two
  bytes; its menu and unpacker are the same as side 1's.
- The parts were written separately: each event has its own variables,
  its own interrupts and its own copy of the music driver, and the
  parts keep their text in four ways (Data tables, below).

## Memory layout

| Thing | Where |
|---|---|
| the boot, over BASIC's main-loop vector | `$02A7`-`$0303` (shell) |
| eight players' records of 32 bytes, the shell's variables in their spare bytes | `$0800`-`$08FF` (shell, `shared_vars`) |
| the shell: jump table, loader, disk prompt, reset | `$0900`-`$0D30` (shell) |
| the world records, 20 bytes an event | `$0E00`-`$0EFF` (shell, `records`) |
| the unpacker as loaded | `$0F00`-`$0FFF` (shell) |
| the part in memory, unpacked | from `$1000`, to its own end (each part's `facts.md`) |
| the unpacker, run with all RAM in view, and its three buffers | `$D000`-`$D0FF`, `$D400`-`$DFFF` (shell) |

A player's record: the name as typed at `+$00`, the event's result as
text at `+$10`-`+$15`, and its score at `+$16`-`+$18`, which the menu's
awards compare as a number (shell; menu, `$157C`). Each event writes its
own result there.

## Timing

- Every part runs from raster interrupts and does its frame's work in
  them; five parts (title, menu, travelogue, barrel jumping, bull
  riding) keep the KERNAL and its vector at `$0314`, the others switch
  it out (`$01` = `$35`) and use the hardware's at `$FFFE`
  (`orientation.md`, "Steady state").
- The events' clocks count frames and do not agree with each other.
  Slalom adds 2 hundredths a frame, right on a PAL machine (slalom,
  `sl_timer`, `$F181`). Log rolling shows a second every 65 or 66 frames, 1.3
  seconds on PAL (log rolling, `lr_clock`, `$3323`). Bull riding's clock
  counts 2 hundredths in 3 frames, so its "8 seconds" is 1200 frames,
  24 seconds on PAL (bull riding, `br_clock`, `$1C9F`).
- The menu's anthem player steps twice a frame (menu, `anthem_step`,
  `$1EA2`).

## Controls

- The menu takes the joystick and fire, or each option's number on the
  keyboard; names are typed (menu).
- RUN/STOP with RESTORE abandons the games from any part and goes back
  to the menu (shell, `nmi`, `$091A`); RUN/STOP alone never breaks a
  load (shell, `never_stop`, `$0B51`).
- Each event learns each player's joystick for itself: the first port
  with anything pressed on the player's first attempt (weightlifting
  `$1779`, barrel jumping `$2334`, cliff diving `$154C`, slalom `$F2DD`,
  bull riding `$1DF6`, caber toss `$195C`), or the port whose button was
  pressed at "PRESS YOUR BUTTON" (log rolling, sumo). With one joystick
  set on the menu (`joysticks`, `$087D`), log rolling and sumo pair each
  player with the computer.
- Bull riding's sixth bull, in practice, is moved by the other
  joystick (bull riding, `br_joystick_bull`, `$22E3`).

## Graphics

| Part | Screen |
|---|---|
| title | multicolour bitmap, a turning globe drawn into it, two sets of credits in turn |
| menu | characters: flags built from a character set, sprites for the frame round the chosen flag |
| travelogue | bitmap above, text below line 114, the title's globe |
| weightlifting | multicolour bitmap, the text rows drawn into it in hires |
| barrel jumping | characters in three bands scrolling at different speeds |
| cliff diving | characters, a cliff 102 rows tall scrolled a row at a time, colours by 5760 bytes of code written at the start |
| slalom | characters, a course of 176 rows of 65 columns, its top row hidden by an invalid mode |
| log rolling | characters, up to 15 sprites in raster bands |
| bull riding | characters on two screens in turn, the sprites turned round as they are copied |
| caber toss | characters on two screens in turn, half the shapes swapped with a second set |
| sumo | multicolour bitmap, sixteen sprites by a multiplexer, one wrestler's turned round as they are copied |

Two events draw their figures facing one way and turn them round as
they copy each shape: bull riding through tables at `$C100` and `$C200`
(`br_copy_shapes`, `$288B`), sumo through one at `$CC00`
(`su_copy_mirrored`, `$119B`).

## Mechanics

- The same hidden test in two events: with the first two players named
  AUTHOR and OFTHEGAME, in either order, barrel jumping shows "WRITTEN
  BY / MATT,JOE, & DOUG" (barrel jumping, `$286A`) and bull riding
  "WRITTEN BY / CHRIS PESTERLING" (bull riding, `br_hidden_check`,
  `$2ED7`) instead of the event. Each then sets `practice` (`$081D`) to
  `$FF` and goes back to the shell. *Live*, both.
- Random numbers come from several places. The shell leaves the SID's
  voice 3 running as noise (shell, `sid_start`, `$0D18`), and
  weightlifting keeps 256 readings of its oscillator at `$0400`
  (`wl_random`, `$197D`). The menu has a generator in the last three
  bytes of the eighth player's record (menu, `random`, `$1AD9`): sumo takes its
  seed from it and log rolling its frame counter. Bull riding, cliff
  diving, log rolling and sumo each add their frame counter to a state
  and shift it with feedback (`br_random`, `$2351`; `cd_random`,
  `$2B20`; `lr_random`, `$2ED8`; `su_random`, `$2B96`). Caber toss's
  inches take a bit from the floating upper half of a colour RAM read
  (caber toss, `ct_show_result`, `$2170`).
- Medals are worth 5, 3 and 1 points; equal results share a place
  (menu, `$157C`). A new world record is saved to the disk after any
  event, practice included (menu; shell, `save_records`, `$0A51`).

## Data tables

Text is kept in four ways:

- screen codes, in the menu and most of the events;
- screen codes with `$C0` added, in slalom, whose letters are the top
  of its character set (`sl_str_time`, `$8264`);
- ASCII, capitals and small letters, turned into screen codes as the
  travelogue prints its pages (travelogue, `text_codes`, `$15A3`);
- ASCII with bit 7 set on each text's last character, drawn into the
  bitmap from a font at `$3800`, in weightlifting (`wl_texts`, `$165C`;
  `wl_print`, `$1D35`).

The title has no text at all: every word is part of its bitmap. The
world records' names are PETSCII (shell, `records`).

## Sound

- One music driver serves the title and every event, each with its own
  copy at its own address: a byte below `$C0` is a note, `$60` a rest,
  the length after it, `$C0`-`$E0` commands, `$FF` the end of a voice
  (title, `play_music`, `$18B7`). Sumo's copy keeps its variables at
  `$B0`-`$EF` and has a jump table of three entries (sumo, `$3300`).
- The copies' top octaves are the same nine times, `$861E` for C to
  `$FD2E` for B (title `$1CB8`, weightlifting `$2CDE`, barrel jumping
  `$A483`, cliff diving `$C578`, slalom `$FA5C`, log rolling `$3EC9`,
  bull riding `$286A`, caber toss `$2894`, sumo `$378F`). `$861E` is
  2093 Hz, the top C, at an NTSC machine's 1.0227 MHz: on a PAL
  machine every note is about 65 cents flat.
- The menu plays the anthems with a player of its own, rows of three
  notes and a length (menu, `anthem_step`, `$1EA2`).

## The listing's error rate

- Sample, seed 20261030: 80 of the 4,243 line comments of all twelve
  parts, in two strata: 60 of the 3,797 written by hand and 20 of the
  446 a script wrote from templates (`work/reports/sample-1/draw.py`).
  The checker, a fresh agent on claude-opus-5-5, found 8 wrong, one of
  them only ambiguous. Barrel jumping's `bj_choose_barrels` said it
  waits for the fire buttons to be up, where it waits for the flags
  that `bj_fire` raises when a button is let go, and `bj_fire` itself
  called them presses. Log rolling's `$EC00` was called the middle
  block of five rather than the fourth, and the rumble's `$36F3`
  counted frames where it counts steps of two frames. Cliff diving's
  `$10EA` named the wrong index register. Sumo's `$A040` gave a range
  of poses that includes one which does not use its shapes, and its
  `su_score_frame` described the force so that it read as one speed's
  size plus the other's signed speed. Weightlifting's `$6D3F` named a
  routine that does not write it and left out one that does. Caber
  toss's `$8D70` put a row of the colour map one screen row too high.
  All eight were corrected, with every comment that said the same:
  `bj_press_button` (`$1EFD`) in barrel jumping, the rise at `$36EB`,
  all eight bytes of the bar's ends in weightlifting, the 20 row labels
  of caber toss's two maps, and the pose lists of 16 shape blocks in
  sumo and 11 in caber toss. The plain rate is 8 in 80, 10.0 % (95 %
  interval 5.2 % to 18.5 %); the hand comments' is 7 in 60, 11.7 %
  (5.8 % to 22.2 %), and the templates' 1 in 20, 5.0 % (0.9 % to
  23.6 %), so the rate weighted by the strata's sizes is 11.0 %. A
  checker misses some, so these are lower bounds.

## Live tests

All on 30 October 2026, in VICE's `x64sc` (PAL) from the vice-mcp
release v3.14.0, from the entry snapshots in `orientation.md`; the scripts are
in `work/scripts/`.

- Both sides boot from their G64 images; the title, menu, travelogue
  and every event's screen were reached (`orientation.md`).
- Menu: key 4 chose practice and key A weightlifting; the S key played
  the anthem of the country under the frame without choosing it, and a
  move of the joystick stopped it (menu).
- Weightlifting: `wl_divide` (`$1DF2`) called with sums of 64, 381 and
  511 gave a high byte of 0, the first judge's delay. `$1482` with the
  weight set to 75, 150 and 225 kg left the factors `$FF`, `$44` and
  `$01`, and with 230 to 250 kg `$A2`, `$00`, `$86`, `$1E` and `$86`,
  bytes of `wl_kg`'s code (`live_wl_kg.py`). Held too long, the limit
  `$44` came to `$4F`, five times the `$43` at `$16F5`; random numbers
  `$00` and `$4E` played script 5, `$4F`, `$80` and `$FF` script 6
  (`live_wl_collapse.py`). With the weight set to 865 kg in a running
  game, the plates' redraw stopped the processor at `$1C63`, on `$F2`;
  at 860 kg the plates were drawn (`live_wl_865.py`).
- Barrel jumping: screenshots 11 frames apart differed only at the
  flags and the prompt.
- The hidden credits in barrel jumping and bull riding, with the names
  poked into `$0800` and `$0820`
  (`reference/barrel-jumping-hidden-credits.png`,
  `reference/bull-riding-hidden-credits.png`).
- Cliff diving: the end of a dive called with scores 101, 100, 102, 99
  and 1 started the gull's list for 101 only, and not after a fault
  (`live_cd_gull.py`).
- Slalom: the head-on hit fell with the frame counter at 0, 50 and 99
  and bent the flag at 100, 150 and 255 (`live_sl_flag.py`); the final
  heat kept the slower time in two of five pairs (`live_sl.py`); as a
  run began, the best time's colour loop wrote 1 to `$DC4D` down to
  `$DC47`, with colour RAM at `$D847`-`$D84D` already 1
  (`live_sl_colour.py`).
- Log rolling: `lr_step` wrapped from -122 to `$FFFF` and held 127
  forwards (`live_lr.py`); `lr_clock` showed a second after 65 or 66
  calls and held at 9:59 (`live_lr_clock.py`).
- Bull riding: the clock counted 10 hundredths in 15 frames.
- Caber toss: 64 reads of `$D800` gave colour 6 with upper bits that
  changed (`live_ct_inch.py`); three throws in play each read the speed
  up's entry from `$1DC7` (`live_ct_release.py`).
