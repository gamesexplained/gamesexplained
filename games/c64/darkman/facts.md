# Darkman — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.
Bronze: these are the sweep's results, not a verified set.

## Build

PAL original on two disk sides, no crack or trainer seen. Analysed: the
level 1 load in play (`work/play-level1.vsf`).

## Memory layout

| Thing | Where |
|---|---|
| Fast loader and level loader (resident) | $0400-$0707 |
| Level number for the next load | $0435 |
| Level entry, each level file's first byte | $0A20 |
| Level 1 program and data (`1a`) | $0A20-$93FF |
| Sound driver, copied there by level 1 and kept by later loads | around $B000-$B850; silence at $B0C8, play at $B176 |
| Level 1 graphics (`1b`), under the I/O and ROMs | $BF00-$FFEF |
| Title screen matrix and character set | $CC00, $E000 (video bank 3) |

## Timing

Four raster interrupts per frame in play, chained through $FFFE: $1E21,
$1EF4, $1D43, $1DBF (*live*, recorded frame). NMI at $2030 sets $2038.

## Controls

Joystick in port 2. The interrupt at $1D43 copies $DC00 to $203B each
frame (unless the countdown $29F3 runs). *Live*, from the play snapshot,
32 frames of each input: left and right walk 4 pixels per 4 frames; up
jumps, rising 26 lines; down crouches; fire with down strikes forward.
The keyboard is read by $0E30 once a frame into $0E2F, and the code $50
pauses ($1777, flag $1EF2).

## The play loop

The foreground loop at $179E redraws the panel and waits for the NMI
flag. The game itself runs in the raster interrupts: $1E21 moves
Darkman ($265E) and the enemies ($354A, $3725) and places their sprites
(Darkman on 0-2, the two enemies on 3-4 and 5-6 through $3639); $1EF4
plays the sound ($B176) and reads the keys; $1D43 reads the stick; and
$1DBF runs $41EF, $4636 and $2066. Each handler restores A, X and Y
through LDA, LDX and LDY whose operands it wrote on entry.

## Text

The game's own character set keeps the machine's screen-code order:
the screen-code sweep reads every message in plain text, so no
substitution table is needed. Strings: resident $060C "DISC ERROR",
$06B1 "INSERT DISK SIDE #1, THEN PRESS FIRE", $06DA "PRESS FIRE TO LOAD
NEXT LEVEL"; level 1 $0FE6 briefing, $122E high-score entry, $1675
credits, $1A02 "GAME OVER", $57C6 photo-session text.

## Hardware register census

From the code traced in `level1`'s session (both parts' code), as
absolute and indexed operands:

| Register | Use | Where |
|---|---|---|
| $D000-$D010 | sprite positions | $1B83-$1B95, $1E88, $31AC-$370F |
| $D011 | screen mode per raster band, blanking at loads | $040D, $0A6A, $1D54, $1DC8, $1E2F |
| $D012, $D019, $D01A | raster interrupt set-up and acknowledge | $0B1C-$0B21, $1E2C |
| $D015-$D01D | sprite enable, expand, priority, multicolour | $0A62, $0ACF-$0AE9, $1AF1 |
| $D016 | fine scroll and multicolour | $0A87, $1E37, $1DCE |
| $D018 | screen and character base per band | $0A99, $1D4C |
| $D020-$D02E | border, background and sprite colours | $0521, $199C, $1AE7, $1E4A, $3332-$3644 |
| $D400-$D418 | sound: voices, filter, volume | $1B17, $1B21, $B0D0-$B84C |
| $DC00, $DC01, $DC02 | joystick and keyboard | $068D, $0E32-$0E89 |
| $DC04, $DC05 | timer A read, likely a random source (unchecked) | $1FB5, $1FC1 |
| $DC0D, $DC0E | CIA 1 interrupts off and timer stop at set-up | $0B2E-$0B36 |
| $DD00, $DD02 | video bank and the fast loader's serial lines | $04CE-$058D, $0A77 |

Never touched in the traced code: $D013/$D014 (light pen), $D01E/$D01F
(collision registers), the SID's read registers. The trace covers
little of the program, so these are leads, not absences.

## Twin copies

The tables at $7D9B and $8A9E reappear at $A9EA and $B920, and those at
$9087 and $AFD3, inside the resident range. Which copy the code reads is
open.
