# ACE 2 — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`ace_2[cascade_1987](v1_1l).g64` from the C64 Preservation Project 10th
Anniversary Collection on archive.org (G64 set), 278,234 bytes, SHA-256
`f347236eb8c6a66a0501bd395c3634e11835f81b8531d3fb02abc2faf1b3f62a`.
Copied to `work/ace2.g64`. The header reads `GCR-1541`, version 0, 84
half-tracks (42 tracks), longest track 7,928 bytes: a GCR image of the
original Cascade Games disk, labelled v1.1L by the collection. The
directory names the disk `ACE2 C64`, id `1.`, and lists six files:

| Name | Blocks | What it really is |
|---|---|---|
| `ACE2` | 4 | the boot program, 254 bytes at `$02A7`-`$03A4`; its load overwrites the BASIC warm-start vector at `$0302` with `$02A7`, so it runs itself |
| `C1`, `CXXZ`, `DZ`, `OPTIONS`, `HS` | 101, 56, 23, 1, 2 | decoys: only their first sector chains like a file (the second link points at track 75 or worse); `c1541` reads 255 bytes of each. Despite the names, the game keeps its options and high scores elsewhere: raw sectors 2 and 3 of track 18, among the directory's sectors, which the loader reads to `$CE00` and `$CF00` and the game writes back whole with the drive's block-write command (`U2:5,0,18,2` and `U2:5,0,18,3`, `$1EC4`) |

All 683 standard sectors decode with good checksums (`kit/c64/disk.py`);
the game is stored in plain sectors, read raw by block number and
scrambled with EOR `$FD` (below). `disk.py` lists the five decoys as
"not a file", each one sector and then a link that leaves the disk.

No trainer, no crack intro: the boot, the loading picture and the
colour-code check are the publisher's own.

## From power-on to play

1. `tools.py vice`, then a hard reset and `vice_autostart` of
   `work/ace2.g64` with VICE's default true drive emulation (no `vicerc`
   needed). Warp on: the load took 234 seconds of warp from the reset to
   the hand-over in a four-core container.
2. While it loads, a picture of the jet ("ACE 2" over a plane firing
   missiles) shows from `$5C00`. Then the title sequence plays with Rob
   Hubbard's title music: "ACE 2 / THE ULTIMATE HEAD TO HEAD CONFLICT",
   "CREATED BY CASCADE GAMES 1987", the credits, "GREATEST ACES" (the
   high score table), then DEMO MODE (the computer flying both planes)
   until fire on either port returns to the title.
3. Fire on either joystick port (port 1 tested, port 2 too) while a title
   page shows opens the options screen: COMMENCE CONFLICT, one or two
   players, the computer's skill level, the scenario, planes each, crash
   detection, missile hits to kill, save options. The defaults are one
   player, level 1, the full-scale scenario, 3 planes, crash detection
   on, 3 hits. Fire on COMMENCE CONFLICT.
4. The **colour code security system** asks for the colour at a square
   of the grid printed on the back of the inlay ("SQUARE DD 5" on the
   run that made the snapshots). The cursor starts on BLACK; stick down
   moves it and repeats quickly while the stick is held, so tap it (a
   tenth of a second); the border shows the colour under the cursor. Fire
   answers. Three wrong answers wipe the game. Each wrong answer asks a
   new square. The answer for DD 5 is ORANGE. The game keeps the grid
   itself (`$FA00`, below), and the right answer for the square on screen
   is in zero page `$E0` as a colour number (8 is orange); an automated
   run reads it there.
   The security code at `$37E1`-`$38B8` is in memory at the hand-over and
   overwrites itself with random bytes after a right answer, which is why
   the listing is built from `entry.vsf`.
5. The hangar screen: each pilot's plane on its deck or runway, with
   TAKE OFF and ARM AIRCRAFT. Fire on port 1 takes off; the computer
   takes off itself. About eight seconds later both cockpits fly.

Snapshots in `work/` (VICE `.vsf`, saved without ROMs):

| File | State |
|---|---|
| `entry.vsf` | the hand-over: a hard reset, autostart, a stopping checkpoint on `$CB6B` (the loader's `JMP ($7FFE)`), one step; PC `$0900`, `$01` = `$37`, SP `$FA` |
| `title.vsf`, `title2.vsf` | the title sequence (`title2` at its start, after fire left the demo) |
| `options.vsf` | the options screen with the defaults |
| `security.vsf` | the colour-code question, square DD 5 |
| `hangar.vsf` | the hangar after the right answer |
| `play.vsf` | both planes in flight, one player against the computer at level 1, about ten seconds after take-off |

The listing is built from `entry.vsf`. It and `play.vsf` agree in every
page of code except where the game rewrites itself or keeps variables
(`$1500`-`$1BFF`, `$3700`-`$38FF` and others by a few bytes) and in the
screens, the options and high-score table at `$0903`-`$09FF` (the hand-over
holds placeholder names; the title shows others, so the game rewrites
the table after it starts) and the work areas at `$8000`-`$8DFF`.
`$3800`-`$38FF` holds code at the hand-over and other bytes in play.

## Steady state

- `$01` = `$35` in play: the KERNAL and BASIC are banked out, the I/O is
  in. The game owns the hardware vectors: IRQ at `$FFFE`, which the
  handlers rewrite twice a frame (to `$4678` on line 145 and to `$43FC`
  on line 212 in `work/frame-play.json`), NMI `$FFFA` = `$2AA6`. The
  KERNAL's RAM vectors at `$0314` and `$0318` read `$0000`.
- The game stores `$81` in `$D01A` (raster interrupt on; `$0A6A`,
  `$0C6D`, `$5551`), which reads back as `$F1`. The frame record shows no write
  to `$D012` during the frame; the sprite registers and pointers are
  rewritten on lines 88-90, 115-119, 173-174, 193-196 and 272-276, and
  `$D018` on lines 115, 149, 211 and 281 (the two cockpits and the side
  panel).
- VIC bank 2 (`$DD00` = `$C5`): screens at `$8000` and `$8400`
  (`$D018` stored as `$18`, `$1E`, `$12` and `$1C` in the frame, by
  code that `$4C5C` patches at each screen flip; the frame record shows
  them read back, bit 0 set, as `$19`, `$1F`, `$13` and `$1D`).
- Everything is in memory before the game's first instruction; nothing
  is loaded per level. The game reads the disk only for its options and
  high scores.

## The loader, in a paragraph

The boot program sets the colours, opens the command channel and sends
a block-read command (`U1`), reads one sector into `$CA00` through the
KERNAL (`CHRIN`, with an `EOR` whose operand it patches) and jumps to
`$CA94`. That code reads runs of sectors with the same block-read
command, sixteen a track (sectors 1-16), each byte EORed with `$FD`:
track 1 to `$5C00`-`$83FF` (the loading picture, shown by `$7F40`),
track 14 to `$1000`-`$3FFF` (then copied to `$D000`-`$FFFF` with every
ROM banked out), track 10 to `$8800`-`$BFFF`, track 4 to
`$0900`-`$5BFF`, track 17 to `$C000`-`$C9FF` and track 19 to
`$5C00`-`$7FFF`, plus three single sectors of track 18 read without the
EOR (to `$CB00`, `$CE00` and `$CF00`). It blanks the screen, runs a
second pass over `$0200`-`$55FF` (each byte EOR `$C078`, plus `$0300`,
both zero by then, so the bytes are unchanged) flashing the border, and
jumps through `$7FFE` to `$0900`. Rebuilt from the disk's sectors that
way, `$0900`-`$C9FF` and `$D000`-`$FFFF` equal `entry.vsf` byte for byte
(`work/scripts/diskmap.py`).
