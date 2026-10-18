# The NeverEnding Story — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshots named in `orientation.md`.

The game is four parts (`kit/scripts/parts.py`): the engine, which stays
in memory from the opening to the end, and the three story parts, each a
file that loads over $2F00-$95FF. This file holds what spans them and
names the part beside every address: an address with no part named is
the engine's. What is true of one part alone, the engine's display and
sound among it, is in that part's `parts/<id>/facts.md`.

## Build

- Ocean Software, 1985: "Game Design & Programming By Ian Weatherburn,
  Graphics By Steve Cain, Music By Martin Galway, © 1985 Ocean Software
  Ltd." (the opening's credits text, engine $B85D, printed by $1580).
- The copy analysed is the one cracked by MrL and Dr Bakterius, from the
  Internet Archive item `Neverending_Story_The_1985_Ocean_cr_MrL_Dr_Bakterius`:
  a .d64 of 174,848 bytes, MD5 `1938dd66ac2dcf1f9067532f41c0b3e8`,
  SHA-256 `4a1e39bad1bed50d2814b54e494391008ff8d42f441cb55960f86318c9a9f894`.
- Its directory holds four program files: `THE NEVER. STORY` (132
  blocks, the engine, packed), `PART 1`, `PART 2` and `PART 3` (104
  blocks each). Each PART file's load address is $2F00 and it ends at
  $95FF, the range the engine leaves for the story (engine
  `SHOW_PART_LOAD_SCREEN` $0439).
- The engine unpacks itself. The depacker leaves its code at engine
  $0100-$01D7: a run-length scheme with the escape byte $D3, ending with
  $01 = $37 and a jump to $3300. The game proper starts at engine $0400.
- The copy keeps signs of a cassette original. The loader at engine
  $C000 is the cracker's disk loader written over the first 34 bytes of
  a cassette turbo loader, whose rest ($C022-$C175, run at $9722) reads
  pulses with CIA 2's timer B and CIA 1's FLAG interrupt and never runs.
  The game's own values for $01, $05 and $06, leave bit 5 clear, which
  turns the cassette motor on (`kit/skills/c64/c64-reference`), and its
  retired save code names device 1, the cassette ($050C).
- Datasoft's 1987 disk release is a different build (it writes $35 and
  $36 to $01 and saves to device 8) and is not the one analysed.

## Memory layout

| Thing | Where |
|---|---|
| Depacker leftovers in the stack page | $0100-$01D7 |
| Engine code: main loop, line editor, text printer, parser, script interpreter, blitter | $0400-$16B3 |
| Exits, verb-noun rules and vocabulary | $16B4-$1C6E |
| Resident turn script, sentences, object descriptions, dictionary, game state, start and action scripts | $1C6F-$2EFF |
| One story part: its tables, scripts, texts and pictures (each part's own listing) | $2F00-$95FF |
| Title tune driver (the opening); the disk loader replaces $9700-$98FF when the opening ends | $9680-$9FEE |
| The KERNAL's zero page, copied by the opening and swapped with the game's around each load ($053C) | $A002-$A0FF |
| Picture 0, the shared room picture | $A100-$A55F |
| 36 object icons of 160 bytes (the opening's texts fill slots 29-31) | $A560-$BBDF |
| Saved play screen: bitmap $BC00, screen bytes $C880, colour bytes $CA10 | $BC00-$CB9F |
| The disk loader as it waits to be copied to $9700, until $070F saves the screen over it | $C000-$C1FF |
| Command line buffer | $CBA0-$CBF0 |
| Screen matrix | $CC00-$CFFF |
| Play screen backdrop as loaded: bitmap $E000, screen bytes $EC80, colour bytes $EE10; from the end of the opening $E000-$EC7F is the picture band's live bitmap | $E000-$EF9F |
| Title tune's data | $F000-$F768 |
| The game's character set, under the KERNAL ROM | $F800-$FFFF |

## How the parts follow one another

- `ENTRY_POINT` (engine $0400) calls `OPENING_SETUP` ($069B), which
  starts the title tune on a raster interrupt at $A880, then $1580, which
  prints the title and credits, waits for a key, stops the tune and calls
  $070F to build the play screen. $070F copies the loader from $C000 to
  $9700 over the tune driver and the backdrop from $E000 to $BC00.
- The opening leaves `LOADED_PART_NO` ($5E) at $FF, so `INIT_GAME_RUN`
  ($14E6) calls `SHOW_PART_LOAD_SCREEN` ($0439): "Hit space to load" and
  "Part one!" (sentences $2F and $30 + `CURRENT_PART_NO`), Space, then the
  loader at $9700.
- The loader (engine $C009, run at $9709) adds one to the digit of the
  name "PART 0" at $9703-$9708, then calls the KERNAL's SETNAM, SETLFS
  with file 1, device 8, secondary address 1, and LOAD. So each load is
  the next file by name, whichever part the game asks for.
- A part ends with action $1F, `ACTION_NEXT_PART` ($0FF1), which clears
  flag 2 and enters `SWITCH_TO_NEXT_PART` ($0415): `CURRENT_PART_NO` + 1,
  the room set to $34 for Part 2 and $4D for Part 3, the load screen and
  the load, then `SETUP_CURRENT_ROOM` ($1544) runs the new part's start
  script. All three start scripts are in the engine ($2968, $296E,
  $297E); the events and pictures they name are the loaded part's.
- Each part ends in a room script. Part 1's ends at the great mirror,
  room $28, past the sphinxes; Part 2's on the hill, room $36, once the
  golden key and Auryn are carried and Falkor is with Atreyu; Part 3's
  in the Empress's quarters, room $7C, with Auryn carried, where the
  win restarts the game (`parts/part-1`, `part-2`, `part-3` facts). *Live*: the route in
  "Live tests" played Parts 1 to 3 through both hand-overs to the end.
- Rooms are numbered across the game: $00-$28 in Part 1, $29-$4C in
  Part 2 and $4D-$7C in Part 3 (`PART_ROOM_BASE_IDS` $0DCC). The engine
  subtracts the loaded part's first room before indexing a part's
  tables ($0B58, $14A2).
- Pictures are numbered across the game too: 0 is the shared one at
  $A100, 1-20 are Part 1's, 21-36 Part 2's and 37-56 Part 3's, each
  part's set starting at $4300 in its file (`ROOM_GRAPHIC_TABLE` $0BF9,
  57 records). `OBJ_ROOM_TABLE` ($0D4F) gives each of the 125 rooms its
  picture.

## Timing

- The engine runs no clock. A turn is one command line: `MAIN_LOOP`
  ($0409) runs the turn scripts ($147D), reads a line ($0806) and
  carries it out ($122F).
- The line editor counts its own idle time in `IDLE_COUNTDOWN`
  ($60-$62, set to $04FFFF at $0806 and counted down once a pass of its
  keyboard loop, $083C). When it runs out, "You wait!" is printed
  (sentence $13, $08C4) and whatever was typed is carried out, so a turn
  passes while the player does nothing. Each key pressed adds one to the
  top byte ($0855), about another quarter of the wait. *Live*: with no
  key pressed, the wait from the prompt was 1,591 frames, 31.7 seconds.
- The raster interrupt runs three times a frame during play: line 49
  switches to the multicolour bitmap for the picture band ($A7E3), line
  130 back to text ($A80A), line 138 only arms the next frame
  ($A835). The dispatcher at $A7E0 picks the phase by a self-modified
  branch offset at $A7E2.
- The title tune plays once a frame from the opening's interrupt at
  $A880. One pass of the tune is 11,328 frames, 3 minutes 46 seconds at
  the PAL frame rate of 50.125 Hz. Run on its own from `MUSIC_INIT`
  (engine $96DA), voice 1 reaches the four closing rests all three
  voices share ($F247) at frames 10,944 and 22,272, and starts its
  stream again ($F250) at frames 11,328 and 22,656.

## Controls

- Typed commands only. The line editor ($0806) takes Return, Delete,
  Space and the letters, which it folds to lower case, up to 78
  characters at $CBA0.
- The parser ($122F) matches the first three letters of each word
  against the 142 stems at $1A2E ("sav", "loa", "art", ...); after the
  stems "nor" and "sou" it reads three more letters, so that NORTHEAST,
  NORTHWEST, SOUTHEAST and SOUTHWEST are directions of their own
  ($1325). Stems that share their three letters are not told apart: of
  the three "tre" the first, $CB at $1B82, always wins. The first verb,
  and the first word after it that the parser does not skip, noun or not
  (FLY SOUTH takes the direction), pick a rule from the 70 verb-noun
  pairs at $19A0, $FB in the noun place matching any noun.
- Directions are N, NE, E, SE, S, SW, W, NW, U and D, each a verb with
  its own exit table ($16B6); 356 exits in all.
- SAVE and LOAD are words the parser knows, but their actions jump to
  one-byte returns ($1189 to $0491, $118C to $045F). The save and load
  code that the returns stand in for is still there ($0494, $0461), and
  names device 1, the cassette (`SETUP_KERNAL_FILE` $050C). QUIT asks
  "Are you sure?" and restarts on Y ($0FCC).

## Mechanics

- **Scripts.** All the game's logic is bytecode run by `RUN_SCRIPT`
  ($1605): opcodes $80-$89 are tests, $00-$20 are actions, $FE ends a
  clause and $FF the script; a failed test skips to the next $FE
  (`CONDITION_DISPATCH_TABLE` $1193, `ACTION_DISPATCH_TABLE` $0DE3).
  Each turn runs the resident turn script ($1C6F), the part's turn
  script (part $2F06) and the current room's script (part table at the
  address in $2F04), then the action script of the rule the command
  matched ($1403).
- **State.** 54 object locations at $28BF (a room, $FC carried, $FD
  gone), 32 flags at $290F, 16 counters at $292F, the room at $293F and
  the part at $2940. A new game copies the starting locations from
  $226C and clears the flags and counters ($14FE).
- **Carrying.** TAKE refuses a sixth object: counter 0 is the number
  carried, and 5 stops it with "You've got a full load already!"
  ($0F22, sentence $0B).
- **Strength.** The resident turn script sets Atreyu's strength,
  counter 1, to 50 once, warns at 10 ("Atreyu is very weak!"), taking
  one more point as it does, and ends the game at 0 ($1C6F). Food restores it (sentence $18). Poison, flag
  8, takes strength each turn until the apple cures it (sentences $40,
  $36).
- **Light.** Flag 7 is light. A dark room prints "It's too dark to see
  anything!" in place of its description ($107E); four turns in the
  dark, counter 6, end the game ("Something grabs you out of the
  darkness and strangles you!"). The glowglobe keeps flag 7 set while
  carried ($1C6F).
- **Chance.** The one random test, opcode $88, passes when the low byte
  of the raster line is no more than its operand ($1222, $0695). A PAL
  frame is 312 lines, so the bytes 0-55 come round twice a frame and
  the rest once: an operand n passes on n + 1 + min(n, 55) + 1 of the
  312 lines, when the test is equally likely to fall anywhere in the
  frame. That is 102 lines for 50 (33 %), not the 51 in 256 (20 %) the
  operand suggests.
- **Restart.** QUIT and Y, a death or the win runs `RESTART_GAME`
  ($0FDD) and then `INIT_GAME_RUN`, which reloads Part 1 if any other
  part has been loaded since (`LOADED_PART_NO` $5E). In this copy the
  loader always takes the next file by name, so a restart after Part 2
  has loaded asks for "Part one!" and loads PART 3, and one after the win
  asks for PART 4, which the disk does not hold: the game then plays
  Part 1's start with another part's texts in memory (see "Live
  tests").

## Data tables

| Table | Where | Size |
|---|---|---|
| Sentences, the engine's own messages | pointers $1CB0, text from $1D38 | 68 |
| Object descriptions | pointers $22C9 | 54 objects |
| Dictionary words that texts call by number | pointers $25DD, words $2699-$28B8 | 94 |
| Vocabulary stems | $1A2E-$1C66 | 142 |
| Verb-noun rules and their action scripts | $19A0, pointers $2986 | 70 |
| Exits, one table per direction | $16CA-$199B | 356 |
| Picture records | $0BF9-$0D4E | 57 |
| Room pictures | $0D4F-$0DCB | 125 rooms |
| Starting object locations | $226C-$22A2 | 54 |
| Noun-to-icon map | $22A4-$22C8 | 36 |
| Each part's room texts, events, room scripts and pictures | part $2F00-$95FF | see each part |

Text is compressed: a byte with bit 7 set is a dictionary word, any
other run is a literal word that starts with a capital; letters print in
lower case except after a full stop, at the start of a message or
event, and at the start of a dictionary word, which keeps its first
capital ("Atreyu", "Great Forest"); '<' starts a line ($0A0E, $0ADB).
$FF takes the next byte as a colour only in the title and credits, which
$1580 prints straight through $0ADB: no compressed text holds one, and
$0A0E would read it as a dictionary word.

## The listing's error rate

The first sample drew 60 of the listing's 2,000 comments with seed
20261017, in two strata: 40 of the 1,472 written by hand and 20 of the
528 written from templates (the engine's sentences, object descriptions
and action scripts, the tune's segments, and the three parts' texts,
scripts and pictures). A checker on a proven model (named in
`game.json`) that wrote none of them found 4 wrong (6.7 % plain, 6.8 %
weighted by stratum; 95 % Wilson interval 2.6 % to 15.9 %), a lower
bound on the true rate. Three were written by hand: the zero page at
$A002-$A0FF was called the game's own, swapped in around every KERNAL
call, where it holds the KERNAL's and is swapped in only while a part
loads; the six icon records at $2943 were labelled three bytes off,
with their fields in the wrong order; and `PRINT_SENTENCE` was said to
print a blank line first, which it does only when the cursor is at
column 0. One was a template's: every room's text named the picture
`OBJ_ROOM_TABLE` gives it as its picture, even where the room's script
shows another, and called picture 0 the picture of every room without
one of its own. All four were corrected, with 174 more comments that
said the same things or were found wrong when each template was tested
against the code: the scroll test ($CFE8, not $CFC0), the drop
capital's colour (yellow, not light grey), the save code's device (1,
the cassette), the sentences the template said nothing prints (it
missed a JMP to the printer and the part names' computed id), the
pause action (Space only, with its message), two DROP rules no command
can reach, and the chance test, whose odds the template gave as n + 1
in 256 where a PAL frame's 312 lines make them n + 1 + min(n, 55) + 1
in 312.

Because 4 is over the mark of 2, checkers on the same proven model then
audited every comment, one address range at a time: the engine in three
ranges and the three parts together, 2,019 comments in all. They found
211 wrong in a detail or worse, about one in ten, and each was
corrected. Among them: the map at $22A4 was read the wrong way round
(it maps icon slots to objects); $FD30, where the code reads the KERNAL
ROM's vector table, was labelled as the font beneath it; and the
templates listed, as users of an event, scripts that a room test
confines to another part. A sixth checker checked the 153 claims in the
five `facts.md` files and corrected 13, and the pages' text, where 8
were corrected.

The second sample, after the audit, drew 60 more comments with seed
61018: 40 of the 1,451 written by hand and 20 of the 508 written from
templates that the first sample had not drawn. A checker that wrote none
of them found 4 wrong (6.7 % plain, 6.3 % weighted by stratum; 95 %
Wilson interval 2.6 % to 15.9 %), each in a detail: the ways into a tune
segment left out the return from the call before it; a maze script
quoted one of its three maze texts for all 19 rooms; a zero-page note
missed the swap around each part's load; and a side comment said disk
where the load is from the cassette. All four were corrected, with five
more tune segments the same template had left incomplete in the same
way.

## Live tests

- *Live*, on the copy above in VICE 3.13.2: from the Part 1 command
  prompt, the commands NE, E, GET AURYN, SW, GET STONE, S, GET HORN, W,
  N, GET BRANCH, S, E, N, NE, W, SW, LIGHT BRANCH, NE, E, E, E, E, E,
  E, LIGHT BUSHES, D, HIT BOX, GET CRYSTAL, U, W, W, W, W, W, SW, S, W,
  SE, BLOW HORN, GET FALKOR, FLY SOUTH, E, S, E, DROP CRYSTAL, S, S
  reach the sphinxes; WAIT until flag 5 ($2914) is set, then S loads
  Part 2 (the loader's name read "PART 2"; the machine stopped at the
  hand-over $0456 with part 1 and room $34). Part 2's route ends with GET
  AURYN and GET FALKOR, which loaded "PART 3" and stopped at $0456 with
  part 2 and room $4D. Part 3's route ends at room $7B, and E there
  shows the ending. A checkpoint on `RESTART_GAME` ($0FEE) was never hit
  on the way. The routes are in each part's facts.
- *Live*: at the sphinxes, flag 5 was set after nine WAITs.
- *Live*: in Part 2 (room $34), QUIT and Y printed "Game over!" and
  "Hit space to load part one!"; at the loader's call ($0453) the game
  was in part 0, room $01; the load returned with the name "PART 3" and
  Part 3's first bytes at $2F00, and the screen then filled with
  unreadable text (`reference/restart-part2-prompt.png`,
  `reference/restart-part2-after.png`).
- *Live*: after the ending, the restart asked for Part one again; LOAD
  returned with carry set and A = 4 (file not found) for "PART 4", $2F00
  still held Part 3, and the screen filled with unreadable text under
  picture 47 (`reference/ending-restart.png`).
- *Live*: from the Part 1 prompt with no key pressed, a non-stopping
  checkpoint on the picture band ($A7E3) counted 1,591 frames before
  the editor's timeout ($08C4).
- *Live*, from the Part 1 prompt in room $01 (`work/scripts/disc_live.py`): N E and NORTH EAST
  each answered "You can't do that." and left Atreyu in room $01; NE took him to room $02
  (`reference/n-e.png`). SAVE and LOAD printed nothing but a blank line
  (`reference/save-load.png`). MUSIC and NOM each printed "Ok!", and TEST printed nothing
  (`reference/mus-nom-test.png`). XYZZY answered `I don't understand the word "xyzzy"`.
- *Live*, with CURRENT_ROOM ($293F) poked (`work/scripts/disc_tree.py`): in room $11, GET TREE
  answered "You can't do that." and CLIMB TREE "The tree is not strong enough to climb!"; in
  room $23, GET TREE answered "You can't do that." and CLIMB TREE took Atreyu to the top of the
  tree, room $20's description. Objects 2 and 50 lay in rooms $11 and $23.
- *Live*, walking from room $01: in rooms $05 and $0A (room $05's script shows no picture,
  room $0A's shows picture 6 only while Artax is with Atreyu, flag 0), the
  picture in use ($2942) was 0, the open book, the same as `OBJ_ROOM_TABLE` gives them; in
  room $04 it was 18 and in room $06 5, as the table gives.
