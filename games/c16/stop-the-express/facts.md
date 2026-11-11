# Stop the Express — verified technical facts

Addresses refer to `work/entry.p4emu`, captured before $1E00 as
`orientation.md` describes. This is Csabo's 2021 Plus/4 conversion.
**Live** identifies a fact checked in plus4emu; other facts are traced
in the listing.

## Build and coverage

The PRG's BASIC line calls SYS4109. **Live:** the unpacker's first
output store is $BD5D. Its completion state has destination page $14
and index $FF, after writing $1500. The contiguous gameplay payload is
$1500-$BD5D: 43,102 bytes. The title exits to $1E00 with ROMs paged out.

The denominator is 42,263 bytes: 13,590 code and 28,673 data. The 839
excluded bytes inside the payload are 520 generated train-template
cells, 47 alignment/workspace bytes after the cast panel, 256 bytes of
runtime enemy workspace, and sixteen bytes of runtime metadata queue.
The complete extent and these exclusions are explicit in `game.json`.
The picture, unpacker and calibration/setup outside the payload have
the loader paragraph in `orientation.md`.

## Memory layout

| Range | Purpose and evidence |
|---|---|
| $0002-$0080 | Game state/scratch; $1E84 clears $19-$80 |
| $0090-$00F9 | Music pointers, durations, instruments, notes and volumes; $9F48-$A20B |
| $0800-$0FFF | Generated 256-glyph character set; $201E |
| $1000-$13FF | Working character screen; $20DE/$20F5 |
| $1400-$14FF | Generated per-glyph colour lookup; $201E |
| $1500-$16B7 | HUD/blank-sky seed copied by $488A |
| $16B8-$18BF | Generated thirteen-row train template; $452F |
| $18C0-$18E7 | Forty ground cells initially cycling $79-$7E |
| $18E9-$1CD0 | Fixed 25 by 40 cast panel; $23CF |
| $1D00-$1DFF | Runtime enemy records and summary; $51F5/$5279 |
| $1E00-$544E | Game/rendering code with embedded strings and tables |
| $544F-$6D4E | Four roof, four interior and four final-engine layouts |
| $6D4F-$6DD6 | Pole delays and five short pitch-effect streams |
| $6DD7-$9D31 | Four complete glyph sets and five partial replacements |
| $9D32-$B02D | Music driver, tables, orders and phrases |
| $B02E-$BD5D | Initial attract recording; ordinary play records over it |
| $D800-$DBFF | TED colour output; $1E49/$20F5 |
| $DC00-$DFFF | TED character output; $20F5 |
| $FFFE-$FFFF | Active RAM IRQ vector, $1F0A or $1F27 |

**Live:** the machine is a PAL Plus/4, 64 KB, with `chips.rom=false`
at entry and in play. $0314 still holds the system vector $CE0E but
does not select the handler while the RAM vector is active.

## Timing

The PAL clock is 1,773,447 double-clock ticks/second and 35,568/frame,
from the platform reference and the emulator instrument check. The
music IRQ alternates raster comparisons 3 and 203 ($1F12), and its
self-modifying call alternates $9D38 and $9D35 ($1F0F).

**Live:** 3,072 frames counted 6,144 entries to the IRQ and music output
at $A070, and 3,072 to the sequencer at $9FF1. Each of the eight order
lists parses to 3,072 sequencer ticks, including a second traversal
with carried settings. The native TED capture has 30,272 writes over
61.611591 seconds.

$50CB advances call-count phases of periods 2,3,4,6,8,12. Time decreases
on phase 12 at $498A. These are loop counts, not seconds or a guarantee
of one call per frame. Ready, death and transition loops use them too.

## Controls

The version's own scroller is $4F29-$509B. $214D/$21B8/$2204 read the
keyboard/joystick and map bits through $2242. The keyboard matrix is
from the platform reference.

| Input | Effect |
|---|---|
| J / L | Commands $34 / $36: left/right |
| I / O / P | $37 / $38 / $39: jump left/up/right |
| M / comma / full stop | $31 / $32 / $33: duck left/still/right; printed as M, <, > |
| Space or joystick 1 fire | $20: start/release a bird |
| Joystick 1 directions | Matching movement digits, including diagonal jumps |
| C during attract | Select practice and issue start ($2155-$2169) |
| M | Fade/stop music through $1ED0; also a duck key during play |
| RUN/STOP | $1B: pause through $5104, read with the Space row |
| Escape during practice | Clear practice, banner enable and score; restart the attract/start path ($218B-$2198) |

**Live:** eight cases shared the same neutral snapshot at $26B6 and a
no-input control for sixteen passes. Still is (19,8); I/O/P follow roof
jump rows 7,7,6,...,7,8; M selects duck row 9. Roof movement calls the
scroll routines, so its continuing effect is in $74/$75 rather than
player column. The private work record keeps position/scroll traces.

## Graphics and alphabets

The font was rendered and read: $20 is space, $30-$39 digits and
$41-$5A uppercase letters, with printable punctuation in ASCII/PETSCII
positions. Higher codes are train parts and figures. Interior patches
change what some of those same character codes draw.

$201E reads a three-byte header: a little-endian offset from $0800,
then a count, zero meaning 256. Each nine-byte record has eight bitmap
rows and a colour byte. Colour bit 7 skips both stores; otherwise the
glyph and its colour at $1400+index are written.

| Stream | Address | Records | Written |
|---|---|---:|---:|
| Train 0 | $6DD7 | 256 | 256 |
| Train 1 | $76DA | 256 | 256 |
| Train 2 | $7FDD | 256 | 256 |
| Train 3 | $88E0 | 256 | 256 |
| Shared interior | $91E3 | 128 | 70 |
| Front 0 | $9666 | 48 | 48 |
| Front 1 | $9819 | 48 | 48 |
| Front 2 | $99CC | 48 | 48 |
| Front 3 | $9B7F | 48 | 48 |

**Live:** native selection/loading ran for all four designs, with glyph
RAM and all 256 colour bytes hashed after roof, interior and front:
twelve oracle cases for the page decoder.

The twelve layouts are 40 cells wide: thirteen rows for roof/interior,
fourteen for the final engine. $452F copies 520 cells to the template;
$2AA8 copies/clips 560 engine cells into working rows 10-23.

$50A0 draws two-byte shape records: nonzero glyph/control, then unsigned
screen-address skip. High-bit glyphs draw with the current offset;
positive low-bit codes skip drawing but still advance by their following
skip. A zero ends the stream. $509C loads the offset from player facing.
Enemy poses at $3D9F are eight fixed two-column, three-row arrays,
with a separate falling stream at $3DCF.

## Mechanics

$51C6 starts round 1 with three lives. Stage byte $49 selects roof or
interior. $268B selects min((round+4)&255,10) carriages. At rounds 252-255 the byte
addition wraps, giving 0-3 carriages; no played route is established. $5339 gives time
limits 100,120,140,160,180,200,190,180,170,160,150, clamped to the final
entry. $2573 maps (round-1)&7 to designs 0,0,1,1,2,2,3,3.

Roof movement rotates thirteen template rows and shifts actor positions
($4396/$442B). Progress changes on a forty-column wrap. The engine room
permits free player-column movement. Entry clears player actions, while
enemy state and knife flags remain. The decreasing retained sound word
is not the approach duration. Its brake test ($4D36) accepts
columns 18-20 and rows below 15. Completion requires the brake flag and
column 2, and $2AA0 increments the round byte.

$4999/$4BAB set death reasons: timeout $FF; gap/fall 1; roof pole 2;
enemy 3; knife 4; bird/ceiling object 5; bouncing engine object 6.
Practice redirects ordinary damage to a flashing life indicator and
freezes time. The internal score still exists, while its normal display
and high-score update are omitted ($4DB1).

Enemy defeats return immediately from the collision scan; later knives
and enemies are tested only on continuing paths. Attract mode suppresses
awards. Roof gaps read working-screen cells $11CB/$11CC.

Score units are ten displayed points: $4DB1 appends a zero to five
digits. A jump attack pays 30 units/300 points; a bird attack pays 10
units/100 points ($4A54). The raw roof-contact gate accepts states
$02-$FE except $04; ordinary walking/throwing states are 2/3. $3497 transfers actual remaining time to score
one unit at a time, paying ten displayed points per time unit.

Attract mode reads one command from $B02E per ordinary input poll
($36FD); active jump/fall paths precede that branch. Live non-practice
polls write commands into the same buffer ($3733). Its 3,376 authored
bytes are zero, Space and movement digits. Capacity extends to $CFFF;
bytes beyond the authored recording are runtime/loader workspace.

**Live, forced counter case:** round zero makes $51F5 initialize 256
enemies. $1E00 changes from `4c061e4caa1ead19` to
`00101e4caa00ad19`; the terminator lands at $2500. Each record initializes offsets 0, 1, and 5. The last record store is
$24FD; $24FE/$24FF are untouched. **Live:** interior setup at $5279
also initializes 256 records for rounds 0 and 255, with the same entry
corruption and $2500 end marker. The round increment is an uncapped byte. This probe does not establish a played route
through 255 rounds.

## Sound

The score has eight logical channels: two TED, three SID at $FD40-$FD58,
and three DigiMuz through $FD22/$FD23. $9F48 initializes the outputs and
$A070 dispatches all eight channels; individual stores are conditional.
SID rest paths skip frequency stores. The final TED mix/volume store is
skipped when both low pitch bytes are $FE, regardless of their high bytes. The page player presents
the native TED part. Physical DigiMuz output/calibration was not tested. The entry snapshot
holds alternating $00/$FF at the period-table addresses $FC00/$FC60.
A complete tune reads these tables. Neither music initialization nor
playback writes them; their preparation for real hardware remains unverified.
Instrument 1 reaches $A2CE, but none of the eight shipped orders selects it.
Its two six-byte percussion tables are indexed by unmasked note age, so
ages six and above read adjacent bytes.

$9FF1 recognizes $FF (next phrase), $FE plus two bytes (shared SID ADSR),
$F0-$FD (instrument), $E0-$E2 (TED envelope), and $60+N (duration N).
$53 is rest. Fourteen dispatch entries at $A20C select pitch, vibrato,
percussion and decay handlers. Settings carry between events. Initial
and loop order-pointer tables match.

Five short effects at $6D63/$6D79/$6DA5/$6DBD/$6DC9 use little-endian
TED pitch values and a high byte $FF to end. Other sounds are train
noise ($44D4/$4516), jump/bounce ($2267), the wire-death sweep
($228E), and the bonus chord ($3527). Several retained parameter paths
call the shared RTS at $23CE, which writes no sound register.

## The listing's error rate

The independent gpt-6-astra check sampled 80 of 439 comments with seed
20261111: 60 of 332 written comments and 20 of 107 generated comments.
Seven written comments had detail errors; all seven findings were upheld
and corrected in the live disassembler, including related ground-strip
claims. The plain error rate was 8.8%, Wilson 95% interval 4.3%-17.0%;
the population-weighted rate was 8.8%. This measures the frozen draft,
not the corrected listing. This sampled rate is a lower bound because
a checker can miss errors. Coverage measures the stated payload and
does not measure comment accuracy.

The round-parameter widget subsequently exposed and corrected one
carriage-count comment: the byte addition wraps at rounds 252-255.

The requested full audit used three fresh gpt-6-astra checkers, running
one at a time, across all 439 comments. It found 38 detail errors; all
were upheld and corrected, with four label changes and related prose
updates. Findings include screen-address interpretation, shape geometry,
caller and mode conditions, loop counts, sound ownership, and unsupported
pitch-table preparation claims. The original program bytes are unchanged.
A separate caution-sign viewer correction now uses the original caller’s
$80 glyph offset. The fresh post-audit sample follows below.

The independent post-audit gpt-6-astra sample used seed 2026111101:
80 of 439 comments, drawing 60 of 332 written and 20 of 107 generated
comments. All 80 were right; none were doubtful or unverifiable. The
observed error rate and population-weighted rate were 0%, with Wilson
95% interval 0%-4.6%. The checker had no part in annotation or the audit.
The listing therefore has a full audit followed by a sample within the
kit's mark. A zero observed rate does not prove every comment is right.

## Live tests

- Both PAL models passed 46/46 instrument checks; the game uses the
  Plus/4. The footprint check found no unexpected external writes.
- Measured unpacker bounds, entry, ROM-off state and RAM IRQ vectors.
- Compared eight controls against the same neutral no-input case.
- Captured twelve native glyph/colour oracle cases across four designs.
- Captured stage two/engine room through game setup routines, with
  explicit round/progress/practice pokes recorded privately.
- Counted native music calls and captured the complete TED loop while
  the main program was parked at $0200.
- Demonstrated code corruption from a forced round-zero initializer;
  this is separate from proving a route through 255 rounds.
- Full-audit native checks covered every layout and tile stream, all 69
  music phrases and eight complete orders, all demo positions in three
  input modes, and 143,360 instrument cases. Focused live setup probes
  confirmed both initializer overruns and the last modified record byte.
- The caution-sign pose is held to the original warning caller at $4709,
  including its $80 character-code offset.
