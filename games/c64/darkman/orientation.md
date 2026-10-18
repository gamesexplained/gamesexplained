# Darkman — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

Two GCR images, one per disk side: `darkman_s1ocean_1990pal.g64` and
`darkman_s2ocean_1990pal.g64`. Both headers read `GCR-1541`, 42 tracks.
Side 1 lists `darkman` (1 block, loads at $0316), `f` ($4000), `code`
($0801), `1a`, `1b`, `2a`, `2b`, `3a` and `3b`; side 2 is named
`darkman2` and lists `4a` to `6b`. Nothing on either side looks like a
crack or a trainer: the boot program is the publisher's own, and the
credits page names Ocean and Twilight.

Emulator: VICE release v3.13.2, v3.13.2-linux-x86_64-gui.zip, through
vice-mcp. `check-emulator` on 13 October 2026: 57 passed, none failed. No
`vicerc` was needed; VICE's default drive emulation loads the G64.

## From power-on to play

1. Hard reset, autostart side 1 (warp on for the load).
2. About 20 seconds of warp later the screen reads "INSERT DISK SIDE #1,
   THEN PRESS FIRE". Hold fire on joystick port 2 for about 1.5 seconds.
3. Coloured stripes run across the border while `1a` and `1b` load, about
   80 seconds of warp. The title then alternates between the credits page
   and the "TODAYS TOP DARKMEN" table. Saved as `work/title.vsf`.
4. Turn warp off, hold fire for one second, wait four seconds: level 1 is
   in play with Darkman standing between two gangsters. Saved as
   `work/play-level1.vsf`. With warp still on, play runs too fast to
   watch, and Darkman dies within seconds.

## The parts

| Part | Files | Loads into | Route |
|---|---|---|---|
| `resident` | `darkman`, `f`, `code` | everything the level files leave alone: $0000-$0A1F and $9400-$BEFF in level 1 | the boot, above |
| `level1` | `1a`, `1b` | $0A20-$93FF, $BF00-$FFEF | the boot, above; the title screen is part of this load |
| `level2` | `2a`, `2b` | $0A20-$99FF, $BF00-$FFEF | skip from level 1, below |
| `level3` | `3a`, `3b` | $0A20-$5FFF, $E000-$FFEF | not reached |
| `level4` | `4a`, `4b` (side 2) | $0A20-$9DFF, $BF00-$FFEF | not reached |
| `level5` | `5a`, `5b` (side 2) | $0A20-$51FF, $BF00-$FFEF | not reached |
| `level6` | `6a`, `6b` (side 2) | $0A20-$9AFF, $BF00-$FFEF | not reached |

The ranges come from each file's load address and length, read with
`c1541`, and were not watched with a store checkpoint. The files are
stored unpacked: `1a` matches the play snapshot at its load address in
35,170 of its 35,296 bytes, and `1b` in 14,802 of 16,624 (the rest are
variables and the screens built at run time). No other level file
matches more than about 750 of its bytes, so none is in memory before its
load. $9A00-$BEFF stays in memory across the level 2 load. Comparing
level 1 in play with level 2's hand-over, it differs in one byte; with
level 2 in play, in 30, all variables. Level 1 copies the sound driver
there from its own file (the bytes at $7543 reappear at $B0C8), and
level 2, whose files hold no driver, calls it at $5491 and $6526. The
range is therefore resident in fact, though written by level 1's code
rather than by a load. $9400-$99FF is overwritten by `2a`.

Level 2 was reached by skipping level 1: in `work/play-level1.vsf`,
stop, set the PC to $0407 (the level number $0435 already holds 1), run
with warp on, hold fire at the next-level prompt, and stop on $0424 for
`work/entry-level2.vsf`. Then turn warp off, wait through the briefing
("LEVEL TWO. DARKMAN IS DISCOVERED..."), hold fire, and save
`work/play-level2.vsf`. Both are in `parts/level2/work/`, the hand-over
as `entry.vsf`; level 2 is not analysed.

Snapshots are in `parts/resident/work/` and `parts/level1/work/` (copies
of `work/play-level1.vsf`; `level1` also has `title.vsf`). The hand-over is `work/entry.vsf` (also
`parts/level1/work/entry.vsf`): a hard reset, autostart, warp on, and
after 25 seconds a stopping checkpoint on `JMP $0A20` at $0424 and fire
held for 1.5 seconds. It stops with `$01=$37`, and `1a` and `1b` lie
there whole, every byte matching. At the hand-over, $9400-$BEFF still
holds the emulator's power-on pattern: level 1 builds it at run time.

## Steady state

In play, `$01=$35` (RAM, I/O, no ROMs), so the game uses the hardware
vectors. NMI $FFFA points to $2030, IRQ $FFFE starts each frame at
$1E21. A recorded frame shows four raster interrupts chained through
$FFFE: $1E21 writes $1EF4 (line 42), $1EF4 writes $1D43 (line 101), $1D43
writes $1DBF (line 200), and $1DBF writes $1E21 again (line 206). The
title screen runs a chain of its own ending in $xxC2 and $xx23 low bytes.
The video chip shows bank 3 ($C000-$FFFF).

## The loader, in a paragraph

The one-block `darkman` program loads at $0316, over the system's
vectors, so that it runs as soon as the load ends; how `f` and `code`
lead to the resident loader at $0400 was not traced. The loop at $0407 shows a text screen at $0400 (the disk
prompt before level 1 and level 4, "PRESS FIRE TO LOAD NEXT LEVEL"
otherwise), waits for fire, loads the two files named for level number
$0435 with the fast loader at $0493 (CIA 2 port A bit-banging, retried on
an error), increments the level number and jumps to $0A20. Every level
is loaded over the one before it.
