# Lethal Weapon — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`ge-image.g64` (278,234 bytes). Its header reads `GCR-1541`: a GCR image
of a 1541 disk, run with the drive's own processor (VICE's default). The
directory has 101 files, all PRG; `kit/c64/disk.py` reads them all and
finds no sector outside a file. No trainer or cracker's menu. The title
program is called `LOADER`; the game's game-over code asks for a file
`TITLE`, which is not on this disk, so whether this is the original
release is open.

## The emulator

`release v3.14.0, v3.14.0-macos-arm64-gui.dmg (tools/vice-mcp)`;
`check-emulator`: 57 passed, none failed.

## From power-on to play

1. Hard reset, autostart the image (VICE loads the first file, which
   loads `F` and then `LOADER`). Warp helps: about 30 seconds of warp to
   the title.
2. The title screen (PRESS FIRE TO START): press fire.
3. The select screen: hold fire **and** right (Riggs) or left (Murtaugh)
   together for a second. This run chose Riggs.
4. The game loads stage 1A (a few seconds in warp).

## The parts

| Part | Snapshot | Route |
|---|---|---|
| `title` | `parts/title/work/title.vsf` (hand-over `entry.vsf`, a stop at `$C000`) | steps 1-2; saved on the title screen |
| `game` | `parts/game/work/play.vsf` (hand-over `entry.vsf`, a stop at `$03C0`) | steps 1-4; saved a few seconds into stage 1A |
| `ending` | `parts/ending/work/ending.vsf` (hand-over `entry.vsf`, a stop at `$0900`) | load the game's play snapshot, set the program counter to `$375C` (what a door with a negative stage does) and run; saved 30 seconds later on WELL DONE |

Each part's listing is built from the snapshot named first.

## Steady state

In play `$01` = `$35`; IRQ vector `$FFFE`, rewritten by each raster
interrupt in the chain (`$136F`, `$E1AC` and the sprite steps, `$1281`,
`$12F4`, `$132B`); NMI `$EC65`. VIC bank 1. Every stage loads its own
overlay at `$3790` and its files over `$4000`-`$CC3F` and `$FC95`-`$FE9C`.

## Files on the disk, mapped onto memory

| File | Part | Where | Note |
|---|---|---|---|
| LETHAL WEAPON | boot | `$0316` | loads F |
| F | boot | `$4000` | loads LOADER |
| LOADER | title | `$C000`-`$C9FF` | the title program |
| LOGO, TCHR, SCN0, PORT, TTHR, TCOL | title | `$5800`, `$6000`, `$8000`, `$8400`, `$8C00`, `$A000` | whole |
| MUSI | title, ending | `$E000`-`$F5D5` | whole |
| GAM0, GAM1 | game | `$03C0`, `$E000` | whole, with variables changed in play |
| L??0 / L??X | game | `$3790`-`$3FFF` | the stage overlay |
| L?? .BLK / .ATT | game | `$4000` / `$FD96` | .BLK is copied over by the screens once built |
| L?? .MAP / .CHR | game | packed: unpacked to `$4400`-`$67FF` and `$4800` | not found whole |
| COL0 | game | packed: unpacked to `$5000`; 256 bytes to `$FC95` | |
| PAN0, PAN1, PAN2 | game | `$5000`, `$42D0`, `$5008` | PAN2 is overwritten by PAN0 |
| SPxx | game | `$53C0`-`$7E3F` by the overlay's list | |
| 111 | ending | `$0900`-`$0D17` | |
| MEL/MUR, ME0/MU0, ME1/MU1 | ending | `$4000`, `$6000`, `$0D11` | by character |

## The loader, in a paragraph

The boot file loads over the KERNAL's vectors and starts `F`, which loads
`LOADER`. Every later file comes through the game's own fast loader
(`$03C3` in the game, `$C38A` in the title, `$0A63` in the ending): it
opens the file through the KERNAL to find it, uploads 256 bytes of drive
code with `M-W`, starts it with `M-E` at drive `$06C7`, and receives the
file two bits at a time on the serial lines, flashing the border.
