# Skate or Die!: Pool Joust — facts

The Pool Joust program: file `$14`, loaded at `$0820` by the event
manager's load stub and entered at `$0820` (the only event not at `$0880`).
Two skaters ride an empty swimming pool; the one holding the pole tries to
knock the other off. The opponent can be a second player or one of three
computer skaters, chosen on a portrait screen first.

"Traced" means read from the code. "Simulated" means observed by running
the play snapshot (`work/play.vsf`, the opponent-choice screen in practice)
in the kit's 6502 machine (`kit/c64/machine.js`) with random joystick input
(`GAME/work/agent-joust/rnd.js`): ten runs, each choosing an opponent, then
playing until `JMP $FE06`, after 2,494 to 3,007 frames. In every run the
computer won 3-0 and the program handed back `$FE0C` = 1. Every executed
address lies in a block typed as code.

## Layout and start-up

- File `$14` is `$3692` bytes, `$0820`-`$3EB1` (loader table `$F2F9`). Code
  `$0820`-`$218F`, a 156-byte gap of `$00`/`$FF` fill (`$2190`-`$222B`),
  the sound driver's variables and code `$222C`-`$29EC`, tables
  `$29ED`-`$31E9`, sound scripts and music `$31EA`-`$3EB1` (its last 60
  bytes again fill). (traced)
- `$0820` is `JMP $0826` as loaded. The one-time start-up `$0826` sets `$01`
  = `$25`, loads the font, the two pictures and the three sprite files,
  blanks the screen, clears `$35` and writes `$EA` over `$0820`-`$0822`
  (`$083A`-`$0844`), so the event manager's re-entry (`$F93E`, PRACTICE
  AGAIN) falls through to `JMP $0845` and nothing is loaded again. (traced)
- Per entry `joust_restart` `$0845`: stack reset, blank, clear zero page
  `$12`-`$C5` (`$14AE`), quarter-square table at `$0400`-`$07FF` (`$14BA`,
  all 512 values checked), the mirroring tables at `$2FEA`/`$30EA`
  (`$14EA`), raster interrupt (`$0A63`), sound driver reset (`$22C8`), both
  skaters in state 0. If `$FE0F` is non-zero (the second slot is the
  computer, as in practice) the opponent-choice screen runs (`$0AD9`,
  `$2086`); then `setup_joust` `$099A`, the pool (`$0AA0`), and the main
  loop `$087E`. (traced)
- The main loop only services sound: `$42` (silence request), the game's
  sound ring (`$2FDA`, indices `$C3`/`$C4`) and one driver tick per frame
  counted in `$C5`. Everything else runs in the raster interrupt `$0B84`:
  two bands from `raster_handlers` `$2A12`, line `$FB` (`$0BB6`: sprite
  registers, frame count, RUN/STOP, Commodore key, swing timers, random
  number) and line `$38` (`$0D8B`: multicolour on, both skaters, draw
  order, hit test). The event ends from inside the interrupt (`JMP $FE06`
  at `$2148`). (traced)

## Loads

| File | To | What | Loaded at |
|---|---|---|---|
| `$14` | `$0820`-`$3EB1` | this program | the stub, `$0806` |
| `$15` | `$6800`-`$69FF` | 64-glyph font (the same 512 bytes as `$0F`, `$23`, `$2D`) | `$140E` (JMP) |
| `$16` | `$4000` | run-length packed opponent-choice picture, `$10AA` bytes | `$08A7` |
| `$17` | `$4000` | run-length packed pool picture, `$2241` bytes | `$0909` |
| `$18` | `$8000`-`$8B9F` | 124 frame descriptors of 24 bytes | `$095E` |
| `$19` | `$8BA0`-`$AF21` | 198 sprite shapes, chained after `$18` | `$0969` |
| `$1A` | `$7000`-`$757F` | 22 ready-made sprites (skateboards) | `$0972` |

All traced from the `load_file` (`$F230`) calls. Files `$16` and `$17`
are two of the files the brief lists as never found whole: both are
packed, and only their unpacked output stays in memory. (traced)

- `unpack_rle` `$2169` (High Jump's `$1B6A`): control byte `$00`-`$7F`
  copies the next n+1 bytes, `$80`-`$FF` repeats the next byte n - `$7F`
  times, until the end address the loader returned. Each picture unpacks
  to 10,001 bytes at `$8000`: bitmap `$1F40`, colour-RAM nibbles `$3E8`,
  screen matrix `$3E8`, one spare byte. Unpacking `GAME/work/files/16.bin`
  and `17.bin` with this rule reproduces `$C000`-`$DF3F`/`$E000`/`$E400`
  and `$4000`-`$5F3F`/`$6000`/`$6400` of the play snapshot byte for byte.
  (traced; checked against the files)
- The choice picture is copied under the I/O area: `load_pictures` sets
  `$01` = `$24` with interrupts off (`$08CB`-`$0900`), copies the bitmap
  to `$C000`-`$DF3F`, colours to `$E000`, screen to `$E400`, and sets `$25`
  again. Shown in VIC bank 3 (`$DD00` bits = 0, `$D018` = `$90`); the pool
  in bank 1 (bitmap `$4000`, screen `$6400`). (traced)

## Graphics

- Both pictures are multicolour bitmaps; `%11` takes the colour-RAM
  nibble, copied from `$6000` (pool, `$0AA0`) or `$E000` (choice, `$0AD9`)
  each time the screen is shown. (traced)
- The pool's character row 0 is the hires status row: band 0 turns
  multicolour off (`$0BB6`), band 1 back on at line `$3A` (`$0D8B`). Text
  is drawn by copying font glyphs into bitmap cells of row 0 (`print_string`
  `$1427`, glyph `$143C`, column `$1461`); the row's colours come from
  `$2EC9`/`$2EF1`/`$2F19` through `set_status_colours` `$1BEB`. (traced)
- Skater sprites: each pose (0-`$7B`) is a 24-byte descriptor in file `$18`
  of four 6-byte parts: pole, body, body, board. Part bytes: +0/+1 offset
  into file `$19` from `$8BA0` (`$2FD8`), or with bit 7 of +1 set a
  ready-made sprite of file `$1A` (0-9 board angles, 10 empty); +2 the
  index of the last byte; +3 signed X offset; +4 Y offset; +5 bit 5
  X-expand, bit 4 Y-expand (no other bit read: `$0D38`, `$0D54`, `$0D5C`).
  (traced, `$15F6`, `$0D10`)
- The 198 distinct shapes the descriptors name tile file `$19` exactly,
  9,090 bytes with no gap or overlap. The shapes are copied into buffers
  `$6C00`-`$6FFF` (blocks `$B0`-`$BF`, two sets per skater, swapped when a
  set is complete) as stored for a skater facing right or mirrored through
  `reverse_pairs` `$30EA` for one facing left (`$16CF`, `$15C9`, `$1580`).
  Board sprites come from blocks `$C0`-`$CA` or the pre-mirrored `$CB`-`$D5`
  and are not copied. (traced; the tiling checked by script)
- Sprite multicolours: `$D025` = `$0A` (light red), `$D026` = 0 (black)
  (`$0975`). The pole colour cycles through `$2FC4` (yellow, orange, white)
  by the swing timer. (traced)
- Poses `$2C`, `$36`-`$39` and `$77` are named by no pose table and by no
  pose arithmetic (the offsets `$41`/`$42` added for the pole holder) in
  the code. (traced; table scan `GAME/work/agent-joust/poses.py`)

## Rules and scoring

- **The pole.** One skater holds the pole. Fire, newly pressed, starts a
  32-frame swing (`$205A`: swing timer `$33` = `$20`) when no swing runs
  and the 32-frame cooldown `$34` is over (`$2073`). (traced)
- **A hit** scores only while the holder's swing timer runs and the
  skaters are within reach (`check_hit` `$1A85`): neither knocked off,
  climbing out or waiting, not both on the deck, depth scales less than 8
  apart, and |dX| + |dY| of the screen positions below 15. The holder
  scores one point, the other is knocked off (state `$0A`), sound 12
  (`$0D8B`). (traced; simulated: points scored)
- **Passes.** Each time the skater without the pole reaches the top of a
  wall one pass is used (`$0FD1`, sound 20); after the fifth the pole
  changes hands, the counter resets to 4 (sound 16). The pass counter
  sprite shows 5 down to 1 beside the holder's side of the screen.
  (traced; simulated: `$2E` 4 to 0, then `$2C` flips between 0 and `$40`)
- **Rounds.** When both skaters are back on the deck the round is over;
  the pole goes to the skater who did not start the last round with it
  (`set_state` `$1792`, `$2D`). (traced)
- **Winning.** Scores show as -0- to -2- while both are below 3. From 3
  points on the field shows the lead: behind `---`, level `TIE`, one ahead
  `ADV`, two or more `WIN` (`score_text` `$1B3C`). So the match is first to
  three with a two-point lead, like deuce in tennis. `WIN` sets `$32` and
  stores 1 in `$FE03` (first skater) or `$FE0C` (second); the event ends
  when both are next back on the deck. (traced; simulated: 3-0 ends the
  match, `$FE0C` = 1)
- **Handed back:** `$FE03` (first slot) or `$FE0C` (second slot) = 1 for
  the winner; `$FE04`/`$FE05` and `$FE0D`/`$FE0E` are never written;
  `$FE12` = `$FF` when RUN/STOP abandons the event (`$2104`). (traced: all
  absolute writes to `$FExx` in the program)
- **Knocked off.** The body flies off along the path while the board rolls
  on (`$0FF3`); after a tumble, fire returns the skater to the deck once
  the other is on the deck or climbing out. The scorer meanwhile may climb
  out (trick 3, chosen automatically when the other is knocked off,
  `$19D2`). (traced)

## Controls (traced)

- First skater on joystick port 2 (`$DC00`), second on port 1
  (`$DC01`). During the introduction whoever presses fire first takes the
  left-hand skater: a press on port 1 swaps the ports (`$1C98`).
- Up/down: move across the pool (depth, `$1962`); on the deck the skater
  without the pole may walk along the edge (`$1977`).
- Left/right below the coping queue the trick for the next wall top
  (`$199F`): against the direction of travel a slide turn (state `$0E`),
  with it a lip trick (state 6), neither an air turn (state 4). In the air
  left/right spin through the sixteen facing poses and up/down tilt the
  path (`$18C2`, `$1901`). Any landing is accepted: no pose counts as a
  fall (`$10E2`).
- Fire: drop in from the deck (8 steps of 6 frames, `$0E61`), swing the
  pole, get up after a knock-off.
- RUN/STOP abandons the event (`$2104`); the Commodore key toggles the
  music, kept across loads in `$FE10` (`$2120`).
- Opponent choice: up/down on either port move the arrow over the three
  faces, fire picks (`$2086`).

## The computer opponents (traced)

- Chosen in `$35`: 1 Poseur Pete, 2 Aggro' Eddie, 3 Lester
  (`opponent_names` `$2F61`). Settings by opponent (`$1CE0`): frames
  between decisions 15/7/1 (`$2F69`); depth distance within which it stops
  closing in when it holds the pole 12/5/3 (`$2F7D`); without the pole it
  keeps between 8/10/15 and 20/30/45 units away (`$2F85`, `$2F81`).
- `cpu_joystick` `$1D4F` builds a joystick byte: chase or evade in depth,
  then a personality routine (`$1E01`): Pete gets up and drops in at once
  and turns at random; Eddie drops in as soon as the player is on the right
  half and high on the wall and turns towards or away from the player;
  Lester adds a random delay and a direction test before dropping in and
  times his lip tricks by the player's speed and height (`$1F54`).
- When the skaters are within reach a computer holder swings at once,
  timers permitting (`$0DB8`).
- Lester's first call is to an `RTS` at `$1F73`; the routine after it,
  which would set his evade distance from the gap along the path, never
  runs.
- In a competition with an odd skater out the event manager makes the
  second slot the computer (`$FE0F` = `$FF`, name LESTER); the joust then
  shows the choice screen there too, so the player picks the computer's
  personality. The computer's result is not stored (`$FF0D`). (traced)

## Sound (traced)

- The driver `$22C8`-`$29EC` is High Jump's byte for byte, `$11` bytes
  higher, except the addresses of its tables. Init `init_sound_driver`
  `$22C8`, request `queue_sound_id` `$2306` (A = ID), tick
  `update_sid_voices` `$233D`. Scripts `$31EA` (26 IDs, low/high split),
  priorities `$321E`.
- IDs used: 1 the music (its script queues 2, the second voice), 12 hit,
  13 climb-out finished, 14 knocked off, 15 and 22 the body landing, 16 the
  pole changes hands, 20 a pass used. Sixteen IDs point at a lone end
  command (`$3238`). Sound 25 calls code at `$CD00`, which in this program
  is inside the choice bitmap; nothing queues it.
- The music: sixteen two-voice phrases (`$3355` table, streams
  `$3497`-`$3DE5`), the next chosen at random from a successor row
  (`$3DE6`), never the phrase before (`$3431`).

## Leftovers and dead code (traced)

- Uncalled: `$0990` (add A to `$12`), `$0B35` (copy from `$FFCF`),
  `$0B4D` (zero fill), `$0B7A` (KERNAL key wait), the hex printer at
  `$13E3`, `print_vs_row` `$1B93`, `body_friction_x12` `$1953`,
  `$1F74` (behind an `RTS`), `stop_sound` `$2314`, `pause_sound_slot`
  `$232A`, `resume_sound_slot` `$2332`.
- `$2F` is set to `$20` and never cleared, so its test at `$0FD5` always
  passes. `$2EBB`-`$2EC2` and `$2F79`-`$2F7C` are never read; `$2EB2`
  follows the 63-byte arrow sprite unread.
- Memory the program never writes holds the shop's and High Jump's bytes:
  the shop's records text at `$6A00`-`$6BFF` until the digit sprites are
  copied, High Jump's data past the end of each file (`$3EB2`, `$7580`,
  `$AF22`), the shop's colour maps at `$E840`-`$EFFF`. All listed in
  `game.json` under `coverage.exclude`.
