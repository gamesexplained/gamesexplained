# Shadowfire — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`Shadowfire.tap`, 627,772 bytes, SHA-1
`30554555c373cf3d59939377f138ddf9cbc0a721`, from the Ultimate Tape
Archive's item `uta_Shadowfire_1985_Beyond_2440` on archive.org, beside
scans of the cassette, its inlay and the instructions. The header reads
`C64-TAPE-RAW`, version 1: a recording of the cassette's pulses, 260
seconds of tape. It is the Beyond cassette of 1985, not a crack: no
intro, trainer or menu comes up, and the blocks it loads are listed below.

A second image was looked at and not used: a D64 from archive.org's
`d64_Shadowfire_1985_Beyond_Software`, SHA-1
`fcb48d4bacc967418a26b88751a397944f919033`. Its disk name ends
`ASS PRESENTS:` and it holds two programs, `SHADOWFIRE` (160 blocks,
loads at `$0801`) and `SHADOWFIRE TUNER` (113 blocks), the add-on the
manual announces: a crack, packed into one file. It was not run.

## From power-on to play

1. Start the emulator (`tools.py vice`), hard-reset it, and autostart
   `work/shadowfire.tap` with `autostart()` in `kit/c64/vice.py`. VICE
   presses PLAY and types the load. Turn warp on with `warp(rpc, True)`:
   the load then takes about 240 seconds on a four-core container. The
   border flashes in colour while each block loads; from about the
   fourth block a picture fills the screen (the Beyond and Shadowfire
   title, "by Denton Designs").
2. The last block is a 19-byte stub at `$081B`; it masks the CIAs'
   interrupts, reads both interrupt registers to clear them, and jumps to
   `$4000`, the game's first instruction. A stopping checkpoint on
   `$4000` armed after the reset and before the autostart catches it:
   `work/entry.vsf` was saved there, with SP `$FA`, `$00` = `$2F` and
   `$01` = `$27` (the motor off; BASIC, I/O and KERNAL in).
   `work/scripts/entry.py` does all of this.
3. The game shows the control menu: F1 keyboard, F3 digital joystick,
   F5 analog joystick, F7 light pen, under the mission panel with a
   message scrolling across it. F3, held half a second through the key
   matrix, gives the start menu with a cursor: the joystick in **control
   port 1** moves it (port 2 does nothing). Left until the cursor's X is
   `$1C` puts it on the New game icon; fire starts the game.
4. `work/play-team.vsf` was saved on the team screen that follows, the
   six Enigma characters in a row and the mission clock at 99:56. Left
   alone on the control menu, the game plays its own demonstration.

## Steady state

- Banking: `$01` = `$25` in play, which is the `$35` banking with the
  cassette motor bit set: RAM at `$A000` and `$E000`, I/O at `$D000`.
  `$00` = `$2F`.
- The IRQ vector at `$FFFE` is `$549B`, with the raster interrupt enabled
  (the game writes `$01` to `$D01A`, at `$41B4`, `$41E3` and `$7861`;
  it reads back as `$F1`, since the register's unused bits read 1). The
  handler saves the main program's zero-page temporaries and several
  variables on the stack before it does anything else, so it is a second
  thread of the game, not just a frame tick.
- The NMI vector at `$FFFA` and `$0318` is `$427D`. RESTORE with RUN/STOP
  held resets the stack and returns into the address held at
  `$42D6`/`$42D7`, a restart; without RUN/STOP it returns.
- The screen is one mode from top to bottom: multicolour bitmap at
  `$2000` (`$D011` = `$3B`, `$D016` = `$D8`), its colour matrix at
  `$0C00` (`$D018` = `$39`), VIC bank 0 (`$DD00` = `$97`). A frame
  recorded with `frame.py capture` on the team screen had no register
  writes at all, and its rebuild matched all 104,448 pixels of the
  emulator's picture. Five sprites are on: sprite 0, multicolour, is the
  cursor; sprites 1-4 are doubled in both directions.
- The start-up at `$4000` copies `$CA00`-`$CFFF` into the RAM under the
  I/O chips at `$D000`-`$D5FF` with `$01` = `$14` (all RAM), copies
  `$1000`-`$13FF` into colour RAM, and fills `$0400`-`$07FF` with spaces.
  So `$CA00`-`$CFFF` in the hand-over holds what the game later reads at
  `$D000`; the RAM there is unwritten until then.
- The game is one load. Nothing is read from the tape after the
  hand-over, except the saved positions the player asks for.

The hand-over snapshot `work/entry.vsf` is the image the listing is
built from: it holds every byte the tape loaded before the start-up
moves any of it.

## What the tape holds

Decoded from the pulses by `kit/c64/tap.py`, and listed item by item in
`media.json`. The first two blocks
are in the Commodore ROM loader's format: a header and a short program.
The rest is a turbo format: pulses of 280 cycles are 0 bits and
528 cycles 1 bits, least significant bit first; a block is a pilot
of `$E3` bytes (96 of them), the sync byte `$ED`, its first address and
the address after its last (low byte first), the bytes, and one more
byte, which was `$44` in every block and which the loader never reads.
Each block's bytes were compared with the hand-over snapshot, and again
with the listing (`media.json`).

| Block | Lands at | Bytes | In the hand-over |
|---|---|---|---|
| ROM header and program | the header in the tape buffer, `$033C`-`$03FB`; the program at `$02A7`-`$030B`, the header's addresses, over BASIC's vectors | 192 and 101 | not the game's: the boot program and, scrambled in the header after the name, the turbo loader |
| 1 | `$0300`-`$030B` | 12 | equal: BASIC's six vectors, at their default values |
| 2 | `$0C00`-`$0FFF` | 1,024 | 349 equal: the loading picture's colour matrix, later overwritten by block 9 |
| 3 | colour RAM `$D800`-`$DBFF` | 1,024 | the picture's colour RAM |
| 4 | `$1400`-`$3FFF` | 11,264 | 3,475 equal: the loading picture's bitmap at `$2000`-`$3F3F`, and `$1400`-`$1FFF` beside it, all overwritten by block 9. The 3,072 bytes at `$1400`-`$1FFF` are no part of the picture and nothing runs or shows them: block 5 turns no sprite on, and only the loader runs until block 9 has replaced them. What they are is not known |
| 5 | `$D000`-`$D02F` | 48 | the video chip's registers: multicolour bitmap at `$2000`, colours at `$0C00`, which puts the picture up |
| 6 | `$E000`-`$FFF7` | 8,184 | equal, every byte |
| 7 | `$4000`-`$CFFE` | 36,863 | equal, every byte |
| 8 | `$D000`-`$D02F` | 48 | the video chip's registers again: the display off (`$D011` = `$0B`), the default text screen |
| 9 | `$0900`-`$3FFE` | 14,079 | equal, every byte |
| 10 | `$081B`-`$082D` | 19 | equal: the hand-over stub |

So the game is `$0900`-`$3FFE`, `$4000`-`$CFFE` and `$E000`-`$FFF7`, all
of it loaded as it stands. The loading picture (blocks 2 to 5) is the
loader's: the game never shows it, and block 9 loads over it.

## The loader, in a paragraph

The ROM loader reads a header and a program of 101 bytes, which loads
over BASIC's vectors and points the main-loop vector (`$0302`) at its own
start, `$02A7`. The program is written in undocumented opcodes. It EORs
the tape buffer from `$0351` up with `$59`, the byte at `$0308` EORed
with the BRK vector's high byte at `$0317`, and jumps to `$0351`: the
header's spare bytes are the turbo loader, stored scrambled (the
program's own code run on the tape's bytes in `kit/cpu/cpu6502.js`, 11
November 2026; the program counter sat at `$03E5` and `$03E8` while
blocks loaded, which is the loader waiting for a pulse). The loader
times each pulse with CIA 2's timer A, loaded with `$0180` and restarted
on every pulse, and a pulse the timer runs out on is a 1. It hunts for
`$E3` a bit at a time, reads on while the bytes are `$E3`, wants `$ED`,
then takes four bytes of addresses and stores bytes until the first
address reaches the second. It
reads the ten turbo blocks above in order (the count is the byte at
`$03BB`), putting up the loading
picture first so there is something to look at for the four minutes the
rest takes, blanking the screen again before the last big block loads
over the picture, and finally runs the stub at `$081B`, which starts the game
at `$4000`. Not annotated further, by policy.
