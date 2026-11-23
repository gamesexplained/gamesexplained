# Chuckie Egg 2 — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

One program file, `chuckie-egg-2.prg`, 64,750 bytes, SHA-256
`585269205e1a1a5287c9804d1f579ee4f33512574447f0862b11752b3ca3a1fd`. Its
header says it loads at `$0314` and runs to `$FFFF`: a one-file version
made from a memory image of the game, not A&F's tape release. Its first two
bytes replace the IRQ vector at `$0314` with `$033C`, so the first
interrupt after the load ends starts it. No trainer, intro or menu of a
cracker's appears; nothing in it names who made the file. `$D000`-`$DFFF`
in the file holds VICE's power-on fill pattern, so the RAM under the I/O
area was empty when the image was made, and the hardware vectors at
`$FFFA`/`$FFFE` hold `$CDC3`/`$CCEA`, the tape loader's handlers, which
the game replaces at its start.

The contributor reports that most images of this game send Harry walking
left for ever in the train rooms, because of bad room data, and that this
one does not; and that in this one the green ladder "sinks into the floor"
when it is dropped (`features.md`, Open questions).

## From power-on to play

1. Start VICE (vice-mcp, `python3 kit/scripts/tools.py vice`) and reset it
   hard.
2. The file cannot be loaded with `LOAD"*",8,1`: its first two bytes move
   the IRQ vector, and VICE's fast disk load lets an interrupt through
   before `$033C` is loaded (the log says "Left ROM for $033c" and the
   machine returns to `READY.`). Put it into RAM instead with
   `inject(rpc, "work/chuckie-egg-2.prg")` in `kit/c64/vice.py`, on a
   machine at `READY.`, without a start address: the next interrupt goes
   through the new vector to `$033C`, as a finished load would.
3. `$033C` restores the KERNAL vectors, runs IOINIT and jumps to the game's
   entry, `$490A`. A stopping checkpoint on `$490A` there gives the
   hand-over: `work/entry.vsf`. It equals the file byte for byte except
   `$0314`-`$0315` and `$0326`-`$0327`, which the start-up rewrote.
4. Run on: the title screen (the high-score table) appears in about four
   seconds. Press P; play starts in room 1 with the van arriving. The play
   snapshot `work/play-room1.vsf` was taken there, Harry standing on the
   grass.

The listing is built from `work/entry.vsf`.

## Steady state

During play `$01` is `$35` (RAM at `$A000`-`$BFFF` and `$E000`-`$FFFF`,
I/O in). The hardware IRQ vector `$FFFE` points at `$1100`, a two-band
raster interrupt that sets the background colour above and below line
`$41`; `$0314` points at `$1105`, its body. The NMI vectors point at
`$4906`, an RTI. The video chip uses bank 0: screen at `$0400`, the
character set at `$0800` (`$D018` = `$13`), sprites from `$2000`. The
front end (title, high scores, keys, tape) sets `$D018` to the ROM's
character set.

The main loop is `$4A87`, paced by a delay loop in Harry's move (`$4C4E`),
not by the frame. Nothing is loaded during play: everything is in memory
from the start. Saving and loading a game use a turbo tape routine of the
game's own (`$F324` writes, `$CC00` reads).

Code: `$1100`-`$11F7` (interrupt, tune), `$4000`-`$7BA6` (the game),
`$8750`-`$881F` (input), `$C900`-`$C98E` (footstep sound),
`$CC00`-`$CE05` (tape loader), `$E000`-`$F4B1` (front end and tape saver).

Emulator: `release v4.0.0, v4.0.0-linux-x86_64-gui.zip` on Linux x86_64
with no display (Xvfb). `check-emulator` passed 57 of 57 on 22 November
2026; no workaround was needed.

## The loader, in a paragraph

There is none in the file beyond the eleven instructions at `$033C`: the
one-file version starts itself through the IRQ vector, restores what it
overwrote and jumps to the game. The game's own tape routines (`$CC00`,
`$F324`) are not a loader for it but its save and load of a game in
progress, and of the high-score table.
