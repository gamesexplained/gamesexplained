# Friday the 13th — orientation

## The image

`friday13.g64`, a GCR image of a disk with the volume name `FRIDAY 13TH`, id `01`. `kit/c64/disk.py` reads it: 680 sectors, one of them with a bad checksum, and no sector in use that no file holds. The files:

| File | Loads at | Bytes | Found in the play snapshot |
|---|---|---|---|
| `FRIDAY 13TH` | `$01F0` | 70 | the loader's first stage, not kept |
| `TITLE` | `$2900` | 24,194 | 214 of 1,512 sixteen-byte pieces: the introduction runs from it and play overwrites most of it |
| `TITLE2` | `$0900` | 125 | not found |
| `DATA1` | `$0C00` | 13,218 | whole |
| `PROG` | `$5800` | 29,299 | 1,800 of 1,831 pieces: the rest is variables |
| `DATA2` | `$E000` | 7,778 | whole, under the KERNAL |
| `RM` | `$0400` | 882 | whole |

The image was not compared with any other release, and nothing says whether it is the original or a crack.

## From power-on to play

1. Attach `friday13.g64` and autostart it (`vice.autostart`). It loads on the real drive timing and takes about a minute.
2. The first screen is the licence text. A wait loop at `$2DA1` polls `$C5` (the last key pressed) until a key is down. Press the space bar (held 0.6 seconds); on the run that made the snapshot the screen moved on after the third press.
3. The introduction shows the five portraits, then a profile of the counsellor drawn for this round, ending in "PRESS FIRE BUTTON." There is a long black screen while the game's files load.
4. Press fire on joystick port 2 (hold half a second), and play starts. `work/play-start.vsf` was taken there, paused at `$A0EB`: Wendy Watson standing in the church, score 0000000.

A snapshot loaded into the emulator stays stopped; run it with `vice_execution_run` before sending the joystick anything.

## Steady state

- `$01` is `$36` in play: KERNAL and I/O in, BASIC out.
- The interrupt vector `$0314` points at `$C604`, the sound routine. `$9312` sets an earlier vector, `$9398`, during start-up.
- The video chip is in bank 1 (`$DD00` = `$C6`), in multicolour bitmap mode (`$D011` = `$3B`, `$D016` = `$D8`), with the bitmap at `$4000` and the colour data at `$5400` (`$D018` = `$57`).
- Eight hardware sprites are used (the census lists sprites 0 and 4 to 7).

## The loader, in a paragraph

The first file, `FRIDAY 13TH`, is 70 bytes that load at `$01F0`, and the rest of the disk loads after it. Which file loads when, and whether any file loads during play, was not traced: the loader was not read, by policy. The play snapshot holds `DATA1`, `PROG`, `DATA2` and `RM` whole, so the game as played is in memory at once.
