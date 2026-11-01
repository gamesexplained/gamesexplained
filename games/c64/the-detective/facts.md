# The Detective — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`
(`work/entry.vsf`, the hand-over at `$2000`).

## Build

A cracked tape release (`orientation.md`, "The image"). Two other
cracked releases, run to `$2000` and compared byte for byte, hold the
same program (`orientation.md`, "Other releases compared"); no uncracked
original was compared. No build identifier was found in the game. The title screen says
`© A.P.S. SOFTWARE 1986` (`$22E3`), and the credit line at `$7A00`
reads `THE DETECTIVE GAME - WRITTEN BY SAM....CHARACTERS BY PAUL
JAY....PLOT CUNNINGLY DEVISED BY THE MAGNIFICENT SEVEN....   PRESS FIRE
TO START INVESTIGATION`.

## Memory layout

| Thing | Where |
|---|---|
| Engine: start-up, interrupt, text, menus, rooms, doors | `$2000`-`$3FDF`; jump table of 24 `JMP`s at `$2000` |
| Room character set (title set at the hand-over) | `$4000`-`$47FF` |
| Text panel character set, word list (`$4A90`), objects' start places (`$4FC0`) | `$4800`-`$4FFF` |
| Sprite shapes `$40`-`$EF` | `$5000`-`$7BFF` |
| Screen | `$7C00` |
| Adventure module: menus, objects, speech, music, actions | `$8000`-`$A45F`; cartridge signature at `$8000`, jump table of 38 `JMP`s at `$8009` |
| The cast's script interpreter | `$A460`-`$A903` |
| The nine characters' scripts (byte code) | `$A904`-`$B18C` |
| Questions, the arrest, the keyboard, the storm | `$B18D`-`$C0EA` |
| Seventeen packed room pictures | `$C100`-`$E7FF`, partly under the I/O area |
| Animation frames, the safe's pictures, room tables | `$E800`-`$E9FF` |
| The other 2 KB character set, and two more room-set halves | `$EA00`-`$F9FF` |
| Menu icons, 48 bytes each | `$FA00`-`$FDBF` |
| Runtime: zero page, slot tables, line buffer, mirror table, door save areas | `$0000`-`$07FF` |
| Runtime: the room map, 15 rows of 256 columns | `$0C00`-`$1AFF` |
| Room, object and door tables; the cast's state | `$1B00`-`$1FFF` |

`$0800`-`$0BFF` holds text of another program (`"TOWN RESCUE"`,
`KASSETTE OHNE HIGHSCORE`, `HERO LIST`), left by the crackers' unpacker.
No instruction of the game names an address there.

## Start-up and the main loop

The loader's last stage jumps to `$2000`, `JMP $2048`. The cold start
(`$2048`) clears zero page and the stack page, and falls into the warm
start (`$2067`), which RESTORE also reaches through the NMI handler
(`$294A`) in play. The warm start sets `$01` to `$35`, video bank 1,
the interrupts (`$28FA`), runs the title (`$222D`) and sets up a game.

The main loop (`$2120`) calls ten tasks in turn from the table at `$213F`,
for ever: the fire latch (`$2224`), the joystick (`$2200`), the sound
effects (`$9993`), the doors (`$3E49`), the nearest objects (`$2EB4`),
the stairs (`$378A`), the cast's scripts (`$A460`), the Major's
muttering (`$99C8`), the time limit (`$2592`) and the room events
(`$3979`).

The game state `$0F` chooses what the third raster stage runs, from the
table at `$2B0F`: 0 the title, 2 play, 3 the icon menu, 4 and 6 list
menus, 5 typing on the keyboard, 7 the cellar, 8 a tune, 9 a cleared
screen.

## The interrupt

One raster interrupt (`$2967`) runs three stages from the table at
`$2999`, at lines 10, 169 and 185 (`$299F`):

| Line | Routine | Work |
|---|---|---|
| 10 | `$29B1` | the room: its character set and colours, the four characters' sprite pairs, the border flash, then animation, the message bar, the text panel and the joystick |
| 169 | `$2A8B` | the message bar: sprites off, its fine scroll, the panel's character set, and the frame counters `$1E68`/`$1E69`/`$1E6A` |
| 185 | `$2ACC` | the text panel's colours, the "more" arrow, and the game state's handler |

*live*: a recorded frame of play shows these writes at lines 11, 170 and
186 (`work/frame-hall.json`).

## The clock and the time limit

The clock is the text `HH:MM` at `$1EBD`, set to `09:10` (`$2153`) at the
start of each game. Animation job 0 (`$2C83`) runs every fourth frame and
counts ten calls in `$65` and 75 of those in `$68` before `clock_tick`
(`$2570`) adds a minute: 3,000 frames, one minute at 50 frames a second.
The game runs in real time.

The time limit is `11:03` (`$2158`, copied to `$1EC4`). The task at
`$2592` compares the clock with it; once it is reached, the lights go out
(`$2696`), "YOU ARE SHOT BY AN UNSEEN ASSASIN" is shown, and the game ends
(`$25BF`). The test is skipped while `$1B` is 4 or more (the player on the
stairs) and when `$1BC0` is 3.

## Text and speech

The game's strings are PETSCII capitals; `/` is the apostrophe. A byte of
`$60` or more in a string is a word token (`$21D8`): its low five bits
index the 32-word list at `$4A90`, printed by `$8568`.

| Tokens | Words |
|---|---|
| 0-9 | THE REVEREND, BENTLEY, COOK, GABRIEL, CYNTHIA, THE PROFESSOR, THE DOCTOR, THE MAJOR, DINGLE, SNIDE |
| 10-15 | INSPECTOR, YOU, SIR, ROOM, MR MC. FUNGUS, YES |
| 16-23 | "..", " HE ", "SHE ", "HIS ", " THAT", " POOR FELLOW ", " SHAME,", SAY |
| 24-31 | " RESPONSIBLE ", " CARE OF ", " KNOW", HAD, TERRIBL, WELL, " SOME", " A " |

Two places show text. The text panel (rows 17-24) prints through
`$2747`, word-wrapped by `$289E`, with a "more" pause for fire when it
fills; a `*` clears it. The message bar (rows 15-16) scrolls the line
buffer at `$0400` in a double-height font, two pixels a frame
(`$2B21`); speech goes there, with "<NAME> SPEAKS" when the speaker
changes (`$8572`).

`$0400`-`$07FF` and the other copies of the word list at `$4E20` and
`$4F39` (one spelling "THE REVERAND") are overwritten in play.

## The cast and their scripts

| No. | Character | Script | Starts in |
|---|---|---|---|
| 0 | the Reverend | `$A904` | the drawing room |
| 1 | Bentley, the butler | `$A971` | the hall |
| 2 | Hilda Crumble, the cook | `$AA77` | the kitchen |
| 3 | Gabriel Gasbag, the maid | `$AB37` | the kitchen |
| 4 | Cynthia Sludgebucket | `$ABBC` | her room (17) |
| 5 | Professor Bull | `$AD2D` | the library |
| 6 | Doctor Mortem | `$AE56` | room 2 |
| 7 | Major Sludgebucket | `$ADD0` | his room (21) |
| 8 | Mr Dingle, the solicitor | `$B009` | the drawing room |

The start rooms are the table at `$30B1`; the script starts the table at
`$A7FB`. The player's per-character values sit just below the cast's
(index -1): `$1D41` the room, `$1D69`/`$1D73` X, `$1D7D` depth.

The interpreter (`$A460`) runs one character per call. An instruction is
an opcode in the low five bits of its first byte, with operands whose
length comes from `$A4FE` (`$FF`: a zero-terminated string). Its 27
opcodes (`$A4C8`) wait, walk to a room through the door table, go
through a door (waiting while it is locked, or jumping), say a line in
the bar, print in the panel, test who is in the room or where the
player is, jump at random (`$99F0`), lock and unlock doors, move
objects, call 6502 code (opcode 11), and set another character's script
(opcode 25).

`init_scripts` (`$A7E6`) runs Y from 9 to 0 over a table of nine starts,
so it sets a tenth pointer from the bytes after the table (`$A80D`);
nothing reads it.

## The plot in the scripts

Dingle is the murderer. Alone in his room with its door locked, he lies
down as if strangled (native code `$B1CF`). The Doctor's script
then announces "INSPECTOR..MR. DINGLE/S BEEN STRANGLED!" (opcode 23),
leads the player there, "POOR FELLOW..TERRIBLE", and switches Dingle to
his second script (`$B09C`). From then on Dingle kills, each time the
player is out of the way: Cynthia in the hall (`$AC96`), the Doctor
(`$B19E`, "A RATHER UNPLEASANT, GASPING SCREAM FROM DOWNSTAIRS!") and
Gabriel (`$ACEC`); he places the bomb (`$B198`) and, last, takes the
ammunition from place `$18` (`$B1E6`). Each death counts in `$C8`, which
other scripts test (the Major asks about the piano once two have died).

Each step of Dingle's second script waits on the player's room (opcode
24), never on the clock: for room 1 or 15 before he disappears
(`$B09C`); for room 0, 13, 7, 11 or 12 before Cynthia (`$B0B1`); for the
player to leave room 23 before the bomb (`$B0D1`); for room 14, 15 or 8
before the Doctor (`$B0DF`); for room 14 or 15 before Gabriel
(`$B134`); for the player to leave room 10 before the ammunition
(`$B14F`). Between them are waits of 260, 368, 122 and 632, two of them
lengthened at random (`$B0DC`, `$B14C`). A wait (opcode 0, `$A519`)
counts down once every 16 interpreter rounds of nine calls, when the low
four bits of `$CA` are zero. *live*, 1 November 2026: from
`work/play-hall.vsf`, the interpreter (`$A460`) ran 5,938 times in 500
frames and 35,148 times in the next 3,000 (non-stopping checkpoints,
against `$2ACC` once a frame), 11.7 calls a frame, so a wait of one is
about 12 frames there. The rate depends on the main loop's load and was
measured only in the hall.

The Doctor's announcement is reached by chance: once a death is counted
(opcode 21 at `$AE90`), his loop at `$AE97` ends with a random jump
(`$AED7`), and falling through it starts the walk at `$AEDA`.

## Objects

52 objects (names at `$8151`); their places at `$1DAC` start from the
table at `$4FC0`:

| Place | Meaning |
|---|---|
| below `$60` | a piece of furniture in a room (its index; names at `$8401`) |
| `$60`, `$61` | the two bookcases |
| `$80` | carried by the player |
| `$81`-`$89` | carried by a character |
| `$90` + n | inside object n |
| `$C0` | in the evidence envelopes |
| `$F7` | Dingle's (the ammunition he took) |
| `$FF` | not yet in the game |

The player carries at most five objects: picking up a sixth is refused
with "YOU CAN/T CARRY ANY MORE!" when five are already carried (`$30CF`,
counting place `$80` through `$883B`). A piece of furniture or an object
holds five; the envelopes hold ten (`$8856`).

## The menus

Fire in play opens the investigation menu (state 3). Its pointer moves
with momentum (`$315F`): every fourth frame the stick changes its speed
by one, within -8 to 7; every sixth frame the speed falls by one towards
zero; the position moves by the speed, and past the box's edges (X `$F4`
and `$13A`, Y `$C0` and `$EA`) it is put back (to `$F4`, `$131`, `$C0`,
`$E1`) and the speed's bits are flipped with `EOR #$FF`, so 3 becomes -4.
The menu opens with the pointer at X `$F0`, Y `$C8`, no speed (`$3308`).
`$33A3` names the icon place under the pointer: 22 pixels across from X
`$EE` in steps of 32, the middle 12 of 16 lines from Y `$BE`. The page's
port is held against `$3185`-`$3248` and `$33A3` by `test_pointer.js`
(120,000 frames of random stick input and 18,972 positions on
1 November 2026). The icons (48 bytes each at `$FA00`, six multicolour
characters, three across and two down) are copied into the panel's
character set for each menu (`$86EE`, `$873F`). Drawn from those bytes,
the pictures are: 0 an open box, 1 a magnifying glass, 2 a notepad, 3 a
red shape on a blue foot, 4 a sheet with a cross, 5 red letters, 6 a
gun, 7 handcuffs, 8 and 9 arrows up and down through a line, 10 a key,
11 a "Q", 12 an open book, 13 a knife and fork, 14 a cross, 15 a clock
face, 16 a box and an envelope, 17 a white shape with a red bar. Icons 4, 5 and 17 point at a
lone `RTS` (`$883A`). 18 icon actions (`$87ED`) include examine, take, the
inventory, put in, read (`$9E6D`), consume (`$A16D`), time/pause
(`$A1E0`), use (`$A2AF`, five-byte records at `$A3E9`), question
(`$B270`), accuse (`$BB50`) and the gun (`$BCAF`).

The border flashes, once on arrival, when the player walks into an
object whose flag at `$E880` has bit 0 set (`$3845`), and at a door
(`$3E32`), except a closed secret passage (type 8), which gives nothing
away.

## Doors and secret passages

32 door records of eight bytes at `$1F00`: the two rooms and the door's
place in each, the flags (+4: bit 0 open, bit 1 locked), the door's type
on each side, and its key (+7). Records 29-31 name no room (`$FF`).
`build_room` draws every door of the room with the room on either side
(`$38FB`), open through the table at `$39B4` and closed through
`$3B24`, after laying the floor row (`$38F3`), and then blanks rows
0-13 right of the picture (`$3954`).

A type with bits 0-1 clear is in the back wall, one with value 2 there is
a gap in the front row (`$3DD5`). `$892A` names the kinds by the upper
bits: types 0-3 "A DOOR", 8-11 "A SECRET PASSAGE!" (and marks the door
open), 4-7 nothing. Type 4 draws nothing open or closed and type 6 is
drawn as a gap either way: openings. A closed type 8 restores the picture
behind it and cannot be seen (`$3B8B`); a closed type 10 is drawn as plain
floor (`$3B97`). Six records have a secret passage on one side (9, 23 and
25-28). The table's `+1`/`+3` places are map columns; types 0 and 8 add
the room's depth (`$1BE0`) divided by four.

The start of a game (`$8680`) sets every door's flags to closed, except
a record whose two types ORed together and masked with `$FC` give 4 (an
opening on at least one side and no secret passage: records 10, 18, 19
and 24), which it marks open, and then locks
doors 2, 3 and 20 (`$86E2`): the study's and Bentley's, whose key (+7)
is object 15, "A BUNCH OF KEYS", and the Professor's, whose key is object
16, "A BIG IRON KEY". The hand-over snapshot holds other flags (only
records 24 and 31 open, none locked).

The Maps tab draws every room with its doors as a game starts, and
`test_rooms.js` holds the page's port against `build_room` and `$8680`
on the kit's 6502 for all 30 rooms (245 cases on 1 November 2026).

## The safe and the library

The safe is behind the picture (object `$1C`): moved, "YOU FIND A SAFE!"
(`$8A1F`). Its combination is the six characters at `$8AFB`, "210319"
(`$8A62`): the date of McFungus's birth, 21 March 1919, which examining
another object shows ("IT/S INSCRIBED: TO ANGUS MCFUNGUS, BORN 21 MARCH
1919", `$9B90`). The interview calls the safe codes part of the original
copy protection; in this release the code is in the game.

The library asks for a book's name (`$BDE8`): "101 DETECTIVE STORIES"
at the bookcase where the hardback book is gives it to the player.

## Winning

The accusation (`$BB76`) succeeds only against Dingle (character 8) with
all ten pieces of evidence in the envelopes (`$BB17`: the will, the
knife, the note, the small bottle, the cravat, the syringe, the folded
document, the wad of notes, the open locket and the bomb); otherwise
"YOU DO NOT HAVE THE EVIDENCE TO PROVE IT.". Then the player is "LED AT
GUNPOINT THROUGH A DARK TUNNEL" to the cellar, Dingle confesses ("VERY
CLEVER, INSPECTOR.. I PAID THE DOCTOR TO CERTIFY ME DEAD, AND THEN TOOK
CARE OF HIM.. NOW I JUST HAVE TO TAKE CARE OF YOU!") and fires. The gun
holds what Dingle took from place `$18`, the bullets (object `$33`) or
the blank bullets (object 1), whichever was there (`$B1E6`). With the
blanks, "<DINGLE> PULLS THE TRIGGER, BUT NOTHING HAPPENS.." and the
player can use the gun: "DON/T SHOOT! I/LL COME QUIETLY.." and "WELL
DONE, INSPECTOR.. YOU/RE A CREDIT TO THE FORCE, TAKE A PROMOTION!"
(`$BCAF`). Waiting instead, Dingle escapes (`$B159`). With real bullets
the player is shot.

Other endings: the time limit; drinking from the small bottle (object 7,
"GASP IN AGONY AND DROP DEAD", `$A16D`); opening the bomb (`$C066`).

## Graphics

Video bank 1, screen `$7C00`. The room (rows 0-14) is multicolour text
copied from the room map, a 40-column window at the scroll column `$40`
(`$35E8`), with a fine scroll. Room pictures are packed: `$3BD7` unpacks
record X of the list at `$C100`, row by row, from a bit stream of runs:
each run a count, then whole-byte characters or 4-bit ones sharing a
high nibble; the RAM under the I/O area is switched in while it reads. Three 1 KB variants of the room
set's upper half rotate through `$4400` per room (`$3CC0`). Up to four
characters in view are each a pair of sprites; a character turning round
has its shapes mirrored in place (`$9138`, `$0500`, `$0380`).

## Sound

A three-voice music player (`$945E`, `$973E`): sequences of notes and
commands (`$F0`-`$F9`), twelve note frequencies at `$97DD`, instruments
at `$981B`-`$9845`, two tunes. Sound effects on voice 1: footsteps
(`$98F2`), doors (`$9905`), the pick-up sweep (`$984D`), and three bursts of noise when the
time runs out (`$25FE`). The storm (`$BF4D`, `$BF7A`): rain as noise on voice 2 whose
frequency is a running sum of the frame counters, and thunder with a
flash of the room's colours at random intervals.

## Hardware register census

From `kit/cpu/census.py` on `work/entry.vsf` with the disassembler's
blocks at the Bronze checkpoint: the sprite and colour registers, `$D011`,
`$D012`, `$D016`, `$D018`, `$D019`/`$D01A`, all three SID voices, filter
and volume, `$DC00` (joystick port 2), `$DC01` (the keyboard, read by
`$BD93` through the KERNAL ROM's key table at `$EB81`), the CIAs'
interrupt registers, and `$DD00`/`$DD02` (video bank). The light pen and
the sprite collision registers are named by no instruction.

## The listing's error rate

Sample 1, seed 20261101: 60 of the listing's 748 comments drawn at
random, checked by a separate agent on claude-fable-5-1 that wrote none
of them, and its findings checked against the code. 14 were wrong
(13 in a detail, 1 in the main claim): 23 % of the sample, a 95 %
interval of about 14 % to 35 %, and a lower bound on the true rate,
since a checker misses some. What was wrong: a loop's reach (the cold
start clears all of zero page), a character table's conversion (letters
lose $20 through an SBC hidden in a BIT), which value a table holds (an
index, not an object number; the scroll position, not the player's X),
the packed pictures' run format, the start of the menu masks ($87A5),
the furniture list's first entry ("DUMMY"), the extent of a colour
table, the counts in the sprite mirroring, why pausing stops the clock
(the animation jobs, not the frame counters), and a carriage return
written as "/" in the text comments. All 14 were corrected, with the 29
other inline-text comments that wrote a carriage return the same way and
the page's sentence on pausing. No audit has been made; one is
recommended.

## Live tests

- *live*, 1 November 2026: from `work/play-hall.vsf`, 6,100 frames gave
  two clock ticks (a non-stopping checkpoint on `$2570`, against 6,100
  hits on the third raster stage at `$2ACC`): one minute per 3,000 frames.
- *live*, 1 November 2026: with the clock set to `11:02`, the game ran on
  to `11:03`, put out the lights, showed the shot in the message bar,
  waited in `$25F8` (`$806C` with 6) and returned to the title. The
  checkpoint counters on `$2067` and `$222D` read 0 though the title
  came back, so they are not quoted.
- *live*, 1 November 2026: with six icons, the menu box showed them three
  to a row at columns 27, 31 and 35 of rows 18-21 (`$32CE`).
- *live*: fire on port 2 starts the game; the stick walks Snide in four
  directions; fire opens the menu (`features.md`).
