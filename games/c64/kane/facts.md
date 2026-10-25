# Kane — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

- Mastertronic's original cassette, 1985: `Kane.tap` from the Internet
  Archive item `uta_Kane_1985_Mastertronic_7916`, SHA-256
  `d6c066a6cdc3380026ace9cd5ecd7c4af98cf90851fb48b3b23777b328c48093`.
- The tape holds the loader `KANE` (`$029F`-`$03BF`, Commodore's own format)
  and three files in the loader's faster format: `DATA1` (`$3FD0`-`$9FFF`,
  copied up to `$A000`-`$FFFF` by its own routine at `$3FD0`), `DATA2`
  (`$0801`-`$40FF`) and `DATA3` (`$8000`-`$9FFE`). The game is one load:
  nothing is read from the tape after the loader jumps to `start` (`$0C00`).
- Design and programming John Darnell; graphics J. Darnell, N. Baikaloff and
  J. Porch (the title's credits lines, which change every so often; the
  graphics credit is at `$3E3F`).

## Memory layout

| Thing | Where |
|---|---|
| Zero page variables: the music's voice pointers, `effects`, the clock, the coach count | `$0002`-`$0048` |
| The thrown rider's three sprite shapes, kept while pictures are unpacked | `$0101`-`$01C0` (from `$4000`) |
| The status lines' text screen; its hidden top rows hold a facing flag for each sprite shape | `$0400`-`$07E7` |
| The status lines' character set | `$0800`-`$0AFF` |
| Ride 1's and the train's placement lists | `$0B00`, `$0B70` |
| Code: pictures, stages, rides, shoot-out, score, hall of fame | `$0C00`-`$3F38` |
| The title picture, packed | `$1300`-`$1945` |
| An older build of `gunman_step`, never run | `$3F3A`-`$3FFF` |
| VIC bank 1: stage sprite shapes `$4000`-`$43FF` and a ride's text screen at `$4000`, the bitmap's screen `$4400`, sprite shapes `$4800`-`$5FFF`, the bitmap `$6000`, a ride's sprites `$4400`-`$77FF` and characters `$7800` | `$4000`-`$7FFF` |
| The rides' map buffer, five rows of 400 characters; at load an older build of the code | `$8010`-`$87DF` |
| Code: the gunmen, the shoot-out's aim and shots, mirroring sprites | `$8810`-`$8C47` |
| Tables and texts: hall of fame, ending text, `tune_slowdowns`, score texts, pending and score, `picture_table`, places, shapes | `$8C48`-`$91E6` |
| Sound: effects, sample player, music player, the tune and the frequency table | `$91E7`-`$9DE5` |
| The whinny sample | `$9E00`-`$9FFE` |
| The town picture, packed | `$A000`-`$B1AE` |
| The canyon picture, packed | `$B1B0`-`$C605` |
| The ending picture, packed | `$C610`-`$CF72` |
| The stages' sprite shapes, packed | `$D000`-`$DA4B` |
| The rides' sprite shapes, packed | `$DA50`-`$F3C4` |
| The hit sample | `$F3F0`-`$F6AF` |
| The rides' character set | `$F6C0`-`$FEBF` |
| The ending's sample (the character set's last 64 characters) | `$FCC0`-`$FF8F` |

Everything from `$A000` up lies under BASIC, the I/O area or the KERNAL;
the unpacking and sample routines set `$01` to 0 for each byte they read.
In play `$01` is `$36`.

## Timing

- PAL. Every handler is a raster interrupt through the KERNAL's vector at
  `$0314`; each handler sets the next one's line and address.
- In the canyon and the shoot-out two handlers: `irq_top` (`$3B09`) on line
  1, the bitmap, and `irq_bottom` (`$39D9`) on line 216, the status lines,
  the shadow sprite registers and the sound effects.
- On a ride eight handlers, lines 1, `$55`, `$6A`, `$7D`, `$81`, `$9A`,
  `$A8` and `$AF` (`irq_ride`, `$27F3`, to `irq_ride_control`, `$2A25`).
- The canyon's loop (`duck_loop`, `$1950`) waits on `frame_delay` with a
  count of `$19` high, about 57,600 cycles: one pass every 3.7 frames
  (*live*, counting checkpoints, 25 October 2026).
- The shoot-out's loop (`$35FA`) waits on `frame_delay` (`$3801`), about
  46,000 cycles: one pass every 2.8 frames (*live*). The gunmen take a step
  every fifth pass (`gunmen_step`, `$9139`), about fourteen frames.
- The ride's loop (`ride_loop`, `$209E`) does not wait: 54 passes a frame on
  the train's ordinary path (*live*). Once the train is caught or 20 coaches
  ahead, every pass clears the obstacles again and a pass takes about two
  and a half frames.
- Ride 1's clock counts down a second every 50 frames in `irq_ride`.
- The music steps every 6 frames (`tempo`, `$9640`).

## Controls

- Joystick in port 2 (CIA 1 port A, `$DC00`).
- Title: fire starts a game at level 1, F1 opens practice ("LEVEL 1 2 OR 3 ?",
  then F1 the ducks, F3 ride 1, F5 the shoot-out, F7 the train), F7 shows the
  hall of fame (`title_screen`, `$3250`; `practice_menu`, `$336C`).
- Canyon: the stick moves the sight six pixels a step, fire shoots an arrow.
- Rides: left and right change the horse's speed a step, from -3 to 3, with
  fifteen frames between changes; fire jumps while the horse moves
  (`irq_ride_control`, `$2A25`). F1 restarts the ride with no token lost
  and the clock back at 2.00 (`ride_loop`; *live*).
- Shoot-out: up and down move the sight three lines a pass, left and right
  walk the Marshall six pixels a step (three for the first step after he
  stands), fire shoots while he stands and has bullets (`$35FA`).
- Hall of fame: three initials from the keyboard, A to Z and space, RETURN
  to finish (`check_high_score`, `$3CF1`).
- RESTORE does nothing: the NMI vector points at a lone RTI (`nmi_ignore`,
  `$3162`). A reset restarts the game through the `CBM80` header that
  `start_stage` (`$3163`) writes at `$8000` before every stage (*live*).

## Graphics

- Every stage starts with a multicolour bitmap picture: screen colours at
  `$4400`, bitmap at `$6000`, colour RAM, unpacked by `show_picture`
  (`$0C1B`) a byte at a time with a pause after each (`short_delay`,
  `$0E31`), so the picture appears as it is drawn.
- A picture is three streams. The bitmap (`unpack_bitmap`, `$0D84`): a byte
  other than `$00`, `$55`, `$AA` or `$FF` is copied, one of those four is
  followed by a count. Screen colours and colour-RAM nibbles
  (`unpack_runs`, `$0DFB`): pairs of a count and a value. Sprite shapes
  (`unpack_rle`, `$3086`): `$00` or `$FF` followed by a count.
- Packed sizes, bitmap + screen colours + colour nibbles: the canyon
  3,730 + 902 + 566, the town 3,431 + 708 + 380, the ending 1,541 + 476 +
  378, the title 1,278 + 202 + 118 bytes.
- `picture_table` (`$907C`) gives each stage's picture: the town for the
  shoot-out (0) and before the train (2), the canyon (1), the ending (3),
  the title (4). Headers are assembled for `$A000` and relocated.
- The status lines are a text screen at `$0400` with the font at `$0800`,
  switched in by `irq_bottom` on line 216.
- A ride's screen is characters at `$4000` from the set at `$7800`, a band
  of five rows of obstacles scrolled a pixel at a time (`$D016`), and eight
  sprites reused on line `$9A` as a black strip of double-width bars.
- The ride's course is a strip of 400 characters by five rows built from
  nine 5×5 objects (`ride_objects`, `$0EC2`) laid by `place_object`
  (`$2F7B`) at the steps in the placement list. A character is 0.01 mile.
- Sprite shapes are mirrored in place when a figure turns
  (`flip_shape`, `$89DE`; `mirror_byte`, `$8A23`), with a flag for each
  shape at `$0400` plus its number.
- The horse falls when sprites 5, 6 or 7 touch the band (the VIC's
  sprite-to-background collision register, read in `irq_ride_sprites`,
  `$2980`).
- One frame of ride 1 rebuilt from a recorded frame by the site's C64
  library matches the emulator's picture in all 104,448 pixels (*live*).

## Mechanics

- Four stages in a loop: the canyon (stage 1), ride 1 (stage 1, from the
  canyon's `RTS`), the shoot-out (stage 0), the train (stage 2). After the
  train the level goes up; after level 3's train, the ending (stage 3).
- Peace tokens (`tokens`, `$8FAC`) are lives: earned in the canyon as
  `ducks_killed` over `ducks_per_token` (3, 4 or 5 by level), lost at a
  fall, when ride 1's clock reaches 0.00 and when the Marshall is shot.
- Points go to `pending` (`$8FA4`, four BCD bytes) and `count_score`
  (`$3B9A`) moves them onto the score in steps of 1, `$0B` or `$99` a frame.
  `$0B` in decimal mode leaves digits above 9: 594 points put 706 on a score
  ending in 0 to 4 (*live*) and 690 on one ending in 5 to 9.
- Canyon: ten arrows; a hit duck gives its arrow back (up to ten); the stage
  ends at 39 ducks home or no arrows left. A duck scores 99, 149 or 198 by
  level; the bonus is 297 points a token.
- Ride 1: 4.00 miles against a two-minute clock. At the finish the bonus is
  15, 20 or 25 points a count; the count is the BCD seconds plus `$50` as a
  binary sum with a minute or more left, and 256 with less (`ride1_step`,
  `$2333`; *live*: 2,520 waiting at 1.58, 1,200 at 1.00, 3,840 at 0.59).
- Shoot-out: twelve bad guys, at most four at once (sprites 3 to 6), from
  sixteen hiding places (`places`, `$9169`). A gunman comes out over 5, 6 or
  7 steps, waits seven, fires once and goes back (`gunman_step`, `$8810`).
  His shot does nothing while the Marshall walks (`gunman_fires`, `$8AF2`;
  *live*: 16 shots and 0 hits in a minute of walking, 8 shots and 6 hits in
  a minute of standing). Standing, the shot hits when the aim is within 8
  pixels; the aim closes in the longer he stands (`gunmen_aim`, `$8A61`).
- The place test reads `place_used` at the gunman's number (`$3ED4`), so two
  gunmen can share a place (*live*: 29 of 552 looks over 150 seconds).
- A gunman is worth `(level+1)×2` lots of 99; the twelfth adds
  `(level+1)×99` (`check_shot`, `$3734`).
- The train: 3, 7 or 11 coaches by level (`coaches`, `$003D`), one fewer
  for every twenty characters gained. Each new low adds 49, 74 or 75 points
  three times. At 0 the train is caught: 30, 50 or 70 lots of 99, and the
  tokens times five lots of 99 three times. At 20 the count stops showing
  (*live*: 19 shown at 21); from 22 the horse slows, stands, and a token is
  lost (`train_step`, `$228B`).
- After the train is caught or gets away, `clear_obstacles` (`$313F`)
  clears `$8001`, `$8003`, `$8007` and `$8008` with the obstacles, and a reset
  starts BASIC until the next stage (*live*).

## Data tables

| Table | Where | Form |
|---|---|---|
| `picture_table` | `$907C` | five addresses less one, by stage |
| `ride_objects` | `$0EC2` | nine objects, 25 bytes each |
| Placement lists | `$0B00`, `$0B70` | pairs of a step and an object, `$FF` to end |
| `places` | `$9169` | sixteen of x, y, hit flag, kind |
| Hall of fame | `$8C74` | five entries of three initials and eight digits |
| `tune_slowdowns` | `$8E5D` | nine places in the ending's tune |
| Ending text | `$8CAC` | lines of thirty screen codes |
| The tune | `$9822` (voice 1) | two-byte events: instrument and length, then note |
| Frequency table | `$9D26` | the notes' SID frequencies |

Text is in screen codes for the status font at `$0800`, which follows the
C64's lower-case set: `a`-`z` at `$01`-`$1A`, capitals at `$41`-`$5A`,
digits at `$30`-`$39`.

## Sound

- One tune, the finale of Rossini's William Tell Overture, on the title,
  ride 1 and the ending (`music_step`, `$9492`, from `play_music`,
  `$9475`). Each voice reads two-byte events; three instruments per voice;
  the gate goes off two frames before a note ends. The filter is set from
  `filter_setup` (`$96A8`). Held against the game's code frame by frame by
  `test_music.js`.
- The ending's loop (`$31DC`) slows the tune at two of the nine places in
  `tune_slowdowns`.
- Effects (`play_effects`, `$91E7`), one bit each in `effects` (`$23`): the
  Marshall's shot (bit 7), a gunman's (6), the whistle (5), the drum (4).
  The shots count in `shot_time` (`$25`) and `gunman_shot_time` (`$9283`) and
  end at 10, leaving 9, so each shot after the first starts nine frames late.
  `shot_time` holds 189 after loading, and the first shot is silent
  (*live*).
- The train's hoofbeats (`hoof_sound`, `$96FF`), noise on three voices,
  their period 20 frames at the start and shortened a frame a beat to 10.
- Five samples, one bit a sample on voice 1's test bit, timed by CIA 2's
  timer A (`$9337`, `$9349`, `$935B`): the hit sample at `$F3F0` at three
  speeds and volumes for a duck, a gunman and the Marshall, the whinny at
  `$9E00` and the ending at `$FCC0`.

## The listing's error rate

A sample of 60 of the listing's 643 comments, drawn with seed 20261025,
was checked one by one by a fresh agent on `claude-opus-5-5[1m]` that had
written none of them. It found 14 wrong in a detail and one doubtful: a
loop's pace stated as once a frame where it is many times a frame or one
pass in two to four (`ride_loop`, `train_step`, the shoot-out's loop,
`gunman_delay`); the hiding-place test (`gunmen_appear`); the aim's step to
the right; `mirror_byte`'s bit order; the two hoofbeat patterns the wrong
way round; the rows two packed records cover; sprite pointers' uses left
out; the drum's bit in `effects`; and `face_left`'s condition. All 14 were
corrected, with about 60 other comments that held the same beliefs. The
95 % interval for the share of comments wrong is 14 % to 35 %. It is a
lower bound, since a checker misses some. The page's tests later showed
four more wrong (`irq_top`'s background by stage, in two comments,
`tune_slowdowns` and the ending) and they were corrected.

## Live tests

All in VICE 3.13.2 (x64sc, PAL) on 25 October 2026, from the snapshots in
`orientation.md`.

- Loop paces with counting checkpoints: the canyon 3.7 frames a pass, the
  shoot-out 2.8, the train's ride 54 passes a frame.
- Ride 1's bonus at 1.58, 1.30, 1.00, 0.59 and 0.30 left, read at `$236D`.
- 594 points waiting put 706 on a score of 0.
- A minute of walking against a minute of standing in the shoot-out.
- Two gunmen in one place, sampled four times a second for 150 seconds.
- The first shot after loading: `shot_time` from 189 to 9, `$923D` never
  reached.
- F1 on ride 1 with 0.04 left and 2.50 miles covered.
- A reset in the canyon (the game restarts) and after the train got away
  (BASIC).
- The coach count at 21 with 19 on the screen.
