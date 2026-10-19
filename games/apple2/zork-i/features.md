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
- Two descriptions of the interpreter, read 19 October 2026 for their
  first lines and zero-page layout only: Eric Smith's partial disassembly
  of Infocom's Apple II ZIP, https://github.com/brouhaha/a2zip, and
  Infocom's early Apple II ZIP source,
  https://github.com/erkyrath/infocom-zcode-terps (`apple/oldzip`).

## Features

### The machine: loading, screen, keyboard, disk, printer

| Feature | Status | Where |
|---|---|---|
| Runs on any Apple II with 32K and one 16-sector drive (the card; the disk's own description) | live | boots on the kit's 128K IIe to West of House in 25 s of the machine's time |
| Boots from drive 1 with the power on; an autostart ROM spins the disk, otherwise `6` CTRL-P (the card) | live | the IIe's boot ROM reads track 0 sector 0; `orientation.md` |
| A language card or 16K RAM board makes it faster (the card) | differs | release 15's interpreter never switches a language card on: the only references to $C080-$C08F in the code it runs are indexed by the slot, for the disk drive, and the top of RAM it looks for is $BF00 at most ($1B6F), so a 64K machine gets the same 76 page buffers as a 48K one. 56 dead bytes at $2BC8 would write-enable the card, but nothing runs them. The card may describe a later interpreter |
| The story is fetched from disk as it is needed, and more memory means fewer disk reads (the 1980 manual) | live | the story's first $48 pages stay at $2C00-$73FF; every other page is read into one of the buffers from $7400 up to the top of RAM, 76 with 48K and 12 with 32K ($08C8), and the buffer used longest ago is reused ($1752, $1801). At West of House fourteen buffers hold pages the first turn needed |
| Type up to two full lines; the left arrow erases; RETURN ends the line (the card) | live | the Monitor's GETLN1 reads the line ($1D42), so the left arrow rubs out; 99 characters reach the parser, the text buffer's size of 100 less the RETURN: 95 spaces and `frobozz` gave `I DON'T KNOW THE WORD 'FROB'.` |
| [MORE] in the bottom left when a description will not fit; the space bar shows the rest (the card) | live | `look. look. look. look. look` fills the window and stops at `[MORE]` in inverse; a key shows the rest ($1C5B). Any key will do, not only the space bar |
| Status line at the top, updated after every move: the room's name, then `SCORE: score/moves` (the card) | live | West of House shows `SCORE: 0/0`, the cellar `SCORE: 35/11`; the words in inverse video, the spaces between them normal |
| SCRIPT and UNSCRIPT start and stop a transcript on a printer card in slot 1 (the card) | traced | the story sets bit 0 of header byte $11; while it is set each line goes through the slot 1 hook at $C100 as well as to the screen ($1BE2, $1BF2), and the first line is preceded by CONTROL-I `80N`. The kit's IIe has no printer card, so it was not run |
| SAVE: up to eight positions, 0 to 7, on a storage diskette; prompts for position, slot (default 6) and drive (default 2), then `-PRESS 'RETURN' KEY TO BEGIN-`; `OK` or `FAILED` (the card) | live | in the cellar, `save` to position 1 in drive 2 printed `OK.`; a position is four tracks from track 3 + 4 × position, so eight fill tracks 3-34 ($2064, $1DC1) |
| RESTORE takes the same steps (the card) | live | after walking north to the troll, `restore` from position 1 printed `OK.` and `look` was back in the cellar ($20FD) |
| A one-drive player swaps disks: `PLEASE RE-INSERT GAME DISKETTE` (the card) | traced | after a save or restore that used slot 6, drive 1, $201E prints `PLEASE RE-INSERT GAME DISKETTE,` and waits for RETURN |
| Storage diskettes are initialised as standard Apple disks, DOS 3.3 or Pascal (the card) | traced | the disk routines find each sector by its address field ($2544), so the disk must be formatted already; the format routine at $2AAF is in memory but nothing calls it. A save writes whole data fields with its own D5 AA BC, so a save to position 3 (tracks 15-18) writes over a DOS 3.3 disk's catalog, which starts on track 17 (`apple2-reference`, "The disk") |
| The game diskette runs only from the main drive (the card) | traced | the story is read through the parameter block at $1DAC, which start-up sets to slot 6, drive 1 and $201E puts back after every save and restore |
| A mild copy protection: the data fields of tracks 1 to 22 begin D5 AA BC, where DOS writes D5 AA AD; 4am's crack changes two bytes of track 0 sector 2 from BC to AD (the crack's notes) | confirmed | the disk routines read only D5 AA BC ($24DC) and write it too ($242A); `disk.py info` reads tracks 1-22 only with `--data D5AABC`. The two bytes are the BC of the write and read routines, the operands of `LDA #$BC` at $245C and `CMP #$BC` at $24FB, in page $24, which the boot reads from track 0 sector 2 (DOS's numbering; physical sector 11) |

### The game: the parser

| Feature | Status | Where |
|---|---|---|
| Words are known by their first six letters; case does not matter (the 1980 manual) | live | the dictionary holds six Z-characters a word (`across`, `advert`, `ancien`); typed in lower case, the game answers in capitals |
| Several hundred words (the 1980 manual) | live | 617 dictionary entries, punctuation included |
| Multiple objects with AND or a comma; ALL, ALL BUT, EXCEPT (the 1980 manual) | live (ALL, ALL BUT) | `take all` took the leaflet and answered for the mailbox and the door, each by name; `drop all but mailbox` dropped the leaflet |
| Several sentences on one line, separated by THEN or a full stop (the 1980 manual) | live | `open mailbox then take leaflet` and `drop leaflet. take all` each did both. The dictionary marks `then`, `.` and `,` as words of their own |
| Two kinds of question: WHERE IS (find) and WHAT IS (examine) (the 1980 manual) | live | `what is a grue` describes the grue; `where is the zorkmid` answers |
| A missing object is guessed and announced, `(with the rope)`, or asked for, `With what?` (the 1980 manual) | live (asking) | `take` alone: `WHAT DO YOU WANT TO TAKE?`; `read leaflet` with the leaflet in the open mailbox: `(TAKEN)` |
| Complaints: `I don't know the word`, `I can't use the word ... here`, `You must supply a verb!`, `There is a noun missing in that sentence`, `Too many noun clauses`, `Multiple objects cannot be used with`, `I don't understand that sentence`, `Beg pardon?`, `It's too dark to see`, `I can't see any ... here` (the 1980 manual) | live (five) | `frobnicate`, `open the take`, an empty line, and `put the troll in the basket with the shovel` give the first, second, eighth and fifth; release 15 prints `TOO MANY NOUN CLAUSES??` with two question marks |
| Talking to characters, `GNOME, GIVE ME THE KEY`, and quoted speech (the 1983 manual only) | differs | the 1980 manual does not mention it, and release 15's dictionary has no `say`, `tell`, `ask` or `answer`: `say "hello"` gave `I DON'T KNOW THE WORD 'SAY'.` and `mailbox, open` gave `YOU MUST SUPPLY A VERB!` (live) |

### The game: commands

| Feature | Status | Where |
|---|---|---|
| Directions N, S, E, W, NE, NW, SE, SW, U, D (the 1980 manual); IN and OUT in places (the 1983 manual) | live (some) | north, east, west and down walk from West of House to the cellar |
| VERBOSE, BRIEF and SUPERBRIEF (the 1980 manual) | live | `MAXIMUM VERBOSITY.`, `BRIEF DESCRIPTIONS.`, `SUPER-BRIEF DESCRIPTIONS.` |
| LOOK or L, INVENTORY or I, DIAGNOSE (the 1980 manual) | live (inventory, diagnose) | `YOU ARE EMPTY HANDED.`; `YOU ARE IN PERFECT HEALTH.` |
| SCORE with a rank (the 1980 manual) | live | `YOUR SCORE WOULD BE 0 (TOTAL OF 350 POINTS), IN 0 MOVES.` and the rank `BEGINNER` |
| QUIT or Q, RESTART (the 1980 manual) | live | `q` and `y` print the score and `-- END OF SESSION --`, and the interpreter stops in a loop ($21BD); `restart` and `y` print the banner and West of House again, read afresh from the disk ($1B69) |
| WAIT, VERSION, AGAIN (the 1980 manual) | live (version, again) | VERSION prints the banner with `RELEASE 15 / SERIAL NUMBER UG3AU5` |
| BUG: "it may have a different opinion" (the 1980 manual) | live | `IF THERE IS A PROBLEM HERE, IT IS UNINTENTIONAL.` |
| Command files with `@` (the 1980 manual, PDP-11 only) | open | the card does not mention it |

### The game: the world

| Feature | Status | Where |
|---|---|---|
| Treasures score when found and again when put in the trophy case; points for actions and for visiting places; a penalty for dying (the 1980 manual) | live | entering the kitchen and the cellar raised the score to 35; the egg put in the trophy case raised it by 5; dying in the dark cellar took 10 away. Property 13 pays for finding a thing or a place (story $61EA), property 12 for each treasure in the case (story $898C), and story $6467 takes the 10 (`facts.md`, "The score") |
| 350 points in all | live | the SCORE command |
| Nineteen treasures (Wikipedia, of the game in general) | confirmed | 21 objects carry a property 12, the points they are worth in the trophy case. Two are the broken canary and the broken egg, which take the place of the canary and the egg, so nineteen treasures can be in the case at once, worth 129 (story $898C). Live, the egg in the case scored 5, its property 12 |
| Time passes only when the player moves, a tick a move (the 1980 manual) | open | |
| The thief, a pickpocket interested only in valuables (the 1980 manual) | open | |
| Containers that open and close, transparent or not, with a capacity; objects have sizes; surfaces (the 1980 manual) | open | |
| Characters fight back and may attack unprovoked; DIAGNOSE shows the wounds (the 1980 manual) | live (diagnose) | `YOU CAN BE KILLED BY A SERIOUS WOUND.` |
| Vehicles carry the player to places out of reach on foot (the 1980 manual) | open | |
| Passages twist: north then south need not lead back (the 1980 manual) | live | west from West of House is a forest, and east from there is the Forest Path. Every exit is a room's property, read by story $6808, so nothing makes an exit lead back (`facts.md`, "Exits") |
| Dark places need a light, or a grue eats the player (Wikipedia; the game's answer to `what is a grue`) | live | in the cellar without the lamp, `east`, where the cellar has no exit, gave `OH, NO!  YOU HAVE WALKED INTO THE SLAVERING FANGS OF A LURKING GRUE!`. In the dark, a direction with no exit rolls `random 100` and kills on 1-74 (story $68B9) |
| The lamp, the sword that glows near enemies | live | `THE LAMP IS NOW ON.`; `YOUR SWORD IS GLOWING WITH A FAINT BLUE GLOW.` in the cellar |

## Beyond the documentation

Found in the code or the dictionary, not in the manuals. Each is in
`facts.md` with the routine it comes from.

- The dictionary holds words no manual mentions: `xyzzy` and `plugh`
  (`A HOLLOW VOICE SAYS 'CRETIN'.`), `zork` (`AT YOUR SERVICE!`), `hello`,
  `pdp10`, `mgckjk`, `odysse` and `ulysse`, `echo`, `advent`, `win` and
  `winnag`, and four swear words (`YOU OUGHT TO BE ASHAMED OF YOURSELF.`).
- The player's object is called `cretin`, and the word `cretin` names
  another object, `you` (live).
- `hello sailor` is counted, and every tenth gets a different answer
  (live).
- At 350 points a voice whispers `Look to your treasures for the final
  secret.`, and the way south-west from West of House to the Stone
  Barrow opens (traced; the barrow and the ending live, with global 30
  set by hand).
- A line of sixty commas fills the parse buffer and writes over the text
  buffer's size, and from then on the game reads one letter of every
  line (live).
- A treasure inside a container in the trophy case scores nothing (live).
- The interpreter divides wrongly when the divisor is negative (live, in
  the emulator; nothing in Zork I divides by a negative number).
- A fatal error is a `BRK` into the Monitor, and the text `ZORK INTERNAL
  ERROR!` beside it is never printed (traced).

## Open questions

- Which complaints and parser features of the 1983 manual are already in
  release 15?
- Does time pass only when the player moves? The thief, containers and
  vehicles are in the story's code and were not traced.
