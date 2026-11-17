# Galactic Games — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`. Addresses
are given with the part that holds them (`parts/<id>/`).

## Build

Two G64 disk sides, the Activision release (directory art "PARA-PROTECT",
"GALACTIC", "GAMES.", "SIDE 0" and "SIDE 1"). Side 1 holds the boot program
(1,283 bytes at `$00AE`), HARRY (the menu, `$0900`-`$2AFF`), PROG0 (100m
Slither, `$0B00`), PROG1 (Space Hockey, `$0B00`), RECO (the records, 50 bytes
at `$BC64`) and packed boot data on tracks 19 to 22. Side 2 holds HARRY again,
PROG2 (Psychic Judo, `$0B00`), PROG3 (Head Throwing, `$1000`) and PROG4 (the
Metamorph Marathon, `$1F00`). Every item is answered in `media.json`.

The title screen reads "Design Copyright (C)1987 Tigress Designs", "Copyright
(C)1987 Activision" and "A Software Studios production in association with
Tigress Designs" (*live*, `reference/title-credits.png`). No version string
was found.

## Memory layout

| Thing | Where |
|---|---|
| Fast-load entry: every load after the boot | resident `$0800` load_file; the fast loader rests at `$DC00`-`$DFFF` and is swapped to `$BC00`-`$BFFF` for each load (`$0819`) |
| Records-changed flag, disk side | resident `$08FE`, `$08FF` |
| Menu program HARRY, its font | menu `$0900`-`$2AFF`, font `$2800` |
| Event files | slither `$0B00`-`$7ACF`, hockey `$0B00`-`$674F`, judo `$0B00`-`$742F`, head `$1000`-`$B73F`, marathon `$1F00`-`$B0BF` |
| Results the events pass back | resident `$B800`-`$B838` (`$B800` the championship flag) |
| Records code entry | resident `$B839` records_entry |
| Records screen texts (run-length coded) | resident `$B970`-`$BC63` |
| Records file RECO | resident `$BC64`-`$BC95` |
| Records screen font, copied to `$0900` | resident `$BC96`-`$C03F` |
| Title screens' letter sprites (shapes 1 to 20, video bank 3) | resident `$C040`-`$C53F` |
| Title screen code and data | resident `$C540`-`$CFFF` |
| Records check, records screen, champion | resident `$D000`-`$D7FF` (RAM under the I/O) |
| Title bitmap | resident `$E000`-`$FF3F` (colours `$D800`, bank 3) |

The resident code runs with every ROM and the I/O banked out (`$01` AND
`$DC`), banking the I/O in only to touch a chip (`$B8D5`, `$B8DF`, `$CF40`,
`$CF4B`). Each event banks the KERNAL and BASIC ROMs out and keeps the I/O
in, and uses video bank 1 (`$4000`-`$7FFF`) with its screen at `$4000`.

Every event reaches the resident at three places: its entry calls the title
screen `$C540` with A = its title number (0 Slither, 1 Head Throwing, 2
Hockey, 3 Judo, 4 Marathon); it loads files through `$0800`; and on
RUN/STOP it writes its results into `$B801`-`$B830` and calls `$B839` with
`$02` = its event number (0 Slither, 1 Hockey, 2 Judo, 3 Head Throwing, 4
Marathon), then loads HARRY itself and jumps to the menu at `$0E90` with
`$FF` = the event just played plus 1. Slither, Hockey, Judo and Head
Throwing call `$B839` only when `$B800` is 0; the Marathon always calls
it, with `$02` = 5 in a championship, which checks all five events'
records and ends the championship.

## Timing

All timing is by raster interrupt; every event stops CIA 1's timer
interrupt. The interrupt splits each frame into bands, through a JMP whose
operand the last band rewrites:

| Part | Bands (raster lines) | Where |
|---|---|---|
| Title screens | `$4A` top row of letters, `$8C` bottom row, 256 colours | resident `$C8B6`, `$C8BC` |
| 100m Slither | top of the far lane, `$B9` near lane, 256 frame work | slither `$0D6F`, `$0E23` |
| Space Hockey | `$69` field (bitmap on), `$B1` pause key, `$F2` message (bitmap off), 256 frame work | hockey `$0FB0` |
| Psychic Judo | `$5A`, `$9A`, `$BB`, `$EA` background colours, 256 frame work | judo `$255D` |
| Head Throwing | `$5A`, `$79`, `$90`, `$9A`, `$B8` and 256 | head `$11C8`, `$11D4` |
| Metamorph Marathon | `$71` course, `$F2` below it | marathon `$311A`, `$311E` |

The clocks count hundredths in decimal, 2 a frame: 50 frames to the second
(slither `$0D81`, judo `$36A8`).

## Controls

- Every event reads three fire buttons, keyboard first: the up-arrow key
  (keyboard row 6, column 6), joystick one's fire and joystick two's fire
  (slither `$0D2C`, hockey `$2388`, judo `$3E8C`, head `$295F`). The
  device that answers a "press fire" prompt becomes that player's controls.
- The keyboard player's keys are `@` up, `:` down, `H` left, `K` right and
  the up-arrow fire (slither `$35DE`, hockey `$2468`, judo `$3F0C`, head
  `$2BB3`). The manual gives `K` as left and `H` as right: the code reads
  them the other way (**differs**).
- RUN/STOP (keyboard row 7, column 7) leaves an event straight away, with no
  prompt (slither `$30A8`, hockey `$2DE7`, judo `$6D36`, head `$34DB`). The
  manual's choice between replaying and the menu is not in the code.
- RESTORE does nothing: every part points the NMI at an RTI.
- Space Hockey pauses on the Commodore key, "GAME PAUSED" and "GAME
  RESTORED" (hockey `$1176`); the manual does not mention it.
- The records screen and the name entry read the keyboard through the
  resident's own scan (`$CF5F`) and table (`$D545`): RETURN ends a name,
  the left-arrow key deletes.

## Graphics

- Title screens: a hi-res bitmap at `$E000` with 80 random stars moving left
  at 1 to 3 pixels a move, eight stars moved per band (resident `$C9F1`,
  `$CD5E`), each cell coloured at random from sixteen colours (`$CED5`); the
  event's name in two rows of up to eight double-size multicolour sprites,
  whose colours rotate every second frame (`$C965`). Stars are placed with
  the whole Y added to the cell address instead of Y AND 7 (`$CE52`).
- Menu: text screen at `$0400` with font `$2800`; the commentator's ball is
  five sprites that follow the text cursor (menu `$10AB`).
- 100m Slither: each worm is built from all eight sprites by a frame record
  (slither `$0E86`); two lanes scroll on their own (`$15DA`, `$16DC`).
- Space Hockey: the field is a multicolour bitmap whose chequerboard floor is
  drawn by flipping four-pixel columns and rows at the bands' edges: where a
  horizontal band crosses a vertical one the two flips cancel (hockey
  `$284B`, `$288F`). A scanner shows the puck and players as sprite dots
  (`$188A`).
- Psychic Judo: two first-person views of the arena, sixteen columns each,
  projected through a 64-row depth table built at the start (judo `$24BC`,
  `$21FE`).
- Head Throwing: the body is four hi-res sprites with four multicolour ones
  over them, Y-expanded, in 27 poses; the flying head uses all eight sprites,
  41 frames (head `$20FC`, `$21F3`).
- Metamorph Marathon: the Metamorph is four black hi-res outline sprites
  with two yellow double-width fill sprites, 35 shapes (blob 0-1, Flyer 2-7,
  Runner 8-`$13`, Burrower `$14`-`$19`, Jumper `$1A`-`$1F`, out of energy
  `$20`-`$22`); the course is a map of 32 rows by 256 tiles at `$8D00`, each
  tile 4 x 4 characters from `$8100`, colours `$8000`.

## Mechanics

- **100m Slither.** States per worm from the table at slither `$3218`.
  The super-slither needs RIGHT with 12 or more slime and spends 12 (`$3247`).
  FIRE while sliding spends 2 slime and cools the worm by 4 (`$32FF`). A unit
  of slime comes back every 200 frames (`$31DB`). With one player, worm one
  is the computer's pace-maker on the far track, driven by a script of
  (frames, controls) pairs (`$3632`, `$3674`).
- **Space Hockey.** Four rounds of 60.00 seconds; level scores give an
  overtime round (hockey `$0CC1`). The puck in the right-hand hole gives
  player one 3, in the left-hand hole player two 3; a player who falls in
  gives the other 1 (`$0D91`). The holes pull through a 16 x 8 grid of pull
  bytes (`$1B15`); the puck is pushed away from them, except while dazed
  after a hit, and each daze grows 4 frames up to 150 (`$219F`). FIRE brakes
  for five frames (`$1DF5`). The computer thinks every 13 frames (`$1EC1`).
- **Psychic Judo.** Rounds of 60.00 seconds; the reserve runs out or the
  clock does (judo `$1DE5`, `$1DB8`). A charging bolt takes 1 from the
  reserve every 5 frames (`$3567`). A bolt reaching the far end is judged on
  a 16 x 16 body map with six zones (`$2B37`, `$2C30`). The computer
  player is a state machine of six states (`$6900`).
- **Head Throwing.** Alternating LEFT and RIGHT adds 4 + ((255 - speed) / 32)
  to the run-up speed, with friction of 1 a frame (head `$1AC4`). The angle
  starts level when the thrower plants and drops one step every 10 frames
  while FIRE is held, throwing by itself straight up at 0. DOWN flaps the
  ears (gravity `$64` against `$100` for 10 frames). A landing angle of
  `$0C`-`$0F` sticks; anything else tips over and the throw is void.
  `end_contest` (`$1EBC`) calls a draw when the metres are equal and player
  one is ahead on centimetres.
- **Metamorph Marathon.** One player against the clock. The energy is 16
  bits, `$03FF` full, shown as four bars of `$100` (marathon `$1F1F`); it
  drains every 20 frames while a run is under way (`$1F23`), and power pills
  refill it (`$1F31`). The Metamorph's state picks the blob, a change, the
  Flyer, Runner, Burrower or Jumper, or out of energy (`$1F1A`).
- **Records.** Each event's two results are checked against its record by
  the resident (`$D005`): Slither, Judo and the Marathon by lower time,
  Hockey and Head Throwing by higher score, in decimal; a new record is kept
  (`$D77D`) and the menu saves RECO when `$08FE` is set.
- **Championship.** The menu sets `$B800` and loads the five events in turn;
  each keeps its results in `$B801`-`$B830`. After the Marathon the resident
  shows the records, calls the points routine that the Marathon's file
  holds at `$AD0C`, prints both players' points (`$D5D5`), compares them with
  the champion's record (`$D619`) and takes a new champion's name, then shows
  the closing title (`$C540`, A = 5).

## Data tables

| Table | Where |
|---|---|
| Title screens, 66 bytes each: shapes, colours, positions of two sprite rows | resident `$C70D`-`$C898`, by `$C899` |
| Results pointers and screen places, per event | resident `$D7D7`-`$D7FE` |
| Keyboard code to ASCII | resident `$D545` |
| Commentator's messages | menu (message table) |
| Pace-maker's script | slither `$3674` |
| Pull grid of the black holes | hockey `$1BF5`, `$1CF5` |
| Body map of the six zones | judo `$2C30` |
| Marathon course map, tiles and colours | marathon `$8D00`, `$8100`, `$8000` |

## Sound

Each event carries its own copy of one effects driver: three voices,
scripts of an instrument byte (`$C0` + n), then note and length pairs (note
`$40` a rest), `$80`-`$83` repeat marks, `$FF` to end; instruments of seven
bytes (envelope, waveform, pitch slide and vibrato); a once-a-frame tick
that slides the pitch (slither `$2EFC`, hockey `$6581`, judo `$71B5`, head
`$334D`, marathon `$3A12`). There is no music: every script is a sound
effect. The menu's typing click is the volume register turned up while
three voices run at volume 0 (menu `$0E90`).

## Text

- The menu prints through the KERNAL's CHROUT on the text screen with its
  own font at `$2800`. That font has no digits: `[` draws a 1, so "100M" is
  stored as "[OOM"; `$` in a message is a pause (menu `$1246`).
- The records screen writes straight to screen memory with a font copied
  from `$BC96`: its letters and digits keep their ASCII places, and the box
  is drawn with characters `$7A`-`$7F` and `$80`-`$8C`. Text is run-length
  coded: `$C8` n c is n copies of c, `$FF` ends (resident `$D599`).
- The events' message lines use each event's own character set with letters
  at their screen-code places; the title screens spell the event names with
  sprites (resident `$C040`).

## Register census

From `kit/cpu/census.py` over every part. In the resident, the census's
`$D000`-`$D7FF` rows are its own RAM routines (the records code runs with
the I/O banked out), not chip registers.

| Register | What the game does with it | Where |
|---|---|---|
| `$0001` | banks ROMs and I/O; the resident runs with all RAM | every part's init; resident `$B8D5` |
| `$D000`-`$D010` | sprite positions, set per band | every event; resident `$C8EF` |
| `$D011`, `$D012`, `$D019`, `$D01A` | raster interrupt bands; bitmap mode on and off | every event; resident `$C540`, `$C997` |
| `$D015`, `$D017`, `$D01C`, `$D01D` | sprite enable, double size, multicolour | events; resident `$C8DE` |
| `$D016`, `$D018` | multicolour text, screen and character set | every part |
| `$D01B` | sprite priority, set once | judo `$1CC0` |
| `$D020`-`$D023`, `$D025`-`$D02E` | border, backgrounds, sprite colours | every part |
| `$D400`-`$D406`, `$D40E`-`$D414` | effects; the menu's click voices | events' drivers, menu `$0E90` |
| `$D418` | volume; the menu's click; read at resident `$B869`, a write-only register | menu, every `sid_init`, resident |
| `$DC00`, `$DC01` | joysticks, keyboard, fire buttons | every part |
| `$DC02`, `$DC03` | keyboard scan directions | resident `$CF5F` |
| `$DC0D`, `$DC0E` | CIA 1's timer interrupt stopped | every event, resident `$C540` |
| `$DD00`, `$DD02` | video bank; the fast loader's serial lines | every part |

No part touches the SID's filter (`$D415`-`$D417`) or the CIA timers beyond
stopping CIA 1's.

## The listing's error rate

A sample of 60 comments from the whole listing (seed 2617, population
3,095), checked on claude-opus-5-5 by a checker that wrote none of them:
9 wrong in a detail, none wrong in its main claim (15 %, 95 % interval 8 %
to 26 %), so the listing is over the mark and needs a full audit. All 9
were corrected, with the comments that repeated them: the sound drivers'
instrument comments in four events said "every N ticks" where the pitch
steps every N + 1, and now give the rate. The kinds of error: a value
read as filler that is a table entry (head `$2A1E`), a flag said to clear
when nothing clears it (marathon `$1F2F`), a routine called "the same" as
another that differs (marathon `$246F`), a branch's condition misread
(marathon `$2798`, slither `$12F8`), swapped return values (menu `$2422`)
and a shape said to be unused that a title uses (resident `$C000`).

## Live tests

- The boot, the menu, every event's title screen and each event's play were
  reached in VICE from the two G64 sides; the reference screenshots in
  `reference/` are from those runs.
- The joystick in port 2 drives player one in the menu and the events; a
  fire press on either port answers the prompts.
