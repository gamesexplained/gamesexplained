# RoboCop — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

Two G64 disk images, both NTSC dumps of the Data East release (Data East
published Ocean's conversion in North America; the file names say 1987),
given as
`robocop[data_east_1987](ntsc).zip` and `...(ntsc)(alt).zip`. Each holds
one G64. In `work/` they are `robocop.g64` (the first, which every
snapshot comes from) and `robocop-alt.g64` (the second).

Both directories list the same files in a standard Commodore DOS layout:

| File | Bytes (with load address) | Loads at | What it is |
|---|---|---|---|
| ROBOCOP | 248 | $0110-$0205 | the boot file |
| FAST | 498 | $7000-$71EF | the fast loader |
| LOAD1 | 61,882 | $0E40-$FFF7 | level one, and what stays for the whole game |
| A | 12,546 | $0F00-$3FFF | level two |
| B | 27,598 | $5000-$BBCB | level two |
| C | 11,754 | $D000-$FDE7 | level two |
| D | 9,801 | $0F00-$3546 | level three |
| E | 23,831 | $5000-$AD14 | level three |
| F | 11,743 | $D000-$FDDC | level three |

The second image is another build: its D and E are swapped in name, and
its LOAD1, B, C, E and F differ in content (`media.json`; the differences
are in `facts.md`, "The second disk image"). Neither disk shows a
cracker's intro or trainer: the boot file goes straight to the fast
loader and the game's own title.

## From power-on to play

1. Start the emulator in NTSC (`MachineVideoStandard` 2) and autostart
   `work/robocop.g64` (`kit/skills/c64/tool-vice-mcp`).
2. ROBOCOP loads over the stack and starts itself; it loads FAST, then
   LOAD1 with the fast loader, and jumps to `$8000`. About 15 seconds.
3. The title shows the high-score table. Fire on joystick port 2 starts
   stage one.
4. Snapshots: `parts/resident/work/entry.vsf` and
   `parts/level-1/work/entry.vsf`, at the first instruction at `$8000`
   (a stopping checkpoint there); `parts/level-1/work/play-stage1.vsf` in
   stage one.

## The parts

| Part | Files | Route to its snapshot |
|---|---|---|
| resident | what LOAD1 leaves that no level loads over | the level-one entry snapshot, at `$8000` |
| level-1 | LOAD1: stages one to three | power-on, as above |
| level-2 | A, B, C: stages four to seven | on level one's title, type SUEDEHEAD (each key held 0.25 s, 0.4 s apart, once the title runs; `$07CE` counts the letters to 9); the game loads level two and starts it at `$8000`: `parts/level-2/work/entry.vsf` there |
| level-3 | D, E, F: stages eight and nine | on level two's title, type DISAPPOINTED the same way; `parts/level-3/work/entry.vsf` at `$8000` |

The cheats are the game's own level skips, so each part's snapshot holds
exactly what the game loads at the end of the level before, except the
score, which the cheat clears.

To see a later stage of a level without playing to it, stop at the first
stage's start (level two: `$80C5`) and set the program counter to the
stage's own start routine (level two: stage six `$814F`, stage seven
`$8191`). The stage then builds itself as it would after the stage
before. The reference pictures of stages five to seven were taken this
way.

## Steady state

RAM with the I/O chips at `$D000` (`$01` = `$35`), so the interrupt
vectors are the RAM ones at `$FFFA-$FFFF`. A raster interrupt at line
`$E1` shows the status panel at the top of the next frame from VIC bank 3
(screen `$C000`, characters `$D000`); a CIA2 timer NMI part way down
switches to bank 1 (screens `$4000` and `$4400`, characters `$4800`) for
the play area. Code lies at `$8000-$BBxx` and `$E000-$FDxx` in each
level, music at `$2500-$35xx`, tiles and maps at `$1000-$24xx`, sprite
frames at `$5000-$7FFF`. Each level's files replace the level before;
between levels the game copies a loader of its own to `$0400-$06FF` and
runs it.

## The loader, in a paragraph

The boot file loads at `$0110` with `$02` bytes over the stack, so the
KERNAL's LOAD returns into its own `JMP $0128`. That code loads FAST,
which installs a computer-side loader at `$0A00` on the LOAD vector and
starts a drive-side half with `M-E`. Bytes come over the serial bus two
bits at a time into a buffer at `$0B00`, and each block is copied to its
place with the ROMs and I/O switched out. LOAD1 then arrives through the
ordinary LOAD call. Not annotated further, by policy, beyond the
resident part's listing.
