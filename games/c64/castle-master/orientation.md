# Castle Master — orientation

How to get from the original disk to the analysed state. Someone else must
be able to follow this exactly.

## The image

`castle_master[domark_1990](!).g64` from the C64 Preservation Project's
G64 collection on archive.org
(`C64_Preservation_Project_10th_Anniversary_Collection`), kept as
`work/original/castle-master-original.g64`. It is a 42-track G64 of the
original Domark disk, marked `(!)` as a verified good dump. The directory
reads `castle master` with id `90 2a`, 359 blocks free:

| File | Blocks | Loads to | Bytes | What it is |
|---|---|---|---|---|
| `CASTLE` | 1 | `$02A7-$0303` | 93 | the autostart stub |
| `LOADER` | 2 | `$C200-$C3A7` | 424 | the loader and its file table |
| `LPBMAP` | 32 | `$E000-$FF3F` | 8,000 | the loading picture's bitmap |
| `LPCOL1` | 5 | `$C400-$C7F7` | 1,016 | the loading picture's screen colours |
| `LPCOL2` | 4 | `$D800-$DBE7` | 1,000 | the loading picture's colour RAM |
| `CMPRT1` | 192 | `$0410-$C1FF` | 48,624 | the game |
| `CMPRT2` | 25 | `$C800-$DFFF` | 6,144 | the music driver, then zeros to the end |
| `CNCOL1` | 5 | `$C400-$C7FF` | 1,024 | the control panel's screen colours |
| `CNCOL2` | 5 | `$D800-$DBFF` | 1,024 | the control panel's colour RAM |
| `CNBMAP` | 33 | `$E000-$FFFF` | 8,192 | the control panel's bitmap |
| `BOOT` | 1 | `$0801` | 50 | a BASIC program that loads `LOADER`; nothing runs it |

Every byte of `CASTLE`, `CMPRT1`, `CMPRT2`, `CNCOL1` and `CNBMAP`, and 419
of `LOADER`'s 424, sit unchanged in RAM at the hand-over to the game. The
five that differ are the loader's own counters and pointers.

The game was first analysed from a Dualis crack, a single packed file
with an intro. That analysis seeded this one, and every byte of the
listing now comes from the original disk.

## From power-on to play

With VICE MCP release v3.13.2 (PAL C64, `x64sc`), started through
`kit/scripts/tools.py`. On 16 October 2026 it passed all 54 of the kit's
emulator checks.

1. Hard-reset, pause, and arm an execution checkpoint at `$473B`. Resume
   and autostart the G64. Warp may be on: the loading picture appears
   while `CMPRT1` loads, and the checkpoint stops the machine at the
   loader's jump into the game.
2. Save `work/entry.vsf` without ROMs. This is the hand-over: every file
   loaded, `$01=$34`, interrupts masked.
3. Clear the checkpoint, resume, pause, and advance 400 frames. The
   language menu is up (1 English, 2 Français, 3 Deutsch). Save
   `work/menu.vsf`. This is the snapshot the listing is built from.
4. Hold `1` for 60 frames, release for 30, hold Return for 60, release
   for 30: English. The second menu offers Prince (1) or Princess (2):
   `1` and Return the same way.
5. Advance 300 frames. The view of the castle from the Wilderness is
   drawn, with `WILDERNESS` in the panel. Save `work/play.vsf`.

`work/scripts/boot2.py` does steps 1 to 3 and `work/scripts/play.py`
steps 4 and 5.

## Steady state

At the menu and in play, the processor port is `$35` (I/O visible, no
ROMs) with DDR `$2F`. The game installs its own vectors in RAM:
`$FFFA=$7579` (NMI, a bare RTI), `$FFFC=$476F`, and `$FFFE=$FF48`, a
copy of the KERNAL's interrupt entry that jumps through `$0314=$737F`.
`$0318` is `$7579` too. At the hand-over these two still hold the
KERNAL's `$EA31` and `$FE47`.

The handler at `$737F` serves two sources. A raster interrupt at line
`$28`, once per frame, ticks the music driver at `$C885`; a CIA 1 timer
interrupt runs the game clock, the lightning, the panel's meters and the
script delays. The VIC sees bank 3
(`$C000-$FFFF`): screen at `$C400`, multicolour bitmap at `$E000`. The
3D view is drawn first into a linear buffer at `$87CC-$95DB` and copied
into the bitmap.

The code runs from `$0410` to about `$9CEB`. The castle's database (34
areas, their objects and their scripts) is at `$9D00-$BF8F`, the music
driver and its state at `$C800-$CFFF`, and the save state at
`$2406-$246F`. Nothing is loaded after the hand-over except a saved
position, which the game reads and writes on tape or disk.

## The loader, in a paragraph

`LOAD"*",8,1` brings in `CASTLE`, which ends by overwriting the BASIC
vectors at `$0300` and `$0302` with `$02A7`, so BASIC's main loop jumps
into it. The stub loads `LOADER` to `$C200` with the KERNAL and jumps
there. `LOADER` sets up the bitmap display the game keeps, then walks a
table of eight files: for each, a flag blanks or shows the screen,
another flashes the border, and a third is the processor port value
used for every byte stored, which is how `CMPRT2` reaches the RAM under
the I/O area. The bytes come in through the loader's own copy of the
KERNAL's serial LOAD, at normal KERNAL speed: no fast loader and no
protection check. With the last file in, it masks interrupts, sets
`$01=$34` and jumps to `$473B`. Unlike most loaders it is annotated in
full, because the listing covers every byte the disk puts in RAM.
