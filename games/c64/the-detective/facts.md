# The Detective — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`
(`work/entry.vsf`, the hand-over at `$2000`).

## Build

A cracked tape release (`orientation.md`, "The image"). No build
identifier was found in the game. The title screen says
`© A.P.S. SOFTWARE 1986` (the string at `$22EB` reads `SOFTWARE 1986`),
and the credit line at `$7A00` reads `THE DETECTIVE GAME - WRITTEN BY
SAM....CHARACTERS BY PAUL JAY....PLOT CUNNINGLY DEVISED BY THE
MAGNIFICENT SEVEN....   PRESS FIRE TO START INVESTIGATION`.

## Memory layout

| Thing | Where |
|---|---|
| Entry jump table: `JMP $2048`, `JMP $2747`, `JMP $289E`, `JMP $32CE` | `$2000` |
| Start-up: clears zero page and the stack page, `$01` = `$35`, video bank 1 | `$2048` |
| Raster interrupt, three stages | `$2967`; routines `$29B1`, `$2A8B`, `$2ACC`; table `$2999`; lines `$299F` |
| NMI (RESTORE) | `$294A` |
| Screen | `$7C00` |
| Credit line | `$7A00` |
| Item names (`A HOT WATER BOTTLE` ... `BULLETS`) | `$8151`-`$83CB` |
| Furniture and bodies (`FOUR POSTER BED` ... `STABBED DOCTOR!`) | `$8407`-`$8564` |
| The cast and their descriptions | `$8E65`-`$9126` |
| Descriptions shown by Examine | `$9A1F`-`$A160` |
| Time and pause text | `$A1E4`-`$A232` |
| Room names (`THE DRAWING ROOM` ... `YOUR ROOM`) | `$A362`-`$A3DB` |
| Characters' speech, stored with word tokens (see "Text") | `$A8E3`-`$BCAC` |
| Accusation and ending text | `$BB25`-`$BD91` |
| The library's book prompt | `$BDF4`-`$BE7C` |
| Leftovers of another program, overwritten in play (see below) | `$0805`-`$1A46` |
| The crackers' unpacker and screen, left at the hand-over | `$0400`-`$07FF` |

The character sets are in "Graphics".

**Leftovers.** At the hand-over, `$0805`-`$1A46` holds text from a
program that is not this game: `"TOWN RESCUE"`, `RONALD MAYER`,
`KASSETTE OHNE HIGHSCORE`, `SAVE SCORES`, `HERO LIST`, `GREATEST SCORES`.
It is memory the crackers' unpacker did not clear. In play
`$0C00`-`$1BFF` holds other bytes (`orientation.md`), so the game uses
that space as a buffer. Which bytes of `$0800`-`$0BFF` the game reads is
open.

## Text

The game's own strings are PETSCII capitals, found by the differences
between consecutive letters at offset 0 (`NOTHING` at `$8130`, `HALL`
at `$A3A5`, `SCOTLAND` at `$8E77`, `MCFUNGUS` at `$8F27`, `BUTLER` at
`$8F06`). There is no private alphabet for these.

`/` is the game's apostrophe (`YOU CAN/T CARRY ANY MORE!`, `$3143`).

The characters' speech (`$A8E3` onward) is stored differently: lower-case
PETSCII with single capital letters and other bytes standing in for
words, names and line breaks. In two strings (`$2639`, `$ACC4`) a `K`
(`$4B`) stands where the sense needs `YOU` ("K are shot by an unseen
assasin", "K hear"), and `P` (`$50`) stands where a line ends. Neither
is traced to the code that prints them; the token table is open.

The names in the strings differ from the interview's: the vicar is
`REVERAND WRINKLEBUM` (`$8EA4`). A search by letter differences for
`WRINKLEBOTTOM` found nothing anywhere in memory, and the speech's
tokens could hide a name, so this says only that the plain-text strings
do not hold it.

## The cast

From the biographies at `$8E65`-`$9126`, as stored:

| Name | Description |
|---|---|
| Inspector Snide | Scotland Yard detective played by yourself |
| Reverand Wrinklebum | Local vicar whose wife disappeared in mysterious circumstances |
| Bentley the Butler | Lifelong servant to the McFungus family; exhibits slightly hostile behavior |
| Hilda Crumble | Family cook, notorious for her macaroni cheese |
| Gabriel Gasbag | The maid; obedient and agreeable, but not very bright |
| Cynthia Sludgebucket | Arrogant and self centred daughter of the Major |
| Professor Bull | Old friend of the late Mr. McFungus; scatterbrained and completely mad |
| Doctor Mortem | not read yet (`$9089`) |
| Major Sludgebucket | Retired major; disturbed but harmless |
| Mr Dingle | Family solicitor, here to read the will |

## Hardware register census

From `kit/cpu/census.py` on `work/entry.vsf`, with the disassembler's
blocks as they stood after the first traces: 127 instructions name 43
registers. Rows marked *suspect* come from a block that is probably data
read as code; they are work items, not facts.

| Register | Use | First instruction |
|---|---|---|
| `$00`, `$01` | `$01` = `$35` at start-up; `$00` written once | `$2082`, `$207E` |
| `$D000`-`$D003` | sprites 0 and 1 position, indexed | `$2512` |
| `$D008`, `$D009` | sprite 4 position | `$24C6` |
| `$D010` | sprite X bit 8 | `$218C` |
| `$D011` | screen on and off, text mode | `$2079` |
| `$D012` | raster line for the next interrupt stage; compared once | `$292C`, `$2C4C` |
| `$D015`-`$D01D` | sprite enable, expand, priority, multicolour | `$2180` |
| `$D018` | screen and character set, per raster stage | `$21AA` |
| `$D019`, `$D01A` | raster interrupt | `$290B` |
| `$D020`-`$D023` | border and background colours, per raster stage | `$2084` |
| `$D025`-`$D02B` | sprite colours | `$2A04` |
| `$D400`-`$D403` | voice 1 frequency and pulse, indexed | `$21B2`, `$94A4`, `$97A6` |
| `$D40B`-`$D40D` | voice 2 control and envelope | `$3C72`, `$BFDB` |
| `$D417`, `$D418` | filter resonance, filter mode and volume | `$C003`, `$21C2` |
| `$D405` | *suspect*: a `dcp $D7E5,y` at `$524B` | |
| `$DC00` | joystick port 2 | `$2200` |
| `$DC0D`, `$DD0D` | interrupt control of both CIAs | `$28FD` |
| `$DD00`, `$DD02` | video bank | `$2092` |
| `$000B` | *suspect*: a `jmp` at `$000B` | |

Named by no instruction: `$DC01` (the keyboard's rows), the CIA timers,
the light pen, and the sprite collision registers (`$D01E`, `$D01F`; an
indexed access from `$D003` could reach them). The game asks for a safe
combination and a book's name to be typed (`$8A66`, `$BDF4`), yet no
instruction names the keyboard's registers: how it reads keys is open.

## Timing

## Controls

*live*: joystick in port 2. Fire on the title screen starts the game;
fire in play opens the investigation menu; the stick walks Snide in four
directions (`features.md`).

## Graphics

From one recorded frame of play (`work/frame-hall.json`), *live*: video
bank 1, screen `$7C00`. The room (lines 11 to 169) is multicolour text
with the character set at `$4000` and sprites on; the text panel
(from line 170) uses the character set at `$4800` with sprites off.
At the hand-over `$4000`-`$47FF` holds the title's character set; in play
the same bytes are at `$EA00`-`$F1FF`.

## Mechanics

## Data tables

## Sound

## The listing's error rate

## Live tests
