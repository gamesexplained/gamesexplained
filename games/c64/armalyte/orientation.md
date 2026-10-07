# Armalyte — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

Two G64 images of the original Thalamus disk, one per side, from the C64
Preservation Project's 10th Anniversary Collection on the Internet
Archive (start at
https://archive.org/download/C64_Preservation_Project_10th_Anniversary_Collection,
"View contents" on the G64 zip, folder `a/`), fetched 7 October 2026:

| Side | File | sha256 |
|---|---|---|
| 1 | `armalyte_s1[thalamus_1988](pal)(!).g64`, kept as `work/armalyte_s1.g64` | `33f6bed52e540a0424c4fbfa81598df324a88fac2209e1a64d8673b3170dc2a2` |
| 2 | `armalyte_s2[thalamus_1988](pal)(!).g64`, kept as `work/armalyte_s2.g64` | `9f53a9dcb186f6f3cd9dd135116f5fa38fd3f8ad8542b29e3a02f4822d473c89` |

The `(!)` marks a verified dump of the original release; nothing on
either side is a crack, trainer or intro. The directories, read with
VICE's `c1541`:

| Side | Name | Loads at | What it is |
|---|---|---|---|
| 1 | `boot!` | `$0100-$0260` | the autostart, over the stack page |
| 1 | `cyberdos` | `$0326-$0600` | the boot loader, over the KERNAL's vectors |
| 1 | `armalyte` | `$0801-$A0BE` | the engine, packed; it unpacks to the engine part (`parts/engine`) and ends at `$A000` |
| 1 | `.blocks free.` | `$0801-$0811` | a one-line BASIC stub, `PRINT "HELLO"` |
| 2 | `d` `e` `l` `h` `u` `n` `a` `r` | `$0801` | levels 1-8, packed (`parts/level-1` to `parts/level-8`) |
| 2 | `m` | `$0801` | the ending, packed (`parts/ending`) |
| 2 | `.blocks free.` | `$0801-$0809` | an empty BASIC stub |

The engine names the level files by letter in the table at `$B3E1`
(engine), in the order D E L H U N A R, then M.

## From power-on to play

1. Hard reset, then autostart side 1 (`work/armalyte_s1.g64`) with warp
   on. After about 30 seconds of emulated time the disk menu appears:
   "1 Armalyte, 2 Loading picture, 3 Walker's Warbles"
   (`reference/disk-menu.png`). Snapshot `work/menu.vsf`.
2. Press `1`. About 12 seconds later the engine has loaded and asks
   "TURN DISK TO SIDE B PRESS FIRE" (`reference/turn-disk-side-b.png`):
   it has tried to open level 1's file on side 1 and not found it
   (engine `wrong_disk`, `$B5CC`). Snapshot `work/turn_disk.vsf`. The
   engine's own hand-over, `parts/engine/work/entry.vsf`, was taken on
   the way, stopped at its first instruction, `$A000`.
3. Attach side 2 (`work/armalyte_s2.g64`) and press fire on joystick
   port 2. Level 1 (file D) loads with the loading picture; the load
   ends at `$B3CC` (engine `after_level_load`) and goes straight to the
   title, because this load is a new game's (`$B004` = 1). Snapshot
   `parts/level-1/work/entry.vsf`, stopped at `$B3CC`.
4. Fire on the title starts level 1 at once. Snapshot
   `parts/level-1/work/play.vsf`, 5 seconds after fire (`work/play-level1.vsf`
   is the same moment from an earlier boot). The title is in
   `work/title.vsf`.

The machine must not be stopped and restored part way through a disk
load: a snapshot saved without the drive's state (the default of
`vice_snapshot_save`) hangs in the KERNAL's serial routines when the load
is continued from it. Every snapshot above was taken in one continuous
session from a hard reset, with `include_disks` set, by
`allparts.py` (kept in the session's scratch, not committed).

## The parts

The engine stays in memory from the first load to the end; every level
and the ending are loaded over it (`parts/<id>/part.json`, `"over":
"engine"`), each into the same three ranges: `$0200-$6FFF`, `$9700-$98FF`
and the RAM under the I/O chips at `$D000-$D6FF`. The eleventh part is
not the game: the music demo behind the menu's third entry arrives over
the machine the menu leaves, with nothing of the game in memory, so it
is an address space of its own and has no `"over"`.

| Part | File | Route to its snapshots |
|---|---|---|
| `engine` | `armalyte` (side 1) | step 2 above, stopped at `$A000` |
| `level-1` | D | steps 3 and 4 above |
| `level-2` to `level-8` | E L H U N A R | from level 1, through the engine's own loader (below) |
| `ending` | M | the same, after level 8 |
| `warbles` | none the directory lists | from step 1, press `3`; checkpoint at `$1825`, its first instruction, is `parts/warbles/work/entry.vsf` |

Playing through eight levels for each snapshot was not practical, so the
later loads were reached with the game's own loader in the same session:
stop at the top of the main loop (`$A12A`), write the level number less
one into `$B002`, and set the program counter to `$AE42`, the part of
`level_complete` that moves on to the next level. The engine then counts
`$B002` on, forces the load (`$B003` = `$FF`), loads the next file from
side 2 and stops at `$B3CC` (`entry.vsf`); fire on "PRESS FIRE TO START"
starts the level, and `play.vsf` is 5 seconds later. Nothing else is
changed: score, lives and enhancements are whatever level 1 had. For the
ending, `$B002` = 7 gives file M; its `start.vsf` is stopped at its first
instruction, `$0801`, and `play.vsf` is a minute into the pictures.

Every load replaces the whole of its three ranges: the level's unpacker,
run in the simulator over memory filled with `$AA` and again with `$55`,
writes all of `$0200-$8000` before the mover runs, and the mover copies
exactly the three ranges (engine `move_level_into_place`, `$9680`).

## Steady state

In play: IRQ vector `$FFFE` = `$A05F` (engine `play_irq`), NMI `$FFFA` =
`$A075` (an RTI); `$01` = `$35`, so the BASIC and KERNAL ROMs are out and
the engine's code at `$E000-$FFFF` is visible; video bank 1 (`$DD00` =
2), screens at `$7000` and `$7400`, characters at `$7800`. The engine
owns `$8800-$FFFF` and the zero page; a level owns `$0200-$6FFF` (object
types, paths, attack waves, map, tiles, sprites), `$9700-$98FF` (the
level's script and its two boss tables) and `$D000-$D6FF` (its character
set, copied to `$7900` at the start of the level). Each level is reloaded
from disk when it is reached, and level 1 again after a game over that
happened beyond it.

The music demo is the other way about: `$01` = `$37`, both ROMs in, the
KERNAL's own interrupt handler running with `$0314` pointing into the
demo, the screen at `$0400` and the characters from ROM. It owns
`$1000-$7FFF` and only four bytes of the zero page
(`parts/warbles/facts.md`).

## The loader, in a paragraph

The boot files take the machine through the disk menu and load the
packed engine, which unpacks itself and starts at `$A000`. From then on
the engine loads every level with its own fast loader (`$B3FC`): it opens
the one-letter file through the KERNAL's serial routines, with the ROM
switched in for the purpose, sends 256 bytes of drive code (kept at `$D900` and copied to `$8600`) to the 1541's
RAM at `$0700` with M-W and starts it with M-E at `$07AB`, then receives
the file two bits at a time on the serial bus's clock and data lines,
four reads of CIA 2's port A per byte, avoiding the screen's bad lines.
Each file is stored from `$0801` and jumps to its own unpacker at
`$0812`, which unpacks to `$0200-$8000` and jumps to the mover at
`$9680`. The menu's third entry, Martin Walker's music demo
(`parts/warbles`), is packed from `$0801` in the same shape, with an
unpacker of its own at `$0812`; the second, the loading picture on its
own, was not followed. Neither is a file the directory can open, so the
menu's own loader finds them on the disk itself, and how it does was not
traced.
