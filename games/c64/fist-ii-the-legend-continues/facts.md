# Fist II: The Legend Continues — verified technical facts

What is true of the game as a whole: how its parts follow one another, and what they share.
Each part's own facts are in `parts/<id>/facts.md`.

## The two programs

The disk's menu (`LL`, loaded at `$9800`) offers `1) TRAINING` and
`2) ADVENTURE`. Each choice runs a loader of its own, `LOADIT` for
Training and `LOADALL` for the Adventure, both at `$C000`, and each reads
its own six files into the same places: `TNK`/`BNK` 12A at `$0400`, 2B at
`$5C00`, 3 copied to `$8000`, 4A at `$C280`, 4B copied under the I/O area
and the KERNAL to `$D000`-`$FFEF` (`$2FF0` bytes: the last nine of the
file, `$3FF0`-`$3FF8` as it loads, never reach the game), and `TOLOR`/`COLOR` copied into colour RAM.
Both end with `JMP $C3FD`. Neither program goes back to the menu (F5
restarts the program in memory), so playing the other means loading the
disk again.

The Adventure's loader shows the title picture (`TITLE`, `TSETUP`) while
it loads; Training's blanks the screen and shows only a cyan border
(parts/training, `$C20D`).

## What the parts share

Training carries much of the Adventure's code at other addresses.
`kit/scripts/carry.py` pairs them instruction for instruction, with
differences in places: a constant changed, a branch that leads elsewhere,
a stretch one copy leaves out.

| Code | Adventure | Training | Instructions paired |
|---|---|---|---|
| Music driver | `$F4EF`-`$F99B` | `$09A5`-`$0F51` | 299 |
| Start-up of the video chip and the interrupts | `$C40D`-`$C4D1` | `$1B3A`-`$1C1F` | 74 |
| Fighter engine: scripts, sprite positions, pose building, mirroring | `$1A9A`-`$20E0` | `$137A`-`$19DF` | 599 |
| Hit test, raster handlers, the sample player | `$3800`-`$3E0B` | `$2E79`-`$34CE` | 208 |
| The two-fighter sprite multiplexer | `$404F`-`$4A34` | `$356B`-`$3AD7` | 585 |

The data differs. Training has 256 packed body images to the
Adventure's 229, 60 poses to 73, four sampled sounds of its own, and its
own tunes, played by the same driver.

## Checks behind the pages

How the pages' widgets, pictures and sounds were checked against the game, and which emulator showed what the pages describe. The pages themselves say only what the reader is looking at.

### gameplay.html

- Captured in an emulator on 2 October 2026, with the hero's energy held up while playing.

### graphics.html

- A reconstruction, not a screenshot: one frame recorded in the emulator, with 70 writes to the video chip and the line each happened on, drawn line by line.
- It matches the emulator's own picture in all 104,448 pixels.

### levels.html

- The outdoor rooms were checked against screenshots taken in the emulator (rooms 94 and 100); the cave rooms of scenery set 0 were not.

### music.html

- The port was checked against the driver itself, run in a 6502 simulator on the game's bytes: all 25 sound registers after each of 30,000 frames, ten minutes of each tune, match.
- The sample player (`$3D8B`, `$3DB8`, `$3E1A`) is ported to JavaScript, and the port was checked against the game’s own routines run in a 6502 simulator on the game’s bytes: every write to the volume register, and the frame and cycle it falls on, match for all ten.

### solution.html

- Jump across and continue right." This crossing has not been driven in the emulator.
- This was observed in the emulator.
