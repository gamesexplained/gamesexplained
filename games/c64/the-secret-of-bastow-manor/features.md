# The Secret of Bastow Manor — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The game's own screens: the title, the `special commands` page, the
  prompts and the endings, read in the emulator on 10 November 2026
  (`reference/`).
- Wikipedia, "The Secret of Bastow Manor", https://en.wikipedia.org/wiki/The_Secret_of_Bastow_Manor,
  read on 10 November 2026: written by Darryl Reynolds, 1983, for the
  VIC-20 and the Commodore 64; the C64 version is formally titled "The
  Secret of Bastow Manor 64"; its graphics are PETSCII characters and it is
  written in BASIC. (Read through a research subagent's summary: the
  page's reception section, if any, was not seen.)
- The Solution Archive, https://solutionarchive.com/game/id%2C473/Secret+of+Bastow+Manor%2C+The.html,
  read on 10 November 2026: the author as "Darryll D. Reynolds"; the
  publisher as SoftGold with Dotsoft and Gameworx named as well; the
  story ("You stand on the misty moors outside the walls of Bastow Manor.
  Old man Bastow has disappeared ..."); that the VIC-20 version has
  "shorter descriptions, fewer objects and no graphics"; that the title
  comes from a local street; one user rating, 6.5 from two votes (no
  platform given).
- Two walkthroughs on the Interactive Fiction Archive,
  https://ifarchive.org/if-archive/solutions/BastowA.sol ("The 99%
  Walkthrough!") and https://ifarchive.org/if-archive/solutions/BastowD.sol
  ("Walk Through by Dorothy Millard (C64 Version)"), read on 10 November
  2026. The second was replayed command by command in the emulator and
  the game took every one of them (`orientation.md`).
- No review of the C64 version was found. The Computer and Video Games
  issue 29 index (March 1984) that a search returned has no review of it
  in the part that was read.

## Features

| Feature | Status | Where |
|---|---|---|
| A text adventure typed at a `> what now ?` prompt, with a PETSCII picture of each place | live | `prompt` line 300, `show_room` line 41; 27 places |
| Commands of one or two words: only the first three letters of the verb count, and the first three of the noun | live | `verb_dispatch` line 360 and the tables `X1$`, `X2$`, `X3$` (lines 12 and 13) |
| Twenty-four verbs: break, climb, cut, drop, eat, fill, get, go, help, inventory, light, look, move, open, press, pull, quit, read, remove, ring, save, unlock, throw, wear | live for eighteen of them; traced for `eat`, `help`, `inventory` (the letter `i` was tried), `quit`, `ring` and `save`, which the replayed walkthrough does not use | `verb_dispatch` |
| One-letter commands: `i` for the pack, `g` for the exits, and `n`, `s`, `e`, `w` | live | `prompt` lines 308 to 358; `i` and the compass letters were used, `g` was not |
| A pack of five things; an empty pack prints "not a cracker !" | live | `show_pack` line 1500, line 1512 |
| Dogs that begin to howl when the gate is opened and kill a player who stays in the open for eight moves; the tree, the shed and the window ledge are safe | live (the barking and howling); traced (the death) | `move_events` lines 140 to 146 |
| The torch is needed in four dark places: the dim room, the tunnel, the corridor and the cell | traced: the walkthrough always lit it first | `place_names` lines 80 to 106, `death_in_the_dark` line 1920 |
| A branch that is too heavy to carry far | live | `move_events` lines 150 and 151, `verb_go` |
| A bridge over a pit of snakes made with the branch | live | `verb_drop`, `resolve_noun` line 1410, `pic_tunnel` |
| A knife and an apple with a key inside, and a note in a box | live | `verb_look`, `verb_cut`, `verb_unlock` |
| Armour that saves the player from a safe dropped from the balcony | live | `safe_drop` line 1720 |
| A combination lock for the treasure chest, opened by typing four letters | live | `combination_lock` line 1740 |
| A robot that guards the treasure and is shorted out by three buckets of water thrown through a hole | live | `verb_throw`, `robot_pushes_back` |
| After the gold is taken, bells ring and a skeleton comes to life and chases the player | live | `move_events` lines 165 to 169 |
| A save to cassette and a restore from it | traced: the save and restore routines match each other and the two saved games on the disk, but the game was not saved to a tape in the emulator | `verb_save`, `restore_game` |
| Death screens with a tombstone | live | `death_screen` line 1650 |
| A title screen with a tune and moving sprites | live | `title_screen`, `title_tune`, `sprite_setup` |
| An advertisement for a second game, "005 Super Spy" | live | `coming_soon_screen` line 1940 |
| Sound while playing | open: nothing but the title tune and the death sound was found; `unused_tune_player` is never called | |

## Beyond the documentation

Found in the code, not in anything the game or the sources say.

- `LIST` is switched off: line 17 changes the vector BASIC lists through.
- The safe's combination is not written anywhere in the program as a
  string: it is assembled from four one-letter or two-letter variables set
  in four different places.
- A dark room west of the damp stone corridor holds a switch that does
  nothing but show an advertisement; no puzzle needs the room.
- Opening the chest and walking out ends the game with a win even if the
  gold was never picked up.
- Two blocks of the program are never reached: a tune player and a line
  with a bare `GOTO`.
- The game keeps a second set of three sprite shapes that replaces the
  first after the title.

## Open questions

- Was the program changed by the crackers? No second copy was to be had.
- Which of the C64 version's reviews at the time exist: none was found.
- The publisher: Wikipedia says SoftGold, the Solution Archive says
  Dotsoft and Gameworx as well.
