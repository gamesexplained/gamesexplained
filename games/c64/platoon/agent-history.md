# Platoon — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 7 October 2026, Bronze run

Euan supplied six G64 images: sides 1 and 2 in a PAL dump, a second PAL
dump ("alt", disk name `rouven ross`) and an NTSC v1.1 dump. Extracting
every file with `c1541` showed the two PAL dumps byte for byte the same
file by file, and the NTSC disks a different build, so the run took the
PAL disks.

The emulator release needed six runtime libraries in this container
(`get-vice download` named them); with those it passed 57 of 57 checks.
regenerator2000 built from crates.io in the background while the game
booted.

The loading screen waits on SPACE with a loop at `$11F2`; sampling the
program counter found it, since the screen gave no prompt. The first play
snapshot was taken during the black screen between the title and the
jungle and was redone. A CHOOSE YOUR MAN panel opened by itself twice in
the jungle; fire closed it.

The hand-over is OVL1's first byte, `$0400`; F patches a `jmp $0400` into
the loader it copies to the stack page. OVL1 lands whole there, the RAM
under I/O included, so `entry.vsf` is the listing's image.

The flow trace from the stack page code at `$0108` (the NMI handler's
other exit) marked zero-page bytes as code; `$0000`-`$01FF` was set back
to undefined.

Raster interrupt handlers were first described by the raster line of the
write naming them, which is the line of the handler before; the comments
were rewritten from what each one writes.

The key test `$BA6A` takes a key number; listing its 23 callers with the
number before each found F1 to F7 (soldier select), Y and N, RUN/STOP,
M, O, 5, 6 and 2 (not yet read), and the five keys Z, A, C, H and 1 at
`$07B5`. Holding them live changed `$2BC8` to `rts`. The first try read
nothing because the machine had been left stopped by an earlier script
and `snapshot_load` keeps it stopped; checkpoint counts at zero, the
control included, showed it.

Every web page fetch was refused by the proxy (403); `features.md` rests
on search summaries and the game's own screens.

## Silver run, October 2026

Loads 2 to 4 were reached through the game's own disk loads and annotated to 100 %. Building
the music page showed the listings of loads 3 and 4 lacked the tune data and parts of the
driver; running the drivers on the simulator with read and execute maps found every byte they
use. The maps page showed load 4's room maps and the ends of its tables were missing too; they
were typed and listed under `coverage.extra`. The first sample found 15 of 60 comments wrong,
and those and their copies were corrected.

## Typed data no label reached (22 October 2026)

#455 made the ledger count typed data that no label reaches, and the
listings then left out 5,238 bytes that needed a description (#458),
most of them in the last section. Two code maps, a minute of play with
the joystick and a static trace from every routine the maps record
reach none of load 4's untyped stretches, so they were read as code
nothing calls: older joystick controls with a jump and a space-bar
grenade, enemy routines and a script engine the finished game replaced,
an old map scroller, and at `$28E2` a complete game of Space Invaders
with its own raster interrupts, which ran when the program counter was
set to it in the emulator (`reference/hidden-invaders.png`). Each is
typed as code and described. Two labels on ROM addresses, `$FD30` and
`$FFBA`, had been taken for RAM. `$FFBA` is now the KERNAL's `SETLFS`,
`$FD30` (the KERNAL's table of vectors, which `kit/c64/kernal.py` does
not name) has no label and is explained at the call that reads it, and
the RAM under both is the end picture and the bytes after it.

In load 3, `$B200`-`$B301` had been excluded as an older end screen
read only by the dead routine at `$FFA1`. The pointer tables at `$C61F`,
`$C659` and `$C693` name it: it holds attack picture 17 and the eight
pictures of the attacker's death (`$C2D5`), which run to `$B486`. The
exclusion is gone and the bytes are described. The same tables showed
that the "bands" in their comments were the sprite positions, colours
and frames, and that `$CBD0`-`$CEFF` is more records of the same form
that no entry names. Load 3 has 14 sound effects, not 18, and the music
driver's comments in loads 3 and 4 named addresses copied from loads 1
and 2; both were corrected.

New snapshots from the same image matched the listings byte for byte.
