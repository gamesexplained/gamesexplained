# Spindizzy — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`spindizzy[electric_dreams_1986](pal).g64`, from the C64 Preservation
Project's G64 collection on the Internet Archive (item
`C64_Preservation_Project_10th_Anniversary_Collection`, file
`..._G64.zip`, entry `c64pp-g64-zip/s/spindizzy[electric_dreams_1986](pal).zip`),
SHA-256 `07cf3a77…7de2d8`. Its header reads `GCR-1541`: a G64 image of
the original disk, with the drive's own data on every track. The
directory has no copy protection the emulator's true drive emulation does
not pass, and no crack or trainer: five files, all "0 blocks" in the
directory listing.

| File | Loads at | Bytes |
|---|---|---|
| `SPINDIZZY` | `$02A7` | 93 |
| `SPIN1` | `$0800` | 768 |
| `SPIN2` | `$6000` | 904 |
| `SPIN3` | `$6000` | 28,672 |
| `SPIN4` | `$1400` | 14,593 |

The same collection has a second release, `spindizzy[activision_1986](!).g64`
(SHA-256 `fa059122…24b0a36`): Activision's American disk, eight files
under other names (`DATA`, `HIBLOCK`, `MIDBLOCK`, `M-CODE6000` and so
on). It is a different build and is not the image analysed here.

## From power-on to play

1. Hard reset, attach the image and autostart it (`autostart(rpc, <image>, 1)`
   in `kit/c64/vice.py`), with VICE's default true drive emulation. No
   `vicerc` settings are needed.
2. The boot file and its fast loader run with no key pressed. About 34
   seconds after the autostart, with warp on as autostart leaves it, the
   loader jumps into the game.
3. The title screen appears ("fire=start S=scores O=options H=help") with
   the start room drawn under it. Fire on the joystick in **port 2**
   starts a game; play shows TIME 107, TO MAP 385, JEWELS 000.
4. Snapshots, saved without ROMs:
   - `work/entry.vsf`: the hand-over. A stopping checkpoint on `$02DB`
     (the boot file's `JMP $6000`), then one step, so the PC is `$6000`
     and `$01` is `$37`.
   - `work/play-start.vsf`: the listing's snapshot. About eight seconds
     on from the hand-over, fire held for half a second, four seconds
     more, then `pause()`: the first room of a new game, Gerald not yet
     moved. PC `$8DC2`, `$01` = `$36`.

## Steady state

Measured in `play-start.vsf` and with `kit/c64/frame.py capture`
(`work/frame-play.json`):

- `$01` = `$36`: BASIC banked out, the I/O chips and the KERNAL in.
- IRQ through the KERNAL's RAM vector, `$0314` = `$7066`; BRK `$0316`
  and NMI `$0318` left at the KERNAL's `$FE66` and `$FE47`. The RAM under
  `$FFFA`-`$FFFF` is the bitmap, not vectors.
- Raster interrupt only (`$D01A` = `$F1` read back, bit 0), compare line
  `$37`. One frame has four writes to the video chip and the sprite
  pointers (two sprite colours, two pointers) and no writes to the
  interrupt vector: one handler, no raster splits.
- The video chip shows bank 3 (`$DD00` bits 0-1 = 0): `$D011` = `$BB`
  (bitmap mode, display on, 25 rows), `$D016` = `$D8` (multicolour),
  `$D018` = `$19`, so the bitmap is at `$E000`-`$FF3F`, under the KERNAL,
  and the colour matrix at `$C400`-`$C7E7`, with sprite pointers at
  `$C7F8`.
- The start-up at `$6000` copies `$4000` bytes from `$1400` to `$0400`:
  SPIN4 (the world's data) lands at `$0400`-`$3D00`, and the rest of the
  copy is whatever followed it in memory. Between that copy and
  `play-start.vsf` only `$1024`-`$1025` of it changed.
- Nothing is reloaded during play: all five files are in before the
  game's first instruction.

Snapshot compared with the hand-over: besides zero page, the stack, the
`$0314` vector and the copied block, the game wrote `$AA80`-`$B8FF` (a
run of `$EA` filler in SPIN3, now `$FF`), `$C1C0`-`$C37F`, the colour
matrix at `$C400`, `$CC01`-`$CFEE` and the bitmap at `$E000`-`$FFFF`.

## Where each file landed

Each file's bytes searched for in 16-byte pieces in both snapshots:

| File | In `entry.vsf` | In `play-start.vsf` |
|---|---|---|
| `SPINDIZZY` | `$02A7`, 92 of 93 bytes equal (the filename's digit is counted up) | the same |
| `SPIN1` | `$0800`, whole | gone, under the copied world data |
| `SPIN2` | gone, under SPIN3 | gone |
| `SPIN3` | `$6000`-`$CFFF`, whole | `$6000`, 23,300 of 28,672 equal: the rest is the filler and buffers listed above |
| `SPIN4` | `$1400`, whole | `$0400`, 14,591 of 14,593 equal |

## The loader, in a paragraph

`SPINDIZZY` loads over `$02A7`-`$0303`, which takes in BASIC's warm-start
vector at `$0302`, so the KERNAL's LOAD returns into it instead of to
`READY.`. It then loads `SPIN1`, `SPIN2`, `SPIN3` and `SPIN4` in turn
through the KERNAL's LOAD, counting the digit of the filename up after
each. After `SPIN1` it calls `$0AD5`, which points the LOAD vector at
`$0330` to `$0998`, `SPIN1`'s fast loader (its text reads "1541 FASTLOAD
ACTIVATE"). After `SPIN2` it calls `$6341`, which copies the
character ROM's second half to `$E000` (`$6200`), waits, and sets up the
screen shown for the rest of the load. After `SPIN4` it jumps
to `$6000`, the game's start-up, which overwrites `SPIN2`. Not annotated
further, by policy.

## Emulator

`release v3.14.0, v3.14.0-linux-x86_64-gui.zip`, PAL. `check-emulator`
passed 57 of 57 checks on 31 October 2026; no workaround applies.
