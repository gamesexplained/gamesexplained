# Skate or Die!: Freestyle ramp — facts

The Freestyle ramp program: file `$0D`, loaded at `$0880` by the event
manager's load stub and entered at `$0880`. It plays the ramp event: push
off a platform, ride a half-pipe for ten passes, and score tricks above the
coping.

"Traced" means read from the code. "Simulated" means observed by running
the program from its snapshot (`work/play.vsf`) in the kit's 6502 machine
(`kit/c64/machine.js`) with random joystick input until it reached
`event_done` `$FE13`: fourteen runs, each ending there after 1,952 to 4,949
frames with scores between 2,150 and 4,630 handed back. The scripts are in
`GAME/work/agent-ramp/` (`sim.js`, `run*.json`).

## Layout and start-up

- File `$0D` is `$31FF` bytes, `$0880`-`$3A7E` (loader table `$F2F9`).
  Code `$0880`-`$1FF7`, then data; the sound driver `$271E`-`$2E67`; sound
  tables and scripts `$3563`-`$3954`. (traced)
- `$0880` holds `JMP $0886` as loaded. The first-time set-up `$0886` sets
  `$01` = `$25` (RAM everywhere, I/O at `$D000`), loads its files, then
  overwrites `$0880`-`$0882` with `NOP` (`$0896`-`$08A0`), so the event
  manager's re-entry through `JMP $0880` (`$F93E`, after PRACTICE AGAIN or
  between skaters) falls through to `JMP $08A1`, the per-entry set-up, and
  nothing is loaded again. (traced)
- Per entry (`$08A1`): clear zero page `$12`-`$7F` (`$166D`), build the
  quarter-square multiply table at `$0400`-`$07FF` (`$1679`) and the two
  bit-reverse tables at `$3363`/`$3463` (`$16A9`), bitmap video, status line
  and sprites, the raster interrupt, the sound driver (`$271E`) and the
  event state (`$1EFD`). (traced)
- The main loop `$08CF` only services sound: a reset request in `$7C`, the
  game's sound-request ring (`$3353`, indices `$7D`/`$7E`) and one driver
  tick per frame counted in `$7F`. Everything else runs in the raster
  interrupt `$0AF4`, two bands from the word table `$2E68`: line `$FB`
  (`$0B25`: sprites, keys, frame count, score pop-up, crowd) and line `$38`
  (`$0CCE`: controls and the current phase, sprite graphics, crowd). The
  event ends from inside the interrupt (`JMP $FE06` at `$1FB0`, no RTI).
  (traced)

## Loads

| File | To | What | Loaded at |
|---|---|---|---|
| `$0D` | `$0880`-`$3A7E` | this program | the stub, `$0806` |
| `$0F` | `$6800`-`$69FF` | 64-glyph font | `$15CB` (JMP) |
| `$10` | `$4000` | run-length packed half-pipe picture (the one High Jump shows) | `$08F8` |
| `$11` | `$6E00`-`$8083` | 158 poses | `$094E` |
| `$12` | `$8084`-`$C0AF` | 477 sprite shapes, chained after `$11` | `$0959` |
| `$13` | `$E000`-`$E8C8` | the Freestyle music | `$0963` (JMP) |

All traced from the `load_file` (`$F230`) calls; files `$10`-`$12` are the
files High Jump loads, `$11`/`$12` placed `$200` lower. `$10` is unpacked
by `unpack_rle` `$1FD1` to `$6E00` and copied out: bitmap `$1F40` bytes to
`$4000`, screen matrix to `$6400`, colours to `$6000` (copied to colour
RAM at each entry); files `$11`/`$12` then overwrite the scratch area.
(traced)

## Controls (traced; simulated)

- Joystick in either port: `$DC00` AND `$DC01` (`$0D35`). Because CIA 1
  port A drives `$7F` (keyboard row 7), the keys of that row also act as
  the stick: SPACE is fire, `1` up, left-arrow down, CTRL left, `2` right.
- RUN/STOP (newly pressed, `$1F58`) abandons the event: `$FE12` = `$FF`,
  then `end_event`.
- C= (newly pressed, `$1F74`) flips the sound-off flag `$FE10`, which the
  event manager keeps across events; turning sound on again restarts the
  music.

## How a run plays (traced)

- **Platform** (phase 0, `$0D58`): up/down moves across the ramp, but not
  into the channel (`$1C14`). Idle, a fidget animation starts at random
  (4 in 256 a frame, `$0D58`). Fire starts a 60-frame push-off; riding
  starts at the top of the wall with speed `$0280`.
- **Riding** (phase 2, `$0E0B`): the ramp is a path of 274 `(x, y)` pairs
  (`$2FA1`), mirrored for the right half; the speed gains the slope each
  frame (`$17D7`) and friction takes one unit a frame (`$1B7C`). Up/down
  move across the ramp (depth `$5F`/`$60`, perspective-scaled by
  `$14B3`). A **pump** is the first fire press in each half of the ramp:
  only if the skater is then in the band y `$E0`-`$EF` does it count
  (`$3F`) and add `$50` to the speed; anywhere else the half's pump is used
  up (`$1BAF`). In the lower zones a newly pressed left or right sets a
  **lean**, with or against the direction of travel (`$1C56`).
- **Trick class**, chosen at the top of each wall (`$1C81`) from the pumps
  (0, 1, 2) and the lean: no lean, class 0; a lean against travel, class
  5, 4, 3; a lean with travel, class 2, 2, 1. From the eleventh pass on,
  class 6 (no take-off, the run ends).
- **What each class does at the coping** (`class_phases` `$2E7E`):
  - classes 0 and 1, the air (phase 4, `$0F50`): left/right spin the
    skater through a 16-pose rotation (`$1B10`), pressing against the spin
    stops it only on a half or whole turn (`$1AF9`); up/down drift; fire
    in a forwards, backwards or side-on pose starts a grab (`$0FF2`, phases
    `$0C`/`$0E`: 2 points a frame held). Landing facing forwards or
    backwards, not spinning, off the channel, scores (`$0FA0`): class 1
    `100`, `200`, `400`, `800`, `1600` for 0-4 half turns (`$32FB`); class 0
    from `air_scores` (`$325B`), by half turns and the grab count (side-on
    grabs count two): `25` up to `3400`. Anything else is a fall.
  - class 2, the plant at the coping (phase 6, `$103F`): 200 points, then 2
    a frame held (4 while drifting); fire lets go (phase 8); left or right
    turns out of it (phase `$10`), which **doubles** the trick score.
  - class 3 (phase `$12`): 500 points, then 5 a frame held; fire, left or
    right ends it (phase `$14`).
  - class 4 (phase `$16`): 300 points and a turn with a drift across the
    ramp.
  - class 5 (phase `$18`): 250 points and a nine-pose spin.
- A trick's points go to the total when the next pass starts (`$1957`),
  shown in a pop-up made of sprites 5 and 6 (`$18E3`) and with sound 20;
  the trick score is **doubled** if the skater left the left wall and has
  come back over the far side of the channel (`$49`, `$1957`). The crowd
  animates more, and for longer, after bigger tricks (`$0B60`, `$1EE8`).
- **Falls** (phase `$0A`, `$0E82`), three types with their own sounds
  (`$334B`: 22, 9, 21): landing over the channel (depth `$D9`-`$E6` on the
  left half, `$1D0A`), off the ramp's width (depth below `$BF` or from
  `$101`, `$1D26`, a drop off the side), dropping below the coping during
  a grab or a held trick, or landing badly. The board rides on and the
  body is thrown, rolls or slides. Fire returns to the platform; a fall
  scores nothing.
- **Passes**: each start of phase 2 counts one (`$4C`, shown as PASSES,
  which never shows more than 10, `$1CD1`). A fall after the tenth pass,
  or reaching the eleventh wall (class 6, phase `$1C`), ends the run.
- **End of run** (phase `$1E`, `$13D9`): the **variety bonus**, by the
  number of different trick kinds landed (bits of `$50`: air, class-1 air,
  classes 2-5): `0`, `500`, `1000`, `2000`, `4000`, `6000`, `9000`
  (`$3305`, `$1E48`); sound 6; a closing animation chosen by the total
  (under 2,500, under 10,000, 10,000 and over, `$2F49`/`$2F53`/`$2F5D`).
  Fire then ends the event.
- **Hand-over** (`$1F99`): the total score as BCD, tens and units in
  `$FE03`, thousands and hundreds in `$FE04`, the top two digits in
  `$FE05`; then `JMP $FE06`. The status line shows only five digits
  (`$1CA8`). The event manager stores the three bytes as the event score
  and prints six digits. (traced; simulated: every run handed back a BCD
  score in `$FE03`-`$FE05`)
- The event reads `$FE00`/`$FE01` (the skater's name, printed on the
  status line, `$09D7`) and `$FE02` (the skater attribute, which here is
  the skateboard sprite's colour, `$09F2`). One of two sprite colour sets
  is picked at random at each entry (`$1EFD`, `$3313`/`$331B`). (traced)

## Graphics (traced)

- VIC bank 1: bitmap `$4000`-`$5F3F`, screen matrix `$6400`, `$D018` =
  `$90`, multicolour bitmap (`$0A54`). Character row 0 is a hires status
  line (the interrupt clears `$D016`'s multicolour bit at line `$FB` and
  sets it at line `$3A`), drawn from the font with each glyph inverted
  (`$15F9`).
- 69 two-frame animated picture cells (flags and crowd): offsets `$1FF8`,
  screen bytes `$2082`, colours `$210C`, pixels `$2196` (`$1E68`), the
  same data as High Jump's.
- The skater: poses at `$6E00` (30 bytes = five 6-byte part records:
  shape offset from `$8084`, last byte index, X and Y offsets); shapes are
  rows of 3 bytes, copied or mirrored (`$3363`/`$3463`) into double-buffered
  64-byte sprite blocks `$6A00`/`$6C00` each time the pose changes
  (`$1865`). Sprites 1 and 2 are multicolour. Sprite 7 is the board drawn
  again in black as a shadow on the ramp (`$1517`, `$1F3A`).

## Sound (traced; simulated)

- The driver is High Jump's, `$467` bytes higher: `init_sound_driver`
  `$271E`, `queue_sound_id` `$275C`, `update_sid_voices` `$2793` (one tick
  per frame from the main loop). Script addresses `$3563`/`$357D`,
  priorities `$3597`, 26 IDs.
- Effects queued by this event: 6 (end of run), 9, 21, 22 (falls), 15 and
  16 (swooshes at the bottom of the ramp), 20 (points added), 23 (held
  noise during the plant). IDs 0, 4, 5, 7, 8, 10-14, 17, 18 and 19 are
  never queued (19 runs as part of 9); 3, 24 and 25 are empty.
- Music: sound 1 (`$E072`), queued at each entry unless sound is off; it
  queues sound 2 (`$E095`). Voice A plays drums: drum scripts (`$E288`,
  `$E331`, `$E3D4`) made of calls to 16 drum calls (`$E15E`-`$E20D`), each
  setting a length (4, 8, 12 or 16 ticks) and one of four noise hits
  (`$E20E`, `$E230`, `$E252`, `$E25E`) that patch one drum routine
  (`$E13F`). Voice B plays pulse-wave note streams (`$E532`-`$E85C`) set up
  by `$E058`. Every phrase is 512 ticks on both voices. The phrase order
  is random: phrase table `$E000` (16 rows), successor table `$E85D`; the
  music opens with phrase 1 and alternates between phrases 8-11 and 1-7,
  never returning to the phrase of two steps before. The phrase-choosing
  code `$E0A7`-`$E137` is High Jump's `$3517`-`$35A7`, relocated. The
  random state `$E13B` comes from the disk (`$99`) and is never seeded, so
  the first music after loading always takes the same phrases.
  (simulated: the runs read the streams of phrases 1, 3, 5, 6 and 8-11,
  never phrase 0's or the drum script `$E483`)

## Oddities

- Never played: music phrase 0's voice B (`$E532`); phrases 12-15
  (their drum script `$E483` is a byte-for-byte copy of `$E3D4`); the
  voice set-up `$E040`. (traced)
- `$17D7` increments the border colour each time an object is clamped at
  either end of the path: a debugging aid left in. (traced)
- `$12D3` (grab in) compares A, still holding the height, instead of the
  frame counter, so the grab's first poses step every frame, not every
  fourth. (traced)
- `$0FA0` limits neither index: five half turns or more, or a grab count
  of 16 or more, read past the score tables. (traced)
- `$1865`: mirrored, the thrown body's sprite blocks 2 and 4 are mirrored
  with the wrong table (multicolour against hires). (traced)
- The NMI vector `$FFFA` holds `$0A3A`, the middle of an instruction here:
  RESTORE would corrupt the IRQ vector. (traced, not tested)
- Unused routines: `$0976`, `$0AA6`, `$0ABE`, `$0AEB` (the last three
  written for the KERNAL). Unused bytes: `$25E6` (156), `$2F30` (11),
  `$3259` (2), `$334E` (3), `$E15D`. Poses 140-157 (`$7E68`-`$8083`) are
  named by nothing in this event. (traced)
- The file's last 298 bytes (`$3955`-`$3A7E`) are stale memory: older
  sound scripts, a copy of file `$13`'s `$E12F`-`$E17F`, and High Jump's
  music bytes at the same addresses as in its own file. (traced)

## Leftovers in the snapshot (excluded from coverage)

`$3A7F`-`$3D7E` (High Jump's file `$0E`), `$5F40`-`$5FFF`, `$63E8`-`$63FF`,
`$67E8`-`$67F7`, `$6BC0`-`$6BFF`, `$6D40`-`$6DFF`, `$C0B0`-`$CFFF` (High
Jump's file `$12` tail, a stale event manager), `$E8C9`-`$EFFF` (the
shop's colour maps, identical to the shop's snapshot), `$F000`-`$F22F` (a
KERNAL copy's tail), `$F654`-`$F72F`. Each is in `game.json` with its
reason. (traced: compared with the High Jump, shop and entry snapshots)
