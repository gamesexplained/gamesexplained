# Big Trouble In Little China — verified technical facts

Current truth for this game, from reading the code in `work/play-level1.vsf`
unless marked *live*. Only what the first play session reached (2,304
instructions in 112 runs, 5,014 bytes) has been read; the rest is open.

## Build

A Trilogic V2.9 crack: one packed program on a D64 that restores a frozen machine and runs from the title loop at `$11FE` (`orientation.md`).

## Memory layout

| Thing | Where |
|---|---|
| Sprite multiplexer, bank 2 buffer (screen at `$8800`, sprite pointers `$8BF8`) | `$0622`, tables at `$0191`-`$01B0` |
| Sprite multiplexer, bank 3 buffer (sprite pointers `$CBF8`) | `$0763`, tables at `$01BB`-`$01DE` |
| Raster IRQ start-up | `$05F0` |
| Title loop and fire wait | `$11E0`, `$11F6` |
| Joystick port 2 reader and its table | `$1AE4`, `$1AC4` |
| Sound effect player | `$2AA6`, tables `$2B06`-`$2B2E` |

## Timing

Each frame, the IRQ chain starts on raster line 0 (`$05F0`/`$060F`) and stops 13 more times (`LDY #$0D` at `$06AD`) to move pairs of sprites down the screen.

## Controls

Title: fire on joystick port 1 (`$11F6`, bit 4 of `$DC01`). Play: joystick port 2 (`$1AE4`, `$DC00` with the low five bits inverted, mapped through the table at `$1AC4`).

## Graphics

Two video banks (bank 2 at `$8000`, bank 3 at `$C000`) are flipped every frame by toggling bit 0 of `$DD00` (`$0A68`-`$0A6D`); the IRQ vector is replaced by the handler that belongs to the bank now shown (`$0A73`-`$0A7C`, tables at `$0165`/`$0167`). Each handler gives sprite pairs a new Y position from a table and adds 1 to two sprite pointers (`$0632`/`$0635`).

## Register census

From `census.py` on the play snapshot, blocks as exported. Registers not listed were not touched by any code that ran.

| Register | What the game does | Routine |
|---|---|---|
| `$D000`-`$D00F` sprite X/Y | Y values set at each raster stop; X from `$0A09`/`$0A0E` | `$0622`, `$0763` |
| `$D010` sprite X high bits | set in the sprite placement | `$09FA`, `$0A03` |
| `$D012` raster | next stop's line written each time | `$0647`, `$0788` |
| `$D015` sprite enable | written once in the placement routine | `$09F5` |
| `$D019` interrupt status | acknowledged | `$0653` |
| `$D020` border | set to black at the last stop | `$065E` |
| `$D02D`, `$D02E` sprite 6 and 7 colours | set | `$132A`, `$132D` |
| `$D400`-`$D406`, `$D418` SID voice and volume | sound effects only | `$2AC1`-`$2AD4`, `$2AA8` |
| `$DC00`, `$DC01` CIA 1 ports | title fire (`$DC01`), joystick 2 (`$DC00`) | `$11F6`, `$1AE4` |
| `$DC04` | timer A low byte read | `$05EC` |
| `$DD00` | VIC bank select, toggled every frame | `$0A68` |

## Mechanics

Open.

## Data tables

Open.

## Sound

Only the sound-effect routine at `$2AA6` was seen writing the SID. No music driver was found in what ran; the whole game was not played, so a tune elsewhere is not ruled out.

## The listing's error rate

Eleven comments were written by the run; none has been checked by another model. This run was on a model the kit does not list as proven, so the listing needs a maintainer's sample (`kit/CHECKING.md`).

## Live tests

- Boot and title: reached by following `orientation.md`; fire on port 1 starts play (screenshots in `reference/`).
- Port 2 moves the street: holding left with the stick on port 2 scrolled a lamppost in from the left of the screen.
