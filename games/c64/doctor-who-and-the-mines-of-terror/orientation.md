# Doctor Who And The Mines Of Terror — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

One program file, `Doctor_Who_and_the_Mines_of_Terror.prg`, 29,175 bytes,
SHA-256 `8d143c7ac59882fe54844aa41d9996679e35bb100932e80f851191a3afb889bb`.
It loads at `$0801` to `$79F6` and starts with a BASIC line `SYS 2061`.
It is a single packed file, so it is not the publisher's release as it
came off the disk: someone packed the game into one file. Whether any code
beyond the packing was changed (a trainer, a removed protection) is
examined in the sweep; no intro, menu or trainer appears on the screen.

## From power-on to play

1. Hard reset (power cycle) the emulator, PAL.
2. Autostart the program file. VICE types `LOAD"MINES",8,1` and `RUN`.
3. There is no title screen and no menu. About twenty seconds after the
   load begins, the depacker hands over to the game at `$484D`, and a
   moment later play is on screen: the Doctor and Splinx the cat beside
   the TARDIS in a cavern, score 000000, six figures beside the score.
4. Snapshots, in `work/` (never committed):
   - `entry.vsf`: stopped on the game's first instruction, `$484D`
     (a stopping checkpoint on `$484D` set before the depacker runs).
   - `play-start.vsf`: a few seconds into play, no input yet.

## Steady state

The start-up at `$484D` blanks the screen, stops CIA1 timer A, sets `$01`
to `$35` (RAM at `$A000` and `$E000`, I/O at `$D000`), and writes its own
hardware vectors: IRQ `$FFFE` = `$8010`, NMI `$FFFA` = `$800F`. During
play those vectors read `$8010` and `$800F` and `$01` reads `$35`.
The KERNAL's RAM vector `$0314` still holds `$0888`, which the game does
not use while the KERNAL is banked out. Program-counter samples during
play fall between `$8000` and `$CDFF`.

The start-up copies blocks from `$4B00` upwards onto the screen at
`$0400`, so the hand-over image holds data the running game has since
overwritten; `entry.vsf` is the image the listing is built from unless the
comparison in the sweep says otherwise.

## Emulator

`release v3.13.1, v3.13.1-linux-x86_64-gui.zip`, on Linux x86_64 in a
cloud container with no display. `check-emulator`: 56 of 57, failed
`pause-at-instruction`; stops are made with `pause()` from `vice.py`.

## The loader, in a paragraph

The BASIC line jumps to `$080D`, which masks interrupts, blanks the
screen, banks all RAM in, copies the decruncher into the stack page and
zero page and runs it from `$0100`. It builds a 52-entry table of lengths
and offsets at `$0334`-`$03CF` and unpacks the game backwards through
memory; the table layout is the one Exomizer uses, which is a resemblance,
not an identification. When it finishes it restores `$01` to `$37`, waits
for the raster to pass the bottom of the screen, calls the KERNAL's
`IOINIT` (`$FDA3`), turns the screen on, enables interrupts and jumps to
`$484D`. The game is one load: nothing is read from disk after this.
