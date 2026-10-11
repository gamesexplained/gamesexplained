# Uridium — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`uridiumhewson_1986pal.g64`, 294,094 bytes, SHA-1
`08ae385e4c9c831d2b0f66a9377d5dd9295e2d15`. The header reads
`GCR-1541`, version 0, 84 half-track slots of up to 7,928 bytes: a GCR
image of a protected original, not a sector image. Tracks 1 to 35 are
present, and so are track 36 and track 39, which a normal disk does not
use. The loading screen credits Andrew Braybrook and Hewson Consultants
and shows "GMA86" in its top right corner.

The directory is one sector, track 18 sector 4 (the BAM's link points
there, past sectors 1 to 3). The disk name is three DEL codes, a RETURN
and `gma240286`; the one file is a PRG whose name is sixteen `$00`
bytes, starting at track 17 sector 0. Its sector chain is a loop of five
sectors (track 17: 0, 10, 20, 8, 18, then 0 again), so a copier that
follows links never finishes it.

**This image does not load as it stands, in VICE.** The copy protection
times ten sync marks on track 39 and turns their lengths into a key byte
(below). On the original the key is `$97`; the image's sync marks are all
24 or 25 bits long, which the drive's 9-cycle counting loop cannot rank,
and it reads `$FF`. Every byte of the main file is then decoded with the
wrong key, the file runs over the loader at `$C22F`, and the machine
deadlocks on the loading screen with the C64 at `$C234` waiting on the
serial bus and the drive at `$0391` waiting for ATN. The run boots
`work/uridium-t39.g64` instead, written by `work/py/fix_track39.py`: the
contributor's image with only those eight 9-byte sync units on track 39
rewritten (33-bit syncs for a 1, 16-bit for a 0, the reference left
alone) so that they measure `$97`. Nothing else on the disk changes, and
the game the run analyses is the file the original key decodes: decoded
with `$97`, the main file equals the hand-over snapshot's `$0900`-`$BEFF`
byte for byte (46,592 bytes, 184 sectors from track 17 sector 5, read
with `c1541` and compared on 10 October 2026).

```
python3 games/c64/uridium/work/py/fix_track39.py \
  games/c64/uridium/work/uridium.g64 games/c64/uridium/work/uridium-t39.g64
```

The script is in `work/`, which is not committed; it is reproduced in
`agent-history.md` so that anyone with the image can make the same file.

What the disk holds, and where it lands:

| File | Where on disk | Format | Lands at | Found in memory |
|---|---|---|---|---|
| boot file (name of sixteen `$00`) | track 17 sectors 0, 10, 20, 8, 18, looping | KERNAL load, load address `$02A7` | `$02A7` onward, over the KERNAL's vectors at `$0300`-`$0333` | the vectors; the KERNAL's own load is still running when control leaves it (below) |
| protection stage | not traced | fast loader | `$C800`-`$C981` | not in the play snapshot: `$C800` holds the game's own data by then |
| main file | track 17 sector 5 onward, 184 sectors, links XORed with the drive ROM's bytes at `$F576`/`$F577` | fast loader, data XORed with the key | `$0900`-`$BEFF` | the hand-over's `$0900`-`$BEFF`, exactly; in play, partly moved (Steady state) |

## From power-on to play

1. Write `work/uridium-t39.g64` (above). Power-cycle the emulator
   (`vice_machine_reset` hard) and autostart that image with `autostart()`
   in `kit/c64/vice.py`. VICE's default drive emulation (a 1541-II, its
   processor emulated) runs the custom loader; no `vicerc` was needed.
   The loading screen ("URIDIUM / by Andrew Braybrook / Published by
   Hewson Consultants Ltd", "GMA86" top right) appears within ten
   seconds, the protection stage loads at 4 seconds and the main file
   from 8 to 28 seconds after the autostart (measured on 10 October 2026
   with stopping checkpoints on the loader's `$C329`, `$C331` and
   `$C2EA`).
2. No trainer or menu. The game starts by itself into its title and
   attract sequence: Hewson presents / URIDIUM / © Graftgold Ltd. 1986 /
   Designed and programmed by Andrew Braybrook, then the dreadnought
   flying past.
3. Hold fire on control port 2 for one second. The status line shows
   "1up", three ships and the level name "01. Zinc.", the Manta leaves
   its mothership and flies right.
4. Snapshots in `work/`, all saved without ROMs:
   - `entry.vsf`: stopped on `$0900`, the game's first instruction, by an
     execute checkpoint on `$0400`-`$BFFF` armed after the main file's
     load had ended (the second hit on `$C2EA`); `work/py/handover.py`
     does it all. `$01` = `$37` there.
   - `title.vsf`: `entry.vsf` left running for 3 seconds: the title page.
   - `play-level1.vsf`: `entry.vsf` run for 4 seconds, fire held on port
     2 for 1 second, then 6 seconds more (`work/py/playsnap.py 6
     play-level1`): "01. Zinc.", three ships, the Manta out of its
     transporter while the launch sequence (`launch_sequence`) is still
     sliding the transporter away; the play loop starts about two seconds
     later. Live tests start from it and run 150 frames first. The disassembler and the listing are built from
     this one.

The emulator was VICE vice-mcp, release v3.13.2,
`v3.13.2-linux-x86_64-gui.zip`, PAL, which passed all 57 of
`check-emulator`'s checks on 9 October 2026. None failed.

## Steady state

`$01` = `$35` during play: RAM at `$A000`-`$BFFF` and `$E000`-`$FFFF`,
I/O at `$D000`. The game owns the hardware vectors: NMI `$FFFA` = `$3FD6`
(an `RTI`, so RESTORE does nothing), RESET `$FFFC` = `$099D`, IRQ `$FFFE`
changes through the frame. `$0314` still holds the KERNAL's `$EA31`,
unused.

In play the raster interrupt is a chain of three handlers in `$3Fxx`,
each writing the low byte of `$FFFE` for the next, recorded with
`kit/c64/frame.py capture` (`work/frame-play1.json`) and read in the
code:

| Handler | Runs at line | Does |
|---|---|---|
| `$3F38` | 82 (`$52`) | waits a few cycles, horizontal scroll from `$2C` into `$D016`, `$D018` = `$2F`, background from `$4A`; next `$3F73` at line 97; calls `$B24B` |
| `$3F73` | 97 (`$61`) | clears `$2F`; next `$3F00` at line 252 |
| `$3F00` | 252 (`$FC`) | `$D016` = `$C0`, `$D018` = `$2D` for the bottom of the screen, background black; counts `$2F`; next `$3F38` at line 82; calls `$0E23` |

A fourth handler, `$3F93`, flips its own raster line between `$48` and
`$C8` each time it runs (it stores the line in its own operand at
`$3FB0`) and calls `$B24B` and, when `$2F` is set, `$0E23`. Which screens
use it is not established here.

**The whole game is one load.** After the hand-over nothing more is read
from the disk. The start-up at `$0900` banks to `$24`, clears zero page,
then copies blocks with a routine at `$B302`: `$8000`-`$9FFF` to
`$E000`-`$FFFF`, `$A000`-`$AFFF` to `$C000`-`$CFFF`, `$7C00`-`$7DFF` to
`$D200`-`$D3FF`, `$5C00`-`$67FF` to `$D400`-`$DFFF` (under the I/O),
`$4800`-`$4BFF` to `$A600`-`$A9FF` and `$7400`-`$77FF` to
`$AA00`-`$ADFF`, and calls `$B30F`, `$30A0` and `$138E` before setting up
the interrupts. Compared byte for byte, every 32-byte piece of the
hand-over's `$0900`-`$BFFF` that is not fill is found in the play
snapshot, except variables and `$7000`-`$73FF`: there the hand-over
holds a font (digits first) of 8-row characters, which start-up spreads
in place to one glyph row in two with blank rows between. The play
snapshot therefore holds every routine at the address it runs from, and
is the one analysed. Of the authored data only that source font is not in
it in its loaded form; the spread copy is.

## The loader, in a paragraph

The KERNAL loads the boot file to `$02A7`, over its own vectors; the
file's sector chain loops, so that load never ends on its own. Between
bytes the KERNAL's load calls the STOP routine through `$0328`, and
other channel routines through `$031C` and `$031E`, all of which now
point into the file's own code at `$02xx`; the first RAM instruction run
is `$02AC`, with the KERNAL's load still on the stack. That code puts a
fast loader at `$C000`-`$C3FF` and sends the drive its half with
`M-W`/`M-E`. The fast loader receives bytes two bits at a time over the
clock and data lines, avoiding badlines; the first two bytes of a file
are its load address and `$01 $01` escapes a `$01`, `$01` and anything
else ends it. It loads a stage to `$C800`, which sends the drive code
encrypted with the key `$74` (the XOR of the drive ROM's bytes at
`$F510`, `$F556` and `$C118`). On the drive, that code finds a sync on
track 39 followed by raw bytes `$69 .. $A9`, measures the next ten syncs,
sets one bit for each of the last eight that is at least as long as the
second, and sends the byte back. The main file, from track 17 sector 5,
is then loaded, and it comes out right only when that byte was `$97`:
the bytes on the disk XORed with `$97` are the game, and with the
image's `$FF` the C64 stored them XORed with `$FF`. Where the C64 side
applies the byte was not traced. Its sector links are XORed with the
drive ROM's `$F576`/`$F577`. When it ends the loader resets the I/O
chips and the game starts at `$0900`. Not annotated further, by policy.
