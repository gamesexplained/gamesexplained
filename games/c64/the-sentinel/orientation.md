# The Sentinel — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The emulator

`release v3.13.1, v3.13.1-linux-x86_64-gui.zip` (vice-mcp), on Linux x86_64
with no display, 25 September 2026. `check-emulator`: 56 of 56 passed, so
none of `kit/skills/c64/tool-vice-mcp/workarounds.md` applies. PAL, 6581 SID.

## The image

`SENTIN.D64`, 35 tracks, no error bytes. Disk name `P00 IMPORTS`, id `01 2A`.
The directory:

| Entry | Blocks | Loads at | What it is |
|---|---|---|---|
| `SENTINEL+` | 154 | `$0801`-`$9FFF` | a single-file freezer-cartridge backup of the running game, packed; **the file used here** |
| `SENTINEL` | 28 | `$02C0`-`$1D9E` | the first file of a second, two-part freezer backup: it loads over the BASIC vectors (`$0302` = `$0334`), and `$0334` runs `JSR $A659 / JMP $A7AE` on the BASIC text at `$02C4`, `LOAD"SENTINEL1",8,1`, and `SENTINEL1` is not on the disk. Its code at `$0800` is the same kind of state restorer as `SENTINEL+`'s, with screen-code prompts such as `LOADING BLOCK?`. Not run successfully: `vice_autostart` loaded `SENTINEL+` whatever `program` or `index` said, and a typed `LOAD"SENTINEL",8,1` ended on a black screen with the CPU in the game's keyboard loop and `$0302` = `$02A7`, which was not followed up |
| `ZIP*` | 0 | | a scratched (`DEL`) entry |

Neither file is the original release. Both are backups made with a
freezer cartridge, so the image analysed here is the game's memory as it
stood when someone froze it, not as the original loader left it. The
difference matters in one place, below.

## From power-on to play

1. Make sure the machine is **running** (`vice_execution_run`): a paused
   machine stays paused through an autostart.
2. Arm a stopping checkpoint at **`$8D0D`**, then autostart the image with
   program `SENTINEL+` (`vice_autostart`, `program: "SENTINEL+"`). The
   checkpoint hits about 13 seconds later (autostart turns warp on).
3. At the stop: delete the checkpoint, turn warp off, and **set PC to
   `$3F00` and SP to `$F6`**. This is `work/entry.vsf`, the hand-over.
   Why this step is needed is under "The backup is damaged", below.
4. Run. The title screen, `THE SENTINEL` / `PRESS ANY KEY`, is up within
   two seconds (`reference/title.png`).
5. Press SPACE (`vice_keyboard_matrix`, held 0.4 s). `LANDSCAPE NUMBER?`
   appears with an input field (`reference/landscape-number-prompt.png`).
6. Type `0`, `0`, `0`, `0` (each held 0.3 s, 0.3 s apart), then RETURN.
   The screen goes blue for about three seconds, then shows the landscape
   from above: `LANDSCAPE 0000` / `PRESS ANY KEY`
   (`reference/landscape-0000-overview.png`). Landscape 0000 asks for no
   secret code.
7. Press SPACE. The first-person view is drawn in about four seconds
   (`reference/play-l0000-first-view.png`). Pause, and save
   `work/play-l0000.vsf`.

## The backup is damaged

`SENTINEL+` restores the machine and resumes the frozen game with `RTI` to
`$8D0D`, inside the keyboard scan (`$8D01`-`$8D23`), which ends in `CLI`.
But the restored RAM from `$F900` to `$FFFF` is all `$FF`. With the KERNAL
banked out (`$01` = `$35`) the IRQ vector is the RAM at `$FFFE`, which
therefore reads `$FFFF`, and the first raster interrupt after the `CLI`
sends the CPU through `$FF` bytes forever (observed: the program counter
alternates between `$FFFF` and `$0002`, the screen a yellow field).

Most of that range is probably as the game had it. `$F900`-`$FF3F` is the
bottom five character rows of the title picture (a multicolour bitmap at
`$E000`, below), where `$FF` shows each cell as a solid block in its colour
RAM colour: the blocky pedestal under the Sentinel. A screenshot of the C64
title published on C64-Wiki (the secret-code prompt, read 25 September
2026) shows the same blocks. What is missing is `$FF40`-`$FFFF`: the NMI
and IRQ vectors and a table of `JMP`s at `$FFC2`-`$FFF6` that the game
writes when it starts, and whatever else the original held there, which is
unknown.

The game rebuilds that area itself. `$3F00` is `JSR $8900` followed by the
rest of the game's start-up. `$8900` sets `$00` = `$2F`, `$01` = `$35`, the
NMI vector (`$FFFA` = `$8F98`), an IRQ vector (`$FFFE` = `$8F9E`), and the
table of `JMP`s; `$3F07` then replaces the IRQ vector with `$95E9`. `$3F00`
follows 32 bytes of `$FF` filler and is the only caller of `$8900` (a byte
search of the image for `JSR $8900` and `JMP $8900`), which is why it is
taken as the game's entry. Starting there makes the backup play. During
play the game writes its own data over all of `$E000`-`$FF3F`, so nothing
it needs in play can have come from the load there.

### Code missing from the backup: `$B000`-`$B5FF`

The restored RAM at `$B000`-`$B5FF` (1.5 KB) holds the emulator's power-up
pattern (`FF FF 00 00 00 00 FF FF` repeating) in the hand-over image, and
nothing writes or runs there on the way from the hand-over to the first
view of landscape 0000 (a store and an execute checkpoint on the range,
both 0 hits, against 3,357 on the raster interrupt). But the game calls
into it: `JSR $B006` at `$367C`, once for each step of a pan. Holding
S to pan the view reaches that call within 0.6 s (a stopping execute
checkpoint on the range stopped at `$B006`, called from `$367C`), and the
CPU then runs through the power-up pattern until it wrecks the processor
port (`ISB $FFFF,X` with X = 1 increments `$0000`) and jams. So this copy
cannot pan. With an `RTS` poked at `$B006` for testing only, the game goes
on: a pan leaves the screen as it was, and the next full redraw (a U-turn)
shows the new view, so the missing code is the part that scrolls the
picture during a pan. That poke is never part of the analysed image.

### A second copy: the original disk, damaged on track 25

The contributor also supplied `sentinel[firebird_1986].g64` from the C64
Preservation Project's collection, a track-by-track image of the original
disk (349,604 bytes; `work/cpp/`). Its directory is a decorated
"PARA-PROTECT / THE SENTINEL" sign whose 15 entries all point at track
18 sector 9, a 843-byte boot file that loads at `$00AE` and runs by
overwriting the stack. Decoding the GCR of every track in Python
(`work/cpp/g64.py`) gives 620 sectors, 619 with good checksums; tracks
1-17 hold 17 to 19 sectors each (the disk was mastered with fewer than the
standard 21), tracks 18-35 the standard counts, tracks 36-41 extra data.
Only the entry page (`$3F00`) is stored in the clear (track 40 sector 14);
the rest of the program is packed or encrypted.

It does not load, in VICE v3.13.1 with true emulation of a 1541 or a
1541-II, Kernal traps off and any drive idle method: the C64 waits forever
at `$0204`-`$0207` (`BIT $DD00 / BMI`) for the drive. VICE's binary
monitor on the drive shows why: the drive runs the loader's own code at
`$0600`-`$06D9`, which reads 23 sectors from track 25 sector 0 with the
1541 ROM's header search (`$F50A`), and track 25 of the image is damaged.
It starts with four sectors headed "track 24, sectors 3-6", has no sectors
1-3, and sector 0's data block runs past the end of the track into those
leftovers (checksum `$96` against `$A2`). The drive retries sector 0
forever. A copy with track 25 rebuilt in clean GCR (the 15 readable
sectors, zeros for the four lost ones) gets past that wait and then stops
on an illegal opcode at `$0008` before any of the game reaches memory: the
loader's first chunk is the damaged one. So this image cannot supply the
missing `$B000`-`$B5FF` either, and the analysis stays on the backup.

## Steady state

Measured on `work/play-l0000.vsf`, running:

| What | Value |
|---|---|
| `$00` / `$01` | `$2F` / `$35`: RAM at `$A000`-`$BFFF` and `$E000`-`$FFFF`, I/O at `$D000` |
| IRQ vector (RAM `$FFFE`) | `$95E9`, a raster interrupt: 504 entries in 1,985,257 cycles (about 101 frames), five a frame, against 16,081 hits on a control at `$31D2` |
| NMI vector (RAM `$FFFA`) | `$8F98`: reads `$DD0D` and returns. 0 hits in the same window |
| `$8F9E` (the IRQ `$8900` installs) | acknowledges and returns; 0 hits in play |
| Play screen | VIC bank 1 (`$DD00` = `$C6`), screen matrix `$7C00`, multicolour **text** mode (`$D011` = `$1B`, `$D016` = `$D8`). The interrupt rewrites `$D018` five times a frame, at lines 54, 94, 134, 174 and 214, to `$F1`, `$F3`, `$F5`, `$F7`, `$F9`: character sets at `$4000`, `$4800`, `$5000`, `$5800` and `$6000`, one per band of 40 lines (`work/frame-play.json`; the kit's renderer redraws it with 0 of 104,448 pixels different) |
| Title screen | VIC bank 3 (`$DD00` = `$C4`), multicolour **bitmap** at `$E000`, screen matrix `$CC00` (`$D011` = `$BB`, `$D018` = `$39`), no raster split (`work/frame-title.json`: 0 writes in the frame) |

The game code sits at `$0D00`-`$3FFF` and `$8400`-`$9AF6` (the map is in
`facts.md`). Between the hand-over and play, the code bytes are
the same except single bytes that the code itself changes (variables and
operands inside routines). The data that differs is working memory: zero
page, `$0400`-`$07FF`, the five character sets at `$4000`-`$67CF`,
`$A700`-`$D103` in patches, and all of `$E000`-`$FF3F`.

**The analysis image is `work/entry.vsf`**: it has the same code as play
and also the title picture at `$E000`-`$FF3F`, which play overwrites. The
disassembler runs on it.

Nothing is loaded from disk once the game is running: the landscapes are
generated (`facts.md`, "Landscape generation").

## The loader, in a paragraph

`SENTINEL+` is a BASIC line `SYS 2061`. The code at `$080D` masks the
interrupts, banks everything to RAM, and moves the packed data up so that
it ends at `$FFFF`. It then unpacks colour RAM from 512 bytes of nybbles at
`$0900`, the zero page from `$0B00` and the stack page from `$0C00`,
programs the SID for a loading noise, restores the VIC and CIA registers
from `$0D00`, `$0D30` and `$0D40`, and jumps to a decruncher it has just
put in zero page (`$0050`-`$00CE`). That fills memory up to `$FFFF`, puts
back the zero page it borrowed (from `$035C` and `$0166`), sets `$01` =
`$35`, and resumes the frozen program with `RTI` from a stack frame at
`$01F5`. On the way it reads `$DF00`, in the I/O area where cartridges keep
their registers. Not annotated further, by policy.
