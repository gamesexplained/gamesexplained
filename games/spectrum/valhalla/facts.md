# Valhalla — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

BASIC line numbers are the program's own; a line "run from" another is
the line a `GO TO` or `GO SUB` names when that line does not exist, so
the ROM runs the next one. Addresses are the 48K Spectrum's.

## Build

- The original Legend release: `Valhalla (1983)(Legend).tzx` from the TOSEC
  set, four ROM-speed files (`orientation.md`). No turbo loader, no
  protection.
- Line 10 of the game's program is `REM LEGEND (c) 1983 021083`: the
  publisher, the year and 2 October 1983, the date Spectrum Computing
  gives for the release (`build_stamp`, $5D32).
- The machine code carries "Jas.Learmont" at $FE5C (`signature`), James
  Learmont's name, where nothing reads it.
- Leftovers from the authors' machine: $D1D3–$D2B0 (`stale_variables`,
  222 bytes nothing reads) holds from $D200 an older copy of the input
  editor's variables with "quitt the axe at Nidhogg" in its line buffer; $FF21 to the end of memory holds what was
  in memory when the file was saved, from $FFC9 the ROM's user-defined
  graphics as it sets them up. The variable `i` is 13 on the tape
  (`leftover_for`, $C991): the end of a `FOR` loop to 12 run as a direct
  command before the program was saved.

## Memory layout

| Thing | Where |
|---|---|
| Screen | $4000–$5AFF; the picture in character rows 0–15, the white text window in rows 17–21, the input line in rows 22–23 |
| BASIC program | $5CCB–$AD59, 20,623 bytes |
| Machine code in line 1's `REM` | $5CD0 `scroll_text` (USR 23760), $5CF0 `save_game` (USR 23792), $5D0B `load_game` (USR 23819), $5D25 `restore_trap` |
| BASIC variables, as the tape loads them | $AD5A–$CBF2, 7,833 bytes, with the end marker $80 at $CBF3 that LOAD writes |
| The text area `n$` (640 characters, 20 lines) | $AD5A (`text_area`), its text from $AD60 |
| The dictionary `d$(255,11)` | data from $AFE8: row n at $AFE8 + 11 × (n − 1) (`dictionary`) |
| Objects and character extras `p$(100,3)` | data from $BAF7: row n at $BAF7 + 3 × (n − 1) (`objects_table`) |
| Characters `c$(39,20)` | data from $BC2B: row n at $BC2B + 20 × (n − 1) (`characters_table`) |
| The map `m$(81,18)` | data from $BF3F: row h at $BF3F + 18 × (h − 1) (`map_table`) |
| Facings `d(39)`, screen columns `g$(2,32,2)` | $C4F1, $C5BA |
| Special places `s$(36,9)` | data from $C64C (`special_places`, $C644) |
| Simple variables: constants, the game's state, routine line numbers and machine-code addresses | $BADD–$BAEE and $C790–$CBF2, between and after the arrays |
| Machine stack, RAMTOP | below $D065 (`CLEAR 53349`) |
| `parse_result`, the parser's 13-byte answer | $D066 (`rad`, 53350) |
| Parser | $D073 `parse_command` (`syntad`, 53363) |
| Input editor and its variables | $D2B4 `input_vars` (IX), $D2DD `input_line`, $D361 `word_list` (`tokad`), $D48D `input_init` (`ioad`) to $D784 `enter_pressed`, $D937 `find_word` |
| Text window | $D6EB `print_text_window` (`priad`, 55019) |
| `enter_flag` | $D2B3 (`fad`, 53939) |
| BASIC error trap | $DA3C `break_trap` |
| Random numbers | $DAB0 `rng_state`, $DAB4 `random`, $DE35 `seed_random` |
| Drawing primitives | $DA6A–$DF8F: skylines, fills, dots, strokes, dashes, lines, mirroring, shading |
| Castles, huts and halls | $DF90 `castle_tiles` to $E12C `castle_start`, $E624 `hall_paint` to $E7C3 |
| Terrain drawers | $E352 `terrain_table` (8), $E362 `view_table`, $E372–$E623 |
| Figures | $E7C4 `glyph_banks`, $E7D4 `figure_shapes` (7), $E8AA `figure_records` (39 × 5 bytes), $E96D–$EB7D glyph banks |
| Object glyphs and scenery glyphs | $EB7E `carry_tables` to $EE8E |
| Animation and the graphics commands | $EE8F `figure_walk` to $FACE |
| Graphics entry | $F7AF `graphics` (`gi`, 63407), $F7DD `gfx_table` |
| Scene features | $FACF `gfx_feature`, $FAF1 `feature_table` (15), to $FE5B |
| Interrupt | $FE69 `interrupt`, IM 2 with I = $09 (vector at $09FF in the ROM) |

## Timing

- The interrupt runs every frame (50 Hz). It calls the ROM's keyboard scan
  (`RST $38`), flips the cursor every 16 frames, and passes a newly
  pressed key to `key_pressed` ($D52B) unless a line is waiting for BASIC
  (`interrupt`, $FE69).
- `RANDOMIZE` with no number seeds `RND` from the frame counter at the
  start of each pass (line 8100), before each character's action (4070,
  4105) and after every line printed (5021), so how long a command takes
  to type changes what follows.
- Everything else runs in BASIC. Each pass of the main loop (line 8100)
  gives up to ten characters' turns (line 4010), stopping as soon as
  ENTER has set `enter_flag`; flaps the flag one time in two (line 8110);
  runs the comings and goings (line 5500); and goes round again unless a
  command is waiting, which line 8320 then reads and acts on. Nothing in the game is
  timed by the clock: strength falls only with commands, so the length of
  a pass, which BASIC sets, is the game's only pace.
- *Live*: between ENTER and BASIC taking the line, 25 to 550 frames passed
  in the commands tried, the longest while the walk of the command before
  was still being drawn.

## Controls

- Typed commands only; the joystick is not read. No `IN` instruction is in
  the machine code or the `REM` code: every key comes through the ROM's
  scan into `LAST_K`, which the interrupt hands to `key_pressed` ($D52B).
- Keys the editor takes: letters (lower-cased), digits, space and
  `! " , - . ; ?`; CAPS SHIFT 5 and 8 move the cursor a character, 6 and 7
  a screen line (32 characters), 0 deletes left, 1 empties the line, 2
  brings back the line last emptied; SYMBOL SHIFT Q and A scroll the text
  window a line back and on, Z redraws it. Any other key gets a low beep
  (`key_refused`, $D5AE), every accepted key a short click ($D5B7). The
  line holds at most 63 characters (`insert_char`, $D666). *Live*: each
  editing key tried in play.
- SYMBOL SHIFT S would leave for BASIC (`escape_to_basic`, $D5DD), and
  BREAK would stop the program, only while bit 7 of the editor's flags is
  set; `ioad` sets it and line 9800 clears it, so in play both do
  nothing (`break_trap`, $DA3C, ignores error L and carries on at the
  ROM's STMT-R-1, $1B7D).
- ENTER (`enter_pressed`, $D784): each word is looked up in the dictionary
  `d$` (`find_word`, $D937), allowing one wrong, missing or extra letter, or
  taking the entry with the most letters matched if that is within two of
  the word's length; a final "s" is allowed. The first word not found is
  shown in red and the line stays for editing (`show_bad_word`, $D8C8). A
  line of known words goes to `word_list` ($D361), five bytes a word, and
  `enter_flag` is set.
- The page's port of `find_word` gives the same row and final "s" as the
  game's code in SkoolKit's simulator for all 746 words of
  `test_parser.py`: every word of the dictionary that can be typed, each
  with an "s", three misspellings of each and 100 random strings.
- The parser (`parse_command`, $D073, from line 100) files the words by
  class (the last byte of each `d$` row): 1 a name or object, 2 a verb, 3 a
  preposition, 5 a word passed over ("the", "please", the place names), 6 a
  swear word, 7 a game command. Its answer at `parse_result` ($D066): the
  subject, verb, object, the words after "with", "from", "to" and "for"
  ("with" files its word with "for" when the verb is buy or sell),
  an amount of crowns, and the game command. A command with no subject is
  yours. A swear word is error 4, which brings Mary ("Mary is not
  amused...", line 120); every other parser error is "what?" (line 115).
- A verb picks its BASIC line as 50 × v − 4000 (`dov`, line 5450): "go"
  (101) is line 1050, run from 1055. A game command picks 50 × sc − 700
  (line 100): "l" (132) is 5900. A command with no verb that starts with
  an object or a direction is "go" (line 8403). A place name cannot start
  one: its class is 5, which the parser passes over (`parse_next_word`,
  $D194).

## Graphics

- One entry for every graphics command: the BASIC builds a string in `x$`
  and runs `LET x$=STR$ USR gi` (line 15); `graphics` ($F7AF) reads the
  string through the ROM's `DEST` and `STRLEN` and dispatches its first
  byte through `gfx_table` ($F7DD): 1 the location's picture, 2 put, 3
  move, 4 lie, 5 eat, 6 drink, 7 get, 8 drop, 9 and 10 the arms, 11 a blow,
  12 appear, 13 blush, 14 reset a figure, 15 nothing, 16 a record bit, 17 a
  missile, 18 a scene feature, 19 dark buildings, 20 the flag, 21 the
  walking speed, 22 a random number. The BASIC never sends 12, 15, 16, 21
  or 22.
- The picture is drawn, not stored. Before it, `seed_random` ($DE35) seeds
  the 32-bit shift register `rng_state` ($DAB0) from the location's number,
  so every random choice the drawers make comes out the same each time.
  The terrain (`m$` byte 1, or `s$` byte 1 at a special place) picks one
  of eight drawers from `terrain_table` ($E352): icy waste, marsh, plain,
  lakes, forest, mountains, cave, hall; the terrain one step north picks
  the view on the horizon from `view_table` ($E362). Then up to four scene
  features from `s$` or one from `m$` byte 18, through `feature_table`
  ($FAF1): castles 0–3, a hut, a cupboard shut or open, a hut's door, a
  chest shut or open, two kinds of window, a gate, a black sky, dark
  buildings. *Live*: Valheim left and entered again drew character rows
  0–11 the same to the byte, pixels and colours.
- Line 7010 sends command 19 before the picture of locations 1 to 45 (Hell),
  56, 57, 65, 66 and 81, so their buildings are red on black (`gfx_dark`,
  $FBC2). The same line seeds BASIC's own `RND` from the location
  (`RANDOMIZE h*100*5`).
- A drawer is mostly calls with their arguments in the bytes after the
  `CALL`: `draw_ridge` ($DADB, six bytes, a skyline across the screen
  filled down to a given y), `scatter_dots` ($DBDE, six), `draw_line`
  ($DED0, four), `draw_tower` ($E077, three). Pixels go straight into the
  screen through `plot_pixel` ($DBAA); `draw_line` uses the ROM's PLOT-SUB
  ($22E5) and DRAW-LINE ($24BA).
- Figures: each of the 39 characters has a five-byte record in
  `figure_records` ($E8AA): its shape (one of seven, `figure_shapes`
  $E7D4), its facing, which carried objects show and the arms' position.
  A shape is a list of 8 × 8 glyphs in one of seven banks (`glyph_banks`,
  $E7C4). Figures walk eight pixels a column (`figure_walk`, $EE8F);
  carried objects are drawn from `object_glyphs`, and the quest objects
  borrow the glyph of the ordinary object they stand for (`object_glyph`,
  $F258).
- The castle's flag flaps: command 20, one pass of the main loop in two
  (line 8110, `gfx_flag` $FBCB). *Live*: the flag's cell redrawn with no
  key pressed.
- The text is the ROM's character set, printed with `RST $10`; there is no
  font of the game's own.

## Mechanics

### Characters

- 39 rows of `c$`: you (1), the 36 of the inlay, and Snake (38) and Raven
  (39). Each has twelve slots of objects (1 the weapon, 2 the shield, 3 the
  helmet, 4–12 anything), its location and column, its crowns, six
  qualities as nibbles from 0 to 15 (1 to 15 on the tape), and its strength
  now. The qualities (`FN g`, `FN h`, `FN y`, `FN b`, `FN i`, `FN p`, line
  50): goodness and charisma in byte 17, strength and bravery in byte 18,
  brains and how readily it moves on (restlessness) in byte 19. The inlay's
  1 to 5 for charisma, strength, bravery and brains are the nibbles divided
  by three and rounded up, for every character but two: Gripe's charisma
  is 2 in the game and 4 on the inlay, and Tyr's bravery 13 in the game
  and 4 on the inlay. The inlay splits goodness in two: 1 to 7 is printed
  as badness (1 is 5, 2 is 4, 3 and 4 are 3, 5 and 6 are 2, 7 is 1), 8 to
  15 as goodness (8 and 9 are 1, 10 and 11 are 2, 12 and 13 are 3, 14 is
  4, 15 is 5). Restlessness is not on the inlay.
- Homes, `p$(n,3)`: each character's is the location it starts at, but
  Idun's (starts at 71, lives at 53), and Snake and Raven have none.
- Full strength is strength × 16 + 15 (`FN s$`, line 63): you start at 175.
- Bravery is never read: no line uses `FN b`.
- Following (line 4010): each character turn first picks one of the 38
  others at random. If it is not here, it arrives (`arr`) when it is at the
  location you just left (`ph`, set as you move, line 1077), its `FN p`
  beats RND × 8 and it likes or loathes you (`FN f(1,n)`, the gap in
  goodness, below 5 or above 11); or when its home, `p$(n,3)`, is here,
  wherever it is. Turns run only while no command is waiting (line 8100),
  so moving on at once gives a follower fewer chances.
- A character's turn (lines 4020–4070): a random one of those here (`a$`,
  which leaves you out) is `s`. Line 4040 picks two of those here at
  random, the same one possibly twice, and tries again up to three times
  while either is `s`; then the turn ends with nothing done. So a character
  alone with you never acts. One time in four the first pick becomes you
  (line 4045). Of the two, the nearer in goodness to `s` is the one it
  likes more (line 4050). A clever `s` (brains above 7, flipped one time in
  ten, `f`) is, one time in two, given the turn's action as an order from a
  random other one here (line 4057), shown as "Skadi asks Saga to ..." and
  refused by the asking rule below. Then it picks one of six actions
  (line 4070): leave for a random location (one time in two, line 4105),
  take or eat or drink what it sees (4205), drop something (4310, only
  when not clever), attack the one it likes less (4410, when they are 7 or
  more apart in goodness; one time in three a throw, 4420), give something
  to the one it likes more (4510, when they are 3 or less apart), or step
  a column aside (4610). Klepto leaves axes and swords lying (line 4205).
  A turn uses slots 4–12 only, never weapon, shield or helmet.
- Asking (line 210): a character told to act refuses one time in three,
  and always when the gap in goodness between the asker and it, less half
  the asker's charisma, is above 2. When you are the asker and it is the
  one last asked (`la`, set by every ask, yours or a character's, lines 210
  and 215, and by every trade, line 1129), seven of the other times in
  eight as well: 11 times in 12 in all. A refusal gives back 4 of the 5
  strength the command cost.
- Comings and goings (lines 5500–5526), every pass: with none or one other
  here, one time in two a character from elsewhere arrives (`arr`, line
  5750; up to nine random picks, line 5525); with two to four, nothing;
  with five or more, one time in two one of them goes to a neighbouring
  location (`dep`, line 5521). The one sent is drawn up to eight times
  against a random p from 3 to 13 until its restlessness is at least p and
  its goodness at most p (line 5518). Line 5523 is never reached: line
  5521 always goes to `dep`, as `h0` is the location here.
- Goodness changes only at line 1356, before a fight, and only when the
  command was yours (`ll` = 1): one time in two, the attacker's byte 17
  goes up 16 when the victim's goodness is under 8, down 16 when it is 8
  or more, and is stored only if the result is non-zero and under 255. The
  attacker is you for `attack`, the one you told for `Thor, attack Hel`,
  and, for a throw you ordered, the target, which fights back at once
  (line 1452, which then prints the attack line a second time). Characters
  fighting on their own turns never change.
- Only the location you are at runs. A character's location changes at
  five lines: 5105 (you), 5630 (death), 5705 (leaving, `dep`), 5760
  (arriving, `arr`) and 5320 (Klepto). `mo` (line 3610, from lines 1214
  and 1417) moves only columns. Every character here is put back to full
  strength as you arrive (line 5122), and every one that arrives (line
  5760).

### Strength, food and death

- Every command costs the one doing it 5 strength (`dov`, line 5450),
  whatever it carries; a character with none left dies, "of hunger".
  Waiting costs nothing.
- What a character can carry is limited by strength: an object's weight
  plus the load must not be more than the strength now (`bput`, line
  3110). A chest and a cupboard weigh nothing and cannot be carried.
- Food restores 64 strength and wine 32 (lines 7150, 7200), up to full
  strength (`csa`, line 3355).
- Food and wine grow back (line 5110): the tally `fo` starts at 230; each
  meal takes 2 off and each drink 1. While it is under 100, every empty
  place at a location you enter is filled one time in three with new food
  (adding 1) or wine (adding 2).
- When your strength falls into a lower quarter of 175 and is under 87,
  "You are getting weak - you need to eat or drink." ("very weak" under a
  quarter of your full strength; lines 8401, 6630).
- Death (lines 5610–5625): the dead keep slots 1–3 and their crowns;
  slots 4–12 go each to a random location other than this one with a free
  place. You come back at location 30, 39 or 21, all in Hell, the others
  anywhere; all at full strength.

### Fights

- `hit`, `attack` and `kill` are one verb (line 1351). The score of each
  side (line 1362) is its strength plus 40 for a weapon and 40 more if the
  weapon's number is above 66. The attacker's weapon is the object named
  with "with", so `attack Thor` alone is bare hands; the defender's is its
  slot 1. Anything numbered above 66 counts as the better weapon: a sword or
  Skalir, but also food (96), wine (70) or a key (80). The side behind adds
  32 for a shield and 64 for a helmet, if it holds a weapon.
- Scores within 20: a draw, both lose 32 (line 1372). A win by less than
  64: the loser loses 64 and is sent off, the winner loses 32 (1374). By
  64 or more, or any loss of 20 or more by you: the loser dies (1376). No
  random number enters the result; the two or three blows drawn are
  decoration. *Live*: five fights ended as the scores say (Live tests).
- An attack made at your command moves the attacker's goodness a step one
  time in two (line 1356): up for a victim of goodness under 8, down
  otherwise. A step down from 0 would
  stop the game with "B Integer out of range" at line 1356.
- Thrown (line 1471): a sword or Skalir does 10, an axe or Felstrong 20,
  lightning 30, a fireball 40, anything else 2; the target then attacks the
  thrower. Lightning and fireballs fly and are not put down. A target under
  two columns away is "too close to throw", but the damage is done and the
  object is lost (line 1482; *live*).

### Objects, places and quests

- The map (`m$`, line 3750): 81 locations in a 9 × 9 grid, 1 in the south-
  west, north +9, east +1 (`mnex`, line 3810). Locations 1–45 are Hell, 46
  and on Midgard, except the east side (column above 4) which is Asgard
  (line 3915). Each has a terrain, its exits as eight bits (north the top
  bit, round to north-west), where its ringway leads, its crowns, six pairs
  of object and column, and a scene feature. You start at 71, Valheim, in
  Asgard; Valhalla is 80.
- A location holds six objects. One inside a chest or cupboard takes one of
  the six, with the column 255 (`con`). An object put down where all six
  are taken brings Klepto, who carries an ordinary object off to a
  neighbouring location with room (line 5300; *live*). A quest object put
  down takes an ordinary object's place, and that is the one he takes;
  only where every place holds a quest object or a container does he take
  whatever is in the last (line 5305).
- Putting an ordinary object into a container where all six places are
  taken stops the game with "3 Subscript wrong, 5310:5": line 5309 works
  out Klepto's column from 255 (*live*).
- 36 special places (`s$`): each has its real terrain, its name, and the
  object or character it needs (`o1`) and forbids (`o2`) for its other exits.
  An exit is open with `o1` carried or here and `o2` neither (`cango`, line
  3860).
- The quest objects lie in containers at locations 73 (Ofnir, in Krank's
  hall), 6 (Felstrong), 37 (Drapnir), 4 (Skornir), 44 (Skalir) and 81
  (Grimnir). Opening needs the key (80, not Ofnir) and (35 − n) × 6
  strength at special place n (line 1955): 174 for Ofnir, which you can
  manage, and 180 to 204 for the other five, more than your full 175, so
  someone stronger with a key must be told to open them. *Live*: "You are
  not strong enough to open the cupboard." at location 6.
- The order of the quests is the special places': a search over `m$` and
  `s$`, taking every condition but a quest object as met, gives Ofnir and
  Felstrong needing nothing, Drapnir needing Ofnir, Skornir needing Ofnir
  and Drapnir, Skalir needing Ofnir and Skornir, Grimnir needing
  Felstrong, Skalir and Skornir, and Valhalla (80) needing Grimnir (by 71
  north or 79 east). Felstrong can therefore come first, where the manual
  puts it fifth. *Live*: Felstrong's location reached from the start,
  with a ring poked into your slot 4: west to 70 and 69, its ringway to
  51, west to 50, its ringway to 21, north-east to 31, north to 40,
  Rankle's hall, and its ringway to 6.
- Reaching Valhalla (line 5135): characters 2 to 37 come in turn, each
  "congratulates you." and leaves, until you type a command.

### Money

- You start with 200 crowns. A price is the goods' value times
  1 + f / 32, f being how far the seller is from you in goodness; with f
  above 9 the seller may refuse outright, when `RND` × f is above 9 (line
  1129).
- `moba` (line 3410) adds the receiver's own number instead of the amount:
  you get 1 crown for any pile picked up, a character paid in a trade gets
  its number, and the rest of the money is gone. *Live*: "You get 50
  crowns." then "You have 151 crowns.".

### Saving and loading

- `save` (line 6050) writes the first 6,378 bytes of the variables, `n$`
  to `g$`, as one headerless block through the ROM's SA-BYTES ($04C2);
  `load` (line 6255) reads it back with LD-BYTES ($0556). The simple
  variables after `s$`, the food tally among them, are not saved.
- Both change the low byte of the BASIC error handler's address to $25,
  meaning to catch an error at `restore_trap` ($5D25); the handler is
  `break_trap` ($DA3C) in play, so an error goes to $DA25, inside
  `find_word`, and BREAK during the tape resets the Spectrum. *Live*, for
  `save` and `load`.

### Bugs

- `moba` adds the wrong number (above).
- The forbidding text of `help` is never shown (line 6555): with `o2` alone
  line 6563 writes "You can go " over it, and with both `o1` and `o2` the
  exits are skipped. *Live*, with `o1` and `o2` set by hand.
- Putting an object into a container at a full location stops the game
  (above).
- An attack that lowers a goodness of 0 stops the game (above): `CHR$`
  of a negative number, "B Integer out of range, 1356:8". Loki, Hel,
  Nasher and Gastro start at 1 (charisma 15, 9, 1 and 4), so two
  downward steps from counterattacks on throws you order reach it.
- The guard at line 1356 tests the whole byte, so a character with
  charisma 15 can never reach goodness 15 by a step up: 15 × 16 + 15 is
  255. Boldir (15, 15) can lose his 15 for good; Loki (1, 15) can climb
  to 14 at most.
- Error 18 ("not strong enough") is never raised; errors 8, 11, 15 and 16
  have no message (lines 9909–9918).

## Data tables

| Table | Variable at | Rows |
|---|---|---|
| `d$(255,11)` | $AFE0 | words 1–39 the characters, 40–47 the short compass words, 63–97 the objects, 88–95 the long compass words, 99 "me", 101–124 the verbs, 132–146 the game commands, 147–177 prepositions and passed-over words, 178–240 place names, 241–254 the swear words |
| `p$(100,3)` | $BAEF | objects: 0, weight, value (Grimnir 20 and 255, food 2 and 5); characters: a byte the fight reads, the load, a home location (line 4010; where it starts, for all but Idun, Snake and Raven) |
| `c$(39,20)` | $BC23 | the characters, above |
| `m$(81,18)` | $BF37 | the locations, above |
| `s$(36,9)` | $C644 | the special places, above |
| `g$(2,32,2)` | $C5BA | the screen's 32 columns: who stands where and facing which way; which object lies there |
| `figure_records` | $E8AA | 39 × 5 bytes, above |
| `feature_table` | $FAF1 | 15 scene features |
| `terrain_table`, `view_table` | $E352, $E362 | 8 terrain drawers, 8 views |

## Sound

All sound is the beeper. The machine code uses the ROM's BEEPER ($03B5)
for the key click (7 cycles at $0197) and the refused-key beep ($28 cycles
at $0428). The BASIC uses `BEEP`: Mary's slap (line 122, 1/10 s at −10),
an object landing (lines 1484 and 1495, 1/10 s at −10), a chest or cupboard
opening or shutting (line 1980, 0.05 s at −15), each blow of a fight (line
1380, 0.01 s at 0, middle C), and four low notes for a death (line 5620, at
−12). There is no
music.

## Hardware and the ROM

There is no `IN` or `OUT` in the machine code or in line 1's `REM` code:
the game reaches the hardware only through the ROM and BASIC.

| ROM entry | Use | Routine |
|---|---|---|
| $0038 (`RST $38`) | keyboard scan and frame counter | `interrupt` |
| $0010 (`RST $10`) | print a character | `print_chars` |
| $03B5 BEEPER | click and refused-key beep | `key_pressed`, `key_refused` |
| $04C2 SA-BYTES, $0556 LD-BYTES | save and load a game | `save_game`, `load_game` |
| $0DD9 CL-SET, $0E44 CL-LINE | print position and clearing in the lower screen | `print_lower_text`, `print_input_line` |
| $1601 CHAN-OPEN | the lower screen's channel | `print_input_line` and the text window |
| $1303, $1B7D | error report; carry on after BREAK | `break_trap` |
| $22E5 PLOT-SUB, $24BA DRAW-LINE | a line's first pixel, then the rest | `draw_line` |
| $09FF | the interrupt vector (I = $09) | `input_init` |

Pixels are set straight into the screen by the game's own `plot_pixel`
($DBAA). System variables the game sets or reads: `FLAGS` and `FLAGS2`
(lower case), `MODE`, `LAST_K`, `DF_SZ`, `COORDS`, `ATTR_T`, `DEST`,
`STRLEN`, `ERR_SP`.

## Text

The ROM's character set and ASCII throughout. Strings are in the BASIC:
the messages in `PRINT` and `LET x$=` statements, the error messages in
`DATA` lines 9901–9918 (each an expression `READ` works out), and every
word the parser knows in `d$`. The string sweep found the machine code's
two: "Jas.Learmont" ($FE5C) and the stale "quitt the axe at Nidhogg"
(in the old line buffer after $D200).

## The listing's error rate

The listing's 644 comments were all written by hand, in three strata: the
BASIC program's lines (188), the variables (30) and the machine code
(426). Each check below was made against the bytes by agents (on
`claude-opus-5-5[1m]`) that wrote none of the comments they checked.

- First sample, seed 20261010, 60 comments (18 of the BASIC, 3 of the
  variables, 39 of the machine code): 7 wrong in a detail, 11.7 % (Wilson
  95 % interval 5.8–22.2 %), none in what the line or routine does. The
  seven were corrected.
- Full audit: three agents checked all 644 in disjoint ranges and marked
  122 (18.9 %) wrong in a detail, none in what the line or routine does:
  18 of the 218 on the BASIC and its variables (8.3 %) and 104 of the 426
  on the machine code (24.4 %). In the machine code, 16 described
  `draw_ridge`'s runs in steps where it counts columns and 8 gave a castle
  one merlon too few; the rest were bit numbers, which register holds
  which size, ranges off by one, pixels for cells and incomplete caller
  lists. In the BASIC they were claims true in most cases but not all
  ("never", "every", "only") and caller lists. All 122 were corrected,
  with two more their notes pointed to (a hall skips the track and the
  view north, `gfx_terrain`; a cut dash is not counted, `hall_paint`),
  and the same claims in `features.md`, `facts.md` and the page.
- Second sample, seed 20261011, 60 comments (18, 3, 39), drawn after the
  audit: 2 wrong in a detail, 3.3 % (Wilson 95 % interval 0.9–11.4 %),
  none in what the line or routine does. `save_game`'s list of what it
  saves left out the simple variables l, o and z, and the comment on the
  settlement style byte ($DF3F) missed three of its bits and three of the
  routines that set it. Both were corrected.

## Live tests

### In ZEsarUX 13.0, 10 October 2026

All from `work/play-1.sna` or snapshots made from it, by typing on the
keyboard matrix and, where a state was needed, poking the variables
(`c$`, `m$`, `p$`) first.

- Editing keys: CAPS SHIFT 5, 8, 0, 1 and 2, SYMBOL SHIFT Q, A and Z each
  did what the manual says; CAPS SHIFT 2 after ENTER brought back the
  command just entered.
- Picking up 50 crowns: "You get 50 crowns." then "You have 151 crowns."
- Throwing food at Thor from beside him: "too close to throw"; the food gone
  and Thor 2 strength down.
- `help` with `o1` and `o2` poked: the forbidding text never printed.
- `save` and `load` with BREAK pressed while the tape ran: the machine reset.
- Putting an object into the chest at a location with six objects: "3
  Subscript wrong, 5310:5".
- An attack with your goodness poked to 0 against a good character: "B
  Integer out of range, 1356".
- An object dropped at a full location: "Klepto steals the rock.", the rock
  and Klepto then at location 61.
- "You can't carry the chest."; "This doesn't make sense:- You drop."
- Felstrong's location reached from the start by the route above; "You are
  not strong enough to open the cupboard."
- Fights, with line 4060 made to return at once (`PEEK` changed to `ABS`)
  and line 5512 made never to send anyone away, so that nobody walked off
  before the blow, and Idun's strength poked: you (175, bare hands)
  against Idun (no weapon) at 175, "The fight is drawn."; at 215, "Idun
  kills you." and you in Hel's hall; at 135, "You defeat Idun." and Idun
  gone. Against Idun at 215 with food and an axe carried: `attack idun
  with food`, "You defeat Idun."; `attack idun with axe`, "The fight is
  drawn."
- `l`, `l`, `r` moved your column 27, 26, 25, 26; `go to Thor`: "You go to
  Thor." and you beside him.
- `damn`: "Mary is not amused...".
- Valheim left by south-west and entered again: the picture the same to
  the byte.
- With no key pressed, the flag's cell (row 1, column 24) redrawn.
- The pictures of 13 locations (6, 8, 14, 21, 30, 40, 48, 52, 61, 65, 71,
  79 and 80), read from the emulator's screen after walking in and
  waiting 1,500 frames, against the same pictures drawn by the game's own
  code in SkoolKit's simulator from the commands lines 7010–7039 send: 0
  of 4,096 pixel bytes and 0 of 512 attribute bytes differ in each.
  `test_pictures.py` draws all 81 that way and holds `reference/pictures.png`,
  the sheet the page shows, against them.

### In `kit/spectrum/machine.js`, 11 October 2026

From `work/loaded.z80`, which SkoolKit 10.1's `tap2sna.py` made from the
tape, with SkoolKit's 48K ROM; what the game printed read from `n$` after
every pass.

- Two runs of 400,000 frames (133 minutes) with nobody typing, one from
  the start at Valheim and one with you poked to location 62 beside Saga:
  57 attacks or throws between characters, every pair 7 or more apart in
  goodness; 35 gifts, every pair 3 or less apart; no goodness changed.
  After the first, the 20 characters never named in its text had rows as
  the tape loaded them, to the byte; after the second, 31. One character
  alone with you for 26 minutes in all did nothing. 42 orders between
  characters, 41 to brains above 7 (Saga 20, Boldir 12; Skadi, brains 3,
  gave 10). Two to four others were with you 83 % and 94 % of the time.
  19 of the first run's 41 arrivals were characters whose home it was.
- "Loki leaves." at the start: the `GO SUB` stack held the return to line
  8120, so the stage manager sent him, to location 80.
- From the start with nothing poked, Thor, Idun, Skadi and Odin told in
  turn to throw what they carried at Loki (`summon` when one was
  missing): each of Loki's counterattacks printed twice; his byte 17 went
  from 31 to 15 at Skadi's throw, and at Odin's the game stopped with "B
  Integer out of range, 1356:8", ten minutes of play in.
- `who`, typed 15 times from the start: each answer as the port of lines
  6210–6235 in `reference/valhalla-page.js` prints it
  (`test_characters.py`).
