# Icicle Works: facts

## Scope

The supplied game is the 64 KB Plus/4 version credited on its title screen
to Doug Turner, copyright Commodore 1985. Its packed PRG is identified in
`orientation.md`. The listing holds 26,129 authored bytes: 6,929 code bytes
and 19,200 data bytes, all described. The source image is `work/entry.p4emu`,
with `work/play-stable.p4emu` as the loaded-data comparison. Runtime buffers,
the repacker's retained copy and the copied KERNAL are excluded as documented
in `game.json`. The one supplied media item is answered in `media.json`.

## Memory and execution

| Address | Meaning and evidence |
|---|---|
| `$6000` | Initialisation; pages ROMs out at `$6052` and installs hardware IRQ `$6722`. |
| `$60ED` | Title/new-game cycle. |
| `$6377` | Room loader; returns at `$6678`. |
| `$6722` | IRQ: camera, timing, animated glyphs, HUD and music. |
| `$6F53` | Simulation sweep; `$2200` is its first grid, `$2800` its second. |
| `$1000` | Generated room character plane, 76 characters across. |
| `$0800/$0C00` | Visible attributes/character screen. |
| `$5000-$57FF` | Generated 256-glyph charset. |
| `$7498-$7A3F` | 181 static source glyphs. |
| `$7A40-$807F` | Fifty 32-byte animation frames. |
| `$8080-$816F` | Fifteen rows of sixteen HUD character codes. |
| `$8170/$81E1/$8255` | Music tick, note reader and tune initialization. |
| `$8C8A-$8D0B` | Ten high-score records, 13 bytes apiece. |
| `$8F01-$9170` | Room part counts, door destinations, assembly orders and times. |
| `$9171-$A5D0` | 163 toy pieces, each four eight-byte multicolour glyphs. |
| `$A5D1-$A5F0` | Sixteen toy-picture pointers. |
| `$A800-$C81F` | Sixteen 514-byte room allocations. |

The hardware vector is `$FFFE/$FFFF`, not the unchanged KERNAL vector at
`$0314`. The ROMs remain disabled during play. Startup keeps the keyboard
scanner callable by copying ROM `$DB00-$E4FF` into underlying RAM and
patching three bytes at `$DB7D` from `$6334`. That machine-code copy is not
part of the published listing. The helper at `$0400` is a generated copy
of `$6D29-$6D41` and sets grid pointers relative to Santa.

## Alphabet and drawing

`$88E7` translates stored ASCII capitals by adding `$4F`; A-Z therefore
use glyphs `$90-$A9`. A space is replaced with `$B1` before addition and
wraps to glyph 0. `$AA-$B3` are small 0-9 glyphs, and `$B4` is the name
entry cursor. Large digits use two stacked glyphs, starting at `$7C + 2*n`.
`$730C` uses the tile kind's low nibble to choose four consecutive glyphs
from `$744F`, laid out top-left, top-right, bottom-left, bottom-right.
`$73B2` chooses enemy glyph groups by heading.

The full room is 38 by 27 tiles, or 76 by 54 character cells. `$68E1`
patches 25 source-address pairs in an unrolled copy loop and copies 24
characters per row to the screen. A source row advances 76 bytes. TED's
24-row window clips the screen at top and bottom. The camera moves in
character-cell steps and follows Santa, whose world coordinates are `$17/$18`.
The runtime character set differs from the hand-over's unused lower RAM;
a renderer must use the source assets or a captured live charset.

## Rooms and progression

`$7468` contains sixteen map pointers, separated by `$0202`. The loader
consumes 513 bytes from each: high nibble first, then low nibble, giving
1,026 cells. The final retained byte in each allocation is not a cell.
`$8F01` supplies the required part count. A tile-9 door receives its next
entry from that room's four-byte destination list at `$8F11`, in map order.
The destination goes in the door cell's high nibble.

`$A5F1` holds sixteen incomplete flags for each player. An incomplete
normal-play room gets its stored BCD time from `$9151` (high byte first).
A completed room or demonstration instead starts at 40. Completing a toy
converts remaining tile-6 parcels to tile-5 bonuses at `$66CD`; the caller
caps surplus time at 40 and clears the active room flag at `$42`. The persistent
per-player flag at `$A5F1,X` is written only on the door-exit path at `$61AA`. Leaving through a
door requires the completed flag and held fire at `$6C46-$6C65`.

The sixteen original room loads contain 42 doors joining 24 room pairs.
Eighteen pairs have doors both ways; six work in one direction: 6 to 7,
7 to 11, 7 to 3, 8 to 4, 8 to 14, and 9 to 8. The Maps overview groups
reciprocal doors into one connection with arrowheads at both ends. Its
room placement is a schematic arrangement. `test_network.js` compares
every door's destination and tile position with the original loader's
first runtime grid, then checks every displayed direction.

Toy collection order uses `room*16 + parts_collected` into `$8F51` for the
visible position and `$9051` for the graphic-piece index. `$7431` has fifteen
screen positions in a five-by-three diagram. `$6377` copies a 448-byte window
from the room's picture pointer; a room using fewer than fourteen pieces
also copies subsequent pictures, but the assembly tables select its own pieces.

## Simulation

| Low tile nibble | Kind / reader |
|---|---|
| 0, 1 | Empty space and snow; movement accepts them. |
| 2 | Polar bear, `$7141`; crushing produces ordinary explosion `$0B`. |
| 3 | Penguin, `$71C2`; crushing produces gift explosion `$0E`. |
| 4, 5, 6 | Snowball, bonus and toy parcel; falling/rolling at `$6F91/$70A3`. |
| 7, 8 | Brick and solid wall; explosions preserve exact tile 8. |
| 9 | Door, with destination in high nibble. |
| 10 | Santa, updated once per sweep through `$7253`. |
| 11, 14 | Ordinary/gift explosion; age in high nibble, resolved at age 3 by `$7284`. |
| 12 | Water, `$70F9`. |
| 13 | Magic grid, `$72B8`. |

`$6F53` reads the first grid while updating the second, then copies four
pages back. Falling objects carry bit 7. An object directly above Santa
enters his cell only when it already has that bit; a stationary object
does not begin falling into him. The two cases were run through the
original full simulation pass. Rolling tries left before right.

Water attempts a spread when `TED_hpos XOR timer1_low < $20`. It checks
left, right, down and up, replacing the first neighbour whose low nibble
is below 4. This includes snow and both enemy types; the leaflet's statement
that animals block water differs from this test. The original routine was
run on 4,096 gate/neighbour cases, including 128 successful replacements.
This is a routine-level boundary test, not an input route proving a
particular water/enemy encounter in a room.

A magic grid requires exact tile 4 above and exact empty tile 0 below.
It removes the snowball and creates `$86` (falling parcel), or `$85` in a
completed room, below. The source code was exercised on 2,048 combinations
of the above tile, below tile and completion flag, with both successful
conversion paths. Doors were checked on all sixteen destinations and both
completion/fire states (64 cases; sixteen accepted).

## Controls, scores and lives

`$6D42` returns signed X/Y intent and a separate fire byte. Keyboard:
P up, L down, A left, S right, SPACE fire/dig. Joystick port 2 uses the
same direction signs and fire value 8 rather than the keyboard's 1.
The title's C toggles the mode, M toggles music for play, and P selects
one or two players. `$6BCC` gives vertical movement first refusal, then
tries horizontal movement when the vertical attempt fails. Fire clears
an adjacent accepted cell without moving Santa. H pauses; RUN/STOP
sacrifices a life; ESC returns to the title. The selected controls and
these state changes were verified in plus4emu.

`$6EC8` adds 1 for a parcel and 2 for a bonus to the internal BCD score.
The display supplies a trailing zero, so those are 10 and 20 points.
`$6EEA` awards a spare life when the thousands digit changes. Each player
begins with two spare lives, in addition to the active life. The two-player
mode alternates after a death and keeps separate room, score and completion
state; the alternation is traced, not a complete two-player playthrough.

`$8D5E` accepts five uppercase letters/spaces for a qualifying high score,
with DELETE editing and RETURN confirmation. The original leaflet says
three letters. An assisted qualifying score accepted `ABCDE` on screen and
stored all five glyphs in the top record. Each record starts with two rank columns, a blank, five name glyphs,
a blank and four score glyphs. Ranks 1-9 begin with a blank; rank 10
uses both rank columns for its two digits. `$8C1D` appends the displayed score's final zero.

## Timing and sound

The PAL machine has 35,568 double-clock cycles per frame at 1,773,447 Hz,
from the platform reference. The IRQ runs once per frame. `$6AFB` reloads
50 when its divider is zero, otherwise decrements and returns; the next
subtraction is therefore 51 IRQ calls later. Four consecutive live gaps
were exactly 51 IRQ hits, with the handler as a positive control. NTSC's
60 reload is traced; an NTSC machine was not tested.

`$69D2` changes object frames once per four interrupts. The directories
at `$6A97-$6AFA` cover magic grid (8), Santa (3 groups of 4), water (4),
explosion (4), two bear orientations (4 each), two penguin orientations
(4 each), and bonus (6). The explosion frame is copied to both ordinary
and gift-explosion glyph groups. In title mode, `$688C-$68BF` instead
rotates the live brick glyphs 28-30 at `$50E0-$50F7`: glyph 28 moves
vertically on odd frame-counter values; glyphs 29 and 30 rotate their
rows two bits left and right on every title interrupt. Icicle glyphs
68-75 remain unchanged. The title-brick viewer matches 256 original
updates, including every phase and frame-counter wrap.

Music has two tune descriptors, selected by title_mode at `$8292/$829A`.
Each voice has little-endian ten-bit frequency words and a separate byte
duration stream terminated by zero. The game tune has 75/134 timed notes
and summed durations 1568/1392 IRQ calls for the two voices. The title tune
has 54/66 timed notes, with both duration sums 1104. `$8170` drives the two
voices and a shared volume envelope; `$81E1` reads the streams. Effects
borrow voice 2, save five sound registers at `$851B` and defer the music
updates while the effect or life-ended flag is set. Restoring a saved
register set requires the music/input latch at `$60` to be nonzero and
both flags clear. The volume envelope approaches level 2 on
a two-call cycle. Tune identities remain open.

## Verification evidence

- Emulator capability suite: 46 passed, zero failed, PAL Plus/4.
- Title animation: 32 live updates match the brick-rotation rule; the
  icicle bytes remain unchanged and an IRQ control counts 32 calls.
  The published viewer also matches 256 original-code updates.
- All sixteen room loads: both full 1,026-cell grids match independent
  nibble decoding, all 448-byte toy windows match their source pointers,
  and all initial BCD times match the parameter table.
- Countdown: four consecutive subtraction intervals, 51 IRQ hits apiece.
- Controls: all five keyboard and port-2 joystick intents; pause holds
  time for 100 frames, resume restarts it, sacrifice changes spare lives
  from 2 to 1, and ESC reaches the title.
- Name entry: `ABCDE` accepted and stored with an assisted qualifying score.
- Timeout: assisted 0001 countdown reached 0000 and the death effect; an
  assisted 990-point score plus one parcel reached 1,000 and awarded a life.
- Published widgets: all room loads and toy assembly prefixes, 24 animation
  states, 512 glyph modes, 4,096 water cases, 5,120 timer cases, and 260
  name-entry sequences match the original code.
- Both tune write streams match independent plus4emu captures in value and
  order: 1,304 game-tune writes and 759 title-tune writes. Within-frame
  instruction-cycle timing does not model TED bus delays.
- All four built pages passed desktop/mobile browser checks, with every
  widget exercised and no script errors or horizontal overflow.
- Rebuilt frame: 0 of 64,000 display pixels differ from plus4emu, with the
  program frozen during the screenshot capture (`orientation.md`).
- Original 6502 routines: 4,096 water cases, 2,048 magic-grid cases, 64
  door cases and the falling/stationary object distinction. Test scripts
  and captures remain in ignored `work/`.

## The listing's error rate

On 11 November 2026, seed 20261111 drew 80 of 242 comments: 60 from 160
written comments and 20 from 82 generated comments. The independent checker,
gpt-6-astra, found five wrong details, all in the written stratum; all five
findings held and were corrected. They concerned the persistent completion
flag, stationary objects above penguins, the blank glyph, which title
routine silences sound, and the music option's encoded trailing blank.
The observed plain rate was 5/80 (6.25%), with a 95% Wilson interval of
2.7-13.8%; weighting the two strata by population gives 5.5%. The sample
is above the kit's mark. It is a lower bound on errors the checker can find,
not an audit or a measurement after correction. That result prompted the full audit reported below. Coverage of 100% measures described bytes, not the absence
of errors in their descriptions.

On 11 November 2026, two fresh gpt-6-astra checkers audited all 242 comments
in disjoint ranges of 138 and 104. They found nine comments with wrong
details and no doubtful or unverifiable comments. The parent verified every
finding and corrected ten comments, including a repeated sound-restoration
claim. The findings concern title state and brick animation, the death
delay, the reset marker's stored value, the toy-copy window, encoded
separators, music restoration, rolling neighbours and masks, and the
tenth high-score record. All 62 original-code test groups and complete
upper-data checks passed. These counts describe what the audit found;
they are a lower bound on errors it could find, not a guarantee that the
corrected listing has no errors.

A fresh gpt-6-astra checker, which wrote and audited none of these comments,
checked a new seed-202611112 sample of 80 from the corrected population of
242: 60 from 160 written comments and 20 from 82 generated comments. All
80 were right, with zero wrong, doubtful, or unverifiable verdicts and no
further corrections. The observed plain and weighted error rates are 0%;
the plain 95% Wilson interval is 0-4.6%. All 25 independent original-code
test groups passed. The sample is within the kit's mark. Zero observed
errors does not establish that every remaining detail is right.
