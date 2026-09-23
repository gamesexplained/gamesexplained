# Little Computer People — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

A single-file crack by Mr Z of the 1985 Activision game; see
`orientation.md` for the image, the loader and the crack screen.

## Memory layout

| Thing | Where |
|---|---|
| Jump table: cold start, `$195E`, a getter | `$0340`–`$0349` |
| Cold start | `$0434` |
| Main loop | `$0931` |
| Time prompt text | `$0905`–`$0926` |
| Typed line, and its length | `$0224`…, `$0222` |
| Text output queue (32 bytes) and its two indexes | `$0202`–`$0221`, `$0200` (in), `$0201` (out) |
| Keyboard tables | `$0691`–`$06E0` |
| Font | `$5000`–`$52FF` |
| Letter texts | `$5600`–`$56DC` |
| Colour matrix (VIC bank 1) | `$5C00`–`$5FE7`, sprite pointers `$5FF8`–`$5FFF` |
| Bitmap (VIC bank 1) | `$6000`–`$7F3F` |
| Parser word lists | `$C234`–`$C5DF`, `$C5E0`–`$C960` |
| Parser rules | `$C96A`–`$CB8A` |

## Controls

- The game reads the keyboard itself (`scan_keyboard`, `$05C7`); the
  KERNAL is banked out. The scan does nothing while `$037B` is non-zero,
  and only runs when no joystick line is held: it first checks that
  `$DC00` and `$DC01` both read `$FF` with no keyboard row selected.
- It walks all 64 keys (index in `$34`, from 63 down) and looks each one up
  in `key_ascii` (`$0691`), which is indexed by row + 8 × column. Codes
  `$23` and `$24` there count SHIFT and CTRL (into `$05C4` and `$05C5`),
  `$21` marks a key it ignores, and `$5C` a key with no character. The
  lowest-numbered key held wins.
- Letters come out lower case; SHIFT makes them upper case (subtract
  `$20`). With CTRL a letter becomes its control code (`AND #$1F`), so
  CTRL F is `$06`. SHIFT also turns `/` into `?`, `:` into `[` and `;`
  into `]`, and clears bit 4 of a digit.
- A new key is stored in `$30`, `$31` and `$33`. `$33` is the last key
  seen: the same key held again is ignored until a scan finds no key and
  clears it. *Live:* `$30` goes back to 0 once the game has taken the key.
- The scanner is called from the main loop (`$0944`), not from the
  interrupt. *Live:* 46 calls in about a second of play, against 51 hits
  on the interrupt handler in the same window; a key has to stay down
  until a scan has seen it, and three frames was often too short.

## Graphics

- Bitmap mode in VIC bank 1: bitmap `$6000`, colour matrix `$5C00`
  (`orientation.md`).

## Text

- **Alphabet: plain ASCII.** Every string found is ASCII, mixed case.
  The ends of strings are marked with `$FF` (the time prompt and the
  letters), `$0D` is a new line, and the parser's words are upper case
  followed by `$00`.
- **One font.** `print_char` (`$BB08`) calls the glyph fetch at `$BB29`,
  which takes bit 7 of the character as a font number and the low seven
  bits minus `$20` as the glyph (the second font also flips bit 5). The
  font bases are in the tables at `$BDC0` (low) and `$BDC2` (high):
  `$5000` and `$5800`. `$5000`–`$52FF` is a complete ASCII font, 96
  glyphs from space to `~`, rendered and read. `$5800` holds no font in
  the steady-state snapshot. Characters below `$20` are control codes.
- **Output is queued.** `queue_char` (`$BA50`) puts a character into
  the 32-byte ring at `$0202` (index `$0200`); `print_queued` (`$BA5E`),
  called once per pass of the main loop (`$0947`), takes one character
  (index `$0201`) and prints it.
- **Strings stored as text:** the time prompt (`$0905`) and four letter
  pieces (`$5600`–`$56DC`): the greeting "Dear Friend,", the sign-off
  "Thank You, / Your Friend", a thank-you ("Thank you for keeping me
  well stocked with food and water.") and a complaint ("Please notice
  that my supplies are running low. I can't stay happy and healthy
  without your support."). An ASCII census of the snapshot (runs of three
  or more letters) found no other text but the name "Billy Bob Binkle" at
  `$03FC` and the parser's words. Where the 256 names of the original and
  the words for anagrams and hangman are, if they are in this build, is
  open: they could be stored some other way.

## The parser's words and rules

- **Two word lists** of records: five bytes of concept bits, the word in
  upper-case ASCII, then `$00`. List 1 (`$C234`, ends with `$FF` at
  `$C5DF`) holds verbs, question words, feelings and manners, 86 words.
  List 2 (`$C5E0`) holds things, rooms and games, 74 words, then a record
  with an empty word at `$C95B`. Whether list 2 ends there or at the
  `$FF` at `$C969` is open.
- Words with the same bits are synonyms. List 1: DO; YOU; LIKE, ENJOY;
  PLEASE; WILL, WOULD; PERFORM, USE, TRY; ALLERGY, ALLERGIC, FEVER,
  DUST, POLLEN, HANKY; RELAX; LIGHT, START, MAKE, BURN, IGNITE; LOOKS,
  IS, SEEMS, APPEARS; SEEM, LOOK, APPEAR; HEAR, LISTEN, PUT, START,
  SPIN; ON; CLEAN, TIDY, PICK; UP; SLOPPY, MESSY, UNTIDY; SHOULD,
  OUGHT; LOGON, PROGRAM, UTILITIES, MATH, HOMEWORK, ADD, SUBTRACT,
  MULTIPLY, DIVIDE; TICKLE; TYPE, TELL, WRITE, CONFIDE; BRUSH, FLOSS;
  DRINK, IMBIBE; GET; FEED; FILL; OPEN; DANCE, MOON, SHOW; LIKE
  (again, another bit); TIRED, BORED, APATHETIC; HATE, APATHETIC,
  AWFUL; PLAYING; PLAY (two bits); IF; WHAT, WHAT'S; IN, INSIDE,
  STORED, KEEP; IS (again, another bit). List 2: PIANO; STEREO,
  TURNTABLE, MUSIC, RECORD, PLATTER; FIRE, FIREPLACE, LOG; CHILLY,
  COLD; PROBLEM, PROBLEMS, TROUBLES, MATTER, LETTER, NOTE; SONG, TUNE,
  SONATA, FUGUE, SERENADE, JAZZ, BOOGIE; IVORIES; TEETH, HYGIENE;
  GLASS, COOLER; DOG, PET, MUTT, POOCH; BOWL, DISH, CAN; TV; CHAIR;
  COMPUTER, COMMODORE; WATER, LIQUID, LIQUIDS, FLUID, FLUIDS; UPSTAIRS;
  BEDROOM; CLOSET; KITCHEN; FILING; CABINET; FREEZER; REFRIGERATOR,
  FRIDGE; DRESSER; NIGHTSTAND; ADDITION, SUBTRACTION, MULTIPLICATION,
  DIVISION; HOUSE, HOME; GAME, CARDS, POKER, WAR, CARD, ANAGRAMS,
  HANGMAN; EXCUSE, PARDON, HELLO, ATTENTION, HEY.
- **34 rules** at `$C96A`, 16 bytes each, `$FF` after the last: five
  bytes of list-1 bits, five of list-2 bits, then action codes ending in
  a byte of `$80` or more. How a sentence's bits are matched against a
  rule, and what each action code does, are for the coverage and verify
  steps.
