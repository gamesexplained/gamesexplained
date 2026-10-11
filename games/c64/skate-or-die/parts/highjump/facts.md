# Skate or Die!: High Jump - verified technical facts

The High Jump load in practice mode. Unless marked *live*, a fact comes
from reading the code in `work/play.vsf` (the same snapshot as the game
folder's `work/highjump-play.vsf`), which `orientation.md` says how to
reach. *Simulated* means the kit's C64 model (`kit/c64/machine.js`)
running that snapshot with scripted input. The disk loader and the event
manager that High Jump runs under are the resident part's
(`parts/resident/facts.md`).

## Loads

- **High Jump's files.** The town's code copies a load stub to `$0800`
  (`run_load_stub` `$FA58`, template `$F925`) that loads file `$0E` to
  `$0880`-`$3D7E` and jumps to `$0880`. That code then loads file `$0F`
  (the font, `$6800`-`$69FF`, `load_font` `$1239`), file `$10` (the picture,
  run-length packed, loaded at `$4000`), file `$11` (`$7000`-`$8283`) and
  file `$12`, loaded at the end address file `$11` returned (`$8284`-`$C2AF`,
  `$0951`-`$0959`).
- **Unpacking the picture.** `$1B6A` expands file `$10` into `$7000`: a
  control byte `$00`-`$7F` copies n + 1 literal bytes, `$80`-`$FF` repeats
  the next byte n - `$7F` times. `$08F2`-`$0947` then copies `$1F40` bytes
  to the bitmap at `$4000`, `$3E8` to the screen at `$6400` and `$3E8` to
  `$6000`, which `$0A50` copies to colour RAM on every entry. File `$11`
  then loads over the scratch area.
- **A self-erasing entry.** `$0880` is `JMP $0886`, which loads the files
  and then writes `$EA` over `$0880`-`$0882`, so a later jump to `$0880`
  falls through to `JMP $089E`, the per-attempt set-up. PRACTICE AGAIN
  re-runs the stub's `JMP $0880` (`$F93E`) and the event restarts without
  touching the disk.

## Memory layout

| Range | What it holds |
|---|---|
| `$0400`-`$07FF` | quarter-square table floor(n²/4), n = 0-511, built at start-up by `$1310` |
| `$0800`-`$081C` | the load stub |
| `$0880`-`$1B90` | High Jump's code |
| `$1B91`-`$217E` | 69 animated picture cells (offsets, colours, two frames of pixels each) |
| `$217F`-`$221A` | 156 bytes nothing reads |
| `$221B`-`$2A00` | the sound driver, its state and its note table |
| `$2A01`-`$2ACA` | raster band tables, pose sequences, the phase table |
| `$2ACB`-`$2CEE` | the ramp profile, 273 entries |
| `$2CEF`-`$2E7A` | digits, the height-ruler sprites, colour sets, pump boosts, sound ring |
| `$2E7B`-`$307A` | bit-reverse tables for mirroring sprites |
| `$307B`-`$3CBC` | the sound-effect table, 26 sound scripts and the music |
| `$3CBD`-`$3D7F` | loaded but never read; `$3D01`-`$3D7E` repeats `$3634`-`$36B1` |
| `$4000`-`$5F3F` | the half-pipe bitmap |
| `$6000`-`$63E7` | colour-RAM copy of the picture |
| `$6400`-`$67E7` | screen matrix: the picture's other two colours |
| `$6800`-`$69FF` | 64-glyph font in screen-code order |
| `$6C00`-`$6F3F` | sprite blocks: two skater buffers and the height ruler |
| `$7000`-`$8283` | 158 poses of 30 bytes |
| `$8284`-`$C2AF` | 477 sprite shapes |
| `$F230`-`$FFF7` | the resident part: disk loader and event manager |

What High Jump does not write and does not read is left over from earlier
loads and is excluded from coverage in `game.json` with the evidence:
`$5F40`-`$5FFF`, `$63E8`-`$63FF`, `$67E8`-`$67F7`, `$6A00`-`$6BFF` (the
hub's records-screen text), `$6DC0`-`$6DFF`, `$6F40`-`$6FFF`,
`$C2B0`-`$CFFF` (a stale copy of the event manager, then the power-on
pattern), `$E000`-`$EFFF` (origin unknown), `$F000`-`$F22F` (the tail of a
KERNAL copy) and `$F654`-`$F72F`.

## The frame

- **Two raster interrupts.** `raster_irq` (`$0AF0`) takes the handler for
  the current band from `$2A01`, patches its own `JSR`, and sets the next
  band's line from `$2A05`/`$2A07`. Band 0 at line `$F9` (`$0B21`) switches
  multicolour off, so the status line on text row 0 is hires, and polls
  RUN/STOP and the Commodore key. Band 1 at line `$37` (`$0CA3`) waits for
  line `$3A`, switches to multicolour bitmap and runs the whole game update.
- **The main loop only plays sound.** `$08CF`-`$08EF` runs the sound driver
  once for each frame counted in `$72` (incremented at `$0B31`), and drains
  the event-sound ring.
- **Video.** VIC bank 1 (`$DD00`), `$D018` = `$91`: bitmap `$4000`, screen
  `$6400` (`init_bitmap_video` `$0A50`). The IRQ never changes `$D018`.
- **The CPU port.** The code sets `$01` = `$25` (`$0886`, `$0A14`): RAM at
  `$A000`-`$BFFF` and `$E000`-`$FFFF`, I/O visible. The `$E4` that a RAM
  read of `$0001` shows is the RAM under the port, not the port.
- **The NMI vector is stale.** `$FFFA` holds `$0A3A`, left by an earlier
  load; in High Jump that address is the middle of `install_raster_irq`.
  Nothing in this load writes `$FFFA`.

## The ramp and the skater

- **The half-pipe is a line.** The skater's position s (`$54`/`$55`, with
  a fraction at `$53`) runs from 0 to `$222` and maps to screen x, y
  through the profile at `$2ACB`; the right half is mirrored as `$222` - s
  (`lookup_skater_position` `$12A0`). The profile's first 109 entries are a
  vertical column at x 42, y 64 to 172: the vertical part of the wall below
  y = `$96` (150), the coping, and the air above it. The flat bottom is at y
  240 and the centre at x 182. A jump is motion along the same path, and a
  position below 0 carries on up the column (`$12E6`).
- **Gravity from the profile.** The acceleration is the profile's y
  difference sixteen entries ahead (`$147E`-`$1489`), `$10` off the
  profile (`$148C`). Every frame the speed loses 1/256 of itself
  (`$16C3`).
- **Pumping.** While the skater is low on the ramp (`$23` ≥ `$B0`),
  `pump_speed` (`$16E3`) watches for any newly pressed joystick direction.
  Each press restarts a ten-frame boost of 6, 6, 6, 6, 6, 6, 4, 3, 2, 1
  added to the speed (`$2DBD`, read backwards), cut short by the speed's
  whole part, so pumps give less as the skater goes faster. While the
  attempt is over (`$43` set) the boost restarts every frame with no input. Alternating is
  not required: tapping one direction every second frame reached the same
  height as alternating at that rate (simulated).
- **Phases.** `$2E` is the phase, dispatched through `$2AB9`: 0 waiting on
  the platform (`$0D50`), `$0C` fidgeting there (`$0DBC`), 2 on the ramp
  (`$0E08`), 4 in the air (`$0F0D`), 6 a fall (`$0E5D`), 8 and `$0A` the
  trick fire starts (`$1004`, `$1038`), `$0E` back to the platform
  (`$1096`), `$10` the final pose (`$10BF`).
- **Sides.** Bit 7 of `$48` is set while the skater is on the right half
  (s ≥ `$0111`), rotated in by `$12A0`.
- **Five passes.** A pass is counted when the speed changes sign on the
  right half (`$1AD0`). At five the controls lock (`$43` = `$FF`, `$1AF4`)
  and the next return to the left wall goes to phase `$0E`.
- **Landing.** A landing is clean when the low three bits of the pose are
  0, 1 or 7 (`$0F21`-`$0F48`); otherwise the skater falls (`$1115`, phase 6).
- **Sprites.** Sprites 0-4 are the five parts of a pose: a record at
  `$7000` + pose × 30 holds five six-byte entries (shape offset from
  `$8284`, size, x and y offsets). Shapes are stored trimmed to the rows
  they use, copied into a 64-byte block and zero-filled (`$14DE`, `$138D`,
  `$13C5`, `$13FD`). Facing left is drawn by copying the shapes through
  the bit-reverse tables at `$2E7B` and `$2F7B` and negating the x
  offsets. The skater is double-buffered at `$6C00`/`$6E00` (`$22`).
  Sprite 4 is the board. Sprite 7 is the board's shape in black, held at
  the coping line while the skater is in the air (`$0C29`-`$0C3B`, `$11E3`);
  it reads as a shadow (not verified live). Sprites 5 and 6 are the
  tick-marked height ruler at x 320, Y-expanded (`$0A01`, `$0B90`).
- **Colours.** At each start one of two sprite colour sets, `$2D7F` or
  `$2D87`, is picked at random (`$19D3`). Entry 4, the board, is
  overwritten by the skater's attribute `$FE02` (`$09EE`): 7 for every
  roster skater, `$0D` for LESTER.

## Height

- **Units.** `$2B` holds the height in eighths of a foot: the maximum over
  the frames of the pass of `$96` - `$23` + `$44` (`$1AB4`). A value that
  would be `$96` or more is taken as 0 (`$1ABC`), so the most a pass can
  record is 149 eighths, 18 ft 7.5 in.
- **The display rounds up.** `$17B4` prints feet and then two characters
  from `$2DF1` for the eighths: 0, 2, 3, 5, 6, 8, 9, 11 inches. A half inch
  always rounds up, so 95 eighths (11 ft 10.5 in) shows as 11'11".
- **One pass counts, not the best.** `$2B` is cleared when a new pass
  begins after the centre crossing (`decide_run_end` `$1798`, `$17A8`),
  by a fall (`$163E`) and at the start (`$15FE`). Once the controls are
  locked it is no longer cleared, so the height that counts is the one
  of the pass that locked them. *Live:* pumping without fire, passes 1 to
  3 recorded 47, 75 and 95 eighths, and `$2B` returned to 0 at each new
  takeoff.
- **Fire ends the attempt.** Fire in the air on the right half, in pose 8
  or `$10`, starts a seven-pose trick (phase 8, then `$0A`, `$0F4B`). Phase
  `$0A` sets a bonus `$44` = 4, half a foot, and locks the controls
  (`$104D`, `$108F`). *Live:* fire at the top of pass 2 went through phases
  8, `$0A`, 4, 2, `$0E` and `$10` with `$43` = `$FF` and kept 95 eighths;
  holding fire for 25 frames instead of 1 gave the same result.
- **Holding fire spins.** Holding fire for `$14` frames or more sets `$33`
  = `$60`, which makes the air phase rotate the pose (`$107D`-`$108B`);
  reaching the coping during the trick is a fall (`$100D`, `$103E`).
- **The last pose.** Phase `$10` picks one of three ten-pose sequences by
  height: under `$50` (10 ft), under `$68` (13 ft), or more
  (`$10F0`-`$1106`).
- **The result.** After phase `$10`, fire calls `end_event` (`$1A49`):
  `$FE05` = `$2B`, `$FE04` = feet in BCD, `$FE03` = inches in BCD, sprites
  off, sound reset, `JMP $FE06`.

## The scenery

- **The flags and the crowd move.** 69 cells of 8 × 8 pixels each have two
  frames: offsets at `$1B91`, screen colours at `$1C1B`, colour-RAM bytes
  at `$1CA5` (bit 7 of the first records which frame is showing), pixels
  at `$1D2F`. `animate_cell` (`$192E`) swaps one. Cells 0-7 are the four
  flags on text row 3; `animate_flag_pair` (`$199B`) flips one flag on
  about one frame in eight. Cells 8-68 are the crowd on rows 7-10;
  `animate_crowd_cell` (`$19AE`) flips one at random with a chance set by
  `$3F`, half the height, reloaded at each turn on the right
  (`$1AD0`). The higher the last pass, the busier the crowd.
- **The meter.** `draw_side_strip` (`$1AFA`) draws a ten-cell strip at
  column 36, rows 1-10, from `$2E07`, with colour 7: the yellow pole at
  the top right, behind the black marks of the ruler sprites 5 and 6 (seen
  in a rendering of the listing's bitmap and in `reference/highjump-play.png`).

## Text

- The font is file `$0F` at `$6800`, 64 glyphs in screen-code order.
  `$126D` draws a glyph inverted into the bitmap's first row; text is
  ASCII masked with `$3F` (`$1242`, `$1258`).
- `$1242` prints the zero-terminated string that follows its `JSR` and
  returns past it. Its one call is at `$099E`; the string is `$09A1`-
  `$09C9`, the `PASS:` and `HEIGHT:` labels.
- The name at the left of the status line comes from the pointer at
  `$FE00`/`$FE01`; in practice it is `$F822`, `PRACTICE`.

### String sweep

Runs of six or more printable characters, as ASCII and as screen codes,
outside the bitmap and sprite data:

| Where | Text |
|---|---|
| `$09A1` | `PASS:    HEIGHT:` |
| `$2CEF`, `$F807` | `0123456789ABCDEF` |
| `$F818` | `LESTER` |
| `$F822`-`$F858` | `PRACTICE`, `AGAIN?`, `YES`, `NO`, `NEXT SKATER`, `SKATING TO SCORES` |
| `$F859`-`$F8A0` | `HIGH JUMP`, `SKATESHOP`, `OVERALL`, `INSERT SIDE` ... `AND PRESS BUTTON.` |
| `$F8D8` | `RAMP`, `HIGH JUMP`, `DOWNHILL`, `JAM`, `POOL JOUST` |
| `$F0BE`-`$F127` | the KERNAL's `I/O ERROR #`, `SEARCHING FOR`, `PRESS PLAY ON TAPE`, `LOADING`, `SAVING`, `VERIFYING`, `FOUND` (leftover) |

`$E000`-`$EFFF` decodes as long runs of low screen codes, a screen or map
from an earlier load; nothing in High Jump reads it.

## Controls

- `read_controls_and_run_phase` (`$0D23`) ANDs `$DC01` with `$DC00`, so
  either joystick works. Keyboard row 7 doubles as joystick 1: SPACE is
  fire, 1 up, left-arrow down, CTRL left, 2 right (keyboard matrix in
  `kit/skills/c64/c64-reference`). `$2F` is the state and `$30` marks new
  presses.
- Fire on the platform starts the run; the push-off takes 60 frames
  (`$0D50`).
- **RUN/STOP** (`check_run_stop` `$1A08`) sets `$FE12` and ends the event
  through `$1A49`. *Live:* RUN/STOP in play went to SKATING TO SKATESHOP.
- **The Commodore key** (`check_commodore_key` `$1A24`) flips `$FE10`.
  *Live:* `$FE10` went `$00` → `$FF` and every sound slot cleared; a
  second press put it back to `$00` and the music started again.

## Sound

- **Three voices with priorities.** `queue_sound_id` (`$22F5`) appends an
  ID to a 16-entry queue; a seventeenth waiting request is dropped. Each
  tick, a request takes the slot with the lowest priority if its own
  priority (`$30AF`) is at least as high (`start_sound_on_weakest_slot`
  `$2981`). The three slots drive SID voices 3, 2 and 1 (`$29DC`).
- **One tick per frame,** paced by `$72` from band 0 of the IRQ, so about
  50 per second on PAL. Volume is set to 15 with no filter at start-up
  (`$22D1`); no filter register is ever written (register census).
- **Sounds are bytecode.** Each of the 26 IDs points at a script
  (`$307B`/`$3095`). A command's low nibble is the opcode and its high
  bits the variant: set a SID register, add to one, compare, branch on the
  comparison, loop, call, poke memory, wait until memory holds a value,
  request another sound, wait n ticks, call machine code, or play the next
  event of a note stream (dispatch `$2394`, `$23AE`/`$23BE`). A note
  stream holds notes as one byte each (low nibble the note, bits 4-5 the
  octave, bits 6-7 one of four durations and gate lengths) and its own
  commands (`$2752`, `$27ED`/`$27F8`).
- **Notes** come from a 12-semitone table of the top octave at
  `$29E1`/`$29F1`, shifted right per octave (`$28CF`-`$28EE`). Entry 1 is
  A6 at 1760 Hz for an NTSC clock, so on PAL the music is about 0.65 of a
  semitone flat (computed, not measured).
- **IDs that play nothing.** 3, 24 and 25 point at `$30C9`, a lone end
  command.
- **What High Jump asks for:** 1 the music (`$19CE`, `$1A45`, only while
  `$FE10` is 0), which requests 2, its second voice; 4 on a change of side
  (`$0CE0`); 6 at the end of a run (`$10D5`); 9 or 22 at a fall, 9 when the
  speed is `$0348` or more either way (`$16A0`, table `$2DB7`); 15, a falling
  hiss, as the skater drops into the lower ramp, and 16, a rising one, as it
  climbs out after the centre (`ramp_bottom_sounds` `$1722`); 20 when the
  speed changes direction (`$1ADC`). Seventeen of the 26 scripts are not requested by any code
  in this load.

### The music is assembled at random

- Nine two-voice phrases, their stream addresses at `$346D`, are chained
  through a successor table at `$3C6C` (a count, then the choices). Phrase
  0 can go to 1-4; phrases 1-4 to any of 1-8 except themselves; 5-8 to 1-4.
- Play always starts at phrase 0 (`$34E3`). Whichever voice finishes a
  phrase first picks the next one for both (`music_choose_phrase`
  `$3549`, toggle `$35A8`), never the phrase just played (`$35AE`,
  `$356F`). Each voice's script then rewrites its own stream operand
  (`music_next_phrase_a`/`_b`, `$3517`/`$3530`).
- The music's random state `$35AB` is never set by High Jump's code; its
  value comes from the disk with file `$0E`, and the random routine shifts
  it on every use (`$357E`-`$3597`). The first run of the music after a load
  always takes the same path; later runs (after the Commodore key, or
  PRACTICE AGAIN without a reload) carry on from where it has got to.

## Register census

Every absolute access to `$D000`-`$DFFF` in this load's code, grouped. The
indexed sprite and SID writes reach the other registers of each group.

| Register | Use | Routines |
|---|---|---|
| `$D000`-`$D00F`, `$D010` | sprite positions, the shadow follows sprite 4 | `place_part_sprite` `$0C4C`, `place_fixed_sprite` `$0C8E`, `$0C1A` |
| `$D011` | 24 or 25 rows per band, screen on | `hj_init` `$089E`, `install_raster_irq` `$0A13`, `$0B21`, `$0CAA` |
| `$D012` | raster compare and frame wait | `$0AF0`, `$0A45`, `$0CAA`, `$0D14` |
| `$D015`, `$D017`, `$D01B`, `$D01C`, `$D01D` | sprite enable, expansion, priority, multicolour | `place_sprites` `$0B5D`, `end_event` `$1A49` |
| `$D016` | multicolour off for the status line, on below | `$0A50`, `$0B21`, `$0CA3` |
| `$D018` | bitmap `$4000`, screen `$6400` | `$0A50` |
| `$D019`, `$D01A` | raster interrupt acknowledge and enable | `$0AF0`, `$0A3A` |
| `$D020`, `$D021` | border and background | `$089E`, `$0A50` |
| `$D025`, `$D026` | sprite multicolours 1 and 6 | `$09CA` |
| `$D027`-`$D02E` | sprite colours, indexed | `$0BA5` |
| `$D400`-`$D406` (+7, +14) | frequency, pulse, control, envelope, indexed by voice | the sound driver `$22B7`-`$29DB` |
| `$D418` | volume 15, no filter | `$22C2` |
| `$DC00`-`$DC03` | joystick 2 and keyboard row 7, port directions | `$0800`, `$0977`, `$0D23`, `$1A08`, `$1A24` |
| `$DC0D` | CIA 1 interrupts off | `$0A13` |
| `$DD00` | VIC bank; the drive's serial lines | `$0A50`, the loader `$F4B7`-`$F5BC` |

Never touched by High Jump's own code: the SID filter (`$D415`-`$D417`),
the light pen, sprite collisions (`$D01E`, `$D01F`), CIA timers. The event
manager's text screen uses `$D011`, `$D016`, `$D018`, `$D020`, `$D021` and
colour RAM (`$F941`, `$F975`).

## Corner cases

- `$1166` reads `$2A13` + `$37`, and `$37` is `$FF` after a change of side
  (`$0CC6`), so it reads `$2B12`, inside the ramp profile. It works only
  because that byte is not zero.
- `$16E3`: the boost index (10 minus the speed's whole part) wraps if the
  whole part reaches 11, and would read up to 255 bytes past `$2DBD`.
  Simulated runs stayed between -5 and 4.
- `$1A08` leaves the IRQ handler with `JMP $1A49` and then `JMP $FE06`,
  with no `RTI`.
- `$107D`-`$1083` loads `$20` and overwrites it with `$60`, so `$33` is
  only ever `$60` or 0.
- The sound driver's wait-until-equal command always rewinds four bytes,
  which is wrong for its five-byte form (`$24F5`); pause (`$2319`)
  overwrites a voice's flags with `$80`, so resume (`$2321`) leaves it
  idle. Neither form is used in this load.
- The event-sound ring `$2E6B` (`$1A96`) has no overflow check.

## How far the listing's comments can be trusted

A sample of 60 line comments (seed 20261004, spread over the seven agents'
ranges in proportion to their comment counts) was checked against the
bytes by an agent that wrote none of them: 4 had a wrong detail and none a
wrong purpose, 6.7 % (95 % Wilson interval 2.6 % to 15.9 %). Leaving out
the 23 shape and pose comments that a script wrote, 4 of 37 (11 %). The
four were a branch read backwards (`$16E3`), two cases folded into one
(`$FF3F`), two exits folded into one (`$F4B7`) and a tick count off by one
(`$3291`).

## Live tests

All on 4 October 2026, VICE 3.13.1 on Linux, from `work/highjump-play.vsf`.

| Test | Result |
|---|---|
| Commodore key twice | `$FE10` `$00` → `$FF` → `$00`; all sound slots cleared, then sounds 1 and 2 restarted |
| RUN/STOP in play | SKATING TO SKATESHOP |
| Pump right and left every two frames, no fire | three passes: 47, 75, 95 eighths; `$2B` cleared at each new takeoff |
| Same, fire for 1 frame at the top of pass 2 | phases 8, `$0A`, 4, 2, `$0E`, `$10`; `$43` = `$FF`; 95 eighths kept |
| Same, fire held 25 frames | the same phases and height |

Earlier sessions confirmed the eighths-to-inches display with pokes to
