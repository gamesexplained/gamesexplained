# Jupiter Lander — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## Getting in

The emulator died on the second tool call of the session, on
`vice_machine_config_get`. Restarting it from `kit/INSTALL.md` worked and
the MCP session reconnected without restarting the agent session, which the
tool skill said would not happen. `vice_machine_config_get` was avoided
afterwards; `vice_machine_config_set` was used instead and answered fine,
reporting PAL and a 6581 SID.

The disk turned out to be a crack with a trainer. The first trainer answer
went in through the key matrix, the second did not, and it took a few
attempts to work out that `vice_keyboard_type` (the KERNAL buffer) gets past
it. Starting the game from the instruction screen needed F1 held for about
three seconds; short taps do nothing, which later made sense when the
interrupt handler turned out to be the only thing that watches for it.

## The offset that was right after all

The platform reference says a VICE snapshot holds the RAM image at file
offset 209 and says to confirm it. The first confirmation failed: the bytes
at offset 209 were not `$00`/`$01` and the screen did not match. Both
checks were bad. `$0000` and `$0001` are the processor port, which VICE
stores separately in the `C64MEM` module header, so the RAM underneath them
holds unrelated values; and the live screen had moved on because the ship
had crashed since the snapshot. Comparing six other ranges against live
memory showed offset 209 to be exactly right. The moral is the one the
reference already gives, with an addition: pick confirmation bytes that are
not `$0000`/`$0001` and not screen memory.

A second wrong turn from the same reading: a search for the HUD string in
the snapshot file found it at an offset that implied a RAM base of 58981.
That hit was the game's own copy of the template at `$ED2C`, not the screen.

## Sprites that were not there

The first steady-state snapshot was taken during an explosion without my
noticing. `$D015` read `$02`, the sprite pointer resolved to a ring of
scattered dots, and the reasonable-looking conclusion was that the lander is
drawn with characters. Rendering all sixteen sprite slots put it right in
one picture: `$F0` is the lander and `$F1` to `$F7` are the explosion it
turns into.

The thruster flames took much longer than they should have. The code is
unambiguous (`place_sprites` builds 1, 3, 5 or 7 in X and doubles it into
`$D015`), but four separate live attempts to catch `$D015` at `$06` failed,
and each failure looked like evidence that the flames do not exist. Three
things were going on at once:

- `vice_execution_pause` reports success but does not halt the CPU. Only a
  checkpoint with `stop` set actually stops it.
- After a checkpoint stops the machine, `vice_registers_get` returns a PC
  from inside the delay loop rather than the checkpoint address. Several
  tests were abandoned on the strength of that number before it was
  recognised as wrong; the checkpoint hit counts showed the breaks were
  happening all along.
- Memory reads resume the machine, so any sequence of reads taken while a
  key is held samples a game that has run on several passes.

What settled it was patching `$E445` so the game enables all three sprites
every pass, letting it run one frame and taking a screenshot. The flames are
there, red under the hull and orange at the side.

## Things that came out clean

The terrain format fell out of `draw_terrain` in one reading, and decoding
all four streams offline confirmed itself: each is exactly 23 rows and each
one ends on the byte before the next one starts. Rendering them matched the
screenshots cell for cell.

The alphabet needed no substitution table. The character set is laid out as
ASCII, so a screen dump read as ASCII was already legible, and the only
surprises were the five punctuation marks at `$5B`–`$5F`. Rendering the
glyph table was still worth doing: it is what showed that `$3B` and `$3C`
stack into a ±0 label across two character rows, and that glyphs `$80` and
above are the sprite bitmaps seen as 8×8 cells.

## A bug that was not one

The fuel subtraction in `move_ship` has no clamp, and 111 taken from a tank
holding 32 should wrap the counter to nearly full. Testing it showed nothing
happening at all, which sent me back to the top of the routine: `move_ship`
clears both thrust flags when the fuel high byte is zero. The tank can never
go low enough to underflow, and the cost of that guard is that the last 255
units are unspendable. The interesting fact was the opposite of the one I
went looking for.

## Measurement that did not work

`vice_cycles_stopwatch` gave 19,656 cycles between two interrupts where the
CIA latch of `$411B` demands 16,668. 19,656 is exactly one PAL frame, so the
stopwatch appears to report frame-quantised figures. Timing was taken from
checkpoint hit counts and from counting the delay loop's instructions
instead, and the two agree.

The joystick could not be tested at all. `vice_joystick_set` and
`vice_joystick_tap` return success and change nothing at `$DC00` or
`$DC01`, on either port, with or without fire. The joystick half of
`read_controls` is therefore traced but not observed, and says so in
`features.md`.

## Order of work

Boot, trainer, snapshot, then the whole engine read end to end in seven
chunks before a single label was written. That worked well: `$E000`–`$F450`
is only five kilobytes, and having read all of it first meant the naming
pass produced names that did not need changing afterwards. Coverage went
0 → 22% on the data typing, → 71% on the routine descriptions, → 100% on
the character set and sprites. The verification pass afterwards corrected
two descriptions: the interrupt's colour cycling is the PUSH F1 TO START
prompt, not the fuel bar, and `move_ship` cuts the engines on an empty tank.

## The climbing landing, a day later

The steward read the scoring section and asked whether a ship can actually
arrive at a pad climbing, or whether the 960 was only a property of the
arithmetic. The honest answer was the second: the figure came from poking
the velocity at a breakpoint. Reading `main_loop` again settled the general
case in a paragraph. The pad test runs before the move, so the velocity
`touchdown` sees is the one that brought the ship onto the line, and from
above that is positive. It also settled something the section had not
noticed: the perfect stop it kept quoting is impossible for the same reason.

The exception was geometry, not code. The x2 plateau has air beside it at
its own height, which the x5 and x10 valleys do not. A ship on the pad's
exact line just left of the pad could drift on with any velocity. Poking
that state at a breakpoint produced `840 X 2= 1680` at once. A poke proves
the routine accepts the state; it does not prove a pilot can reach it, so
the next step was an input-only route. An exact model of `move_ship` and a
breadth-first search over the four stick states found a 26-pass sequence
from a hover eight units left of the pad.

Replaying it was the hard part. Stepping the loop with a stopping
checkpoint and `vice_execution_run` did not resume the machine; alternating
two checkpoints ran two passes per step. A joystick FIRE bit written while
the game had quietly ended started a new game and parked the CPU in the
opening tune, which read as "nothing happens". What worked was to stop
stepping altogether: a small routine at `$C000`, called in place of
`read_controls`, took each pass's input from a table and logged the ship's
state, and the game ran at its own pace. Every pass matched the model, and
the screen printed 2400 on landing 1 and, with the gravity-5 route, 2540 on
landing 2, the arithmetic's ceiling for the pad. The section was rewritten
around it with a pass-by-pass stepper.

### The input-movie routine

Installed at `$C000`, with `$E2C8` patched from `jsr read_controls` to
`jsr $C000` for the duration of the movie and restored afterwards. Inputs at
`$C100`, one byte per pass: bit 0 stick left, bit 1 stick right, bit 2 fire.
Pass counter at `$C0F0`. Log at `$C200`, sixteen bytes per pass: `$08`–`$11`
(position and velocity), `on_pad`, the input, `view`, fuel.

```
C000  AE F0 C0   ldx $C0F0        ; pass counter
C003  BD 00 C1   lda $C100,x      ; this pass's input
C006  8D F1 C0   sta $C0F1
C009  48         pha
C00A  29 03      and #$03
C00C  85 17      sta thrust_side
C00E  68         pla
C00F  4A 4A      lsr / lsr
C011  29 01      and #$01
C013  85 16      sta thrust_up
C015  A9 00      lda #$00         ; log pointer = $C200 + 16*x
C017  8D F3 C0   sta $C0F3
C01A  8A         txa
C01B  0A 2E F3 C0  asl / rol $C0F3   (four times, to C02A)
C02B  85 FB      sta $FB
C02D  AD F3 C0   lda $C0F3
C030  18 69 C2   clc / adc #$C2
C033  85 FC      sta $FC
C035  A0 00      ldy #$00
C037  B9 08 00   lda $0008,y      ; copy $08..$11
C03A  91 FB      sta ($FB),y
C03C  C8         iny
C03D  C0 0A      cpy #$0A
C03F  D0 F6      bne $C037
C041  A5 1E      lda on_pad       ; then on_pad, input, view, fuel lo, fuel hi
C043  91 FB      sta ($FB),y
C045  C8 AD F1 C0 91 FB C8 A5 1C 91 FB C8 A5 12 91 FB C8 A5 13 91 FB
C05A  EE F0 C0   inc $C0F0
C05D  60         rts
```
