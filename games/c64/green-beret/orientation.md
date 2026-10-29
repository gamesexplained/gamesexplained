# Green Beret — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`green_beret[ocean_1986](!).zip` from the C64 Preservation Project's 10th
anniversary collection on archive.org
(`C64_Preservation_Project_10th_Anniversary_Collection_G64.zip`, folder
`g/`), a flux-level G64 of the original Ocean disk of 1986. Unzipped, the
G64 was saved as `work/green-beret.g64` (SHA-1
`eb688ed6cb3f23072c6e09671c82dd3e92da5558`).

`python3 kit/c64/disk.py work/green-beret.g64` lists eight entries. The
program is `GREEN BERET 6428`, 368 bytes loading at `$0101`; the first
entry, with an unprintable name, holds the same 368 bytes. The others
hold no game: `(C) KONAMI` and `TEQUILA SUNRISE` are empty,
`& IMAGINE SOFT.` holds 31 bytes for `$06F2`, and `(C) 1985` and
`XROM SYSTEM BELG` are decoys whose sector chains loop. The game itself
is in 409 sectors the BAM marks used and no file holds, read by the
loader's own code (below). No trainer, no crack: the loading picture and
the game are the original's.

The file's header reads `GCR-1541`: a G64, the bits the drive's head
reads, which the loader's own drive code needs.

## The emulator

VICE release v3.13.2 (`v3.13.2-linux-x86_64-gui.zip`) with its MCP
server, under the kit's launcher. `tools.py --platform c64
check-emulator` passed all 57 checks on 28 October 2026, so no
workaround was used.

## From power-on to play

1. Start VICE through the launcher (`python3 kit/c64/tools.py vice`) and
   autostart the G64 (`vice_autostart`), as `kit/skills/c64/steps`
   (`media`) says.
2. The screen stays black, then shows the start of the loading picture.
   About 70 seconds after the autostart the picture is complete, a tune
   plays, and the loader waits.
3. Press any key or the fire button on port 2. The loader unpacks the
   game (a few seconds of black), and the title page appears: "PRESS
   FIRE TO START".
4. Fire on port 2 starts the opening scene ("RESCUE THE CAPTIVES"); when
   its music ends, stage 1 begins.
5. Snapshots, in `work/`:
   - `loadpic.vsf`: the loading picture complete, waiting for a key.
   - `depacked.vsf`: stopped at `$4000`, the first instruction of the
     unpacked game.
   - `entry.vsf`: stopped at `$36A8`, the game's cold start, after the
     start-up at `$4000` has set up CIA 2 and copied its check routine to
     `$0100`. This is the hand-over the listing is built from.
   - `title.vsf`: the title page, waiting for fire.
   - `play-stage1.vsf`: stage 1 in play, the hero walking.

## Steady state

The game runs with `$01` = `$35`: the I/O area visible, BASIC and the
KERNAL banked out. Its interrupt handler is at `$CEA9`, through the
hardware vector at `$FFFE`; the NMI vector at `$FFFA` points at `$FFFC`,
which holds an `RTI`, so RESTORE does nothing. CIA 1 interrupts are off;
the only interrupt is the VIC's raster interrupt.

The interrupt runs in three phases, set by a table at `$3DD4`: the
sprite multiplexer at `$C474` (a band every 14 raster lines down the
playfield), the status line at `$394E` (raster `$F6`: joystick, game
logic for the player, frame counters, the status line's video registers)
and the playfield set-up at `$39A7` (raster `$46`).

Two video banks are used. The status line at the top shows bank 3
(`$C000-$FFFF`): screen at `$C400`, characters at `$C800`. The playfield
shows bank 1 (`$4000-$7FFF`): screen at `$4000`, characters at `$7800`,
sprite pointers at `$43F8`, sprite shapes between them.

Almost all of memory is the game's. Nothing is loaded after the first
load: per-stage graphics are exchanged in memory by a block-swap routine
at `$FEEC` with a table of nine blocks at `$FF5F`, the second copy of
each kept in the RAM under the I/O area and in `$8000-$9FFF`.

## The loader, in a paragraph

The boot program at `$0101` reads the game from 409 sectors the directory
does not list, with its own drive code, while it shows the loading picture
and plays its tune from `$AA31`. When a key or fire is pressed (`$CE8C`
reads both CIA 1 ports), it silences the SID, banks out the ROMs, moves
the unpacker and its tables into place and unpacks the game backwards
from `$C8B1` down, writing from `$FFFF` down. It ends with a jump to
`$4000`, the start-up. Not annotated further, by policy.
