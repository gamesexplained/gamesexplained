# Delta — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

One program file, `delta.prg`, 47,104 bytes, loading at `$0801` and
ending at `$BFFF`. It is not the original release: it is a crack by the
Reflex Cracking Squad, which put a packer and an intro of its own in
front of the game. The game itself is Thalamus's 1987 release
(the title screen reads "MCMLXXXVII", "Delta by Stavros Fasoulas",
"©1987 Thalamus"). No trainer menu appears.

## From power-on to play

1. Hard reset (power-cycle), then autostart `delta.prg`. VICE types
   `LOAD"DELTA",8,1` and `RUN`; the BASIC line is `SYS 2065`.
2. The crack's depacker runs and jumps to `$C000`, the Reflex intro
   ("Reflex Cracking Squad presents **** DELTA! ****", "Press space to
   kill this intro"). About 14 seconds after the autostart.
3. Press SPACE (matrix row 7, column 4), held until the intro reacts.
   The intro restores the memory it borrowed and jumps to `$CB00`, which
   copies the character ROM to `$0400`-`$07FF`, sets `$2D/$2E` to
   `$B3F5` and jumps to `$0810`.
4. `$0810` is the game's own packing: two more layers, each copying a
   small unpacker into low memory (`$0334`, then `$0100`) and running it.
   The last ends `LDA #$37 / STA $01 / CLI / JMP $1770` (the instruction
   at `$0129` once relocated). **`$1770` is the game's entry.**
5. Snapshot `work/entry.vsf`: a stopping checkpoint on `$1770`, saved
   there. This is the image the disassembler and the listing are built
   from (see below).
6. The game shows its title screen. Fire on joystick port 2 starts a
   one-player game; "Fasten your seatbelt Player 1" shows for about two
   seconds, then wave 1 begins with 3 lives.
7. Snapshot `work/play-wave1.vsf`: about seven seconds after fire, ship
   on screen, no input held, stopped with `pause()` (machine at `$17CC`
   in the main loop).

Also in `work/`: `crack-intro.vsf` (stopped on `$C000`) and
`crack-exit.vsf` (stopped on `$CB00`), kept only to show the crack's
layers.

## Steady state

- Emulator: VICE x64sc, release v3.13.1 (`v3.13.1-linux-x86_64-gui.zip`),
  PAL. `check-emulator` passed 56 of 57; failed:
  `pause-at-instruction` (so every stop for a snapshot uses `pause()`).
- Banking during play: `$01` = `$35` (RAM at `$A000` and `$E000`, I/O at
  `$D000`). The game sets it in its first subroutine (`$17E0`).
- Interrupts: hardware IRQ vector `$FFFE/$FFFF` = `$1800` (RAM). The
  handler at `$1800` saves the registers, acknowledges the raster
  interrupt and jumps through the pointer at `$1000/$1001`, which each
  raster band rewrites for the next one (a chain of raster splits). NMI
  `$FFFA` = `$FFF8`. The KERNAL vector at `$0314` is still the default
  `$EA31` and is not used.
- Main loop: `$17C9`-`$17DA` waits for raster line `$E4`, calls `$9D60`
  once a frame, waits for the line to pass, repeats.
- Video: `$DD00` = `$96`, VIC bank 1 (`$4000`-`$7FFF`); `$D018` = `$13`
  during play, screen at `$4400`, character set at `$4800`. Sprites
  enabled and multicolour from start-up (`$D015` = `$D01C` = `$FF`).
- Nothing is loaded from disk after the start: one file, no overlays.

### Hand-over against play

Compared byte for byte, `entry.vsf` and `play-wave1.vsf` differ in zero
page, the stack, the screen (`$4400`-`$47FF`), the variables around
`$1000`-`$12FF`, a few bytes of code that is self-modified, and in three
graphics areas:

- `$4C00`-`$50FF` and `$F0E0`-`$F5DF` swap places: each image holds the
  other's block. The game exchanges a title set of graphics and a play
  set, so neither image loses anything.
- `$4000`-`$43FF` and `$4A00`-`$4BFF` (sprite shapes in VIC bank 1) hold,
  in play, shapes found nowhere in the hand-over image, and the
  hand-over's shapes there are mostly found nowhere in play. The play
  shapes are built or unpacked by the game per wave; how is for the
  sweep and coverage steps to establish.

The hand-over is chosen: it holds the program as loaded, before the game
has written over any of it.

## The loader, in a paragraph

Three layers, none of them the game. The crack's BASIC stub at `$0801`
copies a depacker to `$0400`, which runs an RLE-style unpack and jumps
to the Reflex intro at `$C000`. The intro swaps a few blocks of memory
out of its way (`$3E80`-`$3FFF` with `$CE80`-`$CFFF`, `$3000`-`$33FF` to
`$C600`), plays, and on SPACE swaps them back and jumps to `$CB00` →
`$0810`. From there two unpacking stages, which appear to be the game's
own or the cracker's repacking (not determined), copy themselves to
`$0334` and `$0100`, decompress the game into `$0800` upward, and jump
to `$1770`. The crack's intro code at `$C000`-`$C3FF` and `$CB00` is
overwritten by the game in the process; what remains of the crack in the
hand-over is the character ROM copy at `$0400`-`$07FF`, if the game does
not use that area itself (to be checked in the sweep).
