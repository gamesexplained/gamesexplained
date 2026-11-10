# The Secret of Bastow Manor — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the line or table it comes from. Unless marked *live*, a fact comes
from reading the program in the snapshot named in `orientation.md`. A
BASIC line is named by its number and, where it matters, its address
(`$XXXX`), which the Source tab links.

## Build

The analysed program is the one file `BASTOW MANOR` on a cracker's disk
transfer (`orientation.md`): a program in Commodore BASIC V2, 953 lines,
numbered 5 to 6230, `$0801`-`$8FC6`, 34,758 bytes, with no machine code,
no `SYS`, no `USR` and no `PEEK`. Every effect is a `PRINT`, a `POKE` or a
`READ` of `DATA`. The listing is built from `work/entry.vsf`, saved at the
`READY.` after the load, before `RUN` (SHA-256 `7d6dc99b…`, see `orientation.md`
for how to rebuild it). The snapshot's bytes at `$0801`-`$8FC6` equal the file's.

## How the program is laid out

| Lines | What | Where |
|---|---|---|
| 5 to 18 | start-up: strings, the `LIST` switch-off, then `GOTO 4900` | `init_variables` `$0801` |
| 20 to 35 | the verbs `cut` and `eat` | `verb_cut` `$0991`, `verb_eat` |
| 41 to 184 | drawing a place, its name, its objects, its exits, and what happens each move | `show_room` `$0B00`, `move_events` `$119F` |
| 300 to 359 | the prompt, one-letter commands and special exits | `prompt` `$1459` |
| 360 to 1020 | the verb handlers, save and restore | `verb_dispatch` `$18D5` |
| 1400 to 1997 | helpers, death screens, cutscenes, the lock | `resolve_noun`, `death_screen` `$42C3` |
| 2000 to 4520 | the picture of each place, one routine each | `pic_gates` and the rest |
| 4900 to 5082 | the title, sprites, the question about a saved game, the start | `title_screen` `$8404` |
| 5900 to 6230 | `DATA`: tune, sprite shapes (two sets), exits, objects | `data_tune` `$8941` |

The program is entered by `RUN` and never leaves BASIC: it ends by
`NEW` (after a win, after the player says no to another try, and by `quit`
when the player then declines to save: line 710; a `quit` that saves writes
the file and goes back to the game, line 799) or runs again from the start
with `RUN` after a death.

## The places

27 places, numbered 1 to 27. `show_room` picks the picture routine with
`ON B GOTO` (lines 51 and 53), `place_names` the name (62 and 63).
Exits are in `R$(place, 1 to 3)`, read by line 5015 from the `DATA` at
lines 6040 to 6043 into the three-slot lists; a move along one of them goes to the next place
number up (south, east) or down (north, west), so the neighbours in a list
are consecutive: lines 354 to 359. The exceptions are coded in lines 320 to
353.

| # | Name | Picture | Exits listed | Objects at the start |
|---|---|---|---|---|
| 1 | outside the manor gates | line 2000 | s | gate, wall |
| 2 | on a gravel path | 2400 | w, s, e | garden, manor |
| 3 | at the front door | 2200 | w, e | door, bell, sign |
| 4 | at the east side of the manor | 2300 | w | door, window |
| 5 | by the manor wall | 2100 | n | tree, mailbox, sign |
| 6 | at the top of a dead tree | 2600 | none | nothing |
| 7 | in the garden outside a shed | 2500 | n, s | nothing |
| 8 | inside a storage shed | 2700 | n | case |
| 9 | in a dim room | 2800 | w, s | small box, door |
| 10 | at the north end of the hall | 2900 | n, s | door, clock |
| 11 | at the south end of the hall | 3000 | n, s | door, stairs |
| 12 | in the kitchen | 3100 | n, w, s | table |
| 13 | in the wine cellar | 3200 | n | racks of wine, armour |
| 14 | in a secret room | 3300 | w, e | robot |
| 15 | in the treasure room | 3400 | w | chest |
| 16 | in the master bedroom | 3500 | s | stairs, bed, window |
| 17 | in the master bathroom | 3600 | n | bath |
| 18 | on a window ledge | 3700 | none | ivy, window |
| 19 | in the entrance foyer | 3800 | s, e | door, balcony |
| 20 | in the library | 4450 | w | desk, books |
| 21 | in a closet | 4100 | e | mop, bucket, crate |
| 22 | in the study | 4200 | e | desk, picture |
| 23 | in a dark, moss covered tunnel | 4250 | n, s | deep pit |
| 24 | in a damp stone corridor | 4300 | n, w, s | toolbox |
| 25 | in a dark room | 4350 | e | switch |
| 26 | in a secret laboratory.my gosh! | 4400 | n, e | bloody table, skeleton |
| 27 | in a stone cell | 4500 | w | nothing |

(`n`, `s`, `e`, `w` are what the table lists. A listed move goes to the
next place number down (`n`, `w`) or up (`s`, `e`), unless a special exit in
lines 320 to 353 takes the same letter in the same place first. Most of
those join places that are not neighbours by number: north of the north
hall (10) to the foyer (19) and south of the foyer back (lines 320 and 333),
the study (22) east to the south hall (11) (334), the kitchen (12) west to
the closet (21) and east back (335, 336), the dim room (9) south to the
tunnel (23) and north back (321, 322), the corridor (24) south to the
laboratory (26) and north back (345, 350), the secret room (14) west to the
cell (27) (329), the gravel path (2) south to the garden (7) and north back
(341, 342), and the gates (1) south to the wall (5) and north back (337,
338); the corridor west to the dark room (25) and east back (343, 344) join
neighbours the other way round. The rest take the move the numbers give and
add a condition or an effect: the tunnel (23) and the corridor (24) are
joined only once the branch lies across the pit (323 to 326); the secret
room (14) east to the treasure room (15) and the laboratory east to the cell
(27) move the robot's or the skeleton's sprite off the screen (330, 348);
the shed (8) is entered from the dim room (351) and from the garden (352)
and left north for the garden (353, refused by 327 while the player is too
tired); west from the gravel path once the chest's combination is right is
the win (331); east from the foyer (19) is the safe from the balcony (328).
Moves that use a word instead of a compass letter are lines 370 to 391:
`go gate` (1 to 2, once the gate is open), `go trapdoor` (8 to 9, once the
case is moved, with the player not too tired and the ladder not in the
pack), `go stairs` (11 to 16 and back), `go window` (16 to 18 and back,
once the window is open), `go door` (11 to 22 with the study door open, 9
to 10 once the dim room's door has been opened, which needs the beam gone:
lines 385, 389 and 883), `go hole` (27 to 14, once the hole is made).
`climb tree` goes from 5 to 6 and back (lines 531 and 532), and `climb
ladder` from 4 to the ledge (18) and back while the ladder is there (lines
533, 534 and 1991 to 1995). The balcony (line 1736) and the robot, which
pushes the player back into the cell (line 1763), also set the place
directly.)
Places 9, 23, 24 and 27 (the dim room, the tunnel, the corridor and the cell) kill the player when the torch is not lit (`CC`=0; lines 80, 100, 102 and 106, and again at 2800, 4250, 4300 and 4500, `death_in_the_dark`). The dark room (25) and the laboratory (26) test nothing: the dark room is dark in name only, and the laboratory's name ("in a secret laboratory.my gosh!", line 105) does not call it dark.

## What the variables mean

Every variable is a global; BASIC names are two characters. The save
routine writes 58 of them, the numbers in lines 782 to 787, and after them
the pack, the objects in each place and `A5$`, `A1$` and `Z2$` (lines 788
to 799); nothing else is kept.

| Variable | Meaning |
|---|---|
| `B` | the place (1 to 27) |
| `C` | moves played, printed on the death screen |
| `X` | border and background colour: 0, and 2 after the corridor's south exit into the laboratory (line 345; lines 348 and 350 set 0 again). Entered from the cell, the laboratory leaves `X` at 0, and its picture pokes the red itself (line 4400) |
| `P$`, `D` | what the player typed and its length |
| `N$`, `E`, `A`, `AA`, `K` | working: the object's name, whether it was found, loop counters, the column where the noun starts |
| `T$(5)`, `S$(27,7)`, `R$(27,3)` | the pack, the objects in each place and the exits |
| `PB`, `PC`, `PA` | the dogs: `PB` the gate has been opened, `PC` the player is hiding, `PA` how many moves the dogs have had |
| `HB`, `HJ` | the branch: moves it has been carried, and "too tired" (set when `HB` passes 3) |
| `CC` | the torch is lit |
| `DK`, `AM`, `G1` | the gate: unlocked, opened (and drawn open) |
| `BM` | the mailbox: 0 locked, 1 unlocked, 2 the letter found, 3 the torch found, 5 the brass key put there, 6 the brass key found (`look mailbox` lays each find in the place, line 1620, for the player to get) |
| `HK`, `HX`, `H2`, `H3` | the closet: the crate moved, the old man coming (`HK`=4) and afterwards (`HK`=2) |
| `KK`, `G9`, `BB` | the shed: the case moved, the trapdoor drawn, the case opened |
| `DB` | the branch lies across the pit |
| `DC`, `DF`, `BN`, `HU` | the toolbox, the clock, the small box (0 locked, 1 unlocked, 2 open, 3 the note found and laid in the place, line 485) and the note found |
| `GG`, `GZ` | the study door in the south hall: unlocked, opened |
| `G7`, `G8`, `DA` | the dim room's door opened (line 883, after the beam is off), the beam removed |
| `BW`, `CW` | the bedroom window opened; the player has walked through the dim room's door into the north hall (line 385), which lets the ledge's window be used |
| `BA`, `DP`, `AZ`, `HH` | the study: the drawer opened (1) and its pencil found (2), the button shown, the hole made |
| `HR`, `HT`, `AF` | the robot shorted out; throws of water; the bucket filled |
| `H8`, `CO` | the chest's combination right |
| `LR`, `LT` | the skeleton: bells (1, 2), awake (3), moves it has chased |
| `AW`, `H5` | armour worn; armour taken from the cellar |
| `DG` | the ladder stands against the east wall |
| `G6`, `H6`, `H7` | the small box, the bucket and the mop still lie where the picture draws them |
| `ZA`, `G5` | the dark room's switch, drawn pulled or not |
| `DN`, `DE`, `DO`, `LI` | flags and a counter for the pictures |
| `A1$`, `A5$`, `A6$`, `A9$`, `Z6$`, `Z2$` | the letters of the chest's combination (below) |
| `LW`, `QW`, `ZB` | the `help` count, the notes of the title tune, the items shown |
| `AB`, `LL`, `BR`, `DM`, `MJ`, `HZ` | stage flags: the iron key found at the gate, the ladder found by `look shed` in the garden outside the shed (place 7, line 443), the branch broken off, the iron key reached with the branch at the gate (lines 1462 to 1468), the gold found by `look chest` (line 473; not saved), `HZ` (saved and restored; no line uses it) |

## The words

A typed line is split by its first letter: above `P` (ASCII 80) the tables
of `X3$`, above `H` those of `X2$`, otherwise `X1$` (line 360 to 366); the
three-letter entries of the table are compared with the first three
letters, and `ON A GOTO` jumps to the handler. Direction letters and `i`
and `g` are handled before, by `D=1` (line 306).

| `X1$` (A to H) | break, climb, cut, drop, eat, fill, get, go, help |
|---|---|
| `X2$` (I to P) | inventory, light, look, move, open, press, pull |
| `X3$` (Q to Z) | quit, read, remove, ring, save, unlock, throw, wear |

Each handler that takes a noun cuts it out of the typed line with
`MID$(P$, k, 3)`, so the noun is read from column `k` of the line, three
letters long. `k` is 4 in the handler at line 370, 5 at lines 20 and 30,
6 at lines 435, 550, 570, 620, 660, 730, 760, 860 and 875, 7 at lines 500,
530, 600, 640 and 830, and 8 at lines 750 and 800; `get` and `drop` share
one, in `resolve_noun` (line 1404), with `k` 5 when the line starts with
`g` and 6 otherwise (lines 1400 and 1402). The column suits the
full verb typed, so a shortened verb followed by a noun is read from the
wrong place. (Read from the detokenised listing; the shortened-verb
consequence was not tried in the emulator.)
The line `get key` always asks a second question, `which one ?`, and
takes its answer from the first three letters again (`resolve_noun`).

## The puzzle chain

The route that wins is the one in `route.txt` (shared files), 225
commands, and it is the order the puzzle flags (`BM`, `DK`, `KK`, ...) force:

1. Break a branch off the dead tree and use it to get the iron key from
   under the gate (`look gate`, `get key`, `iron`; the iron key lies *inside*
   the gate, `verb_look` line 441).
2. The iron key opens the mailbox, which gives a letter and a torch; the gate
   can then be unlocked and opened, which starts the dogs.
3. The shed gives a ladder (`look shed` from the garden outside it), a
   trapdoor once the case is moved, and an apple once the case is opened
   and looked into (lines 879 and 444, which do not test the move); the
   ladder against the east wall gives a hiding place and, later, the way
   back in from outside; carrying the branch more than three moves
   makes the player too tired to leave the shed, so it is dropped there.
4. Below the trapdoor: the small box, the pit (bridged with the branch), the
   toolbox with a crowbar, the beam on the dim room's door (removed with
   the crowbar), and the door into the hall.
5. The hall: a clock with a knife in it. The apple is cut open with the
   knife (a small key falls out) wherever it lies: lines 20 to 25 need the
   knife in the pack and the apple on the ground where the player stands,
   and test no place. The small key opens the small box; the note in it
   reads `VI`.
6. The closet: moving the crate shows a brass key and the old man knocks
   the player out; the brass key is later found in the mailbox. The brass key opens the study door;
   in the study the drawer, the panel (never named in the room), a button
   and a hole in the stone cell.
7. The wine cellar's armour is worn to survive the safe thrown from the
   balcony, which leads into the library; its book gives the turns for
   the combination: right 3, left 7, right 2.
8. Water from the bathroom, three buckets, thrown through the hole,
   short out the robot; the combination, typed in one line, opens the
   chest. The gold sets the skeleton after the player, who must get back
   to the shed within five moves, and then out of the gate to the west.

## The dogs

`PB` is set by `open gate` (line 892). From then `PA` goes up by one at the
top of every move when the player is not hiding (`PC`=0; line 140). `PA`=1
prints `i hear dogs howling !!`; above 2 every move prints `bark!  bark!
bark!`; above 7 the dogs attack and the player dies (lines 142 to 146).
The three places where `PC` is set are the tree top (line 532), the shed
(line 352) and the window ledge (line 1995), and each also resets `PA` to 0.
Leaving them sets it to 0 again: down the tree (line 531), north out of the
shed (line 353) and down the ladder (line 1992); the trapdoor out of the
shed (line 373) leaves it at 1. Line 168 also sets it to 0, and `PA` to 3,
at every move in the shed once the chest is open (`H8`=1).

## The robot, the water and the skeleton

`throw water` in the cell needs `AF`=1 (the bucket filled, line 556) and
the answer `hole` to the question `where` (lines 831 to 837); each
throw empties the bucket and adds one to `HT`, and at three `HR`=1. Until
then, entering place 14 starts `robot_pushes_back` (line 160). The gold is
taken in place 15 once `H8`=1 (line 1406 and 473); it sets `LR`=1, which
prints bells next move and sets `LR`=2; entering place 26 makes `LR`=3
and the skeleton starts to chase: every move adds one to `LT` and the fifth
(`LT`>4) kills. The shed resets it (line 168).

## The chest's combination

The code is `IBDF`. The book (line 1699 to 1706) gives three turns,
`right 3`, `left 7`, `right 2`, and the note in the small box says `VI`,
the sixth letter: from `F` three to the right is `I`, seven to the left of
`I` is `B`, two to the right of `B` is `D`, and the path ends at the
starting letter `F`. The program never holds the four letters together
until the player has played: `A1$` (`I`) is loaded by line 660, the top of
the `pull` verb, whether or not the pull works; `A5$` (`F`) by line 600, the
top of `light`; `A9$` (`D`) by line 5000 and `A6$` (`B`) by line 5070,
in the title's set-up, from `A6`=68 (line 4922) and `A9`=66 (line 13);
and `Z6$`=`A6$`+`A9$` by line 140 the first time a move is made in the
open with the dogs about. `throw` (line 830) joins them: `Z2$`=`A1$`+`Z6$`+`A5$`.
The lock (line 1745) compares the typed line with `Z2$`. The save and
restore routines keep `A5$`, `A1$` and `Z2$`, and not `A6$`, `A9$` and `Z6$`.
*Live*: typing `IBDF` at the prompt opened the chest (`lock-right.png` in
the work folder; the route in `route.txt`).

## The lock-out of `LIST`

Line 17 pokes `168` ($A8) into address `775` ($0307), the high byte of
BASIC's `LIST` vector at `$0306` (the ROM's own value is `$A71A`).
*Live*: with the vector as the game leaves it, `LIST 5` printed `5` and
nothing else; with it restored, line 5 listed whole (the entry snapshot, `$0307`
changed by hand). The effect is on `LIST` only: `RUN` and every other
command are unaffected, and the program in memory is whole.

## The save format

`save` writes `mansav` on cassette (device 1). The first 58 values are
the state variables listed in line 782 to 787, one per line (the
separator `U$` is `CHR$(13)`), then the five pack slots, then all 189
object slots, an empty slot written as `*`, then `A5$`, `A1$`, `Z2$`
(lines 780 to 799). `restore_game` (lines 998 to 1020) reads them back in
the same order.

## The two saved games on the disk

`BM-1` and `BM-2` are `mansav` files saved to disk by the crackers (their
`PRINT#1` text, with the first two characters of each taken as a load
address). Parsed with the variable list of line 782 and on:

| | `BM-1` | `BM-2` |
|---|---|---|
| place `B` | 1, the gates | 7, outside the shed |
| moves `C` | 1 | 283 |
| pack | empty | bucket, small box, torch, small key, gold |
| state | the game at its start: every flag 0 | gate opened, trapdoor, hole and robot done, chest opened, the gold in the pack |
| combination letters | `*`, `*`, `*` (empty) | `A5$`=`F`, `A1$`=`I`, `Z2$`=`IF` |

`BM-1` is the starting state; `BM-2` is a game on the verge of winning.
`Z2$` is `IF` because `Z6$` was still empty when the last `throw` was
typed (line 830; `Z6$` is not saved, so a restored game holds it empty
until line 140 runs with the gate open and the player not hiding). The
save itself was made at 283 moves outside the shed (place 7, the first
value written, line 782).

## Sprites and sound

No interrupt and no machine code. Sprite shapes (blocks 13 to 15 at `$0340`,
`$0380`, `$03C0`) are poked from the `DATA` at lines 6000 to 6016 for the
title (swept across it by lines 5006 to 5010) and then replaced by the set at
lines 6100 to 6134, which gives the safe (sprite 0, pointer 2040), the robot
(sprite 3, pointer 2043) and the skeleton (sprite 4, pointer 2044).
The title tune plays on voice 1 (sawtooth) over a constant voice 2
(triangle, register value 675). The `DATA` holds 15 notes, but line 1802
counts the notes read and returns when the count passes 14, so only 14 are
sounded and the fifteenth is read and dropped (`title_tune`, `data_tune`).
The year `1983` is printed when the ninth note is read (line 1803). The death sound is voice 1, sawtooth, from the volume steps of
line 1661. `unused_tune_player` (lines 1570 to 1573) takes notes in the
same three-number form, on voice 2, and stops at a negative first number,
which the tune's `DATA` does not hold; nothing calls it, and with no
`RESTORE` in the program it could not read the tune again. A line with a bare `GOTO 60` (4700) is also never
reached.

## How the listing was made

There is no machine code, so there is nothing for a disassembler to
disassemble: the listing is the BASIC program as its lines, 953 of them,
with one comment on each of 102 groups of lines. The symbols and comments
were written by a script (`tools/annotate.py` in the project's shared
files) into `symbols.json`, with the program declared in `game.json` as a
BASIC block (`"basic": [["$0801", "$8FC6", ...]]`); the listing was built with
`kit/scripts/listing.py` from `work/entry.vsf`. Coverage reads 100 %
because every byte lies in a commented group, which is coarser than a
comment on every line.

## The listing's error rate

Every check was made by an agent on claude-opus-5-5 that wrote none of the comments it checked, one at a time.

| Step | Seed | Result | Corrected |
|---|---|---|---|
| sample of 60 of 102 | 4711 | 26 wrong in a detail (43 %) | 26 |
| audit of all 102 | | 22 wrong in a detail | 22 |
| sample of 60 | 1111 | 5 wrong (8 %), over the mark of 2 | 5 |
| audit of all 102 | | 12 wrong in a detail | 12 |
| sample of 60 | 2222 | 1 wrong (1.7 %, 95 % interval 0.3 % to 8.9 %), within the mark | 1 |
| maintainer's sample of 60 (`air`) | 8310 | 5 wrong in a detail (8.3 %, 95 % interval 3.6 % to 18.1 %), over the mark | 5, and 2 more that said the same thing |
| maintainer's audit of all 102, and of every claim in this file (`air`) | | 11 comments and 21 claims wrong in a detail | all |
| maintainer's sample of 60 (`air`) | 5150 | 1 wrong (1.7 %, 95 % interval 0.3 % to 8.9 %), within the mark | 1, and 1 more that said the same thing |

The errors were in details, never in what a comment is about: which places are dark, what a flag means, sprite and voice numbers, colours, line numbers off by one, "every" claims that fail for one case, and calling the chest's combination the safe's. The comments are on groups of lines, not on each line. The annotation itself was written on claude-sonnet-5-5, which is not a proven model, so the last three rows are a maintainer's check (`kit/CHECKING.md`), made by `air` with fresh checkers on claude-opus-5-5. Its first sample found what a verb answers when the noun is right but the object is not in the pack (`i can't do that...yet`, line 1630) left out of three "anything else" claims, a condition the trapdoor needs on both its lines, and a misquoted prompt. Its audit corrected, among the comments, where the cursor sits after line 1900, what the ladder's flag `DG` means, the line that leaves `E` for `which one`, and quoted game text; and in this file the layout table's addresses and line ranges, the list of special exits, the meanings of `BM`, `BN`, `LL`, `DM`, `MJ` and `X`, the dogs' hiding places and the place of the `BM-2` save. Its second sample found that a refused `get ladder` or `drop ladder` in place 4 still changes `DG`.
