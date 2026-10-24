# Karateka — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

The game is six parts (`orientation.md`, "The parts"): the engine, in
memory from the boot to the end, and five stages that take turns in the
same 12 KB, the title and demo (stage 0), the cliff (1), the palace (2),
the dungeon (3) and Akuma's chamber with the ending (4). What is true of
one part is in that part's own `parts/<id>/facts.md`, with that part's
addresses: the engine's holds the fighters, the brain, the blows, the
keys, the drawing, the sound and the loader. This file holds what spans
the parts, and names the part beside every address it gives: "engine
$6B00" is the engine's routine at $6B00, "cliff $B700" the cliff's.

## Build

Side A of Brøderbund's original disk, 1984, as 4am copied it to WOZ for
A Woz A Day (`orientation.md`, "The image"). There is no DOS and no file:
the disk is the game's own format, twelve 256-byte sectors a track, read
by a loader of its own (engine $0300). Side B holds the same game with
every picture upside down; it is not analysed.

## Memory layout

| Thing | Where |
|---|---|
| Zero page, the game's variables | $00-$FF (engine; every cell is commented in the engine's listing) |
| The engine's entry points, THE END, the stage loader and the reset handler | engine $0200-$03FF |
| The text alphabet's glyphs and tables, the text drawer, the prologue's scroll | engine $0400-$07FF |
| The hi-res row tables, the mirror table ($0980), the fills | engine $0800-$0AFF |
| The arrows, the sound effects, the tune player, the recorded sound, two tunes | engine $0B00-$0FFF |
| A stage's tunes, pictures and the shape-drawing library ($1900-$1C79) | each stage, $1000-$1FFF |
| Hi-res page 1, drawn on every other frame | $2000-$3FFF |
| Hi-res page 2; the loader's second and third stages and its zero page live in the parts never shown ($4000-$41FF, $4F00-$57FF) | $4000-$5FFF |
| The fighters' tables, animation, brain, keys, hits, frame end, cutscenes | engine $6000-$7FFF |
| The fighters', Akuma's, the scenery's and the stars' pictures | engine $8000-$9FFF |
| A stage's own code and pictures | each stage, $A000-$BFFF |
| The stage's entry and its three check bytes | each stage, $BFFA-$BFFF |
| A copy of the machine's ROM, its reset vector changed | the language card, $D000-$FFFF |

The game never touches auxiliary memory, and runs with interrupts off
(`orientation.md`, "Steady state").

## How the parts lead to one another

- $D0 is the stage asked for and $D2 the stage in memory. Engine $0200
  loads stage $D0 through the loader at engine $0300, retrying until the
  last three bytes check ($BFFD the stage number, $BFFE it EOR $3B, $BFFF
  it EOR $49), copies $D0 to $D2 and enters the stage through its JMP at
  $BFFA (engine $020C).
- The title (stage 0) is loaded at the boot. A key there starts a game
  (engine $0237): the castle picture is read into $A000-$BFFF and copied
  to the screen (engine $03A5), the title stage's tune at $1012 plays,
  and the cliff (stage 1) is loaded over it.
- Each stage loads the next by setting $D0: the cliff loads the palace
  when the hero walks off its second screen (cliff $B260), the palace
  loads the dungeon when he passes the last portcullis (palace $B400), and
  the dungeon loads Akuma's chamber when the hawk is gone (dungeon $BB14).
- The hero's death in stages 1-4 plays the stage's tune at $1003 and
  jumps to engine $0203, THE END, which waits for a key to start a new game and
  otherwise returns to the title, loading it again if it is not in memory
  (engine $025E). A death in the demo goes back to the title (title
  $B4E7). CONTROL-R loads the title at any time once it has been loaded
  once ($D2 not negative; engine $7722).
- The engine calls fixed addresses in every stage: the tunes behind the
  JMPs at $1000-$100F, the shape library at $1900-$190E, the hawk's and
  the scenery's vectors, Akuma's figure at $BC00, and the brain's
  thresholds at $BFE1-$BFFD. Each stage puts what it needs there, and
  some stages leave other bytes where a vector they never need would be
  (akuma $B000).
- What carries over from one stage to the next is only what is in the
  engine's memory: zero page (the control choice $C4, the sound switches
  $4F and $86, the headgear $3E, the rooms opened $C5) and the hero's
  record ($60-$6F), which stage 4 keeps from stage 3 (akuma $B700).

## Timing

There is no timer. One frame of the game is one pass of a stage's main
loop, ended by engine $7600, which flips the hi-res pages (engine $7609)
after waiting for the vertical blank on a IIe or IIc (engine $779A) and
plays the frame's sounds (engine $7628). A tune or a recorded sound
holds the frame up while it plays. *Live*, on the kit's enhanced IIe:
on the cliff with the hero standing still, 43 frames in 300 video frames
(5 seconds); with him running and the scene scrolling, 11 in 120 (2
seconds).

Guards in the cliff, palace and dungeon move only on the frames drawn on
page 1, unless their legs are past position $0D of a sequence or stopped
(cliff $B874, palace $B9DF, dungeon $B8B8), and their blows are tested
only on those frames (cliff $B874, palace $BA1A, dungeon $B8DE); the
hero's are tested every frame. Akuma moves and is tested
every frame (akuma $B895, $B8C7).

## Controls

The keys and the joystick are read by the engine (engine
`parts/engine/facts.md`, "Controls"). Every key the manual names works
as it says, with one difference: the low kick is X, where the manual
prints Z, which is the low punch (`features.md`).

## Graphics

Both hi-res pages are drawn in turn: $07 holds the page being drawn ($20
or $40), and the other is shown. Pictures are shapes, two bytes (the
height in rows, the width in bytes) and then the rows, drawn by the
library each stage carries at $1900-$1C79: as they are, or mirrored
through engine $0980, in store, OR or AND mode ($0F). A figure facing
left is the same shapes drawn mirrored.

A fighter is drawn from parts: the legs (42 poses), the torso (38 poses)
and the head or headgear, each placed by tables of columns and rows per
pose (engine $6000-$62FF, $6811). The headgear tells guards apart: type 0
and 6 are drawn from the engine's pictures, types 1-5 from the stage's own
at $BE00-$BFFF (engine $62E8-$62FD, $6AEA-$6AF5). Akuma is drawn by the
last stage's own figure routine (akuma $BC00).

### The text alphabet

The prologue, the credits before the title and the closing text are drawn
on the hi-res screen by engine $0700 in a face of the game's own, from
strings in ASCII order: the letters keep their places, everything else
moves.

| Byte | Glyph |
|---|---|
| $60 | space |
| $61-$7A | a-z (the face has no capitals) |
| $7B | . |
| $7C | , |
| $7D | : |
| $7E | - |
| $5F | end of the line |

Each line is two bytes and then its letters: the byte column ($05) and
the dot within it ($10, 0-6), where the line starts. Engine $0700 takes
the line from ($E5) and its height on the screen from $06, and draws each
glyph through the shape drawer at $1903, from the shapes whose addresses
are at engine $0680 (low bytes) and $06A0 (high bytes, plus 4), indexed
by the byte less $60; $06C0 and $06E0 give each glyph's width in bytes
and dots. A byte below $60 ends the line. $7F has a table entry but no
string uses it; drawn, it shows the a. *Live*: all 32 drawn by $0700
itself on a cleared page from the ending stage's entry snapshot.

The lines: the title's credits and prologue through the pointer tables
at title $BB9F (low) and $BBB5 (high), set by title $B960; the closing
text, eight lines, through akuma $A30F and $A318, set by akuma $A203 and
drawn by akuma $A321. The copyright line on the title screen and "the
end" are pictures, not strings: neither is in memory as text in any part.

## Mechanics

The rules of a fight are the engine's (`parts/engine/facts.md`,
"Fighting"); each stage sets the numbers.

| | Cliff | Palace | Dungeon | Akuma |
|---|---|---|---|---|
| Hero's most arrows at the start | 14 | 12 | 10 | 8 |
| Each opponent's | 14 | 16 | 18 | 20 |
| After each guard beaten, while the hero's most is | 10 or more | 9 or more | any | |
| Headgear of the guards | 0-5 | 1-5 | 3-6 | Akuma, 7 |
| Chances of a kick, punch, step forward, by headgear | cliff $BB75 | palace $BC45 | dungeon $B499 | all $FF |
| Hawk | | sent by Akuma, flies off when struck | an opponent with 5 arrows, the hero then with 23 | |

Sources: cliff $B700, $B874; palace $B700, $B8A2; dungeon $B700,
$B820; akuma $B700, $B834. The hero's most arrows and his opponent's
always add up to 28: the palace and Akuma's chamber compute the
opponent's as 28 less the hero's. The hero's arrows come back one at a
time while he is not hit (engine $0BE3), every $B8 calls of the arrows'
routine, which the stages call once a frame; the four fighting stages set
$B8 to 30 at their start and to 2 once a guard is beaten, and the engine
puts it back to 30 once he has them all (engine $0C02).

The guards' chances out of 256 (a random byte must be below the number):

| Headgear | Kick (cliff, palace, dungeon) | Punch | Step forward |
|---|---|---|---|
| 0 | $E0, -, - | $E0, -, - | $FF, -, - |
| 1 | $E8, $F0, - | $E0, $F0, - | $E0, $C0, - |
| 2 | $30, $20, - | $FF, $FF, - | $C0, $A0, - |
| 3 | $FF, $F8, $E0 | $30, $FF, $E0 | $A0, $80, $E0 |
| 4 | $F8, $FF, $F0 | $E8, $20, $F0 | $80, $60, $A0 |
| 5 | $FF, $FF, $FF | $E8, $FF, $F0 | $50, $40, $70 |
| 6 | -, -, $FF | -, -, $FF | -, -, $40 |

Before those chances are tried, the brain picks a move by the distance
between the fighters, 7 to 11 columns, from four tables each stage keeps
at $BFE1-$BFFD (engine $6B00; the cliff's at cliff $BFE1). The title's
demo guard has every chance at $FF and its own tables (title $BFE8).
The page's port of the brain (`reference/brain.js`) gives the same
command, height ($2A), stick ($29) and next random number ($48) as
engine $6B00 run on the kit's 6502 over the listings in 673,440 cases:
every random number at distances 0 to 13 in each of the five stages,
and 100,000 random states of the zero page cells it reads
(`test_brain.js`).

## Data tables

The tables a stage must hold at fixed addresses for the engine:

| Address | What | Read by |
|---|---|---|
| $1000-$1017 | the tunes, behind JMPs | engine $0250, $766C, $79C6, $7A10, $7B40, $7BA8, $7BBC, $7BCE, and the stage |
| $1530-$1DFF | Mariko's pictures, in the stages that show her | engine $7E3F |
| $1900-$190E | the shape library's five entries | everything that draws |
| $BE00-$BFDF | headgear types 1-5, three drawings each, in the cliff, the palace and the dungeon | engine $62E8-$62FD, $6AEA |
| $BFE1-$BFFD | the brain's thresholds by distance | engine $6BBB-$6C38 |
| $BFFA-$BFFF | the entry and the check bytes | engine $020C |

## Sound

The speaker only. Seven short effects (engine $0C40), clicks spaced by
the Monitor's WAIT; a tune player in two voices that beat against each
other (engine $0D00); and a recorded sound of 2,048 one-bit samples
(engine $0E00) played at a speed set by $BA: 30 when an opponent falls
dead or a doorway is kicked open, 40, slower and lower, when the hero
falls to Akuma, and other speeds for the hawk, Mariko's kick and the
hero taking the stance (engine $0DC0, $7207, and the stages). CONTROL-S
turns the music off, then the sound, then both on (engine $7697); the
last stage turns both on again whatever was chosen (akuma $B700).

Each stage keeps its own tunes at $1000 (`parts/<id>/facts.md`); the
engine keeps two of the last stage's at engine $0FB0 and $0FE4. The
closing tune plays over and over under the closing words, at tempo $40,
far slower than any other (akuma $110A).

## The listing's error rate

One sample of the listing's comments, seed 20261024, checked against the
bytes and in the kit's simulator by an agent (on `claude-opus-5-5[1m]`)
that wrote none of them. The 2,142 comments of the six parts fell in two
strata: 1,676 written by hand on the code, the variables and the tables,
and 466 on the shapes, written by a script from their headers. The
sample drew 60 from the first and 20 from the second.

8 of the 80 were wrong, 10.0 % (Wilson 95 % interval 5.2-18.5 %): 8 of
the 60 by hand (13.3 %, 6.9-24.2 %) and none of the 20 by the script
(0-16.1 %), so 10.4 % weighted by the strata's sizes. That is over the
mark of one in 30. All eight were wrong in a detail. Two gave the rows
or columns of a black fill one too far, counting the fill routine's
bottom row and right column, which it stops before ($7AB3, cliff
$AF76); one gave a spare mask's last row a gap of seven dots, when it
is five ($9352); one said a punch from the lunge always starts both
sequences again, when that depends on the torso's position ($6618); one
gave the X of the brain's step chance as the distance on every path, when
two paths reach it with another X ($6C2F); one called the rooms'
scenery the palace's, when the palace draws only Mariko's cell with it
($7800); one put the fence posts at $51 instead of $51 + 1 (title
$AA23); and one said a falling hero leaves out both feet masks, when
only his own is left out (title $B5DA). All 8 were corrected, with the
23 comments that said the same: 15 more fills, the six other spare
masks, $0024 and the cliff's copy of the fence post. The checker also
found, outside the sample, the demo's height choice (title $A0AF), which
gave three heights where the code gives two; it was corrected too. The
checker's rate is a lower bound on the true rate.

## Live tests

All in Apple2TS as the kit's enhanced IIe, from the parts' entry
snapshots, with the keyboard chosen by writing 1 to $C4.

- *Keys* (cliff): J cleared $C4 and K set it; CONTROL-S three times went
  from both on to music off ($4F = 0), both off ($86 = 0) and both on;
  ESC froze the hero and the scroll for 130 video frames until a key;
  CONTROL-X, -Y, -E and -B each set their flag ($C1, $C2, $C0, $C3) and
  CONTROL-N cleared all four; CONTROL-R loaded stage 0 ($D0 = 0) and the
  prologue came up.
- *The run and the bow* (cliff): LEFT while running brought the hero to
  standing still (legs pose 7) within 60 video frames; B while standing
  ran his legs and torso through poses $0B, $0C, $0D and back to 7, and a
  guard standing at column $1C, 13 columns off, bowed back through the
  same poses (`reference/cliff-bow.png`).
- *The fall* (cliff): from the start, taking the stance and stepping left
  set $A2 at column $0A, and $A1 reached $33 with the hero dead ($5D = 0;
  `reference/cliff-fall.png`).
- *The frame rate* (cliff): the page flips counted each video frame, in
  "Timing".
- *Akuma's opening kicks* (akuma): from the stage's start with $C5 set to
  6, the hero run into room 6 died of the first kick; taken into room 6 in
  the stance, he was knocked back into room 5, $58 went to 0, and Akuma
  then fought by the brain.
- *The tunes* (each stage's snapshot): each of the sixteen tunes, played
  from its stage's entry with the music and the sound on until the
  player returned ($0DA5), clicked the speaker as the listing's code does
  on the kit's 6502, spacing for spacing (`test_tunes.js`).
- *The sounds* (engine): the seven effects and the recorded sound at
  speeds 30, 40 and 18, each called with a return to $0200, clicked as the
  listing's code does, with the Monitor's WAIT taken as
  (26 + 27A + 5A²) / 2 cycles (`test_sound.js`).
- *The title and the demo* (title): run from $BFFA with no key, the two
  hi-res pages held the same bytes as the listing's code run on the kit's
  6502 at each of 18 flips of the page shown, from the credits to the
  demo fight and the prologue again (`test_demo.js`). Through the first
  round, 571 flips from the credits to the flip before the credits come
  round again, the 16,141 clicks of the speaker between flips came at the
  same spacings in both; the first click after a flip came up to 4 cycles
  apart, and the flips themselves came later in Apple2TS, whose IIe waits
  for the vertical blank: 157.75 s for the round against 155.10 s.
- *The stages* (cliff, palace, dungeon, akuma): each stage run from its
  entry ($BFFA) in Apple2TS, with the keyboard chosen where the snapshot
  had the joystick, and stopped at the flips of the page shown that
  `reference/stages.js` names for its places (17 in all, after the same
  pokes, key presses and jumps), showed the same 7,680 visible bytes of
  the page shown as the listings run on the kit's 6502 from the same
  hand-over state (`test_stages.js`). The screen holes ($3FF8-$3FFF and
  the like) and the stack differ between the two and are left out.
- *The portcullis*, *the doorways*, *the stages in order* and *the text
  alphabet*: `orientation.md`, "From power-on to play", and "The text
  alphabet" above.
