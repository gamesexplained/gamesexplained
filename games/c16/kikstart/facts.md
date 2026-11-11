# Kikstart — verified technical facts

The listing uses `work/entry.p4emu`, reached by `orientation.md`.
Unless marked live, facts below are traced in that unpacked resident image.

## Build

The supplied PRG is 6,359 bytes, loads at $1001, and calls $100D with
SYS 4109. Live execution reaches $2000. The loaded title credits Shaun
Southern, Mr. Chip Software, 1986, and A. Morris. Cassette instructions
identify Mastertronic. The packed release's provenance is unknown.

## Memory layout

| Thing | Where | Evidence |
|---|---|---|
| State; raster phase | $02; $03 | $25D0; $2118 |
| Four moving-object slots | $10-$23 | $223C; $2524 |
| Terrain pointer | $24-$25 | $2E28 |
| Bike vertical position/fraction/velocity | $27-$29 | $28F8 |
| Scroll speed | $2A | $2784; $2E44 |
| Course; remaining bikes | $2F; $30 | $2E14; $2894 |
| Drawing queues | $0400,$0430,$0460,$0490 | $23C8 |
| Attributes; character screen | $0800; $0C00 | $2000; $2204 |
| Terrain/bike character bank | $1000-$17FF | $2118; $246C |
| HUD/message bank | $1800-$1BFF | $2118; $2964 |
| Packed tune and pitch tables | $1948-$1A47 | $2AA0 |
| Fixed display/motion/course tables | $1C00-$1E7F | Their listing comments and consumers |
| Tile properties and five expansion rows | $1E80-$1FFF | $23EC; $239C |
| Engine, with alignment gaps | $2000-$2EFF | Static trace and executed-address map |
| Terrain stream and look-ahead tail | $2F00-$3FFF | $239C; $2E28 |

Live Plus/4 check: the unpacked bytes at $1000-$3FFF match the C16 and the game reaches riding state 2 with five bikes.

The loaded title occupies $0800-$0FFF at hand-over. Engine start clears
and replaces both planes. The listing keeps their loaded values.

## Timing

The raster handler cycles three phases, switching at target lines
$14,$83,$B3. It arms TED two lines early and waits for the target before
changing horizontal scroll and character base ($2118-$217F). The main
loop waits for phases 1 and 2 ($20CF,$20F3).

Live: a 300-frame interval counted 300 timer calls, 898 IRQ entries, and
299 loop-top hits. It began at an already-entered loop and ended at a
frame boundary; those endpoints explain why these are not 900/300 hits.

The timer's decimal borrow loop subtracts one unit, and $2363 subtracts
another from its lowest glyph. The normal even hundredths sequence
therefore falls by two per pass. Live, a stationary controlled test with
countdown enabled and pending time zero ran 100 timer calls in 100 frames;
the display fell from 18'54 to 16'54. A displayed second is fifty PAL
frames, about 1.003 s using the platform reference's 35,568-cycle frame
and 1,773,447 Hz clock.

Pending seconds ($3C) transfer into the display on alternating ticks
($2372-$2394). Countdown is disabled before the start marker.

## Controls

`read_controls` ($2704) uses matrix/joystick selects $FA and $FD. $33's
low direction bits are active high; bit 7 is active-low fire.

| Input | Live result over four matched riding passes |
|---|---|
| None | Speed $80 stays $80; state 2 |
| 3 | Speed $80 to $74; brakes |
| 4 | Speed $80 to $8C; accelerates |
| T | State 7; jumps |
| Joystick 1 left/right/fire | Match 3/4/T |
| Joystick 2 fire | Does not jump in this test |

The English cassette panel prints the opposite 3/4 directions. Joystick 2
also affects some merged direction bits; joystick 1 supplies the complete
tested left/right/fire set.

Ground controls add/subtract three with guards $F9/$63 ($2784). Air
controls use two and $FA/$62 ($2E44). Normal jump starts signed velocity
$CC (-52); a spring starts $A0 (-96).

## Graphics

Gameplay uses 38-column multicolour text. Software composes moving things
from character cells. $23C8 queues row, column, glyph, and attribute;
$21D8 erases old cells and $2204 commits their replacements. The screen
stores forty columns; the narrower window hides its scrolling edges.

The bike is a three-by-three grid. Fine scroll and the low two bits of
its height select pre-shifted variants through $1CC8/$1CCC ($246C).
This is position alignment, rather than a wheel animation. Types 0-7 use
balloon/cross shapes two columns wide and three rows high. The row deltas
are at $1CA0; $22F0 advances the column after the third cell.
Types 8-15 use four-cell clouds, with
attributes changing through $1CA8's 32-entry phase table. Type bit $10
adds a bolt from glyphs $34-$36 ($22C0).

The double-height HUD uses $0B-$14 for upper digits 0-9 and $1F-$28 for
their lower halves. Single-row messages use $52-$5B for digits 0-9,
$61-$79 for A-Y, $00 and $7A blank, $5C full stop, and $5E exclamation.
The title uses standard
screen codes. Rendered glyphs, the course-number tables $1DC0/$1DD0,
and bonus digits establish these separate alphabets.

## Mechanics

$25D0 maps states 0 attract, 1 entry particles, 2 riding, 3 finishing,
4 bonus, 5 crash, 6 game over, 7 airborne, and 8 recovery.

Airborne motion ($28F8) adds gravity two, caps positive velocity at $60,
and integrates the fixed-point coordinate four times. Its helper clears
carry before gravity. The height's low two bits choose quarter-cell
alignment; higher bits choose a character row. Terrain samples at
offsets 16 and 18 supply two surface thresholds ($23EC). Riding crashes when the bike coordinate is numerically greater than either threshold. Coordinates above both can enter airborne; this is not a test of membership between the two heights.

Live intervention at the riding handler with the bike on a surface and
both $40 surface flags set entered state 7 at velocity $A0. This tests
the spring mechanism; it is not a recorded player route.

`object_contact` ($2D48) makes type 0 queue five seconds. Types 1-4 award
(type+1) × course multiplier × ten points. Types 5 and above crash the
bike. Live controlled calls on course 1 with types 0,1,4,5 produced five
pending seconds, 20 points, 50 points, and state 5. Cloud contact also
requires an active bolt and a bike height between its type-derived top
and $3F ($2D18). Recovery waits for a nonzero high two-bit field in the
terrain stream, then restarts entry particles ($2948).

Start grants five bikes ($2640). Crash deducts one after its particles
clear ($2894). Live forced crashes took five to four; with one bike the
game reached state 6 and zero bikes. Bonus setup grants one bike below
five on the first sixteen course indices ($2A4A), after calculating the
remaining-bike bonus. The paired tables $1D38/$1D40 give 10,25,40,75,99
units for 1-5 bikes. Live setup with three bikes displayed 040 and then
held four bikes; five displayed 099 and remained five.
Below five bikes on course indices 16 or higher, $2A4A grants no bike
and leaves the extra-bike message row unchanged. This is a conditional
routine test, not a completed player route beyond course sixteen.

## Data tables

Sixteen split pointers ($1E50/$1E60) select starts in a shared stream.
A column's low six bits index five 64-byte glyph tables at
$1EC0,$1F00,$1F40,$1F80,$1FC0, building five screen rows. Tile properties
at $1E80 supply surface heights and flags.

Full byte $FE enables countdown and $FD requests finishing; both are
sampled at offset sixteen ($2318). The base pointer wraps at $3FD8
($2E28), while the screen reads forty columns. Its look-ahead can reach
$3FD8-$3FFE before the base wraps: $3FD7 plus the last window offset, 39.
The loaded allocation continues through $3FFF. This tail differs from
power-on RAM and contains $FD,$FF at $3FE8 and $FE,$FF at $3FF8.
The stream boundary and look-ahead window are distinct extents.

Initial seconds at $1E70 are
20,30,30,30,32,30,30,32,16,36,30,36,44,44,28,48.
Multipliers at $1E10 are 1,1,2,2,2,3,3,3,4,4,4,4,5,5,5,5.
Drift ($1DE0), random thresholds ($1DF0), candidate-type masks and
spacing ($1DA0,$1DB0,$1E20) also vary by course. The threshold alone
is not a complete spawning probability: a free slot and spacing test
must also pass ($2C5A).

Live input-only selection wrapped from course 1 to 16 and started index
15 with five bikes. Completing a full sixteen-course route remains a
follow-up; a start-state test does not establish that ending.

## Sound

$2AA0 reads 192 packed note bytes at $1948. Each nibble indexes one
voice's sixteen-entry pitch tables ($1A08,$1A18,$1A28,$1A38). A divider
advances every six calls: 1,152 calls, about 23.1 seconds per loop at the
measured PAL rate. Control $38 enables two squares at volume eight.

Gameplay audio ($2AEC) combines a speed-derived engine voice with a
shared effect ramp. Pitch, signed delta, remaining calls, and flags are
$50,$51,$54,$55. Jump and spring use different ramps; crash and lightning
select noise. Effects share these cells, so a new effect can replace one.
At nonzero speed, $2B33-$2B3C alternates volume 4/8 with tick parity.
At zero speed, $2B4A-$2B50 additionally sets bit 3, producing volume
nibbles $0C/$08; TED sounds both as volume 8 (c16-reference, Sound).
The time-award helper at $2BA0 leaves an active effect unchanged. Its
caller $2E90 still checks the time limit when that sound request is skipped.
A live log captured one tune period plus a call; the page's test checks
the chosen loop against the driver.

## The listing's error rate

Seed 20261111 drew 116 of 294 comments: 60 of 137 written comments, 20 of 63 title allocations, 20 of 78 gaps, and all 16 course slices. The independent checker ran on harness-selected gpt-6-astra with xhigh effort. The lead confirmed two wrong details: the final gap's neighbours and the riding surface predicate. Both sampled comments were corrected, along with the airborne comment carrying the same interval misreading. The plain observed rate was 2/116 (1.7%), with a 95% Wilson interval of 0.5%-6.1%; weighting by stratum size gives 2.1%. This was the pre-audit sample. Frozen texts, verdicts, and simulator evidence remain in `work/reports/`.

At the contributor's request, a fresh gpt-6-astra checker with xhigh effort audited all 294 of 294 comments and the claims in this file. The lead upheld and corrected 13 comments: object-drawing axes, glyph and punctuation descriptions, strict spawn spacing, the NOP count, the zero-speed volume override, the falling surface sample, and the scope of the game-over tone and collision scan. The last two narrowed overbroad descriptions of conditional behavior. The alphabet and greatest terrain look-ahead address were also corrected here and in orientation.md where applicable. All 25 independent simulator groups passed when reproduced, alongside the snapshot/data checks and existing page tests. Historical live observations were checked against saved artifacts; this audit did not rerun those emulator observations. Findings are a lower bound on errors the checker can detect.

After the audit, seed 2026111102 drew a fresh 116 of 294 comments: 60 of 138 written comments, 20 of 63 title allocations, 20 of 77 gaps, and all 16 course slices. A separate fresh gpt-6-astra checker with xhigh effort, which wrote and audited none of the comments, found two wrong details. The bonus-panel comment omitted the later-course branch that leaves its message row unchanged, and the time-limit helper comment omitted the active-effect guard on its sound request. Both were upheld and corrected; the related extra-bike helper description was made explicit as well. The measured rate is 2/116 (1.7%), with a 95% Wilson interval of 0.5%-6.1% and a stratum-weighted rate of 1.6%. This is within the kit's one-in-thirty mark, not a guarantee that no errors remain. All 26 independent simulator groups passed when reproduced, including concrete caller-state tests for both findings. The full audit and this sample are recorded separately in game.json; frozen texts, verdicts and evidence stay in work/reports/.

## Live tests

- Both emulator models passed 46 checks; the footprint check was clean.
- Matched riding states tested 3,4,T and both joystick ports.
- A controlled 100-frame run counted 100 timer calls and two displayed seconds.
- A 300-frame counting test carried the IRQ as a positive control.
- Holding 3+4 latched the selector; 3 then T started course 16.
- Controlled bonus setup checked three/five-bike amounts and the bike cap.
- Controlled object contacts checked time, score, and crash dispatch.
- A forced spring contact entered airborne at velocity -96.
- Forced crashes checked bike loss and game over.
- Power-on/entry comparison established that the terrain tail was loaded.
- TED writes recorded the attract music for its player.
- The reconstructed held display matches all 64,000 emulator display pixels.
- The page test covers all speed bytes, all terrain bytes, shape variants, bonus tables, and every music write value.

Browser checks exercised all four authored pages at desktop and 390-pixel mobile widths, including all course choices, shape types, animation, speed/bonus controls, and music/effect buttons. There were no JavaScript errors or horizontal page overflow.
