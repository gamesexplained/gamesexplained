# The Incredible Hulk — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`questprobe_the_hulk[cbm_1984].g64` (286,164 bytes, SHA-256
`345f41414af157bfb2d0654944253aeead7b0646b66e303d8c8025e55553c0bb`),
Commodore's 1984 disk of *Questprobe featuring The Hulk*, from the C64
Preservation Project's G64 collection on archive.org. The header reads
`GCR-1541`, version 0, 84 half-tracks: a flux-level image of the original,
not a sector copy. `kit/c64/disk.py` reads 682 sectors from it, none with a
bad checksum. The disk is called `HULK`, ID `98`. The title screen says
"Scott Adams and COMMODORE Present", "Version: 3-127", and Commodore's
manual for the C64 disk (C6460, `work/web/manual.pdf`) matches what the
game does.

The directory holds a BASIC boot file `SAGA`, the database `SHULK.DB`, two
second-stage loaders (`SAGA.C64` and `SAGA.TED`, for the C64 and for the
Commodore 16 and Plus/4), 30 room pictures `R01000`-`R01099`, 40 picture
pieces `B01001I`-`B01250R`, two files with names of 16 repeated characters
(`¤¤¤…` and `£££…`, the encoded third stages for each machine) and four
files `Á.Ó` to `Ä.Ó`, the four saved-game areas A to D. Ninety-five sectors
are in use and in no file: 45 of them, from track 16 sector 1, are the
game's code (below).

A second release was compared: `questprobe_the_hulk[gvp_1986].g64` from
the same collection, which adds a menu program. Its code sectors, decoded
the same way, are byte for byte the same 11,263 bytes (`$5400`-`$7FFE`) as this disk's, so
the program analysed here is the one both releases shipped.

## From power-on to play

1. Power-cycle the emulator (`reset` "hard" in `kit/c64/vice.py`), then
   autostart the G64 (`autostart()`; VICE types `LOAD"*",8,1` and `RUN`).
   VICE's defaults (true drive emulation) need no settings file. The boot
   program clears the screen, prints `LOADING - PLEASE WAIT`, loads
   `SHULK.DB` and then `SAGA.C64`, which starts itself. The game's first
   instruction runs about 70 seconds after the autostart.
2. A colour test appears ("Adjust your TV to match above colors. HIT
   RETURN"): press RETURN.
3. The trademark and copyright screen: press RETURN.
4. "Scott Adams and COMMODORE Present … HULK … Version: 3-127": press
   RETURN. The title picture is drawn (about 10 seconds) and the game asks
   "Do you want to restore a previously saved game? (Yes, No, Demo)".
5. Type `N` and RETURN. The credits scroll in the text window, the first
   room's picture is drawn, and the game prints "I'm Bruce Banner, tied
   hand & foot to a chair." and "What shall I do?".
6. `work/play-start.vsf` was saved at that prompt, about 20 seconds after
   the `N`. The listing is built from it.

The hand-over, `work/entry.vsf`: power-cycle, arm a stopping checkpoint on
`$5400`, autostart, and save when it stops (`$01` is `$37` there; the
program counter is `$5400`, the loader's `JMP ($011F)`).

`D` at step 5 starts the game's own demonstration: it restarts at the
colour test, answers its own prompts and types a scripted game into the
parser (`features.md`).

## Steady state

- `$01` is `$36`: BASIC switched out, the KERNAL and the I/O area in. The
  game calls the KERNAL for keys, screen output and disk access.
- The IRQ vector `$0314` points at `$6AB6`, the game's raster interrupt;
  `$0316` and `$0318` keep the KERNAL's defaults (`$FE66`, `$FE47`).
  The handler passes an interrupt that is not the raster's to the
  KERNAL's `$EA31` (keyboard, clock, cursor) only when the raster line's
  low eight bits are under 128; otherwise it returns at once ($6B0C).
- The screen is split by that interrupt. Down to raster line 210 it is a
  multicolour-capable bitmap at `$2000` with its colours at `$0400`
  (`$D011` `$39`, `$D018` `$1F`); below it, text mode with the screen at
  `$0400` and the ROM's mixed-case character set (`$D018` `$17`). The video
  bank is the first (`$DD00` `$C7`).
- Memory in play:

  | Range | What |
  |---|---|
  | `$0100`-`$0155`, `$0200`-`$0235` | the second-stage loader (`SAGA.C64`), left in the stack page and the BASIC input buffer |
  | `$0400`-`$07E7` | screen: the picture's colours above the split, the text window below |
  | `$0800`-`$1B0C` | the picture buffer: each picture or piece as loaded from disk (`R01001` over the tail of the title's `R01099` in the snapshot) |
  | `$1C00`-`$1E3D` | the game's state, the block a saved game writes |
  | `$1E3E`-`$1FFF` | the game's other variables and the line buffer |
  | `$2000`-`$3F3F` | the bitmap the picture is drawn into |
  | `$4000`-`$530C` | the cache of the last room picture, a copy of `$0800`-`$1B0C` ($7984) |
  | `$5400`-`$7FFE` | the program |
  | `$8030`-`$A6AF` | the database, `SHULK.DB` |
  | `$C000`-`$C24A` | the third-stage loader and its sector buffer, left over |

- Nothing is reloaded from disk but data: each room's picture and the
  pieces drawn over it, and a saved game. The program stays where it is,
  so the game is one image (`kit/skills/core/15-parts`: data fetched into
  a buffer during play is not a part).

## The disk's files in memory

Each file's bytes searched for in both snapshots in 16-byte pieces
(`10-orient`, step 7):

| File | Loads at | Found |
|---|---|---|
| `SAGA` | `$0801` | whole at the hand-over (157 bytes); gone in play |
| `SHULK.DB` | `$8030` | whole in both (9,856 bytes) |
| `SAGA.C64` | `$0100` | 294 of 310 bytes at the hand-over, 253 in play: the stack has overwritten the rest |
| `¤¤¤…` | (`$DC35` in its header) | not as stored: `SAGA.C64` reads it through the KERNAL, inverts each byte and subtracts `$21`, and puts the result at `$C000` |
| `R01001` | (`$5000` in its header) | whole at `$0800` in play (1,524 bytes): the first room's picture |
| `R01099` | (`$5000` in its header) | 1,791 of 3,273 bytes at `$0800` in play: the title picture, under `R01001` |
| `Á.Ó` … `Ä.Ó` | `$1C00` | 358 to 368 of 574 bytes in play; at the hand-over 169 to 174 at `$92C0`, inside the database: saved games, which hold the game's state block |
| `SAGA.TED`, `£££…` | | not loaded on the C64 |
| the other `R` and `B` files | | not loaded at either moment |

## The loader, in a paragraph

`SAGA`, a BASIC program, loads `SHULK.DB` to `$8030`, reads the KERNAL's
reset vector at `$FFFC` to tell a C64 (`64738`) from a Commodore 16 or
Plus/4, and loads `SAGA.C64` or `SAGA.TED`. `SAGA.C64` loads at `$0100`,
over the stack, so the `LOAD` returns into it through the `$02` bytes it
fills the stack page with: it opens the file `¤¤¤…`, decodes each byte
(invert, subtract `$21`) to `$C000` and jumps there. That stage sends the
drive `I0` and then `U1` block reads, starting at track 16 sector 1 (the
numbers it finds at `$011D`), XORs each byte with `$55` and stores the
sector backwards into its buffer at `$C14B`, and copies it to memory:
the first sector's third and fourth bytes give the load address, `$5400`,
and each sector's first two bytes the next track and sector. After 45
sectors it closes the files and jumps through `$011F` to `$5400`. The
program is therefore in no file on the disk, and a directory copy of the
disk does not run. Not annotated further, by policy.

The program also puts code into the disk drive. At the cold start
($657B, through $7904) it opens the command channel with `I0`, sends 26
bytes of code to the drive's memory at `$0300` with `M-W` and runs them
with `M-E`; they read track 35 sectors 0 and 1, which are in no file and
which the disk's block map marks as used, into the drive's buffers at
`$0500` and `$0600`, and a second `M-E` starts that code: the fast
loader every picture comes through ($7777). Its bytes are on the disk,
not in the C64's memory, so the ledger has no place for them.

## Emulator

`release v3.14.0, v3.14.0-linux-x86_64-gui.zip` (vice-mcp), PAL. Its
`check-emulator` passed 57 of 57 on 31 October 2026, so none of
`workarounds.md` applies.
