# Zork I — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

Addresses with a `$` and four digits are the Apple II's memory. A story
address is an address in the story file, which starts at $2C00 in
memory, so story $2396 is memory $4F96. Global numbers are decimal.

## Build

Infocom's Zork I, release 15, serial number UG3AU5, on a 16-sector Apple
II disk (`orientation.md`). The disk holds two programs:

- **The interpreter**, 6,656 bytes of 6502 code at $0800-$21FF, plus the
  disk routines at $2400-$2BFF. It is Infocom's ZIP for the Apple II: it
  runs version 2 of the Z-machine, Infocom's virtual computer.
- **The story**, 81,920 bytes on tracks 3-22. Its header says version 2,
  release 15, serial `UG3AU5`. The rest of the header gives these
  addresses: high memory at story $476C, the first instruction at $4859,
  the dictionary at $3686, the object table at $010A, the globals at
  $20DE, static memory at $2CDC and the abbreviations at $00CA.

Two published sources describe this interpreter: Eric Smith's partial
disassembly of Infocom's Apple II ZIP, `zip.asm` in
https://github.com/brouhaha/a2zip, which builds this version as `iver2`
("only known to be used by Zork I release 15 and Zork II release 7"), and
Infocom's own early Apple II ZIP source, `apple/oldzip` in
https://github.com/erkyrath/infocom-zcode-terps, both read 19 October
2026. The run read the first lines of each and the reconstruction's
zero-page layout as a guess about purpose. It did not map either onto
the image, and the listing's names and comments were written from this
image's bytes.

At start-up the interpreter writes $FF over header byte 5, which is the
low byte of the high-memory mark ($0800). The story in memory differs
from the disk in that one byte and in nothing else.

## Memory layout

| Thing | Where |
|---|---|
| Interpreter's variables | $80-$F2; $0800 clears $80-$FF at start |
| An RTS the dispatcher calls before every instruction ($0A2E) | $7C, put there by the loader at $232F |
| Output line, built and shown a line at a time ($1B90) | from $0200 |
| Z-machine stack, 178 words, growing down from $03E8 ($1708) | $0284-$03E7 |
| Interpreter | $0800-$21FF |
| Which story page is in which buffer, and their order of use ($0800) | $2200-$23FF |
| Disk routines, an RWTS like DOS 3.3's ($2900) | $2400-$2BFF; nibble buffers $2700-$2855 |
| The story's resident part: its first $48 pages, read at start-up and kept ($0800) | $2C00-$73FF |
| Page buffers, one 256-byte page of the story each ($08C8) | $7400 up to the top of RAM: 76 with 48K, 12 with 32K |

Language card: never used. The only references to $C080-$C08F in code
that runs are indexed by the slot, for the disk drive. The top of RAM is
found by testing pages from $BF00 down ($1B6F), so a 64K or 128K machine
gets the same 76 buffers as a 48K one. The 56 bytes at $2BC8 would
write-enable a language card if run, but nothing runs or refers to them.

### The story

| Story address | What | Read by |
|---|---|---|
| $0000-$003F | header | $08C8 and the story |
| $0040-$00C9 | the 32 abbreviation strings' text | $195F |
| $00CA-$0109 | abbreviation table, 32 packed addresses | $195F |
| $010A-$0147 | property defaults, 31 words | $100D |
| $0148-$0A3E | 255 objects, 9 bytes each: 4 bytes of attributes, parent, sibling, child, property table address | $16BB |
| $0A3F-$20DD | property tables: short name, then properties in descending order | $167D |
| $20DE-$222D | 168 globals | $0B12 |
| $222E-$22E1 | the table of timed events, six bytes an entry (global 116) | story $47C0, $47FE |
| $2396-$2485 | parse buffer, 240 bytes (global 54) | sread $12EB |
| $2486-$254D | text buffer, 200 bytes (global 37) | sread $12EB |
| $2CDC-$2DB1 | start of static memory: the verb table, 107 words (global 137) | story $5058 |
| $2DB2-$347F | sentence patterns, a list for each verb, 8 bytes a pattern | the story's parser |
| $3480-$355F | action routines, 112 packed addresses (global 135) | the story's parser |
| $3560-$363F | pre-action routines, 112 words, 13 of them non-zero (global 136) | the story's parser |
| $3640-$3685 | the 17 prepositions, numbers 239-255 (global 134) | the story's parser |
| $3686-$476B | dictionary: separators `,` `.` `"`, then 617 entries of 7 bytes | $1432 |
| $476C-$E925 | high memory: 359 routines, and one string, `Failed.` | $1752 |
| $E926-$13FF3 | 491 strings, printed with print_paddr | $18D2 |

Everything from story $4800 on lives on the disk and is read into a
buffer when the Z-machine reaches it. That is 63,476 bytes of code and
text, and the 76 buffers hold 19,456 bytes of it at a time, so the
listing cannot show them. Its comments cover the story's resident part only; the counts above
come from a decoder of the story file, written for this run.

## Paging

- A page below $48 is at $2C00 plus the page. Any other page is looked up
  among the buffers' page numbers ($18B5). When no buffer holds it, it is
  read from the disk into the buffer used longest ago ($1752 for code,
  $1801 for data). Each use moves a buffer to the newest end of a chain
  kept at $2300 and $2380 ($1880).
- Story page *n* is at track 3 + *n* ÷ 16, sector *n* mod 16 ($1DC1). The
  disk routines translate that sector through the table at $2BB8, so
  consecutive pages lie four sectors apart round a track.
- A disk error while paging restarts the interpreter from $0800.

## Timing

- There is no interrupt, timer or clock. The interpreter runs as fast as
  the 6502 allows and waits only for the keyboard and the disk.
- Random numbers come from the Monitor's count RNDL-RNDH ($4E-$4F). The
  count runs while the Monitor waits for a key, so it depends on how long
  the player took to type ($21E8). `random` returns the count's
  remainder divided by the operand, plus one ($1547). Each call rotates
  the high byte, so two calls in one turn differ.
- Time in the game is counted in moves. The story runs its table of timed
  events once a turn (story $47FE).

## Controls

- A line is read with the Monitor's GETLN1, so the left arrow rubs out
  and RETURN ends the line ($1D42). Capitals become lower case.
- At most 99 characters reach the parser. The text buffer holds 100, and
  the RETURN takes the last place (*live*).
- `[MORE]` waits for any key ($1C5B). The save questions take one key
  each, and RETURN keeps the default ($1F6F).

## Screen

- The game uses text page 1, 40 columns ($1D90). Row 0 is the status
  line. The text window is rows 1-23, so scrolling leaves the status line
  alone.
- The status line is drawn before each input ($1CD7). It shows the
  room's short name (global 0) at column 0, then `SCORE:` at column 25,
  with the score (global 1), a slash and the moves (global 2), all in
  inverse. The row is cleared first with the Monitor's CLREOL, which
  leaves normal spaces between them although the inverse flag is set
  (row 0 of every play snapshot).
- All output is in capitals, since the Apple II and II+ have no lower
  case ($1B90). Lines are broken at the last space before column 40
  ($1BB5).
- `[MORE]` appears in inverse when the lines printed since the last input
  fill the window (*live*, $1C5B).

## Sound

None. The interpreter never touches the speaker at $C030.

## Mechanics

### The interpreter's arithmetic

- **A negative divisor gives the wrong answer.** $160F is meant to make
  both operands positive before a multiply or divide. It counts each
  negative operand, but it negates the first operand whichever one was
  negative ($1633). A multiply still comes out right, because a 16-bit
  product wraps the same way. A divide does not. Run live through the
  interpreter's own `div` handler at $111D: 7 ÷ -2, -7 ÷ -2 and
  100 ÷ -7 all give 0, while -7 ÷ 2 gives -3 as it should.
- **`mod` never fixes the sign** ($114F). -7 mod 3 gives 1 (*live*), and
  7 mod -3 gives 32,761 (*live*). That second result is $FFF9 with its
  top bit lost: the divide routine's remainder keeps only 15 bits ($15C1).
- **Division by zero** gives -1 (*live*). Nothing tests for it.
- None of this shows in Zork I. The story's six divisions divide by 2, 4,
  5 or 70, and its two `mod`s take a counter that only goes up.

### The parser's buffers

- **A line of sixty words breaks the game.** The parse buffer (story
  $2396) says it may take 120 words, but it is 240 bytes long. That is
  room for 59 entries of four bytes after its two-byte head. The 60th
  word's length and position are written over the first two bytes of the
  text buffer, which follows it. The first of those bytes is the text
  buffer's size, so the size becomes 1. From then on every line is cut to
  its first letter. Commas, full stops and quotation marks are words of
  their own, so sixty commas do it. Run live: after sixty commas,
  `open mailbox` gives `I DON'T KNOW THE WORD 'O'.` and `north` walks
  north. `restart`, `restore` and `save` arrive as `r` and `s`, and `s`
  means south, so the player can no longer get out. Only quitting (`q`)
  and booting the disk again put it right.
- **Sixty-three words wrap the index.** sread reaches the entries through
  ($84),Y, and Y wraps at 256 after the 63rd entry ($12EB). The
  position of the next word is written into byte 1, the count of words,
  and its length into byte 0, the limit. sread stops only when the count
  equals the limit, so it never stops early again. With 63 commas the
  count comes out at 64, and the story reads a 64th entry made of commas
  from the text buffer. It then prints a screenful of memory as
  `I CAN'T USE THE WORD '...' HERE.` (*live*).
- A word is cut to its first six letters before the dictionary search
  ($13CD).
- The search of the punctuation alphabet for a typed character starts 13
  bytes past the end of the 24-character table ($1B0B), in the code that
  follows it. A typed character equal to one of those 13 bytes, such as a
  backtick, gets a code too big for five bits.

### Saving and restoring

- A saved game takes four tracks, starting at track 3 + 4 × position, so
  positions 0-7 fill tracks 3-34 of the save disk ($1EC8, $1DC1).
- **What a save writes** ($2064):
  1. The first sector holds the story's version byte, the program counter,
     the 15 locals and the stack's count, pointer and frame.
  2. The next two sectors hold the Z-machine's stack area, $0280-$03E7.
  3. Then come story pages 0-$2D, 46 pages. That is one page past where
     dynamic memory ends (header word $0E, story $2CDC).
- Each block is copied into the buffer at $0200 last byte first
  ($20F1), and restore turns it round again.
- Restore reads back 45 pages, 0-$2C, which is all of dynamic memory. It
  refuses a save whose first byte is not this story's version ($20FD).
  It keeps the SCRIPT flag, header byte $11, as it is.
- The disk routines write their own D5 AA BC data fields into existing
  address fields ($242A), so the save disk must be formatted beforehand.
  Nothing calls the format routine at $2AAF.
- Live: in the cellar, `save` to position 1 in drive 2 printed `OK.`.
  After walking north to the troll, `restore` from position 1 printed
  `OK.` and `look` was in the cellar again.

### Errors

- The interpreter has one fatal error, a BRK at $21E7, which drops into
  the Monitor. It is called for a story with bit 0 of header byte 1 set,
  an illegal opcode, `je` with one operand, a property too long for
  `get_prop` or `put_prop`, and a Z-machine stack that overflows or
  underflows.
- The text `ZORK INTERNAL ERROR!` is at $21D3, but nothing refers to it.

### The story

Read from the story file with the decoder; the line names the routine.

- **The player is called `cretin`.** Object 252, which global 38 holds
  in play, has the short name `cretin`; the one noun in its property 18
  is `advent`, for adventurer. The words `cretin`, `me`, `myself` and
  `self` are object 75's nouns, `you`, one of the objects inside object
  23, which has attribute 20 like the player. Live: `kill cretin` asks
  `WHAT DO YOU WANT TO KILL THE CRETIN WITH?`, and `hello cretin` answers
  `THE YOU BOWS HIS HEAD TO YOU IN GREETING.`
- **The score.** Points come from two properties and one global. The
  routine at story $61EA adds an object's or a room's property 13 to the
  score, then sets it to 0; it is called when an object is taken (story
  $6A5C) or put somewhere (story $6B34) and when the player enters a room
  (story $7112). 23 things carry one: 19 objects and four rooms, the
  Kitchen (10), the Cellar (25), the East-West Passage (5) and the
  Treasure Room (25), 208 points in all. Property 12 of the nineteen
  treasures comes to 129 (below). The last 13 are global 35, which the
  Drafty Room's routine (story $CC4C) adds once, when the player is in
  that room and global 118 is not 0, and then sets to 0: 208 + 129 + 13
  is 350. Dying takes 10 away (story $6467).
- **Walking into the dark.** When a room has no exit in the direction
  asked and global 118 is 0, the walking routine rolls `random 100` and
  on 1-74 prints `Oh, no!  You have walked into the slavering fangs of a
  lurking grue!` and kills the player (story $68B9); otherwise `You can't
  go that way.` Global 118 is 0 in the dark: the grue's line needs it,
  and the Drafty Room's points need it not to be. Live: in the cellar
  with the lamp left behind, `east`, a direction with no exit, gave the
  grue's line and `YOU HAVE DIED`, and the score went from 35 to 25.
- **Exits.** Properties 19-31 of a room are its exits, and the walking
  routine (story $6808) reads them by length: 1 byte is a room; 2 a
  message, printed; 3 a routine, called, which gives the room or 0; 4 a
  room, a variable number and a message, the room taken when the variable
  is not 0 and the message (or `You can't go that way.`) when it is; 5 a
  room, a door and a message, the room taken when the door has attribute
  13, the message (or `The ... is closed.`) when not. The direction words'
  dictionary entries carry the property numbers: north 31, east 30, west
  29, south 28, north-east 27, north-west 26, south-east 25, south-west
  24, up 23, down 22, in 21, out 20, land 19.
- **Nouns and adjectives.** An object's property 18 lists the dictionary
  addresses of the nouns that name it, and property 16 the numbers of its
  adjectives (story $5DEC).
- **The trophy case.** After any `take` in the living room, and after a
  `put` into the trophy case (object 183), the living room's routine
  (story $8814) sets the score to global 129, the points scored so far,
  plus the property 12 of everything in the case (story $898C). Nineteen objects carry a property
  12 above 0, besides a broken canary and a broken egg; those nineteen
  are the treasures. The sword uses property 12 for how brightly it
  glows.
- **A treasure inside a container in the case scores nothing.** The
  routine that adds up the case (story $898C) calls itself for each
  container it finds, then throws the result away. Run live: the egg put
  straight into the case raised the score from 15 to 20; the egg put
  into the brown sack, and the sack into the case, left it at 15.
- **The last secret.** Every score change goes through story $6192,
  which adds to global 129 as well as to the score. When the score
  reaches global 83, 350, and global 30 is still 0, the routine sets
  global 30, changes two objects' attributes and prints `An almost
  inaudible voice whispers in your ear, "Look to your treasures for the
  final secret."` Global 30 is the condition on West of House's
  south-west exit, to the Stone Barrow (property 24: room 180, variable
  $2E). Live: with global 30 written as 1 (memory $4D1A-$4D1B) at West of
  House, `southwest` led to the Stone Barrow, and `west` or `enter` there
  printed the ending, `PLAY "ZORK: THE GREAT UNDERGROUND EMPIRE, PART
  II".`, with a score of 0. The barrow's own routine (property 17, story
  $85D8) gives the ending; its one exit is north-east, back to West of
  House.
- **Strength in a fight** is 2 + score ÷ 70 (story $E20C), from 2 at the
  start to 7 at 350 points. When asked, the routine adds the player's
  property 15, which wounds lower. The troll's property 15 is 2, the
  thief's 5 and the cyclops's 10,000.
- **Saying hello to the sailor.** `hello sailor` names object 22,
  `sailor`, one of the objects inside object 23, and counts in global 81
  (story $766E): every twentieth answers `You seem to be repeating
  yourself.`, every other tenth `I think that phrase is getting a bit worn
  out.`, and the rest `Nothing happens here.` Live, twenty in a row from
  West of House: the 10th and the 20th gave those two answers, and the
  other eighteen `NOTHING HAPPENS HERE.` `hello` alone prints a greeting
  from a table (global 87), `HELLO.` live. Said to an object with
  attribute 20 it answers `The ... bows his head to you in greeting.`,
  and to any other `I think that only schizophrenics say 'Hello' to a
  ...` (live with `mailbox`).

## Data tables

| Table | Where | Form |
|---|---|---|
| Dispatch: 0OP, 1OP, 2OP, VAR | $0921, $0939, $0959, $098B | 12, 16, 25 and 10 handler addresses |
| Alphabet 2 | $19B5 | `0123456789.,!?_#'"/\-:()`, codes 8-31 |
| Word breaks | $13E5 | space `.` `,` `?` CR LF tab form feed |
| Sector order | $2BB8 | 0 4 8 12 1 5 9 13 2 6 10 14 3 7 11 15 |
| Disk nibbles | $2629 (write), $2696 (read) | 64 six-bit values, $96-$FF |
| Save prompts and defaults | $1E4E-$1EC7 | slot 6, drive 2, position 0 at first, then the last answers |

The Z-machine's alphabets 0 and 1 are not tables: a 5-bit character
6-31 becomes `a`-`z` or `A`-`Z` by adding $5B or $3B ($18D2).

## The listing's error rate

One sample of the listing's comments, seed 20261019, checked against the
bytes and in the kit's simulator by an agent (on `claude-opus-5-5[1m]`)
that wrote none of them. The 927 comments fall in two strata: 330 written
by hand on the interpreter and its disk routines ($0000-$2BFF), and 597
written by a decoder of the story file from templates, one for each kind
of table in the story's resident part ($2C00-$73FF). The sample drew 60
from the first and 20 from the second.

7 of the 80 were wrong in a detail, 8.75 % (Wilson 95 % interval
4.3-17.0 %): 7 of the 60 by hand (11.7 %, 5.8-22.2 %) and none of the 20
by the decoder (0-16.1 %), so 4.1 % weighted by the strata's sizes. That
is over the mark of one in 30. Each of the seven was a list or a
condition stated too narrowly: who swaps the output hook ($0037: new_line
does it too, at $1CA3), who reads the opcode ($0080: $0A11 as well) and
the third operand ($0086: storeb and je as well), when the program
counter's page is looked up again ($008F: after every backward jump, and
after print and print_ret, which copy $96 into it at $0C7C), how the
start-up reaches the instruction loop ($08C8: a jump at $091B, not a
fall), which handlers share the tail at $0F04 ($0EB3: dec_chk and inc_chk,
not jl), and how the status line is cleared ($1CD7: CLREOL leaves normal
spaces). All seven were corrected, with the three comments that said the
same ($0036, $00EE and $0BAA). The checker's rate is a lower bound on the
true rate.

## Live tests

All from `work/play-west-of-house.json` or `work/play-cellar.json`, typed
through the kit's Apple2TS server.

- Arithmetic: operands written to $82-$85, PC set to the handler, stopped
  at $0B55 where the result is stored. `div`, `mod` and `mul` on 17 pairs;
  the results are under "The interpreter's arithmetic".
- Lines of 58, 60, 61, 62, 64, 66, 68, 70, 75, 77, 78, 79, 85 and 100
  commas, the buffers read when sread returns ($1331): up to 62 commas
  give `YOU MUST SUPPLY A VERB!`, and 64 or more print memory.
- Sixty commas, then `open mailbox`, `north`, `restart`, `q`, `y`.
- 95 spaces and `frobozz`: `I DON'T KNOW THE WORD 'FROB'.`
- `look. look. look. look. look`: stops at `[MORE]`.
- `save` and `restore` at position 1 on a formatted disk in drive 2.
- The egg in the case, and the egg in the sack in the case: 20 and 15.
- `restart` and `y`; `q` and `y`.
- `kill cretin`.
- `west` then `east` from West of House: the Forest, then the Forest Path.
- Down the trap door without the lamp, then `east`: the grue.
- Global 30 written as 1 at West of House, then `southwest`, then `west`
  or `enter`: the Stone Barrow and the ending.
- `open mailbox then take leaflet`, `drop leaflet. take all`, `drop all
  but mailbox`, `mailbox, open`, `say "hello"`.
