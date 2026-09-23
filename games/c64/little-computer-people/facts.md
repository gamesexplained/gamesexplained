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
| Font | `$5000`–`$52D7` |
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

## Banking

- The main program runs with `$01` = `$35` and drops to `$34` (`AND #$FE`)
  around each use of the RAM under the I/O area: code at `$D000` onwards
  (entered by `JMP $D000` at `$B635`) and tables at `$D587`, `$D700`,
  `$D764` and `$D7AC`–`$D7B1` (for example `$AB21`, `$B26F`, `$B62E`).
- The IRQ handler saves the low bits of `$01` in `$092D`, forces I/O in
  (`$x5`) for its own work, and puts them back on the way out (`$0822`).
  An interrupt can therefore land while the main program has I/O out.

## Hardware register census

From the traced code (`work/census.py`: every absolute-mode operand in
`$D000`–`$DFFF` in a code block). Registers reached only through an index
or a pointer are listed under the base the instruction names.

| Register | What the game does with it | Where |
|---|---|---|
| `$D000`–`$D010` sprite positions | written by the raster interrupt, which shares the eight sprites among the figures | `irq_handler` `$0713`–`$08D2`; also `$048A`, `$1282` ? |
| `$D015` sprite enable, `$D01B` priority, `$D01C` multicolour, `$D027`+ colours | likewise | `irq_handler`; also `$1293`–`$12A8` ? |
| `$D025`, `$D026` sprite multicolours | `$D026` = `$0A` at start; both rewritten elsewhere | cold start `$04F5`; `$0B51`–`$0BA7` ?, `$B9D5`, `$B9EA` ? |
| `$D011` | set at start; screen blanked and unblanked at `$0589`–`$0598`; rewritten in the interrupt | `$04E6`, `$0589`, `$0598`, `$07F4`, `$07F9` |
| `$D012` | next raster line for the interrupt | cold start `$049A`, `$049F`; `$07DB`; `$1277` ? |
| `$D016` | multicolour off for the text band at the top (`AND #$EF`), and the saved value put back at a timed raster position | `$04F0`; `$0732`, `$0759`, `$075E`, `$07E9` |
| `$D018` | set once | cold start `$04EB` |
| `$D019`, `$D01A` | raster interrupt enabled at start, acknowledged in the handler | `$0492`, `$0495`; `$0714`, `$07F1` |
| `$D020`–`$D024` | not named by any traced instruction | |
| colour RAM `$D800`+ | written when the top text band is cleared, and by drawing code | `$BAF3`; `$2D01`, `$2D6B`, `$2D6E`, `$3E96` ? |
| SID `$D400`–`$D414` | all 21 voice registers cleared at start | `$3726` |
| SID voice registers, seven at a time | a voice set up from a 7-byte record in the table at `$B031` | `$B4C0`–`$B4E5` ? |
| SID voice frequency and control | written from shadow copies at `$7FCD`+ (one set per voice, offset 0, 7, 14) | `$3F3B`–`$3FBF`, `$42DF`–`$43F2`, the eight sound jobs `$4574`–`$4677` |
| SID `$D415`–`$D418` filter and volume | from a table at `$B05C`; volume also set at start | `$B474`–`$B486`; `$046C`; `$4577`, `$457F` |
| CIA1 `$DC00`–`$DC03` | keyboard and joysticks | `$059E`–`$060C` |
| CIA1 timers A and B | set up for the sound interrupts | `$4487`–`$44A5`; control at `$3FFD`–`$401D` |
| CIA1 `$DC0D` | interrupts off at start; read in the timer interrupt | `$045B`, `$0461`; `timer_irq` `$3959`; `$39B4`, `$4429`, `$442C`, `$44A5` |
| CIA2 `$DD00` | VIC bank 1 | cold start `$046F`, `$0476` |
| CIA2 `$DD03`, `$DD0D`–`$DD0F` | set once at start | `$0450`–`$0469` |

Rows marked ? are routines not yet read.

## Graphics

- Bitmap mode in VIC bank 1: bitmap `$6000`, colour matrix `$5C00`
  (`orientation.md`).
- `$BAD4`, which clears the text band, copies the row pattern at `$BDD0`
  into the bitmap at `$62C0`. `$6340`–`$639F` holds the same 96 bytes as
  `$BE50`; what copies them is not yet read.

## Text

- **Alphabet: plain ASCII.** Every string found is ASCII, mixed case.
  The ends of strings are marked with `$FF` (the time prompt and the
  letters), `$0D` is a new line, and the parser's words are upper case
  followed by `$00`.
- **One font.** `print_char` (`$BB08`) calls the glyph fetch at `$BB29`,
  which takes bit 7 of the character as a font number and the low seven
  bits minus `$20` as the glyph (the second font also flips bit 5). The
  font bases are in the tables at `$BDC0` (low) and `$BDC2` (high):
  `$5000` and `$5800`. `$5000`–`$52D7` is an ASCII font of 91 glyphs,
  space to `z` (`$20`–`$7A`), rendered and read; the bytes after it are
  code (`$52D8` is an activity's entry). `$5800` holds no font in
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

## Data tables

- `driver_jumps` (`$8000`): a jump table, three bytes an entry. Entries
  `$800C`, `$800F`, `$8012` and `$8018` jump to the sound and timer code at
  `$394E`–`$39B2`, and each has one caller (`$0812`, `$9256`, `$347E`, the
  IRQ handler at `$072C`). The other six entries are `RTS` stubs, and
  nothing in the image calls them.

## Sound

- `timer_irq` (`$3959`) takes the CIA1 interrupts: timer A goes to
  `$3F3B` and timer B to `$3FBF`, each with interrupts re-enabled first.
- `sound_dispatch` (`$396E`) calls one of eight routines, `$4574` to
  `$4677`, for each bit set in `$478D`, through the split address table
  `sound_jobs` (`$399C`).

## Control flow: the switch and the activities

- **The switch** (`$3F0C`, `$3F11`, `$3F13`) is an "on n go to". `JSR
  $3F13` takes n in A; `$3F11` loads it from `$4C` and `$3F0C` from `$68`
  first. It pulls its own return address, picks the n-th word of the table
  that follows the `JSR`, pushes it and returns into it. Each word is a
  handler's address minus one, and control never comes back to the call
  site. There are 103 call sites (84 with `$4C`, 16 with `$68`, 3 with A).
  Nearly every table ends with the handler `$8F0E`, and the next site
  follows directly. The tables are typed as words in the disassembler.
- **Activities.** The main loop's last stage (`$09D5`) calls `$8DAB`. That
  calls `$BED0` and `$2A6E`, and then, only when the low three bits of
  `$03C4` are zero, loads the current activity from `$8D9B` and switches
  on it at `$8DC6`. That switch (n in A) has 128 entries (`$8DC9`–
  `$8EC8`), and most of them are other switch sites: `$5825`, `$54E3`, `$9387`, `$BEFF`,
  `$2F18`, `$2797`, `$2DFE`, `$37EA`, `$3375`, `$338C`, `$9108`, `$9125`,
  `$91AD`, `$91DB`, `$9224`, `$92A2`, `$9081`, `$90B2`, `$90D8` and
  others. So an activity is a small state machine: `$8D9B` picks the
  activity, and `$4C` is its phase, which picks the handler for this
  pass. Handlers shared by many activities include `$8F0E` (the last
  entry of nearly every table), `$8FA7`, `$94CC`, `$293D`, `$2728` and
  `$2759`.

## Live tests

All from `work/play-02.vsf`, with the machine running at normal speed. The
game is deterministic from a snapshot: with no input the same activities
come at the same times, so a difference after an input is the input's
doing. The activity number is `$8D9B`, sampled every quarter second, so an
activity shorter than that can be missed. After an interruption the next
activity the person chooses for himself is the same in every run (the same
random state), which is why 25 follows several unrelated inputs.

| Input | Activities, in order (seconds after the input) |
|---|---|
| none | 5; 40 at 18.8; 79 at 23.2 |
| "please type a letter to me" | 5; 46 at 0.5; 22 at 2.9. The letter is typed into the top band |
| "please light a fire" | 5; 46 at 0.5; 7 at 6.4; 88 at 50.5 … 5 at 88.7. He walks to the living-room fireplace; logs are in it at 50 s and burning at 80 s (`reference/fire-building.png`, `reference/fire-lit.png`) |
| "please play the piano" | 5; 121 at 0.3; 79 at 0.5. During 79 SID voice 2 plays a changing pitch |
| "hello" | 5; 46 at 0.5; 52 at 2.9; 5 at 6.7 |
| "please dance" | 5; 118 at 0.5; 120 at 4.9; 53 at 5.4 |
| "please play poker" | 5; 46 at 0.5; 25 at 2.9; 21 at 36.2; 79 at 36.5. No card game started |
| "lets play a game" | 5; 25 at 0.5; 118 at 36.1 |
| CTRL F | 5; 0 briefly at 18.3; 40; 79. Nothing reached the door in 60 s |
| CTRL W, CTRL A | the same as no input |
| CTRL D | 16 at once; 33 at 0.3; 15 at 45.8 |
| CTRL C | 16 at once; 25 at 0.3 (he sits in the living-room armchair by the phone, `reference/phone-call.png`); 15 at 31.7 |
| CTRL P | 16 at once; 6 at 0.3; 15 at 38.6 |
| CTRL R | 16 at once; 50 at 0.3; 15 at 51.5 |
| CTRL B | 16 at once; 51 at 0.3; 15 at 46.3 |

Unprompted, nine minutes from `play-02` (`work/probe-free9.json`): 32 changes
of activity. Time spent: activity 25 116 s, 5 107 s, 79 (the piano) 98 s,
27 49 s, 16 46 s, 8 29 s, 40 17 s, 38 8 s. Activity 0 appears only for
a moment between two others. He did not knock on the glass to ask for a
game in that time.

The action codes in the parser's rules are activity numbers: the letter
rule's `$16` is activity 22, the fire rule's `$07` is 7, the greeting
rule's `$34` is 52, and the dance rule's `$09 $35` ends in 53. The piano
rule's `$15` (21) was not seen after "please play the piano"; 21 appeared
later in the poker run, just before 79.
