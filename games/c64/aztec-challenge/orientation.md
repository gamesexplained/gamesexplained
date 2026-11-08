# Aztec Challenge — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`Aztec_Challenge.tap`, 1,254,024 bytes, SHA-1
`d6fbf6aeefa5d14d0ccac24d3009791279edbbcc`, from the contributor's copy
of the Ultimate Tape Archive V4.0, entry 733, in a folder named for the
U.S. Gold release. The header reads `C64-TAPE-RAW`, version 1: a raw
recording of the cassette's pulses. The inlay scans beside it show the
U.S. Gold "All American Software" sticker on a Cosmi cassette, which
says to `LOAD "AC"`, press the Commodore key at `FOUND AC`, then `RUN`.

It is an original tape in the KERNAL's own format, not a crack: no
intro, trainer or fast loader. A decoder written for this run
(`work/tapdec.py`, which reads the pulses as the KERNAL writes them)
finds two headers and two data blocks, each written twice as the
KERNAL does, every checksum correct:

| File | Type | Address | Bytes | What it is |
|---|---|---|---|---|
| `AC` | 1, a BASIC program | `$0801`-`$0A65` | 613 | the boot: draws the Cosmi title card, loads `AZTEC`, starts it |
| `AZTEC` | 3, loaded where it was saved | `$1000`-`$7FFE` | 28,671 | the whole game |

Both files are in memory at the hand-over byte for byte as the tape
holds them.

## From power-on to play

1. Power-cycle the emulator (`reset(rpc, "hard")` in `kit/c64/vice.py`)
   and autostart the TAP with `autostart()`. VICE presses PLAY and types
   the load and `RUN`. Turn warp on (`warp(rpc, True)`) straight after.
2. `AC` runs. It blacks the screen and prints the card "C O S M I /
   AZTEC CHALLENGE / BY PAUL NORMAN / BASED ON A GAME BY ROBERT
   T.BONIFACIO / LOADING NOW / COPYRIGHT(C)1983,COSMI,INC.", then line 40
   `LOAD"aztec",1,1`. The KERNAL blanks the screen while it reads.
3. A `LOAD` from inside a program runs the program again from its first
   line. Line 15 tests `PEEK(4096)=162` (the game's first byte, `LDX #`)
   and, now that it is there, goes to line 50: `SYS4096`. With warp on
   from two seconds after the autostart, `$1000` first ran 577 seconds
   later on 8 November 2026 (`work/handover.py 1000 7FFF <name>` does
   it all, from power-on).
4. The game shows a spinning spiral (Cosmi's logo), the title
   "AZTEC CHALLENGE" around the sun stone, then "SELECT - ONE PLAYER -
   PRESS KEY F1 / TWO PLAYERS- PRESS KEY F3". Left alone, it plays
   short previews of the levels and comes back to the menu.
5. F1 (held half a second) gives the scorecard for player 1, level 1,
   phase 1, with the Gauntlet's instructions and "PRESS FIRE BUTTON TO
   START". Fire on control port 2 must be held about one and a half
   seconds: the scorecard checks it only between two long delay loops
   (`$12D5`).
6. Snapshots in `work/`, all saved without ROMs:
   - `entry.vsf`: the hand-over, stopped on `$1000` by an execute
     checkpoint on `$1000`-`$7FFF` armed two seconds after the
     autostart. The disassembler and the listing are built from this
     one: the game never writes inside its own `$1000`-`$7FFE` except ten
     bytes at `$5C28` (below), so it holds every authored byte.
   - `level1-intro.vsf`: the scorecard before level 1, one player.
   - `play-L1.vsf` to `play-L7.vsf`: each level about two and a half
     seconds after fire, reached from `level1-intro.vsf` by setting the
     level digit at `$03` to `'1'`-`'7'` (`$31`-`$37`) before pressing
     fire (`work/levels.py`).

## Steady state

- The interrupt is the KERNAL's own timer interrupt (CIA 1), with
  `$0314`/`$0315` pointed at `$1C00` by `$101B`. The VIC's raster
  interrupt is never enabled (`$D01A` is written `$00` and `$10`, whose
  set bit is not an interrupt source). NMI and BRK vectors stay the
  KERNAL's.
- `$01` is `$37` in play: BASIC, KERNAL and I/O all in. The game calls
  the KERNAL to clear the screen (`$FFD2` with `$93`), to update the
  clock and to read the STOP key (`$FFEA`, `$FFE1`).
- The video chip stays in bank 0 (`$DD00` = `$97`). The screen is
  `$0400` throughout. `$D018` picks the ROM character set (`$15`, the
  scorecard and menu), the set at `$3000` (`$1D`, levels 3, 5, 6, 7)
  or the one at `$3800` (`$1F`, levels 2 and 4). Sprite pointers
  `$8A`-`$BE` put the sprite shapes in `$2280`-`$2FBF`.
- Memory used: zero page, the stack, the screen and its sprite pointers
  `$0400`-`$07FF`, colour RAM, and the program at `$1000`-`$7FFE`.
  Nothing above `$7FFF` changes between the hand-over and any level.
  Inside the program only `$5C28`-`$5C31` change, during level 5.
- Nothing is reloaded: the tape is read once.

## The loader, in a paragraph

There is none of the game's own: `AC` is ten lines of BASIC that print
the title card and use the KERNAL's `LOAD`, which reads the standard
slow format (the inlay says six minutes for the "28K Program"). The
re-run of a program after a `LOAD` inside it is what line 15 relies on
to start the game.
