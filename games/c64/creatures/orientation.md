# Creatures — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

Two G64 images of the original Thalamus disk, one for each side, from the
C64 Preservation Project's collection on the Internet Archive
(`C64_Preservation_Project_10th_Anniversary_Collection`, the G64 zip, files
`creatures_s1[thalamus_1991](pal)(!)` and `creatures_s2[...]`), fetched on
13 October 2026:

| Side | SHA-256 of the G64 |
|---|---|
| A | `4544cf5d6ce9130c4da853e169058dcb7e2b9c7dec780d0c8f94356c10491c1c` |
| B | `b30bb735d37212ada914a0d5f291b8d5994f4039141402643898b8016bacca35` |

The collection names the release 1991; the title screen and the manual say
1990. Nothing on either side is a crack or a trainer.

Side A:

| File | Loads to | What it is |
|---|---|---|
| `BOOT` | $0100-$025F | the autostart (below) |
| `2` | $C000-$C4FF | the fast loader that loads the title |
| `MENU` | $2300-$9DFF | the title, its music player and the loader of `GAME` (part `intro`) |
| `GAME` | $0200-$B8FF | the engine, moved into place after loading (part `engine`) and the attract block |
| `UNCLE CLYDE` | $0801-$1C8E | a separate picture, not loaded by the game (part `picture`) |

Side B: `1@` ($5800-$69FF, a copy of the attract block), the levels `LA`
`LB` `LD` `LE` `LG` `LH`, the torture chambers `TC` `TF` `TI` and the
ending `CJ`. The first levels of each world and the chambers load to
$5800-$ABFF, the second levels to $8700 (`LB` to $ABFF, since it carries
the witch's shop at $9A00; `LE` and `LH` to $99FF), and `CJ` to
$5800-$8CFF.

## From power-on to play

1. Attach side A to drive 8 and autostart it (`LOAD"*",8,1` does the
   same). Keep the drive emulated in full: the loaders run code in the
   drive.
2. The title appears once `MENU` has loaded: THALAMUS PRESENTS, then the
   Creatures logo, the credits and a scroller. Fire loads `GAME`, which
   opens on the attract sequence and the high-score table.
3. Fire starts a game. The game asks for side B ("INSERT SIDE B AND PRESS
   FIRE TO START"): attach side B and press fire. Level 1.1 loads and its
   Get Ready screen appears; fire starts play.
4. Snapshots: `work/play-l1.vsf` in level 1.1's play, and each part's own
   below.

## The parts

Each part's snapshot is `parts/<part>/work/entry.vsf` unless named.

| Part | Files | Snapshot |
|---|---|---|
| `intro` | `MENU` | `entry.vsf` at the title's start, $2AED, where the fast loader hands over; `play.vsf`, which the listing is built from, at $C000 after fire, when the title has run and the loader of `GAME` is about to start |
| `engine` | `GAME` | at $1000, just after the code at $0190 has moved $5C00-$B7FF to $A400-$FFFF ($01 = $34): the engine and the attract block as the file left them |
| `attract` | `GAME`, `1@` | the engine's snapshot; the attract block is $E000-$F1FF |
| `level-1-1` | `LA` | from `work/play-l1.vsf`: the stage number $12A2 set to $FF, X to 0 and the program counter to $14AF (`stage_next`), which adds one and loads that stage's file, here `1@` and then `LA`; `entry.vsf` when the fast loader has written the file's last byte and returned to code outside $4800-$4BFF |
| `level-1-2` | `LB` | the same from level 1.1's `play.vsf`, with $12A2 = 1; each stage below starts from the part before's `play.vsf` or `ready.vsf` with $12A2 one less than its own |
| `shop` | arrives with `LB` | level 1.2's Get Ready screen ($3809) after the witch's shop, its block still at $E000 |
| `torture-1` | `TC` | at the chamber's start, $8051 |
| `level-2-1` | `LD` | |
| `level-2-2` | `LE` | |
| `torture-2` | `TF` | |
| `level-3-1` | `LG` | |
| `level-3-2` | `LH` | |
| `torture-3` | `TI` | |
| `ending` | `CJ` | at $7D6A |
| `picture` | `UNCLE CLYDE` | autostarted on its own; the program unpacks and stops in its loop at $3F96 |

The route passes the shop after every level file, leaving it through
EXIT. The snapshots of `level-3-1`, `level-3-2` and `torture-3` were
reached from chamber 2's snapshot without the chamber's exit, which
restores eight engine branches the chamber flips: there $2CC7, $2D1D,
$2D98, $2DFE and $31C1 hold $B0 where the game has $90, and $2DDD, $2E47
and $AD1D hold $90 where it has $B0. Live tests from those snapshots poke
the game's values first.

The snapshots of `level-2-1` and every part after it also come from a
route without chamber 1's exit, `torture_leave` (torture-1 `$938A`),
which puts back the engine settings the chamber changes: the panel
sprites' y, `$126C`, `$24F0`, `$7FFF`, `$12DE`, `$12E6`, `$12EA` and the
operands at `$2E5C`, `$2E5D` and `$3045`. From those snapshots the main
loop made one pass every two frames (1,980 passes in 4,163 frames on
level 2.1), so the spawn records fell behind the scrolling landscape;
with `torture_leave`'s writes made first it made one a frame. The map
runs (`test_maps.json`) make them first.

## Steady state

During play the ROMs are banked out ($01 = $35). `stage_start` points the
NMI vector at an RTI at $22E7 and the IRQ vector at $22E8, the first of a
chain of raster interrupts, each of which sets the vector to the next. The
chain draws the screen: the playfield scrolls by hardware fine scroll
and a coarse scroll that alternates between two screens at $4400 and $4800
(`scroll_draw_column`), the status panel is sprites, and the objects are
multiplexed sprites. The VIC bank is $4000-$7FFF. The engine's code and
tables fill $0334-$3FFF and $A400-$FFFF, apart from $E000-$F1FF; its
variables are at $1200-$12FF and the objects' tables at $C000-$C4FF.

Each stage loads its file into $5800-$ABFF (a level's second stage only
$8700-$99FF, over the first's), which holds its character set ($5800),
sprites ($6000), tiles, map, spawn records, tunes and its own code at
$A300-$ABFF; the engine reads the file's tables at fixed addresses and
calls its code through five hook addresses (`level_begin`). The shop and
the attract sequence share $E000-$F1FF and are swapped in and out
(`memory_swap`).

## The loader, in a paragraph

`BOOT` loads over the stack page, filled with $02, so the KERNAL's LOAD
returns into it at $0203. It blackens the screen, turns the KERNAL's
messages off, points the NMI vector at an RTI and starts CIA 2's timer
interrupt so that RESTORE does nothing, then loads `2` with the KERNAL and
jumps to $C240. That fast loader uploads its drive code and loads `MENU`,
whose code at $2AED starts the title. The title copies its own fast loader
to $C000 as it starts; fire copies the code at $2F00 to $0190 and runs the
loader, which loads `GAME` and jumps to $0190. That code moves the top of the file up to $A400-$FFFF with all RAM
visible and jumps to $1000. In the game the engine loads each stage's file
the same way: the KERNAL opens the file and the engine's fast loader
(`fast_loader`, run at $4800) uploads 256 bytes of drive code with M-W,
starts it with M-E and receives the file two bits at a time through
$DD00. Not annotated further, by policy.
