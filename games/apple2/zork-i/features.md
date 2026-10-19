# Zork I — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

The game is two programs. Infocom's interpreter, 6502 code on tracks 0 to 2
of the disk, runs the machine: the screen, the keyboard, the disk, the
printer. The story, Z-machine code and data on tracks 3 to 22, is the game
itself: the parser, the rooms, the objects and every sentence. A feature of
the machine is found in the interpreter; a feature of the game is found in
the story, which the interpreter runs.

Sources:

- INTERLOGIC Reference Card for the Apple II, Infocom, two printings:
  https://mocagh.org/infocom/interlogic-refcard-ap2.pdf and
  https://mocagh.org/infocom/interlogic-refcard-ap2-alt2.pdf, read
  19 October 2026. "The card" below.
- ZORK: The Great Underground Empire - Part I (PDP-11 version), Infocom's
  1980 manual, OCR text at
  https://archive.org/download/zork-pdp-11/Zork_PDP_11_djvu.txt, read
  19 October 2026. "The 1980 manual" below. It is the PDP-11 edition, so
  what it says about files, RT-11 and command files is not this disk's.
- Zork I instruction manual, Infocom 1983,
  https://archive.org/details/Zork_I_The_Great_Underground_Empire_1983_Infocom_a,
  read 19 October 2026. It describes later releases; where it says more
  than the 1980 manual, the row says so.
- Zork, Wikipedia, https://en.wikipedia.org/wiki/Zork, read 19 October 2026.
- The disk's own description in the A Woz A Day collection,
  https://archive.org/details/wozaday_Zork_I_r15, and the notes of 4am's
  crack of the same release, https://archive.org/details/ZorkI_r15_4amCrack
  ("Zork I r15 (4am crack).txt"), read 19 October 2026.
- The game's own screens and its dictionary of 617 words, read from the
  disk on 19 October 2026.

## Features

### The machine: loading, screen, keyboard, disk, printer

| Feature | Status | Where |
|---|---|---|
| Runs on any Apple II with 32K and one 16-sector drive (the card; the disk's own description) | live | boots on the kit's 128K IIe to West of House in 25 s of the machine's time |
| Boots from drive 1 with the power on; an autostart ROM spins the disk, otherwise `6` CTRL-P (the card) | live | the IIe's boot ROM reads track 0 sector 0; `orientation.md` |
| A language card or 16K RAM board makes it faster (the card) | open | |
| The story is fetched from disk as it is needed, and more memory means fewer disk reads (the 1980 manual) | open | |
| Type up to two full lines; the left arrow erases; RETURN ends the line (the card) | open | |
| [MORE] in the bottom left when a description will not fit; the space bar shows the rest (the card) | open | |
| Status line at the top, updated after every move: the room's name, then `SCORE: score/moves` (the card) | live | West of House shows `SCORE: 0/0`, the cellar `SCORE: 35/11`; drawn in inverse video |
| SCRIPT and UNSCRIPT start and stop a transcript on a printer card in slot 1 (the card) | open | |
| SAVE: up to eight positions, 0 to 7, on a storage diskette; prompts for position, slot (default 6) and drive (default 2), then `-PRESS 'RETURN' KEY TO BEGIN-`; `OK` or `FAILED` (the card) | live (prompts) | the prompts appear as the card gives them; the write itself is not yet tried |
| RESTORE takes the same steps (the card) | open | |
| A one-drive player swaps disks: `PLEASE RE-INSERT GAME DISKETTE` (the card) | open | |
| Storage diskettes are initialised as standard Apple disks, DOS 3.3 or Pascal (the card) | open | |
| The game diskette runs only from the main drive (the card) | open | |
| A mild copy protection: the data fields of tracks 1 to 22 begin D5 AA BC, where DOS writes D5 AA AD; 4am's crack changes two bytes of track 0 sector 2 from BC to AD (the crack's notes) | open | `disk.py info` reads tracks 1-22 only with `--data D5AABC` |

### The game: the parser

| Feature | Status | Where |
|---|---|---|
| Words are known by their first six letters; case does not matter (the 1980 manual) | live | the dictionary holds six Z-characters a word (`across`, `advert`, `ancien`); typed in lower case, the game answers in capitals |
| Several hundred words (the 1980 manual) | live | 617 dictionary entries, punctuation included |
| Multiple objects with AND or a comma; ALL, ALL BUT, EXCEPT (the 1980 manual) | open | |
| Several sentences on one line, separated by THEN or a full stop (the 1980 manual) | open | |
| Two kinds of question: WHERE IS (find) and WHAT IS (examine) (the 1980 manual) | live | `what is a grue` describes the grue; `where is the zorkmid` answers |
| A missing object is guessed and announced, `(with the rope)`, or asked for, `With what?` (the 1980 manual) | live (asking) | `take` alone: `WHAT DO YOU WANT TO TAKE?`; `read leaflet` with the leaflet in the open mailbox: `(TAKEN)` |
| Complaints: `I don't know the word`, `I can't use the word ... here`, `You must supply a verb!`, `There is a noun missing in that sentence`, `Too many noun clauses`, `Multiple objects cannot be used with`, `I don't understand that sentence`, `Beg pardon?`, `It's too dark to see`, `I can't see any ... here` (the 1980 manual) | live (five) | `frobnicate`, `open the take`, an empty line, and `put the troll in the basket with the shovel` give the first, second, eighth and fifth; release 15 prints `TOO MANY NOUN CLAUSES??` with two question marks |
| Talking to characters, `GNOME, GIVE ME THE KEY`, and quoted speech (the 1983 manual only) | open | the 1980 manual does not mention it |

### The game: commands

| Feature | Status | Where |
|---|---|---|
| Directions N, S, E, W, NE, NW, SE, SW, U, D (the 1980 manual); IN and OUT in places (the 1983 manual) | live (some) | north, east, west and down walk from West of House to the cellar |
| VERBOSE, BRIEF and SUPERBRIEF (the 1980 manual) | live | `MAXIMUM VERBOSITY.`, `BRIEF DESCRIPTIONS.`, `SUPER-BRIEF DESCRIPTIONS.` |
| LOOK or L, INVENTORY or I, DIAGNOSE (the 1980 manual) | live (inventory, diagnose) | `YOU ARE EMPTY HANDED.`; `YOU ARE IN PERFECT HEALTH.` |
| SCORE with a rank (the 1980 manual) | live | `YOUR SCORE WOULD BE 0 (TOTAL OF 350 POINTS), IN 0 MOVES.` and the rank `BEGINNER` |
| QUIT or Q, RESTART (the 1980 manual) | open | |
| WAIT, VERSION, AGAIN (the 1980 manual) | live (version, again) | VERSION prints the banner with `RELEASE 15 / SERIAL NUMBER UG3AU5` |
| BUG: "it may have a different opinion" (the 1980 manual) | live | `IF THERE IS A PROBLEM HERE, IT IS UNINTENTIONAL.` |
| Command files with `@` (the 1980 manual, PDP-11 only) | open | the card does not mention it |

### The game: the world

| Feature | Status | Where |
|---|---|---|
| Treasures score when found and again when put in the trophy case; points for actions and for visiting places; a penalty for dying (the 1980 manual) | live (places) | entering the kitchen and the cellar raised the score to 35 |
| 350 points in all | live | the SCORE command |
| Nineteen treasures (Wikipedia, of the game in general) | open | |
| Time passes only when the player moves, a tick a move (the 1980 manual) | open | |
| The thief, a pickpocket interested only in valuables (the 1980 manual) | open | |
| Containers that open and close, transparent or not, with a capacity; objects have sizes; surfaces (the 1980 manual) | open | |
| Characters fight back and may attack unprovoked; DIAGNOSE shows the wounds (the 1980 manual) | live (diagnose) | `YOU CAN BE KILLED BY A SERIOUS WOUND.` |
| Vehicles carry the player to places out of reach on foot (the 1980 manual) | open | |
| Passages twist: north then south need not lead back (the 1980 manual) | open | |
| Dark places need a light, or a grue eats the player (Wikipedia; the game's answer to `what is a grue`) | open | |
| The lamp, the sword that glows near enemies | live | `THE LAMP IS NOW ON.`; `YOUR SWORD IS GLOWING WITH A FAINT BLUE GLOW.` in the cellar |

## Beyond the documentation

Found in the code or the dictionary, not in the manuals.

- The dictionary holds words no manual mentions: `xyzzy` and `plugh`
  (`A HOLLOW VOICE SAYS 'CRETIN'.`), `zork` (`AT YOUR SERVICE!`), `hello`,
  `pdp10`, `mgckjk`, `odysse` and `ulysse`, `echo`, `advent`, `win` and
  `winnag`, and four swear words (`YOU OUGHT TO BE ASHAMED OF YOURSELF.`).

## Open questions

- Does the interpreter use a language card when there is one (the card's
  "faster execution")? The kit's IIe has one and the game left it off at
  West of House.
- Which complaints and parser features of the 1983 manual are already in
  release 15?
