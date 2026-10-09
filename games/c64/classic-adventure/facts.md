# Classic Adventure — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

The analysed program is the one file on a widely circulated disk
transfer of the tape release, `CLASSIC ADV.` on a disk named `DIGITAL
DUNGEON` (`orientation.md`). A wrapper (`wrapper_move` `$081F`,
`wrapper_start` `$0B9E`) moves the whole file up by `$0340` and enters
the game at `start` `$12B5`; the tape's own entry was `$0B9E`, which the
stub's text names as `SYS 2974`. The listing is built from
`work/entry.vsf` (SHA-256 `4d71f193…6c15`), saved when the machine
first stops at `$12B5`.

The game runs with `$01` = `$36` (BASIC ROM out, KERNAL and I/O in) and
never changes it. It installs no interrupt handler and keeps the
KERNAL's: all input is a line read through `CHRIN` and all output goes
through `CHROUT`.

## Memory layout

| Thing | Where |
|---|---|
| BASIC stub `0 SYS 2079` with the hidden text `UPERSOFT` | `$0801`-`$081E` |
| The wrapper's first half, run where it loads | `$081F`-`$083E` |
| What the move leaves behind (excluded from coverage, with the reason in `game.json`) | `$083F`-`$0B9D` |
| The wrapper's second half, run in its moved copy | `$0B9E`-`$0BBA` |
| Copy of the objects' starting state, for another game | `obj_start` `$0BBB`-`$0C56` |
| Line buffer and variables | `$0C57`-`$0CC7` |
| Action handler table (20) and condition handler table (11) | `act_table` `$0CC8`, `cond_table` `$0CF0` |
| Built-in messages in plain ASCII, with the lives, score and turn digits inside them | `$0D06`-`$0F98` |
| The game's code | `$0F99`-`$1BA9` |
| An older build of the printing routines, never called | `stale_code` `$1BAA`-`$1D1F` |
| The dictionary, 305 words | `$1D4C`-`$2346` |
| Room texts, 140 | offsets `$2347`, text `$2461`-`$47DE` |
| Vocabulary, 226 entries of 5 bytes | `$47DF`-`$4C48` |
| Exits, (word, room) pairs for each room | offsets `$4C49`, pairs `$4D63`-`$5208` |
| Command rules, 422 of 6 bytes, and the record after them | `$5209`, `cmd_end` `$5BED` |
| Their conditions and actions | `$5BF3`, `$5FD9` |
| Status rules, 30 of 4 bytes, and the record after them | `$66C7`, `st_end` `$673F` |
| Their conditions and actions | `$6743`, `$679D` |
| Messages, 200, of which 105 are empty | offsets `$6855`, text `$69E7`-`$80A6` |
| Object texts, 78 | offsets `$80A7`, text `$8145`-`$8AA1` |
| Each object's location and flags, two bytes | `obj_state` `$8AA2`-`$8B3D` |

Variables worth knowing (`$0C57`-`$0CC7`): `room` `$0CA3` (0 means
dead), `prev_room` `$0CA5`, `lives` `$0CAD`, the flags 0-12 at
`$0C94`-`$0CA0` (flag 2 `$0C96` is the count of objects carried, flag 5
`$0C99` the darkness count, flag 10 game over, flag 12 the cave
closing), the three word numbers of the last command at
`$0C8C`-`$0C8E`. Object n's location is at `$8AA0` + 2n and its flags
at `$8AA1` + 2n: bit 1 means carried, bit 4 treasure.

## Timing

Nothing is timed. The game waits in the KERNAL for each typed line, and
every rule runs once per command. The one use of time is the chance
condition (`cond_chance` `$16BE`): it holds when the low seven bits of
the jiffy clock `$A2` are below its argument. The clock is the KERNAL's
(the store to `$A2` was caught at `$F69F`, reached through `$FFEA`), and
it advanced 359 times in 300 PAL frames, 60 a second (*live*), so the
seven bits run through all 128 values about every 2.1 seconds and a
chance of n in 128 depends on the moment the rule is tested.

## Controls

- A command is a line of at most 39 characters typed into the KERNAL's
  screen editor and ended with RETURN (`read_line` `$1194`); the rest of
  a longer line is read and dropped.
- `parse` (`$11D1`) clears bit 7 of every character, so shifted letters
  match too, cuts each word to four letters (`next_word` `$122F`) and
  looks it up among the 226 vocabulary entries (`lookup_word` `$126D`).
  Words it does not know are skipped. The first known word is the verb,
  the second the noun; a third is stored at `$0C8E` and nothing reads
  it. A line with no known word gets "I dont understand!".
- Every line typed counts as a turn, the ones the game does not
  understand included (`get_command` `$13BD` counts before it parses).
- The questions "Are you sure?" and "Another game (y or n)?" are answered
  with a typed line. Only an unshifted `Y` (`$59`) quits (`act_quit`
  `$1980`), and only an unshifted `N` (`$4E`) declines another game
  (`act_another_game` `$1941`); the test there ANDs the key with `$DF`,
  but a shifted N arrives as `$CE`, which still counts as yes.
- After 20 lines of output the pager in `put_char` (`$0FD6`) prints "Hit
  any key to continue." and waits until the KERNAL's `$C5` shows a key
  held.

## Graphics

There are none. `init_screen` (`$1AF9`) sends `CHROUT` the codes for the
upper and lower case character set (`$0E`), for locking it (`$08`), for
white text (`$05`) and for clearing the screen (`$93`), and sets the
border to blue (`$D020` = 6, the game's only VIC-II write). The game's
text is ASCII; `chrout_swap` (`$1131`) flips bit 5 of every byte from
`$41` to `$7F` on the way to `CHROUT`, because with that character set
PETSCII has the cases the other way round.

## Mechanics

### Text

- **A dictionary of whole words.** Room, message and object texts are
  bytes of ASCII in which any byte below 4 starts a two-byte reference
  to one of the 305 words of the dictionary at `$1D4C`, counted from 1
  (`print_record` `$1033`, `print_word` `$0F99`). A word in the
  dictionary ends with a byte that has bit 7 set. Each table is 16-bit
  offsets into its text, and record n runs from offset n-1 to offset n,
  so an empty record is two equal offsets: 105 of the 200 messages and
  room 31 are empty, and no object is.
- **Spacing.** `print_record` puts a space before a dictionary word, and
  before a letter that follows a word, from a state at `$0C86`: no space
  at the start of a line or after an apostrophe, slash or hyphen.
- **Full justification.** Text is built a line at a time in the
  40-column buffer at `$0C5A`, and `justify` (`$114B`) widens the gaps
  between words, working from the right, until the last column holds a
  letter. The last line of a record, a line containing `%`, and the
  pager's line are left ragged (`$0C87`). Every record ends with a blank
  line.
- **Built-in messages.** "Okay", "I cant", "You are carrying" and the
  other 21 messages the code prints itself are plain ASCII at
  `$0D06`-`$0F98`, printed through `print_inline` (`$1ADD`). The
  digits of the lives count (`$0EF0`), the score (`$0F48`) and the turns
  (`$0F68`) are kept inside those messages, as ASCII, and counted there.

### The rule engine

The game is a table interpreter in the style of the adventure systems
of its time: almost everything it does is decided by the two rule
tables, and the code supplies 11 kinds of condition and 20 kinds of
action.

- **One turn.** `get_command` reads and parses a line. If the first word
  is the word of one of the room's exits (`travel` `$15C5`), the player
  moves and `main_loop` (`$12F4`) describes the new room. Otherwise
  `command_rules` (`$1405`) scans the 422 command rules in order. A rule
  applies when its verb is the first word and its noun is `$FF` (any) or
  the second word; the first one that applies and whose conditions all
  hold runs its actions, and the scan stops there. If none does,
  `no_rule` (`$14D6`) prints "I cant go that way" for a first word from
  43 to 54 (the directions) and "I cant" for anything else.
- **Status rules.** The 30 status rules at `$66C7` have no words and run
  in order before every command (`status_rules` `$12FF`): after each
  room description and after every command whose actions do not end the
  turn. Every one whose conditions hold runs, unless its actions end the
  turn or move the player, which starts the description and the status
  rules again. They make the pass-through rooms work (room 31 has no
  text and no exits: status rules 5 and 6 send the player on), the dwarf
  throw his axe, the bird fight the snake and the dragon, the cave close,
  and the pit kill the player in the dark.
- **Conditions** (`cond_table` `$0CF0`), each a code and an argument:
  0 in room n; 1 object carried or here; 2 chance n in 128; 3 object
  neither carried nor here; 4 flag set; 5 flag clear; 6 carried; 7 here
  and not carried; 8 not here; 9 not carried; 10 the object's location
  or its flags byte is not 0.
- **Actions** (`act_table` `$0CC8`): 0 inventory; 1 take; 2 drop;
  3 message; 4 describe the room; 5 end the turn; 6 go to room n;
  7 set flag ($FF); 8 clear flag; 9 offer another game; 10 "Okay";
  11 quit; 12 put the object here; 13 remove it from play (location 0);
  14 set a flag to 4; 15 score; 16 remember room n; 17 put the object in
  the remembered room; 18 SAVE; 19 RESTORE. No rule uses actions 9 or
  14, and the code reaches the "another game" handler only from the
  score. `run_actions` (`$1794`) reads the list two bytes at a time, code
  and argument, but the actions that ignore the argument all leave the
  rule, and the lists store them as the code alone: 322 of the 452
  lists end in such a byte.
- **Taking and dropping.** `act_get` (`$185F`) refuses an eighth object
  with "You can't carry any more": flag 2 counts what is carried, and
  the limit is 7 (*live*). Taking an object that is not in the room, or
  already carried, prints "You have it already". A carried object has
  location 0 and bit 1 set in its flags; one removed from play has
  location 0 and keeps its flags (`act_destroy` `$19C2`), so condition
  10 sees every treasure, bit 4 set, as still in the game.
- **Exits.** Each room has its own list of (word, destination) pairs,
  tried in order, so a passage need not lead back the way it came. The
  exits are tried before any command rule, and an exit that depends on
  something (the grate, the nugget, a chance) is a command rule with
  conditions instead.
- **The previous room.** Moving remembers the room left at `$0CA5`,
  except when leaving rooms 21 and 22, whose texts are "You didn't make
  it" and "The dome is unclimbable" (`$0CA7`, `$0CA8`).

### Light and darkness

- Rooms 1-9, 100, 115, 116 and 126 are lit (`lit_rooms` `$0CAE`). Any
  other room is lit only while the lit lamp, object 3, is carried or
  lies there (`describe_room` `$1503`).
- Each description of a dark room prints "It is now pitch dark. If you
  proceed you will likely fall into a pit!" and takes one from the
  darkness count, flag 5. Status rule 21 kills the player the moment it
  reaches 0. The count is 4 at the start of a game and 3 after each
  death; nothing else sets it, so it is spent over a whole life, not
  per dark stretch: lighting the lamp does not give any back (*live*:
  two dark `LOOK`s, the lamp on and off again, and the second `LOOK`
  after that was the fall).
- `LOOK` counts, and so does a move that a status rule turns into a
  second description (*live*: one `SW` in the dark printed the warning
  twice).

### Death and lives

`death` (`$1B35`) runs when the room becomes 0. With lives left it prints
the reincarnation text, whose "I can only do this 4 times more" counts
the reincarnation under way (`$0EF0` gets the count before it is taken
down), puts a carried lamp (object 2 or 3) on the road, room 1,
puts everything else carried in the previous room, not the room of the
death, empties the hands, sets the darkness count to 3 and wakes the
player in the building, room 3. After the fifth death it sets flag 10
and shows the score, which then offers another game. The score is not
changed by dying.

### Score and the end of the cave

- **The score.** `act_score` (`$19E4`) counts 10 for every object in the
  building, room 3, with bit 4 set in its flags. Fifteen objects that can
  be carried have the bit (57, 59-66, 69-72, 75 and 77), so the score
  tops out at 150 against the 210 its message promises (*live*: all 15
  poked into the building scored 150). Three more objects have the bit:
  67, the vase resting on the pillow, takes the vase's place when the
  vase is dropped on the pillow, so it scores instead of it, not as
  well; 76, the bear's chain on the wall, never leaves room 130; and 78,
  "Underneath the body is a small flute.", is placed by no rule.
- **The digits.** The score is kept as three ASCII digits in the
  message. A carry out of the tens writes `1` into the hundreds rather
  than adding one, so a score of 200 or more would read as 100 or more
  (*live*, with twenty objects poked into the building as treasures: the
  digits read `100`).
- **The turns** are kept twice, as a 16-bit count at `$0CA1` that no
  instruction reads (SAVE copies it to tape with the block around it)
  and as four ASCII digits in the score message, which the score shows.
  The digit loop in `get_command` carries leftwards with `X` and turns a
  space into a `0` before it adds. The 10,000th command carries out of
  the thousands with `X` at `$FF`, and `turn_digits,X` is then `$1067`,
  inside the code: the opcode of print_record's `STA $61` (`$85`) is
  incremented to `$86`, `STX $61`. From then on print_record takes its
  length from `X`, which most callers leave at 0, so the room
  descriptions and messages come out as blank lines and the turns read
  `0000` (*live*: the digits poked to `9999`, one `LOOK`, then `$1067`
  read `$86` and `LOOK` and `SCORE` printed nothing).
- **Closing the cave.** A `SCORE` that finds exactly 15 objects of any
  kind in the building sets flag 12 (`$1A27`), and the next arrival in
  the hall of mists (room 15) runs status rule 11 or 12: the cave
  closes and the player is moved to the north-east end of the
  repository (room 115), with the rod with the rusty star, the plant and
  the oyster; the rod with the rusty mark, the bird in its cage and the
  pillow are put at the south-west end (room 116). With 18 objects in the building flag 12 stayed clear; with 15 it
  was set and the hall of mists led to the repository (*live*).
- **The blast.** `BLAST` at the north-east end ends the game with lava
  (message 134). At the south-west end it kills the player if the rod
  with the rusty mark, object 10, is carried or lies there (message
  135), and otherwise wins (message 133). Every arrival puts rod 10 at
  the south-west end. Only five rules touch it: status rules 11 and 12
  put it there, command rules 211 and 263 take it, and rule 406 tests
  it. Rule 263 is `DROP ROD` when the other rod is not carried, and its
  action is `get`, not `drop`, so once rod 10 is taken it can never be
  put down (*live*: "You have it already"). The repository's two rooms
  lead only to each other, and none of the rules that kill the player
  can run there, so rod 10 cannot be carried out by dying either. The
  winning message can be seen only by poking the player into room 116
  when rod 10 is not there (*live*, in a new game).

### Characters and puzzles

- **The dwarf.** Status rule 22: each time the player is in the awkward
  east/west canyon (room 12) while the little axe is neither carried
  nor there, the axe is put there and the dwarf throws it (*live*: the
  axe dropped on the west side of the fissure was back in the canyon).
  `THROW AXE` at the dwarf needs flag 11, which no rule sets, so the
  dwarf can never be hit.
- **The bear.** Feeding the ferocious bear makes it gentle. `GET BEAR`
  is meant to answer "The bear is still chained to the wall." while the
  chain holds it, but rule 190 tests object 78, which no rule places,
  where object 76 (the chain on the wall) was meant, so the gentle bear
  can be taken while still chained (*live*: with the bear poked gentle
  and the chain still on the wall, `GET BEAR` answered "Okay" and the
  bear followed).
- **The troll.** Throwing a treasure to the troll at either end of the
  bridge removes that troll; the troll at the other end stays. `FEE FIE`
  brings the golden eggs back to the giant room, room 92. Rule 396,
  which would also bring the troll back, follows rule 395, whose only
  condition is that the eggs have a location or flags, and the eggs
  keep their treasure bit even when given away, so rule 395 always runs
  and the troll does not come back (*live*: eggs thrown to the troll,
  then `FEE FIE`: the eggs were in room 92 and "The troll is nowhere to
  be seen.").
- **Empty answers.** `KILL CLAM` (rule 328) and `OVER` at the east bank
  of the fissure with no bridge (rule 36) print messages 15 and 87,
  which are empty, so the game answers with a blank line (*live*).
- **Words that never match.** No vocabulary entry carries word 5, so the
  exits and the rule written for it (`DOWNSTREAM` in room 38 among them)
  can never be used. Flags 8 and 9, set by the two blasts, and flags 0,
  1, 3 and 4 are read by no rule; flags 3 and 4 are counted down by the
  code (`end_turn` `$13B5`, `describe_room`) but never set.

### SAVE and RESTORE

`act_save` (`$1A5D`) writes two files to tape, device 1, secondary
address 1, no name: `$8AA2`-`$8B3C` (the objects) and `$0BBB`-`$0F97`
(the starting copy, the line buffer, the variables, the handler tables
and the built-in messages with their digits). `act_restore` (`$1AA3`)
loads both back to the addresses they came from and describes the room.
Neither checks for an error. The tape prompts appear, and RUN/STOP at
the prompt returns to the game (*live*); no tape was attached, so the
files themselves were not checked.

### Another game

"Another game (y or n)?" answered with `N` jumps through the KERNAL's
reset vector (`$195A`) and the machine restarts into BASIC (*live*). Any
other answer copies the objects back from `obj_start` and starts again
at `new_game` (`$12BB`).

## Data tables

| Table | Records | Format |
|---|---|---|
| Dictionary `$1D4C` | 305 words | letters, the last with bit 7 set |
| Vocabulary `$47DF` | 226 entries | four letters zero-filled, then a word number; synonyms share a number, and the first match wins |
| Rooms `$2347`/`$2461` | 140 | 141 offsets, then text with word references |
| Exits `$4C49`/`$4D63` | 140 lists | 141 offsets, then (word, room) byte pairs |
| Command rules `$5209` | 422 | verb, noun or `$FF`, then 16-bit offsets of the conditions (from `$5BF3`) and actions (from `$5FD9`); the next rule's offsets end the lists |
| Status rules `$66C7` | 30 | offsets of the conditions (from `$6743`) and actions (from `$679D`) |
| Messages `$6855`/`$69E7` | 200, 105 empty | as rooms |
| Objects `$80A7`/`$8145` | 78 | as rooms |
| Object state `$8AA2` | 78 × 2 | location, flags |

## Sound

There is none: no instruction in the program can reach the SID's
registers (`opcodes.py --refs` on `$D400`, `$D404`, `$D40B`, `$D412` and
`$D418` found nothing).

## Live tests

All run on VICE 3.13.2 from `work/entry.vsf` or a fresh autostart, with
commands typed through the keyboard and the screen read back.

- The help texts, `INVENT`, `SCORE`, `QUIT`, `SAVE` and `RESTORE`
  prompts, RUN/STOP at the tape prompt, and `N` to another game.
- Darkness: four dark descriptions in one life, the lamp lit and put out
  between them, ended in the pit; the count read 4, 3, 3, 3, 2, 1, then 3
  after the death.
- Carrying limit: an eighth object refused.
- Score: 30 for three treasures in the building, the same after a death;
  150 with all fifteen carriable treasures poked there; `100` with
  twenty objects poked there as treasures.
- Cave closing: flag 12 clear with 18 objects in the building, set with
  15, and the hall of mists then led to the repository.
- The blast: lava at the north-east end, death with rod 10 present,
  the winning text with the player poked into room 116 in a new game;
  `DROP ROD` with rod 10 in hand answered "You have it already".
- The dwarf's axe back in the canyon after it was dropped elsewhere.
- `GET BEAR` with the bear poked gentle and the chain still on the
  wall: "Okay", and the chain stayed.
- Eggs thrown to the troll, then `FEE FIE`: eggs in room 92, troll gone.
- `KILL CLAM` and `OVER` at the bridgeless fissure: a blank line.
- The jiffy clock: 359 ticks in 300 frames, and its writer at `$F69F`.
- The turn digits poked to `9999`: the next command left `0000` and
  `$1067` changed from `$85` to `$86`, and the game printed blank lines
  from then on.

## The listing's accuracy

One sample of the listing's comments, seed 20261008, checked against the
bytes by an agent (on `claude-opus-5-5[1m]`) that wrote none of them. The
2,015 comments fall in two strata: 188 written by hand (the code, the
variables and the built-in messages) and 1,827 written by the decoder in
`work/` from the records of the game's tables. The sample drew 40 by
hand and 20 by the decoder.

3 of the 60 were wrong, 5.0 % (Wilson 95 % interval 1.7-13.7 %): none of
the 40 by hand (0-8.8 %) and 3 of the 20 by the decoder (15 %, Wilson
5.2-36.0 %), so 13.6 % weighted by the strata's sizes. All three were the
same sentence of the decoder's action-list template, which said each
action is stored as a code and an argument. The engine reads them two
bytes at a time, but the actions that ignore the argument all leave the
rule, and the lists store them as the code alone: the byte read with it
is the first of the next list. The template was tested against all 452
lists: 322 end in a one-byte action, and command rule 85 alone keeps an
argument byte (`$1D`) after its end turn. All 323 were rewritten from the
bytes by the decoder, and the counts agree on every list with the
checker's own decoder. `run_actions` (`$1794`) says the same now. The
checker marked three hand comments right with a caveat: the bytes before
the line buffer, `turns` and `room_spare` said nothing reads them, and
SAVE and RESTORE carry each with the block from `$0BBB`. They say so now,
and so does `$0CA6`, the one other comment of that kind. The
other templates (the texts, the vocabulary, the exits, the rule heads and
the conditions) were tested against the code that reads each: the first
match in `lookup_word`, noun `$FF` as any noun in `command_rules`, and
condition lists of two bytes each throughout.
