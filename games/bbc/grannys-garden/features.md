# Granny's Garden — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- Complete BBC Micro Games Archive, "Granny's Garden",
  https://www.bbcmicro.co.uk/game.php?id=3575, read 14 October 2026: 1983,
  4Mation Educational Resources, author Mike Matson, educational
  adventure; Model B yes, Model A no; no joystick, no saving; 4Mation
  still enforce the copyright and sell the game, so the archive offers no
  image. Its screenshot is `reference/bbcmicro-co-uk-screenshot.jpg`.
- Acorn User, November 1983 (number 16), page 108, "Toadstools and
  dragons in Mode 7", a review by Jeremy Vine, read 14 October 2026 in the
  OCR text of archive.org's scan,
  https://archive.org/download/Acorn_User_Number_016_1983-11_Adn-Wesley_GB/Acorn_User_Number_016_1983-11_Addison-Wesley_GB_djvu.txt.
- Alison Gazzard, "4Mation: A British/Australian Box of Treasures", Play It
  Again blog, 31 October 2014,
  http://www.ourdigitalheritage.org/archive/playitagain/4mation-a-britishaustralian-box-of-treasures/,
  read 14 October 2026.
- The teacher's booklet that came with the game (Acorn User) was not found
  online.
- The game's own screens, every one a route reaches
  (`orientation.md`), saved in `reference/` as `p1-*` and `p2-*`.

## Features

| Feature | Status | Where |
|---|---|---|
| A 32K adventure for young children, Model B only (Acorn User; the archive: Model A no) | confirmed | each part fills &0E00 to about &6800 with the Mode 7 screen at &7C00; a Model A has 16K |
| Transported from Granny's garden to the Kingdom of the Mountains, where a wicked witch has locked up the King and Queen and hidden their six children (Acorn User) | live | Part 1 lines 560 and 800-850, `p1-05`, `p1-06` |
| Two parts (Acorn User) | live | two programs, `GRAN1` and `GRAN2`; Part 1 ends "The rest of the adventure is on the next program" (line 2640) |
| Four locations with puzzles: the children rescued one place at a time (Acorn User) | live | the woodcutter's house and the Giant's garden (Part 1), the City of the Dragons and the Land of Mystery (Part 2) |
| A talking toadstool, a magic raven, a spider, dragons and other characters (Acorn User) | live | PROCtd, PROCrav1 and PROCrav2, PROCspi, PROCdrag; `p1-16`, `p1-07`, `p1-23`, `p2-07` |
| Passwords to go on from part to part (Acorn User) | live | snow (Esther), sky (Tom), river (Clare and Anna); Part 1 lines 2390-2400, Part 2 lines 740-750 |
| Mode 7 with teletext graphics, moving pictures and sound (Acorn User) | live | every picture is teletext graphics in PRINT strings; the trees, the raven, the toadstool, the witch, the keeper, the dragons and the eyes move; the music, PROCsnd1, plays under each part's title |
| One-word answers (Acorn User) | confirmed | PROCi takes only letters, DELETE and RETURN, so no answer can hold a space; Part 1 line 1020, Part 2 line 460 |
| Misspelt answers accepted without comment (Acorn User) | confirmed | answers are matched by INSTR on two to four letters inside the word: "itch" for kitchen, "ack", "upb", "rs", "pl", "ic", "or", "ot", "ak", "as", "il", "pom", "horn", "no", "ky", "iv", "ed", "reen" |
| Rubbish sometimes accepted as an answer (Acorn User) | confirmed | a yes or no is the answer's first letter; several questions take anything but "Y" as no and go on (Part 1 lines 600, 620, 680, 700); `Stars` reaches the stairs |
| The teacher's booklet, with ideas for discussion (Acorn User) | open | not part of the program; not found online |
| No joystick (the archive) | confirmed | no ADVAL in either program |
| No saving (the archive) | confirmed | no file access after the load; the passwords take its place |
| The theme tune (Gazzard) | live | PROCsnd1: 52 notes on three channels, under each part's title and at the end; recorded from the sound chip (`facts.md`, Sound) |
| Puzzles with trees and dragons (Gazzard) | live | PROCtr (Part 1), the four baby dragons (Part 2 lines 1110-1230) |

## Beyond the documentation

Found in the code, then played.

- **Only six of the twelve magic trees can be the one.** Line 290 picks
  the column as `RND(3)*9+4` and the row as `RND(2)*6`: columns b, c and
  d and rows 1 and 2. Column a and row 3 never hold it. **live**
- **Secret: T at "Ready to start?" fixes the tree at a1**, a tree that is
  otherwise never magic (lines 230 and 290). The prompt comes back; then
  Y starts. It has a flag (`t%`) and a test of its own, so it was put
  there on purpose, and nothing on the screen, in a review or in a guide
  found online mentions it: a secret, as the How it works page heads it.
  **live**
- **An answer ending in f turns the music off** (line 220 in Part 1, 210
  in Part 2): `Yf` starts with no tune under the title and none of the
  witch's sounds; Part 2's ending still plays the theme (line 2580).
  `Yesf` cannot be given: the field there takes four letters, and the key
  after the fourth, RETURN included, is taken as DELETE, so three survive
  (PROCi, line 1030). **live**
- **Run from this disc by CHAIN, Part 1 runs out of memory** before it can
  be finished: `No room`, which ON ERROR cannot catch. Its own relocation
  to &0E00 is cut off by line 100 being a REM (`orientation.md`). **live**
- **The game restarts itself after 20 hallways or 26 journeys.** Rooms are
  entered by calling on, never by returning; BASIC II's limits of 20
  REPEATs and 26 GOSUBs end the run with an error, and ON ERROR RUN starts
  the part again (`orientation.md`). After a guess at the trees rejected
  for its form it is 19 hallways, and once the lake has told its name 25
  journeys. **live**
- **The BREAK key's definition never happens.** Part 2's line 140,
  `ONERRORRUN:*K.10OLD|MRUN|M`, makes everything after ON ERROR the
  error handler, which RUNs before it reaches `*KEY`. The soft-key buffer
  at &0B00 is empty in play. **live**
- **The second wrong throw at the snake brings the witch.** Line 1620
  calls her when `try` reaches 3, and the tree puzzle has left `try` at 1,
  so only one wrong throw is forgiven. **live**
- **The stick is a trap and the snake optional.** The green broomstick is
  in the cupboard on the second visit whatever else has been done
  (lines 1500-1550); the stairs only give the hint. **live**
- **The red broomstick, the pot, the stick on the snake** each bring the
  witch, who sends the player home (PROCwitch). **live** (the pot)
- **In the Land of Mystery the order matters**: the lake eats the key,
  the castle door needs it, and the forest's fire can be put out once;
  going back to the forest afterwards brings the witch (Part 2 lines
  1830, 2120, 2300). **live** for the order that wins
- **The castle keeper's friendship never counts.** Line 2500 greets a
  player who has fed him, but `fed%` is never set TRUE, so a second visit
  with no cake is sent away. **confirmed**
- **The dragon puzzle**: each food brings one dragon out and sends
  another in (Part 2 line 1270); a collar goes on when exactly one dragon
  is out; four of any one food brings the witch. **live**
- **The beast's question is "Redhorn"**, the lake's name, which the lake
  only tells the player who gives it the key; any answer with "horn"
  after its first letter passes, and "horn" alone does not, because the
  input routine makes the first letter a capital. **live**
- **A bee hurt in the wood cannot pass the dog.** Called in the wood, the
  bee stings the nut trees and a nut makes its nose bleed (be=1); on the
  dog's path it refuses and the Witch comes, and no other creature gets
  past the dog (Part 1 lines 2740-2750, 3020). **live** (`p1-beewood`)
- **Asking the lake its name first costs the key and the water.** The lake
  wants the key before it tells its name; with the key eaten there is no
  water for the fire and no key for the castle door, and there is one key
  (Part 2 lines 2310-2320, 1940-1970). **live** (`p2-name`)
- **The castle has one chance.** The keeper takes the cake at the gate, and
  his greeting for a friend (`fed%`) can never be earned; leave at `Are you
  ready to explore?` and he asks for a cake there is no getting (Part 2
  lines 1780, 2500-2510). **live** (`p2-explore-no`)
- **The giant answered twice runs into the forest.** Anything but Y or N to
  `Shall I eat you?`, then Y, makes PROCgiant return into itself and run on
  past the next DEF into Creepy Forest's lines, with the hill's picture
  still on screen (Part 2 lines 2090-2110). **live** (`p2-giant`)
- **The blue dragon is cyan**, in its name and its picture (Part 2 lines
  740, 1310). **live**
- **The Mode 7 screen moves sideways** for the big dragons and in the
  Castle of Dreams: VDU 23 writes the CRTC's start address (register 13),
  Part 2 lines 1040 and 2550. **live**

## Open questions

- Whether the disc in the TOSEC set is 4Mation's own or a copy made from
  the tape (`orientation.md`, The image).
- What the teacher's booklet says.
