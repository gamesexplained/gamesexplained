# Zork I — the story: verified technical facts

Current truth for the story, the Z-machine program the interpreter runs.
The interpreter's facts are in `parts/interpreter/facts.md`. Every fact
names the routine or table it comes from. Unless marked *live*, a fact
comes from reading the code in this part's listing, which is read from the
story file on the disk (`orientation.md`). *Live* means played: in
Apple2TS where the interpreter's facts say so, and otherwise in Bocfel 2.6
with the kit's trace (`kit/zmachine`), on the same story file, with the
seed named, the commands in the run's working files.

Addresses are story addresses, five digits on the Source tab and four
here where they fit: story $2396 is memory $4F96 while the story's first
pages are resident. Global numbers are decimal; a global's name is the
one Infocom's later source gives it, where the code matches
(`original-source.md`).

## Build

- **The file.** 81,920 bytes on tracks 3-22 of the disk. Version 2,
  release 15, serial `UG3AU5`. A version 2 header has no length; the
  story's own bytes end at $132E5, the last byte of its last string, 78,566
  bytes in all. Zeros follow to $133FF, and $13400-$13FFF is a byte for
  byte copy of $11400-$11FFF, 8 KB earlier: the end of an 8 KB buffer
  written out again. The part's coverage excludes $132E6-$13FFF.
- **Names.** 347 of the 359 routines, 131 of the 138 globals and 246 of
  the 255 objects have the names Infocom's released source gives them,
  each taken only where release 15's code does the same job in the same
  steps. Names in lower case are the run's own. The source is of a later
  release, 119 (`original-source.md`).

## Memory layout

| Story address | What | Read by |
|---|---|---|
| $0000-$003F | header | the interpreter's $08C8 and the story |
| $0040-$00C9 | the text of the 32 abbreviations | the interpreter's $195F |
| $00CA-$0109 | abbreviation table, 32 packed addresses | the interpreter's $195F |
| $010A-$0147 | property defaults, 31 words | the interpreter's $100D |
| $0148-$0A3E | 255 objects, 9 bytes each | the interpreter's $16BB |
| $0A3F-$20DD | property tables: short name, then properties in descending order | the interpreter's $167D |
| $20DE-$21F1 | 138 globals, variables 16 to 153 | the interpreter's $0B12 |
| $21F2-$222D | the tables round the house and the forest, and ABOVE-GROUND | GO-NEXT, RANDOMIZE-OBJECTS |
| $222E-$2395 | C-TABLE, the timed events, 180 bytes used and 180 never reached | INT, CLOCKER |
| $2396-$2485 | parse buffer, 240 bytes (global 54) | sread, the interpreter's $12EB |
| $2486-$254D | text buffer, 200 bytes (global 37) | sread |
| $254E-$2CDB | the parser's tables and the game's tables of rooms and messages | the routines that name them |
| $2CDC-$2DB1 | start of static memory: the verb table, 107 words (global 137) | SYNTAX-CHECK |
| $2DB2-$347F | sentence patterns, a list for each verb, 8 bytes a pattern | SYNTAX-CHECK |
| $3480-$355F | action routines, 112 packed addresses (global 135) | PERFORM |
| $3560-$363F | pre-action routines, 112 words, 13 of them non-zero (global 136) | PERFORM |
| $3640-$3685 | the 17 prepositions, numbers 239-255 (global 134) | PREP-FIND |
| $3686-$476B | dictionary: separators `,` `.` `"`, then 617 entries of 7 bytes | the interpreter's $1432 |
| $476C-$E925 | high memory: 359 routines | the interpreter's $1752 |
| $E926-$132E5 | 411 strings, printed by packed address | the interpreter's $18D2 |
| $132E6-$13FFF | past the story's end (above) | nothing |

## Mechanics

- **The player is called `cretin`.** Object 252, which global 38 (WINNER)
  holds in play, has the short name `cretin`; the one noun in its
  property 18 is `advent`, for adventurer. The words `cretin`, `me`,
  `myself` and `self` are object 75's nouns, `you`, one of the objects
  inside object 23, which has attribute 20 like the player. Live: `kill
  cretin` asks `WHAT DO YOU WANT TO KILL THE CRETIN WITH?`, and `hello
  cretin` answers `THE YOU BOWS HIS HEAD TO YOU IN GREETING.`
- **The score.** SCORE-OBJ ($61EA) adds an object's or a room's property
  13 to the score, then sets it to 0; it is called when an object is taken
  ($6A5C) or put somewhere ($6B34) and when the player enters a room
  ($7112). 23 things carry one: 19 objects and four rooms, the Kitchen
  (10), the Cellar (25), the East-West Passage (5) and the Treasure Room
  (25), 208 points in all. Property 12 of the nineteen treasures comes to
  129 (below). The last 13 are LIGHT-SHAFT, global 35, which NO-OBJS
  ($CC4C) adds once, when the player is in the Drafty Room and LIT is set,
  and then sets to 0: 208 + 129 + 13 is 350. Dying takes 10 away
  (JIGS-UP, $6467).
- **Walking into the dark.** When a room has no exit in the direction
  asked and LIT is 0, the walking routine rolls `random 100` and on 1-74
  prints `Oh, no!  You have walked into the slavering fangs of a lurking
  grue!` and kills the player ($68B9); otherwise `You can't go that way.`
  Live: in the cellar with the lamp left behind, `east`, a direction with
  no exit, gave the grue's line and `YOU HAVE DIED`, and the score went
  from 35 to 25.
- **Exits.** Properties 19-31 of a room are its exits, and V-WALK
  ($6808) reads them by length: 1 byte is a room; 2 a message, printed; 3
  a routine, called, which gives the room or 0; 4 a room, a variable
  number and a message, the room taken when the variable is not 0 and the
  message (or `You can't go that way.`) when it is; 5 a room, a door and a
  message, the room taken when the door has attribute 13, the message (or
  `The ... is closed.`) when not. The direction words' dictionary entries
  carry the property numbers: north 31, east 30, west 29, south 28,
  north-east 27, north-west 26, south-east 25, south-west 24, up 23, down
  22, in 21, out 20, land 19.
- **Nouns and adjectives.** An object's property 18 lists the dictionary
  addresses of the nouns that name it, and property 16 the numbers of its
  adjectives ($5DEC).
- **The trophy case.** After any `take` in the living room, and after a
  `put` into the trophy case (object 183), LIVING-ROOM-FCN ($8814) sets
  the score to global 129, the points scored so far, plus the property 12
  of everything in the case (OTVAL-FROB, $898C). Nineteen objects carry a
  property 12 above 0, besides a broken canary and a broken egg; those
  nineteen are the treasures. The sword uses property 12 for how brightly
  it glows.
- **A treasure inside a container in the case scores nothing.**
  OTVAL-FROB calls itself for each container it finds, then leaves the
  result on the stack. Live: the egg put straight into the case raised the
  score from 15 to 20; the egg put into the brown sack, and the sack into
  the case, left it at 15. Infocom's later source has the same bug.
- **The last secret.** Every score change goes through SCORE-UPD
  ($6192), which adds to global 129 as well as to the score. When the
  score reaches global 83, 350, and global 30 is still 0, the routine sets
  global 30, changes two objects' attributes and prints `An almost
  inaudible voice whispers in your ear, "Look to your treasures for the
  final secret."` Global 30 is the condition on West of House's
  south-west exit, to the Stone Barrow (property 24: room 180, variable
  $2E). Live: with global 30 written as 1 (memory $4D1A-$4D1B) at West of
  House, `southwest` led to the Stone Barrow, and `west` or `enter` there
  printed the ending, `PLAY "ZORK: THE GREAT UNDERGROUND EMPIRE, PART
  II".`, with a score of 0. The barrow's own routine ($85D8) gives the
  ending; its one exit is north-east, back to West of House.
- **Strength in a fight** is 2 + score ÷ 70 (FIGHT-STRENGTH, $E20C), from
  2 at the start to 7 at 350 points. When asked, the routine adds the
  player's property 15, which wounds lower. The troll's property 15 is 2,
  the thief's 5 and the cyclops's 10,000.
- **Saying hello to the sailor.** `hello sailor` names object 22,
  `sailor`, one of the objects inside object 23, and counts in global 81
  ($766E): every twentieth answers `You seem to be repeating yourself.`,
  every other tenth `I think that phrase is getting a bit worn out.`, and
  the rest `Nothing happens here.` Live, twenty in a row from West of
  House: the 10th and the 20th gave those two answers, and the other
  eighteen `NOTHING HAPPENS HERE.` `hello` alone prints a greeting from a
  table (global 87), `HELLO.` live. Said to an object with attribute 20 it
  answers `The ... bows his head to you in greeting.`, and to any other `I
  think that only schizophrenics say 'Hello' to a ...` (live with
  `mailbox`).

### Bugs

- **A knockout always ends in death.** DO-FIGHT ($E16E) sets L06 to 2-4
  after a knockout, one to three more rounds, and lowers it with `dec L06`
  ($E1CE), an indirect reference: it lowers the local whose number L06
  holds, L02, L03 or L04, never L06. The rounds go on in the same turn,
  and against a player who is out VILLAIN-BLOW turns every result into a
  hesitation or a killing blow ($E35D). Live, seeds 1-40, an unarmed
  player waiting in the Troll Room: 28 knockouts, each followed in the
  same turn by up to five hesitations and `Conquering his fears, the troll
  puts you to death.`
- **A container carried into the Timber Room or the Drafty Room crashes
  the game.** NO-OBJS ($CC4C), at the start of each command, walks the
  player's possessions from the first; for a container (attribute 14) it
  calls itself ($CC68) with the container as an argument it never reads,
  and the call walks the player's possessions from the first again. A
  thing bigger than size 5 ahead of the container stops the walk first.
  Live, seeds 1-5: lamp, garlic and sack carried, the sack taken last, then
  `look` in the Timber Room stopped Bocfel with `call stack too deep: 1025
  (pc = 0xcc68)`; with the sack left at Ladder Bottom, `look` and
  `inventory` worked. On the Apple II the Z-machine's stack holds 178
  words and the push that does not fit is the BRK at the interpreter's
  $21E7 (traced, not played on the Apple II).
- **Disarming the troll breaks every "narrow".** TROLL-FCN ($8D3B),
  for a troll without his axe in the player's room, has `storew #99 #0B`,
  where every other branch has `put_prop TROLL #0B`: it writes $8E7F, the
  packed address of `A troll is here.`, to story $00AF-$00B0, inside the
  text of abbreviation 26, `narrow `, and clears its end bit. Live, seed 1,
  also 23 and 34: after `The troll, disarmed, cowers in terror`, the
  cellar was `a dark and damp cellar with a narroizx'.1 passageway`.
- **Shaking an open container hangs the game.** V-SHAKE ($7DE7-$7DEE)
  moves the container's first child into the container itself, so the
  loop never ends. Live: `open sack`, `shake sack` in the kitchen; no
  output, the trace looping at $7DE7-$7DEE.
- **Throwing anything at the bottle.** BOTTLE-FUNCTION ($AB21) removes
  PRSO for `throw` without asking whether it is the bottle, prints `The
  bottle hits the far wall and shatters.`, and returns false unless water
  spilled. Live, seed 7: `throw lamp at bottle` in the kitchen gave that
  line, then `The lamp has smashed into the floor, and the light has gone
  out.` (LANTERN); the bottle stayed on the table with its water, and a
  broken brass lantern lay on the floor. Thrown empty at the window, the
  bottle shattered and then `You're not carrying the glass bottle.`
- **Any verb on the skeleton brings the curse.** SKELETON ($947A) has no
  test of the verb: it prints the ghost's curse and calls ROB on the room
  and on object 252 to object 214, the Land of the Living Dead. Live, seed
  1: `examine skeleton` in the maze; the bag of coins in the room was
  gone.
- **The Loud Room echoes `save`, `restore` and `quit`.** LOUD-ROOM-FCN
  ($B248), while the room is loud, reads lines itself and answers all but
  `w`, `e`, `u`, `bug` and `echo` with the line's last word twice. Live,
  seed 1: `quit quit ...`, `save save ...`, `there there ...` for `hello
  there`, `That's only your opinion.` for `bug`; `w` gave `Round Room` with
  no description; `echo` gave `The acoustics of the room change subtly.`
  and the room was quiet from then on.
- **Taking the water from the bottle takes the bottle.** WATER-F
  ($ABA4). Live, seed 1: `open bottle`, `take water` in the kitchen gave
  no reply, and the player held the bottle, water and all.
- **Throwing something at the spirits.** GHOSTS-F ($9DEE) as the
  indirect object prints `How can you attack a spirit with material
  objects?` and returns false. Live, seed 1: `throw garlic at spirits`
  gave that line and then `Thrown.`
- **The garlic does not keep the bat off.** BAT-F ($C842) has no test of
  the garlic. Live, seed 1: `take bat` with the garlic held, three
  `Fweep!`s and a ride to a Coal Mine room.
- **A match lights nothing.** MATCH-FUNCTION ($C33A) sets the match's
  attribute 3 and leaves LIT alone, and only GO, GOTO, V-LAMP-ON,
  V-LAMP-OFF, THIEF-VS-ADVENTURER, CAVE2-ROOM and BASKET-F work LIT out.
  Live (the sample's checker): lamp off in the North-South Passage, `light
  match`, `look` gave `It is pitch black.`
- **The cyclops is never run as a villain.** I-FIGHT's loop and
  DO-FIGHT's stop when the count reaches VILLAINS' count, 3 ($5A31,
  $E180), so the cyclops's entry, the third, is never read by them.
  Infocom's later source has the same loops.
- **`score` says "would be".** V-SCORE's argument defaults to 1, and
  nothing passes 0. Live, seed 7: `Your score would be 0 ...`.
- **A restore prints only `Ok.`** The restored game resumes at V-SAVE's
  branch. Live, seed 7.
- **`wait` passes one turn, not three.** CLOCKER returns true whenever it
  ran an event, and I-FIGHT runs every turn, so V-WAIT's loop stops at
  once. Live, seed 7: `wait`, `score` counted 1 move.
- **Twenty-six questions overflow the orphan clause.** Each orphan
  question appends to P-OCLAUSE ($270E), whose count is never reset. Live,
  seed 7: after 26 rounds of `put leaflet` and `wait`, `i` printed `You
  are carrying:` and then the tail of V-FROBOZZ's text, `n and operates
  this dungeon.A leaflet`.
- **The egg's missing new line.** Live, seed 7: `climb on egg` gave `...
  badly damaged.There is a golden clockwork canary nestled in the egg`.

How release 15 differs from Infocom's later source, routine by routine,
is in `original-source.md`.

## The listing's error rate

One sample of the story's comments, seed 20261028, checked against the
bytes, and in Bocfel where a claim was about play, by an agent (on
`claude-opus-5-5[1m]`) that wrote none of them. The 2,110 distinct
comments fall in two strata: 728 written by the run and 1,382 written by
map.py's templates for the story's tables, strings and routine headers.
The sample drew 60 from the first and 20 from the second.

10 of the 80 were wrong in a detail, 12.5 % (Wilson 95 % interval
6.9-21.5 %): 10 of the 60 by the run (16.7 %, 9.3-28.0 %) and none of the
20 by the templates (0-16.1 %), so 5.8 % weighted by the strata's sizes.
That is over the mark of one in 30. Each of the ten stated a list, a
condition or an argument wrongly: three of RIVER-LAUNCH's shores lead to
the Reservoir and the Stream ($2122); THIEF-ENGROSSED's cap on the
thief's strength never applies, since I-FIGHT clears the flag first
($2186); RANDOMIZE-OBJECTS puts only what is not a treasure in the rooms
above ground ($2216); DROWNINGS holds nine messages, not eight ($27BA);
an object right after `and` or a comma never ends a clause, and CLAUSE
returns false after a word it cannot use ($4D4A); a command with no
preposition takes a pattern's fallback whatever its preposition, and the
last fallback found wins ($5058); a match leaves the room dark to `look`
too ($C33A); the forest is not in scope from the house ($D9D4);
WINNER-RESULT's third argument is the unwounded strength, so a miss
restarts the cure ($E60E); and two baskets have descriptions, not one
($E926). All ten were corrected, with the five comments that said the
same (DROWNINGS, I-MAINT-ROOM, VILLAIN-STRENGTH, and I-FIGHT and DO-FIGHT
for the loops that skip the cyclops). The checker's rate is a lower bound
on the true rate.

## Live tests

Bocfel 2.6 with the kit's trace, `-z` seed as named, on the story file.

- Seed 7: `score`, `save` then `restore`, 26 orphan questions, `wait`,
  the egg, the bottle thrown and thrown at.
- Seed 1, 23 and 34: the troll disarmed with the sword, then `look` in
  the cellar.
- Seeds 1-40: walk to the Troll Room unarmed, then `wait` until the
  troll strikes.
- Seeds 1-5: Ladder Bottom with lamp, garlic and sack, the sack taken
  last, west into the Timber Room, `look`; and the same with the sack
  left behind.
- Seed 1: `examine skeleton` in the maze; `open bottle`, `take water`;
  `throw garlic at spirits` at the Entrance to Hades; `take bat` with the
  garlic; the Loud Room's echoes; `open sack`, `shake sack`.
- The sample's checker: `listen`; a match in the North-South Passage; the
  Maintenance Room flooding; `walk around` the forest from the house and
  Up a Tree.
