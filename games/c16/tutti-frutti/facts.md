# Tutti Frutti — verified facts

Addresses below refer to the unpacked PAL engine in `work/entry.p4emu`.
Both PAL models run the same bytes at $1000–$3FFF in the tested build.

## Screen and alphabet

| Area | Meaning |
|---|---|
| $0800–$0BFF | TED attribute plane, one byte per character position |
| $0C00–$0FFF | Character positions, including the five score digits at $0C4A and lives at $0DB6 |
| $3800–$3E7F | 208 RAM character patterns, eight rows each |
| $3E80–$3FFF | Draw tables, movement vectors, and the packed music |
| $0380, $03D0, $0420, $0470 | Parallel draw-list arrays of address low and high bytes, glyph codes, and attributes |
| $0600–$065F | Mutable 16×12 orchard, two four-bit cells per byte |

Coordinates in the movement tables use one unit per two display pixels.
An eight-unit orchard tile therefore spans sixteen display pixels.

The custom alphabet uses $00 for blank, $01–$1A for A–Z, $1B for a
solid cell, and $1C–$25 for digits 0–9. Glyphs $26–$29 are !, period,
copyright, and comma. The elapsed clock uses $2A and $2B as separators.
Ball quadrants are $2C–$2F. Fruit and actor graphics occupy $30–$CB,
and $CC–$CF make the soil tile. The publisher screen has a different
character set at $2000 before the second unpack.

The renderer rebuilt all 64,000 pixels of `reference/round-one-frame.png`'s
320×200 display window from the attribute and character planes, RAM
glyphs, and TED registers. The screenshot at a stopped machine is drawn
a frame later. Advancing one frame after the matching stop captured
that precise screen state.

## Register census

The census over typed engine code found 73 instructions naming these
18 registers. KERNAL code and BASIC's publisher screen are separate.

| Address | Use | Evidence |
|---|---|---|
| $FD30, $FF08 | Keyboard rows and port 1 joystick latch | $1780, $3100 |
| $FF06, $FF07 | 25 rows, 40 columns, multicolour and 256 glyphs | $201F, $2024 |
| $FF09, $FF0A, $FF0B | Raster pending, enable and compare | $20A0, $20AC, $20B9 |
| $FF0E, $FF12 | Voice 1 pitch. Startup also sets the character source to RAM | $17BB, $17C1, $2010 |
| $FF0F, $FF10 | Voice 2 pitch for the title, effects and interludes | $2B3E, $2B44, $25B4 |
| $FF11 | Voice gates and volume | $17CA, $25C1, $2B49 |
| $FF13, $FF14 | Character and screen bases | $2017, $201C |
| $FF15, $FF16, $FF17 | Background black, red and green | $2003, $2008, $200D |
| $FF19 | Border attribute. The foreground loop also reads it | $203F, $2080 |

## Input and movement

- Port 1 fire starts a game from the fruit-bordered title. Port 2 fire
  from the same state leaves it on the title. The box calls the physical
  connector port 0. The emulator calls it joystick 1.
- From a stationary player at (56,8), 24 frames of down or Z gave
  (56,20). A gave (56,0), 3 gave (44,8), and 4 gave (68,8). With no
  input the same snapshot left the player in place. The keyboard matrix
  at $3100 also gives T and F3 the port-1 fire line in the selected rows.
- $2E2C allows direction changes across axes at tile boundaries,
  every eight position units. $2E80 advances one unit (two display
  pixels) on even frame counter values.
  $2F30 digs or collects under the player. Setting the tile under a
  stationary player to a cherry yielded 25 points at the next update.
- $2700 launches the ball diagonally at two position units per axis
  (four display pixels). $2740 tests the horizontal and vertical
  neighbors and then the diagonal. $1D30 starts the random cooldown
  on an enemy hit. $2570 colors the ball's new cell and clears a
  returning ball when it reaches the player's tile. A controlled
  emulator probe crossed a character cell boundary. The old
  character code cleared and its attribute stayed at $55. The new
  cell's attribute became $71.
- Enemy slots are 1–5 in $0360, $0368 and $0370. $1C00 moves them
  when adding the speed byte to its accumulator carries. At each tile
  boundary $1C80 samples an open direction. It masks off the reverse
  direction when it can go another way. $1E34 waits for the reserve,
  active slots and pending spawns to run out before clearing the round.

## Progression

| Layout | Packed start | Cherries or blocks | Apples | Alternate to clearing the enemy roster |
|---|---|---:|---:|---|
| 1 | $3560 | 32 cherries | 6 | Collect all cherries |
| 2 | $35C0 | 6 cherries | 6 | Collect all cherries and put exactly six apples on the bottom row |
| 3 | $3620 | 64 cherry blocks | 4 | Put a Bad Apple block in each corner |
| 4 | $3680 | 40 cherries | 6 | Collect all cherries |
| 5 | $36E0 | 6 cherries | 6 | Collect all cherries and put exactly six apples on the bottom row |
| 6 | $3740 | 72 cherry blocks | 4 | Put a Bad Apple block in each corner |

$2940 decodes 96 bytes per layout, high nibble first. Index 0 is the
decorative title border. Values 0, 1, 2 and 3 are tunnel, soil, cherry
and Bad Apple. Values 4 and 5 are the movable cherry and apple blocks.
The fixed wall uses 6 or 7. Gameplay places the spawn marker at
column 7, row 6 (zero-based). $37A0–$37FF stores the six sets of
fallable apple positions. A record is eight X bytes and eight Y bytes,
with $FF for unused slots. Layout 2 has an apple at column 8, row 4.
The reported invisible apple to the right of the spawn remains open.

The clear routines are $2C00 (cherries, then bottom row for state 4),
$2C78 (the four corner cells), and $1E34 (enemies). Live probes removed
the cherries in layout 1 to reach state 3. In layout 2 removing the
cherries alone left state 4. Adding six type-3 bottom tiles reached
state 5. Setting the corners to type 5 in layout 3 reached state 1.
These probes test the win predicates using controlled RAM changes.
Both clear routes award the remaining bonus at $2C60. The alternate
route adds 1,000, 2,000, or 3,000 points through $1AA8.

$315F wraps the layout index after six maps. The displayed level
advanced to 07 while the layout index returned to 0. The difficulty
index was 6, with speed $A8 and four extra spawns. $1BB0 clamps the
table lookup to index 15. The raw byte can wrap after 256 rounds.
The five opening spawn countdowns start at $20, $30, $40, $50 and $60.
The rate table at $34C0 ranges from $78 through $D0. Extra spawns
queued by $1E00 start with countdowns of 64–127. $1C00 tests for zero
before decrementing. Emulator probes confirmed that the endpoints
activate on enemy updates 65 and 128.

$1E00 checks whether the reserve is nonzero before visiting the five
slots. Each free slot then spends one from the reserve. A controlled
emulator probe with one in reserve and five free slots queued all five
and left the reserve at 252. A zero-reserve control queued none. A route
to the wraparound during ordinary play remains open.

## Fruit and score

- $32BF starts gravity in the first two rulesets when the tile below
  is clear. Clearing the tile at (4,3) under the first orchard's apple
  at (4,2) set its timer to 32. After 32 more ticks the timer was zero
  and Y was still 16. After four further ticks Y was 20. $332C puts
  type 3 back in the board when a falling apple settles.
- $2CB3 starts a slide for a cherry or Bad Apple block when its next
  cell is open. Fire against a blocked cherry starts the crush sequence
  at $2D84. Enemy overlap is tested at $1D30 and player overlap at
  $1E50.
- Slot 7's delay at $033F is $7E at the first playable block orchard
  reached after boot. A write watch across the Plus/4 boot measured
  $00 at power-on, $40 after the first unpack and $7E after the
  second unpack. There were no further writes through the first
  orchard start. The push writes the direction and position but
  leaves the delay in place. The 126th play tick takes the delay to
  zero and the next one moves the fruit. The natural up, left, then
  down-and-fire route reproduced the delay on both PAL models after
  the first two rounds were skipped by clearing their enemy rosters. From the same pre-push state
  with the delay cleared, the first tick after the push moves it.
- The bonus begins at 599, 799, or 999. $1A00 subtracts one every
  second call from the enemy update at $1C5B. The separate elapsed
  clock at $1A38 adds one displayed second per 60 calls. The PAL
  raster runs at about 49.86 frames per second.
- The game starts at five lives. An overlap set the death bit and the
  death sequence reduced the last life from 1 to 0, then selected state
  7. The Game Over text appears in the orchard. The live ranking
  code at $20FA copies scores into the top-eight table during play.

## Sound

$2B00 plays both nibbles of each of the 192 bytes at $3F00. The
high nibble selects the first voice, with 1 continuing its note.
$1780 reads that voice alone during play. Holding Shift kept the note
index unchanged for 32 frames and cleared the voice-1 gate in $FF11.
Releasing Shift advanced the index again. The second voice is then
available for effects from $25A0 and the short tones at $25E0 and $25F8.

$23D0 plays the round-clear phrase from $3EC8 and $3ED4. $1B40 plays
the Game Over phrase from $3480 and $3490. $1F10 computes a separate
life-loss sound from the countdown. The publisher's BASIC loop calls
a glyph-rotation routine and has no music command.

## The listing's error rate

GPT-6 Astra checked 60 of 206 comments selected with seed 20261112.
One comment mislabeled the Bad Apple settle hook at $2463 as the
cherry hook. Both that comment and the paired hook at $246A were
corrected. The sample found 1.7% wrong, with a 95% Wilson interval
of 0.3%–8.9%. This is a lower bound on the mistakes a full audit could
find.

The full audit checked all 206 comments in two independent ranges.
GPT-6 Astra found 12 details to correct. A follow-up emulator probe
showed that $2570 colors the new ball cell, bringing the total to
13 corrected comments. The other corrections cover movement units,
spawn timing and reserve handling, a slide branch, and BASIC, text,
palette and difficulty tables.

A fresh GPT-6 Astra checker found zero errors in 60 of the 206 comments
after the audit. The draw used seed 2026111202. The observed rate was
0.0%, with a 95% Wilson interval of 0.0%–6.0%.
