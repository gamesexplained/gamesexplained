# Skate or Die!: Downhill Race — facts

The Downhill Race program (side 2). Its main file `$1B` loads to `$0880`,
and the program starts at `$0880`. The event manager's load stub at `$0800`
loads it. On its first run the program loads its own twelve files.

"Traced" means read from the code. "Simulated" means seen when the
program ran from its snapshots (`work/entry.vsf`, `work/play.vsf`) in the
kit's 6502 machine (`kit/c64/machine.js`). `load_file` `$F230` was served
from the disk's own files. The scripts are in `GAME/work/agent-downhill/`
(`sim.js`, `ptrs.js`, `callr.js`, `sound.py`, `poses.py`).

## Loads and memory

- `$0880` holds `JSR load_files` (`$1D7C`). `load_files` loads the files
  listed at `$3787` (numbers) to the addresses at `$3793`/`$379F`, then
  writes `$EA $EA $EA` over `$0880`-`$0882`. A PRACTICE AGAIN restart
  (`JMP $0880`) therefore skips the disk. (traced; simulated: loads
  `1c@8000 1d@8000 1e@a600 1f@7e00 20@4800 21@5400 22@6800 23@4000 24@4200
  25@44c0 26@7500 27@46a0`)

| File | Lands at | What |
|---|---|---|
| `$1B` | `$0880`-`$3FFF` | code and variables (`$36EB`-`$3786` and `$3F83`-`$3FFF` are uninitialised fill) |
| `$1C` | `$8000`, copied to `$CE00`-`$D567` | pose directories of the falls and scripted actions (`copy_poses_under_io` `$1DBD`, `$01 = $24`) |
| `$1D` | `$8000`, copied to `$D568`-`$F190` | pose shapes: 198 sprite shapes, rows of 3 bytes (`copy_shapes_under_io` `$1DEF`) |
| `$1E` | `$A600`-`$CDD7` | character map of the course, 255 rows x 40 |
| `$1F` | `$7E00`-`$A5D7` | colour and terrain map: low nibble colour, high nibble terrain type |
| `$20` | `$4800`-`$4FFF` | course character set (multicolour cells where the colour has bit 3 set) |
| `$21` | `$5400`-`$67FF` | riding sprites, blocks `$50`-`$9F` |
| `$22` | `$6800`-`$73FF` | crouched riding sprites, blocks `$A0`-`$CF` |
| `$23` | `$4000` | the shared 2 KB font. Only characters `$00`-`$3F` survive, used by the status rows |
| `$24` | `$4200`-`$44BF` | eleven overlay sprites, blocks `$08`-`$12` |
| `$25` | `$44C0`-`$469F` | messages: 8 taunts, 8 cheers, 8 exhortations |
| `$26` | `$7500`-`$7DFC` | the music, including 6502 code (`$75AA`-`$7634`) |
| `$27` | `$46A0`-`$47EB` | sound-effect tables and scripts |

- VIC bank 1 (`$DD00`). The screen is at `$5000`. Course rows use
  `$D018 = $42` (charset `$4800`); the status rows use `$D018 = $40`
  (font `$4000`), set by `irq_band_status` `$1F84`. (traced)
- Memory left by earlier programs is not read: `$0400`-`$05B9`,
  `$081C`-`$087F` and the gaps between files. `$E000`-`$EFFF` holds this
  program's pose shapes (file `$1D` sits whole at `$D568`), so none of
  the shop's colour maps survive there. (traced; simulated)
- Built at run time: the mirror tables `$0600`/`$0700` (`$1E48`), the
  fall/action sprite buffers `$7400`-`$74FF` (blocks `$D0`-`$D3`) and the
  flag-restore buffers `$05BA`-`$05FF`. (traced)

## How it plays

- Controls: both joystick ports are read together (`$DC00 AND $DC01`,
  `$2B41`). Down pushes (+1 speed every 8 frames, up to `$10`). Left and
  right turn. Fire+up jumps, fire+left/right spins, fire+down ducks.
  Goofy foot swaps up with down and left with right. The record comes from
  `control_records` `$3984` by stick bits, `+$16` with fire, `+$2C` when
  goofy. At the start, any direction toggles REGULAR/GOOFY FOOT every
  tenth frame (`$0998`). (traced)
- Clock: tenths every 6 frames (`update_clock` `$1060`), held at 9:59.9.
  That is right for 60 Hz; on a PAL machine a game second is 1.2 real
  seconds. Landing in the water adds a 3-second penalty (`$3F61`).
  (traced)
- Trick points (BCD, `add_points` `$0C47`): skull ramp 2 (`$146D`), roof
  4 (`$172D`), passing a hurdle 4 (`$17C1`), into the pipe 3 (`$141A`),
  out of its mouth 10 (`$13D3`), bouncing off a wall in the air 2
  (`$1B9F`), landing the other way round 1, two half turns in one jump 20,
  the rough-ground drop 1, a bench 2, jumps over water 5, 20, 40, 40 in
  turn (`score_landing` `$2DF8`), and 5 at the finish with no fall
  (`check_finish` `$0D20`). Points count only while the clock is under
  1:30, and points earned during a fall are lost (`$0C5B`). (traced)
- The score (`race_results` `$0B14`), which answers the shop agent's
  question. `$FE03`-`$FE05` holds a six-digit BCD number, low byte first.
  It is a time score plus 100 for every trick point:
  - time score = (90 − seconds taken) × 100 + 4 × tenths + 1, and 0 from
    1:30 on;
  - total = time score + trick score × 100.
  So the score measures speed first: every second under 1:30 is worth as
  much as a trick point. The tenths term goes the wrong way: a slower
  tenth adds 4. Because an `ADC` (`$0B9A`) has no `CLC` before it, a run
  under one minute with no tricks loses another 100. (traced; simulated
  by the earlier agent: 0:45.5 with no tricks gives 4421)
- Final pose: action `$0E` after three or more falls, `$0C` with a trick
  score of 40 or more, otherwise `$0D` (`$0A2E`). Fire on the results
  leaves through `leave_event` `$0D57` → `JMP $FE06`. RUN/STOP sets
  `$FE12 = $FF` and quits. The Commodore key toggles the sound (`$FE10`).
  (traced)

## Graphics

- Course: 255 rows. The character map at `$A600` and the colour/terrain
  map at `$7E00` are both `row*40 + column`. `redraw_course` (`$20A5`)
  copies 22 rows to the screen at `$5078` and to colour RAM. Terrain
  types: 0 road, 1-3 ramp and its walls, 4 rough, 5 water, 6 roof, 7
  grass, 8 bench, 9 start/finish line and the lake's islands, A wall,
  B flag, C object, D pipe top, E pipe mouth, F pipe. Handlers are at
  `$3B5E` (middle cell) and `$3B7E` (side cells). (traced)
- The 35 flags are listed at `$3B9E` (rows) and `$3BC1` (columns). The
  flag cloth (characters `$81`, `$86`, `$87`, `$89`), the skull's eyes and
  jaw (`$E3`/`$E4`, `$EA`/`$EB`) and three lake objects (`$F8`-`$FA`) are
  animated by rewriting the charset (`$115C`). (traced)
- Riding skater: five sprites with pointers `bank + direction` (0-15).
  Banks are at `$393F`: arms `$50`/`$A0`, head and torso `$60`
  (multicolour), legs `$70`/`$B0`, board `$80`, the "shadow" wedge
  `$90`/`$C0`. (traced; simulated: pointers `$50`-`$CF` all seen)
- Overlays (blocks, set at the addresses given): `$08`/`$09` pipe end
  (`$13AB`), `$0A`/`$0B` pipe mouth (`$13F8`), `$0C` flag (`$1566`),
  `$0D`/`$0E` hurdle bar (`$184F`), `$0F`/`$10` the arch on the right
  (`$1817`), `$11`/`$12` the building (`$18DB`, `$1903`). (traced)
- Falls and scripted actions: each action's directory (`$3E57`) holds four
  6-byte entries per pose: shape offset from `$D568` (word), length − 1,
  dx, dy, colour (`read_pose_entry` `$27D9`). The shapes are copied into
  `$7400`-`$74FF`, mirrored through `$0600`/`$0700` for action 3
  (`$281E`). Actions: 1 forward fall, 2/3 side falls, 4/5 crashes, 6
  splash, 7/8 idling, 9 push-off, `$0A`/`$0B` slowing, `$0C`-`$0E` final
  poses. (traced)

## Sound

- The driver is High Jump's, moved: `init_sound_driver` `$2FAC`,
  `queue_sound_id` `$2FEA`, `update_sid_voices` `$3021`, its state at
  `$2F10`. It runs from raster band 3 (`$2019`). Sound IDs are requested
  through `$8B`, and `request_pending_sound` `$0CFF` passes them on.
  (traced)
- Tables (file `$27`): script lo `$46A0` and hi `$46B3`, priority `$46C6`,
  19 IDs. IDs 0, 1, 9, `$0D`, `$10` and `$12` are silent (`$46D9`). IDs: 2
  music voice 2, 3 a fall starts, 4 the music, 5 splash, 6/8 fall impact
  (other/rough ground), 7 fall on road, `$0A` fall in the pipe, `$0C` wall,
  `$0E` landing on grass, `$0F` landing, `$11` points. ID `$0B` (`$4714`)
  has no request in the code. (traced)
- Music (file `$26`): 16 phrases, each a pair of note streams
  (`$7500`). Sound 4's script (`$7572`) starts voice 1 on phrase 0 and
  queues sound 2 for voice 2. After each phrase, the script's op `$0A`
  calls 6502 code in the music file: `pick_phrase_voice1` `$75AA` and
  `pick_phrase_voice2` `$75BD`. `choose_phrase` `$75D0` draws the next
  phrase at random from the phrase graph at `$7D6D` (9 bytes per phrase:
  a count, then successors), never going straight back to the phrase
  before. The second voice reuses the first voice's choice. Phrase 0 is
  only the opening. The chooser's random generator (`$760B`) has its own
  seed bytes (`$7638`-`$763A`), which come from the file and which
  nothing else touches. The sequence after a fresh load is therefore
  always the same; it moves on over restarts, because the seed is not
  reloaded. (traced; simulated: the op `$0A` calls come from `$364C`)

## Oddities

- Sound `$0F`'s first frequency is read through an address (op `$81`
  from `$FC00`, the event manager's code), giving `$DC01`. The immediate
  form `$01` was probably meant. (traced)
- Water-jump points go 5, 20, 40, 40. The index `$3F31` is never limited
  and is reset only by a fall. From the fifth water jump on, the points
  come from the bytes after the table (`$4C`, `$80`, ...; `$3ED9`), the
  first of which is not valid BCD. Whether five water jumps without a fall
  are possible on the course is open. (traced)
- The lake's islands are type 9 (start/finish), so riding onto one keeps
  the clock running. That is harmless, since the clock is already
  running. (traced)
- Action `$0D`'s pose 2 (`$D478`) is never shown. Its first shape,
  `$EF45`-`$EF71`, is used by nothing else. (traced)
- `speed_split` has `$0A` where the pattern gives `$10` (`$394F`).
  (traced)
