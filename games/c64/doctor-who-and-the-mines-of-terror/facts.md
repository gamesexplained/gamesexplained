# Doctor Who And The Mines Of Terror — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

A single packed program file (`orientation.md`). The depacker leaves the
game at `$484D` with the KERNAL banked in; the game banks it out itself.

## Memory layout

| Thing | Where |
|---|---|
| Start-up, run once | `game_entry` `$484D`-`$4A85`, then `$7440` clears `$4800`-`$4FFF` (its own start-up included) |
| Main loop | `$7476`-`$74BF`: input, frame wait, then eighteen subsystem calls, round again |
| IRQ handler | `$8010`, three raster bands chosen by a branch whose offset the handler rewrites (`$8018`) |
| NMI handler | `$800F`, a bare `RTI` |
| Zero-page vector table | `$03`-`$1B`, copied from `$4A4E` at start-up |
| Status-bar screen | `$0400`, VIC bank 0 (band at the top) |
| Play-area screens | `$7800` and `$7C00`, VIC bank 1, swapped by `$52` indexing `$8002` |
| Splinx Programmer screen | `$0C00`, screen codes, in the loaded image |
| Custom-alphabet strings | `$1770`-`$184F` (item names), `$9680`-`$98E0` (messages) |

## Timing

- The main loop waits in `$80DA` for raster line `$FA` with bit 8 clear,
  once per pass, so a pass is at least one frame. It counts frames in
  `$53`-`$55`. It subtracts 1, in decimal, from the three-byte counter
  `$1B`-`$1D` only when both `$53` and `$54` wrap to zero together (the
  `BNE`s at `$80EA` and `$80EE`), once every 65,536 frames, about 21.8
  minutes on PAL; the `AND #$3F` test after them is then always true.
  (traced: `$80DA`-`$810C`)

## Controls

`$8F24` reads the stick in control port 2 (`$DC00`) and six keyboard
rows, each held in its own zero-page byte, and turns them into movement
flags (traced: `$8F3C`-`$9058`):

| Input | Effect |
|---|---|
| stick left, Z | `$CB` = `$81`, `$D4` = `$81` |
| stick right, X | `$CB` = `$01`, `$D4` = `$01` |
| stick down, `/` | `$CC` = `$81`, `$D5` = `$81` |
| stick up, `;` | `$CC` = `$01`, `$D5` = `$01` |
| fire, RETURN | `$CD` = `$FF` |
| F1, F3, F5, F7 alone | `$D0`, `$CF`, `$D2`, `$D1` = `$FF` |
| S | `$D3` = `$FF` (opens the Splinx Programmer, *live*) |
| D; with CTRL | `$E8` = `$80`; `$C0` |
| R, L (when `$E8` is 0) | `$E8` = `$12`; `$FF` |

## Graphics

Three raster bands (traced: `$8010`-`$80D7`):

1. From raster `$FF`/top: VIC bank 0, `$D018` = `$10`, background black,
   `$D016` X scroll from `$EA`. The status bar.
2. From raster `$4D`: bank 1, `$D018` from `$8002`,`$52` (`$E3` or `$F3`:
   screen `$7800` or `$7C00`, characters `$4800`), X scroll from `$5E`
   (inverted), Y scroll from `$5F`.
3. From raster `$55` or `$56` (`$84`): `$D018` from `$8000`,`$52`,
   background from `$EF`.

## Text

Two alphabets.

- **Screen codes** on the Splinx Programmer screen at `$0C00` and on the
  loading screen left at `$0400` in the hand-over image ("PLEASE WAIT --
  STILL LOADING", "MINES OF TERROR").
- **A private alphabet** for everything the game prints itself: a letter
  is its ASCII code plus 155 (`A` = `$DC` ... `Z` = `$F5`), a digit *n* is
  `$F6` + *n*, `$94` is a space and `$00` ends a string. Found by
  searching for the letter differences of known words.

## Strings

Item names at `$1782`, in order: SPLINX, MARKER 1-4, PICK AXE, MAT,
CRYSTAL, PASS CARD, SPANNER, PLATFORM, AIR MASK, BOX, DETONATOR,
EXPLOSIVES, CAPSULE, ACTIVATOR, CIRCUIT, EGG, CHEMICALS, GEM.

Messages at `$9687`: YOUR FINAL SCORE IS; THE DOCTOR REGENERATES AFTER;
GAME OVER; PRESS F1 TO, F3 TO, F5 TO, PLAY AGAIN; the causes of death
(FORCED REGENERATION, THE CRYSTAL, THE TIRU PLANS, SPLINX, THE EXPLOSION,
EXPOSURE TO RADIATION, A SHOCK FROM A CONTROLLER, A FALL, FALLING ON A
STALAGMITE, SUFFOCATING, SUFFERING A MADRAG BITE, BEING ATTACKED BY A
BABY MADRAG); the ending (AFTER YOU HAVE RETURNED TO GALLIFREY IN THE
TARDIS / AN ESCAPE POD, WITH ... AND HAVE SUCCESSFULLY / BUT HAVE NOT
HALTED THE PRODUCTION OF HEATONITE, THE TIME LORDS ARE VERY PLEASED /
DISPLEASED WITH YOUR PERFORMANCE); SAVE ON CASSETTE, DISC, RETURN TO
GAME.

## Hardware register census

From every instruction in the traced code with an operand in `$D000`-
`$DFFF` (colour RAM aside), read from `entry.vsf`.

| Register | Accesses | Where |
|---|---|---|
| `$D000`-`$D007`, `$D010` | sprite positions | `$B00F`-`$B059`, `$FE80`-`$FE90` |
| `$D011` | 44 | start-up, raster bands, `$80DA` |
| `$D012` | 9 | raster bands; reads in `$8D0B`, `$931B`, `$B02D`, `$B15D` |
| `$D015` | 4 | `$8138`, `$9362`, `$AF83`, `$B05E` |
| `$D016`, `$D018` | 15, 4 | raster bands, `$9594`, `$AF8B`-`$AFC6`, `$B143` |
| `$D017`, `$D01B`-`$D01D` | 3 each | `$81A8`-`$81BE`, `$AFD3`-`$AFE2`, `$FE7A`-`$FE88` |
| `$D019`, `$D01A` | 2, 5 | start-up; `$9367`, `$94F2`, `$AF88`, `$B140` |
| `$D020`-`$D026` | colours | start-up; `$FF31`-`$FF41` |
| `$D027`-`$D02A` | sprite colours | `$815E`, `$AFE7`-`$AFF6`, `$FEA2` |
| `$D400`-`$D40B` | voices 1 and 2 | `$755D`-`$7631`, `$C8A2`-`$C8A5` |
| `$D40E`-`$D414`, `$D418` | voice 3, volume | `$C7CF`-`$C8A5` |
| `$D41C` | voice 3 envelope, read | `$C82B` |
| `$DC00`-`$DC02` | keyboard and stick | `$8F3C`-`$8FD2` |
| `$DC0D`, `$DD0D` | read (acknowledge) | `$FFDA`, `$FFDD` |
| `$DC0E` | stops CIA1 timer A | start-up `$4855` |
| `$DD00`, `$DD02` | VIC bank | raster bands, `$AFB2`-`$AFC1` |

Not named by any traced instruction: the filter registers, the voice 1
and 2 envelope registers, the CIA timers, `$D01E`/`$D01F` (hardware
collisions). `STA $D400,Y` at `$755D` can reach any SID register, so for
the SID this is a claim about direct operands only.

## Live tests
