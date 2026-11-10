# Friday the 13th — orientation

## The image

`friday13.g64`, a GCR image of a disk with the volume name `FRIDAY 13TH`, id `01`. `kit/c64/disk.py` reads it: 680 sectors, one of them with a bad checksum, and no sector in use that no file holds. The files:

| File | Loads at | Bytes | Part | Found in the play snapshot |
|---|---|---|---|---|
| `FRIDAY 13TH` | `$01F0` | 70 | the loader | the loader's first stage, not kept |
| `TITLE` | `$2900` | 24,194 | intro | 214 of 1,512 sixteen-byte pieces: the introduction runs from it and the game overwrites most of it |
| `TITLE2` | `$0900` | 125 | the loader | not found: the intro loads it and jumps to it, and it loads the four files below |
| `DATA1` | `$0C00` | 13,218 | game | whole |
| `PROG` | `$5800` | 29,299 | game | 1,800 of 1,831 pieces: the rest is variables |
| `DATA2` | `$E000` | 7,778 | game | whole, under the KERNAL |
| `RM` | `$0400` | 882 | game | whole |

The image was not compared with any other release, and nothing says whether it is the original or a crack.

## From power-on to play

The game is two loads, so two parts (`parts/intro`, `parts/game`).

1. Attach `friday13.g64` and autostart it (`vice.autostart`) after a hard reset. It loads on the real drive timing.
2. **Intro hand-over.** The loader jumps to `$2900` about a minute after the autostart, with `$01` = `$37`: a stopping checkpoint on `$2900` takes `parts/intro/work/entry.vsf` there.
3. The intro shows the title picture while the scream plays (`$3600`), then the licence text. `wait_key` at `$2D9B` waits for no key and then a key on `$C5`: press the space bar (held 0.6 seconds). The story text follows; press space again. The portraits come up and the intro calls LOAD for `TITLE2`: a stopping checkpoint on `$FFD5` there takes `parts/intro/work/portraits.vsf`, the intro's code still whole.
4. `TITLE2`, at `$0900`, loads the game's four files while the portraits stay on screen (the loader was not read). **Game hand-over:** a stopping checkpoint on `$9200`, set before the autostart, takes `parts/game/work/entry.vsf` (about 3 minutes 40 seconds after the autostart on 10 November 2026, pressing space every 8 seconds).
5. The game prints a profile of the counsellor for this round, ending in "PRESS FIRE BUTTON." Press fire on joystick port 2 (hold half a second), and play starts. `parts/game/work/play-start.vsf` was taken there, paused at `$A0EB`: Wendy Watson standing in the church, score 0000000.

A snapshot loaded into the emulator stays stopped; run it with `vice_execution_run` before sending the joystick anything.

## Steady state

- `$01` is `$36` in play: KERNAL and I/O in, BASIC out.
- The interrupt vector `$0314` points at `$C604`, the sound routine. `$9312` sets an earlier vector, `$9398`, during start-up.
- The video chip is in bank 1 (`$DD00` = `$C6`), in multicolour bitmap mode (`$D011` = `$3B`, `$D016` = `$D8`), with the bitmap at `$4000` and the colour data at `$5400` (`$D018` = `$57`).
- Eight hardware sprites are used (the census lists sprites 0 and 4 to 7).

## The loader, in a paragraph

The first file, `FRIDAY 13TH`, is 70 bytes that load at `$01F0`; `TITLE` loads next, and the loader jumps to `$2900`. The intro loads `TITLE2` through the KERNAL's LOAD (`$2DA8`) and jumps to it at `$0900`, and `TITLE2` loads the rest. Whether any file loads during play was not traced: the loaders were not read, by policy. The play snapshot holds `DATA1`, `PROG`, `DATA2` and `RM` whole, so the game as played is in memory at once.
