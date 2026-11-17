# Jumpman Junior — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`jumpman_junior[epyx_1983](!).g64`, 286,164 bytes, a GCR image (its header
reads `GCR-1541`), named as a verified dump of the disk release. The
directory holds two files:

| File | Bytes | Loads at | What it is |
|---|---|---|---|
| `JR` | 246 | `$0110` | the boot: a BASIC line that overwrites the stack page, so the KERNAL's `LOAD` returns into it at `$0128` |
| `JUMPMAN JR.` | 16,431 | `$8000`-`$C02E` | the game: a 16 KB cartridge image (signature `CBM80` at `$8004`, cold and warm start both `$8009`) followed by 47 bytes at `$C000` |

The DOS reads 523 sectors with good checksums and cannot read the other
160 of a 35-track disk; no used sector lies outside the two files. Which
of the 160 the loader's drive code reads was not traced (the loader is
out of scope, below). The game was published on cartridge as
well; this disk carries the cartridge's 16 KB with a loader in front of it.
Whether the disk version is Epyx's own or a later conversion is not known
from the image alone; the loader's drive code and the protection track
point to a commercial release, not a crack, and no crack's intro or
trainer appears.

## From power-on to play

1. Hard reset, attach the image as drive 8 and autostart it
   (`vice.autostart(rpc, "work/jumpman-junior.g64")`). Drive emulation must
   be on (VICE's default for a G64).
2. About 40 seconds of loading (the screen stays blank, then the KERNAL
   message clears). The title appears: EPYX PRESENTS / JUMPMAN JUNIOR /
   (C) 1983 BY EPYX / DESIGNED BY RANDY GLOVER, with the prompt
   NUMBER OF PLAYERS (1-4) ?.
3. The game scans the keyboard itself: `vice_keyboard_type` does nothing.
   Press `1` through the matrix (`vice.key(rpc, "1")`, held half a
   second), then `4` for PLAYER #1 SPEED. Play starts at once on the first
   level, "NOTHING TO IT".
4. `work/play-level1.vsf`: saved a few seconds into level 1, Jumpman
   standing at the start, nothing moving but the level's own animation.
5. `work/entry.vsf`: the hand-over. A stopping checkpoint on `$8009`
   fires twice: first on the boot's decryption stub (saved as
   `work/loader-stub.vsf`), then on the cartridge's own cold start once
   the loader has put the real bytes back. The second stop is
   `work/entry.vsf`. Its `$8000`-`$C02F` is byte for byte the same as in
   `play-level1.vsf`: the game never writes its own image.

## Steady state

- `$01` = `$3D`: BASIC and KERNAL ROMs out, I/O in. `$E000`-`$FFFF` hold a
  RAM copy of the KERNAL made by the boot, with one byte patched: `$FDD6`,
  the value IOINIT stores into `$01`, is `$ED` instead of `$E7`, so the
  cartridge's own call of IOINIT keeps that RAM KERNAL banked in.
- Interrupts: the hardware IRQ vector at `$FFFE` (in the RAM KERNAL) is the
  KERNAL's `$FF48`, which jumps through `$0314`, set to `$863C`, the game's
  raster interrupt. NMI at `$FFFA` is the KERNAL's `$FE43`.
- Video during play (one frame recorded, `work/frame-level1.json`): CIA 2
  port A `$C2`, so the video chip sees `$4000`-`$7FFF`; `$D018` = `$81`
  (screen at `$6000`, bitmap at `$4000`); `$D011` = `$3B`, bitmap mode;
  `$D016` = `$D8`, multicolour. The frame's only writes switch multicolour
  off at line 233 and on again at line 269, so the status bar under the
  level is drawn in hires.
- The whole game is the 16 KB at `$8000`-`$BFFF`; nothing is loaded after
  the start. Levels are built from data in that image.

Emulator: vice-mcp v4.0.0 release (`v4.0.0-linux-x86_64-gui.zip`) on Linux
x86_64. `check-emulator`: 55 of 57; failed `checkpoints-survive-load` (add
and delete a checkpoint after every load) and `snapshot-ram-offset` (v4.0.0
moved RAM in the snapshot; `kit/c64/snapshot.py` finds it by module).

## The loader, in a paragraph

`JR` loads `JUMPMAN JR.` with the KERNAL and jumps to `$C000`, which copies
the KERNAL ROM into the RAM under it, banks it in with the IOINIT patch
above, and jumps to the cartridge's cold start at `$8009`. On disk the
256 bytes `$8015`-`$8114` are encrypted and `$8009` holds a stub that
XORs them with `$57`: the stub's own branch operand is the first byte it
decrypts, so the loop changes its target as it runs. The decrypted bytes
are a second stage that XORs page 3 with `$55`, uploads code to the 1541
with `M-W` and starts it with `M-E`, then reads 128 bytes at a time from
the drive over the serial bus into `$8009`-`$8114`, which restores the
cartridge's real first 268 bytes and jumps to `$8009` again. The drive
code reads the protection track; without it the game's start-up code is
missing. Not annotated further, by policy.
