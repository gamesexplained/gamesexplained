# Speedball — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`speedball[mirrorsoft_1989](pal).g64` from the C64 Preservation Project
(the file in that collection's G64 set), copied to `work/speedball.g64`,
SHA-256 `57c5ad913de856167f753d7324af6032882cb102c761cffba66186ee6931f10e`.
The header reads `GCR-1541`, version 0, 84 half-tracks, longest track
7,928 bytes: a GCR image of a protected original, not a sector image. It
is Mirrorsoft's PAL release (Imageworks label); the same collection also
has a Cinemaware NTSC release, which this run did not use. No trainer, no
crack intro.

The disk's name is `SPEEDBALL`. Its directory, as `kit/c64/disk.py` reads
it:

| Name | Loads at | Bytes | What it is |
|---|---|---|---|
| `LOADER` | `$02A7` | 345 | the first stage: a BASIC line and the boot code, which takes over the KERNAL's output vector |
| `BLOCKS FREE.` | `$0801` | 2 | a decoy entry that makes the directory look empty |
| `LOADER2`, `PROTECTION` | | | entries whose sector chains loop: not files |
| (unnamed, `$FF`) | `$F000` | 1,280 | the second stage, loaded by `LOADER` |
| `2` | `$1C00` | 375 | the last stage: loads the game's files with the KERNAL's own routines and jumps to `$2000` |
| `FILE8` | `$5800` | 10,240 | the first loading picture (colour, screen, bitmap) |
| `FILE0` | `$0810` | 4,992 | the music driver and its tunes |
| `FILE6` | `$8000` | 5,760 | 96-byte strips the last stage copies into the loading picture |
| `FILE5` | `$5800` | 10,240 | the second loading picture, the one on screen through most of the load |
| `FILE1` | `$8000` | 16,128 | copied to `$C000`-`$FEFF` once loaded |
| `FILE4` | `$4000` | 7,168 | game code and data |
| `FILE2` | `$2000` | 8,192 | game code; `$2000` is the entry |
| `FILE3` | `$8000` | 16,384 | game code and data |
| `FILE7` | `$6000` | 1,202 | copied to `$0200` by the game |
| `0`, `1` | `$1C00` | 1,024 each | not loaded at boot; the same size and address as the game's saved positions |

Six sectors on track 1 are marked in use with no file holding them.

## From power-on to play

1. Power-cycle VICE (x64sc, PAL, its default 1541 with true drive
   emulation; no `vicerc` was needed) and autostart `work/speedball.g64`.
   VICE types `LOAD"*",8,1`; the `LOADER` file's KERNAL output vector
   then starts it with no `RUN`.
2. **Leave warp off until the loading picture shows.** Twice, with warp
   turned on three seconds after the autostart, the load ended at BASIC's
   `READY.` with nothing loaded; with warp left off for the first 100
   seconds (the KERNAL load of the stages and the protection check) and
   on after it, the load went through each time. Why was not found.
3. The first picture (`FILE8`) and then the second (`FILE5`) show while
   the game loads: about 125 seconds from the autostart with warp on after
   the first 100.
4. The game starts at `$2000` and shows the SELECT GAME menu (one player
   knockout, two player game, one player league, save game, load league,
   load knockout, load two player game, continue game). Fire on joystick
   port 2 picks the highlighted entry; ONE PLAYER KNOCKOUT is first.
5. PLAYER 1 SELECT shows three teams; fire picks the highlighted one
   (Verna, captain Kef). KNOCKOUT ROUND shows the two teams and "FIRE TO
   PLAY OR F3 FOR MAIN MENU"; fire starts the match.
6. Snapshots, all in `work/`:
   - `entry.vsf`: a stopping checkpoint on `$2000` from a power-cycled
     boot, saved at the stop. This is the hand-over: it holds the play
     sprites at `$F300`-`$FEFF`, which the game moves to `$5C00`-`$67FF`
     for each match and back afterwards, and the `FILE7` block at `$6000`
     that the start-up moves to `$0200`.
   - `play-match1.vsf`: about ten seconds into the first match, players
     on the pitch. The listing is built from this one, since every
     routine and table is in place in it.

## Steady state

The game banks out the KERNAL and BASIC and installs its own vectors in
the RAM under the KERNAL: IRQ at `$FFFE` = `$86D3`, NMI and reset at
`$FFFA`/`$FFFC` = `$8703`, an `RTI`, so RESTORE does nothing. Its main
code reads `$01` as `$30` (all RAM), and the interrupt handler sets it to
`$0D` (RAM, I/O, RAM, with the cassette motor bit clear) for its own
work and puts it back on exit. The raster interrupt is a single handler
that steps through a table of lines at `$2C3A`-`$2C9F` (`$08` is the slot
number): each slot sets the next line, the video registers, and jumps
through a per-slot address. A frame of play (`work/frame-play.json`)
has the sprites rewritten at lines 23 to 34 and the score panel split
off at line 221; the pitch above it is a multicolour character screen.
No writes to the interrupt vectors happen during a frame.

Nothing is reloaded per match. Between the hand-over and the match the
game builds `$5C00`-`$7FFF` (screens, character sets, sprites), and
overwrites `$F300`-`$FFFF`. The save and load options bank the KERNAL
back in for the length of the transfer (`kernal_enter`, `$BE00`) and
call its own `SAVE` and `LOAD` (`$F5ED`, `$F4A5`), with `$1C00`-`$1FFF`,
the game's state, as the file.

## The loader, in a paragraph

`LOADER` is loaded by the KERNAL at `$02A7`, over the KERNAL's output
vector, so that BASIC's `READY.` after the load runs it. It blanks the
screen, writes SPEEDBALL at its top, points the NMI at an `RTI` and
starts CIA 2's timer A with an NMI, and loads the one-character-named second stage to
`$F000`, which ends in the stage at `$1C00` (the file `2`).
That stage loads each `FILEn` with the KERNAL's `LOAD`, shows the two
pictures, copies `FILE1` from `$8000` up to `$C000`, and jumps to
`$2000`. What the `$F000` stage checks was not read. The game's own
start-up then starts CIA 2's timers A and B with the same period, four
cycles apart, and its interrupt handler checks them on every raster
interrupt (copy protection: `facts.md`). Not annotated further, by
policy.
