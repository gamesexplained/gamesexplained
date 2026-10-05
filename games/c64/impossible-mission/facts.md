# Impossible Mission — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`
(`work/play-room1.vsf`); *live* facts were measured in VICE (x64sc,
vice-mcp v3.13.1, PAL) on 1 October 2026 with the scripts in `work/`.

## Build

The Epyx disk, PAL, as a G64 with its protection intact
(`orientation.md`). The program is unpacked to `$0880`-`$D024`; the
speech samples are a separate file (`words`, `$E000`-`$F77F`). No build
string or version number was found in the image (string sweep in both of
the game's alphabets and in PETSCII).

The game is written for NTSC timing and adjusted for PAL at start-up:
`detect_pal` (`$3FB9`) tells the two apart by whether the raster passes
line `$20` after line 259 (only PAL has more than 263 lines) and on PAL
writes `$6E` into the operands at `$AB2B`, `$AB39` and `$AB49`, switching
the end picture's mouth animation from the NTSC durations
(`$AB67`: `$40 $28 $28 $20 $2C $20 $10`) to the PAL ones (`$AB6E`:
`$35 $21 $21 $1B $25 $1B $0D`, five sixths of them). *Live:* the three
operands read `$6E` in play. Nothing else is adjusted: the game clock
counts 60 ticks to the second on both (below).

## Memory layout

| Thing | Where |
|---|---|
| Zero page variables | `$10`-`$EC` (the listing names each) |
| Speech buffer (run time) | `$0800`-`$087F` |
| Speech driver | `$0880`-`$0CFF` (entry `$0880`, NMI handlers in page `$08`, variables `$0CF1`-`$0CFF`) |
| Panel, shaft and corridor tables | `$0D00`-`$0E6F` |
| Room pointer table, 32 rooms | `$0E70`-`$0EAF` |
| Room records | `$0EB0`-`$1D63` |
| Lifting-platform originals and lists | `$1D64`-`$2051` |
| Password words | `$208E`-`$20D5` |
| Robot scripts and their starts | `$2112`-`$2231` |
| Ball scripts | `$2232`-`$232B` |
| Furniture types and shapes | `$232C`-`$26E2` |
| Puzzle patterns and 16 piece masks | `$26E3`-`$3062` |
| Code-room picture, furniture slot list, password pictures | `$3063`-`$3312` |
| Pocket computer screen and colours | `$3313`-`$3632` |
| Security terminal screen (run-length) | `$3633`-`$3854` |
| Start-up and pocket computer code | `$3855`-`$3FE0` |
| Video bank 1: screen `$4000`, sprites `$10`-`$1F` `$4400`, character sets `$4800`, `$5000`, `$5800`, agent sprites `$6000`-`$6FFF`, robot sprites `$7000`-`$71BF` | `$4000`-`$71BF` |
| Game code | `$71C0`-`$BF29` |
| Piece records (run time) | `$BFC0`-`$C04F` |
| Work areas (run time): room buffer `$C100`, bit-reversal table `$C500`, saved display `$C690`, puzzle images `$C9F0`, hall of fame `$CF00` | `$C000`-`$CFFF` |
| End picture character set (under the I/O area) | `$D000`-`$D7FF` |
| End picture screen (under CIA 1 and 2) | `$DC00`-`$DFFF` |
| Speech samples | `$E000`-`$F77F` |
| End picture colours | `$F800`-`$FBFF` |
| Map of this game (run time) | `$FC00`-`$FFEB` |

The start-up moves three blocks the unpacker left in `$C000`-`$CFFF`
into the RAM under the I/O area and the KERNAL (`move_high_tables`,
`$71C0`): `$C800`→`$D000`, `$C000`→`$F800`, `$C400`→`$DC00`.

## Timing

- One raster interrupt a frame in a room, at line `$FF`; two in the shaft
  view, at `$FF` and `$AA` (the split for the pocket computer). *Live:*
  the handler at `$82F4` ran 120 times in 120 frames in a room.
- The tick `$E0` goes up once a frame. *Live:* +600 (mod 256) in 600
  frames.
- The game clock (`game_clock`, `$83A2`) counts 60 ticks to a second
  (`$D1`), then seconds, minutes and hours in decimal (`$D2`-`$D4`), from
  12:00:00. *Live:* 600 frames moved it on 10 seconds. On a PAL machine
  (50 frames a second) one game second therefore takes 1.2 real
  seconds, and the six hours of the mission are 7 hours 12 minutes of
  real time; on NTSC they are six real hours.
- The clock stops while the pause button's message is up (`$D5`) and
  during the death sequence (interrupts masked). *Live:* it stood still
  for the two seconds of a death.
- At six o'clock (`$D4` = 6) `$43` = `$FF` and the game ends
  (`wait_tick_or_end`, `$83F4`).
- The agent moves once every 3 ticks (`$40` = 3 against the counter `$3E`).
- The speech plays from CIA 2 timer B NMIs (`$DD06`/`$DD07`, `$DD0F`,
  enabled with `$DD0D` = `$82`), latch 100: one every 101 cycles, 9,755 a
  second on PAL and 10,126 on NTSC (`speech_start_timer`, `$0C71`).

## Controls

- Joystick in port 2 (`$DC00`). Left and right walk; fire somersaults;
  up in front of furniture or a terminal searches or uses it; up and down
  in the lift move it; up and down on a lifting platform raise and lower
  it (`agent_read_stick` `$87ED`, `room_loop` `$7249`, `lift_loop`
  `$39CF`, `lift_platforms` `$AC88`).
- Fire in the lift or corridor opens the pocket computer; the stick then
  moves a hand pointer and fire presses the button under it (`$3A80`).
- The keyboard is read only for the high-score name (own matrix scan,
  `read_key` `$BE2D`).
- RESTORE restarts the game: the NMI vector points at `$388C`, inside the
  start-up (`nmi_normal`, `$BECD`).

## Graphics

### Character sets and alphabets

Three character sets in video bank 1:

| Set | Shown in | Selected by |
|---|---|---|
| `$4800` | the shaft view above the panel, the security terminal, the end screen | the interrupt at line `$FF` (`$D018` low nibble 2) |
| `$5000` | rooms | `draw_room` (`$D018` = `$04`); in a room the interrupt leaves `$D018` alone |
| `$5800` | the pocket computer panel | the interrupt at line `$AA` (`$D018` = `$06`) |

The game keeps no text in PETSCII or screen codes. The two sets that
carry text each have their own letter order, and every string is stored
in the order of the set that draws it:

| Set | Letters | Digits | Other |
|---|---|---|---|
| `$4800` | A-Z = `$71`-`$8A` | 0-9 = `$8B`-`$94` | space `$53`, `.` `$FE`, `*` `$95`, `=` `$96`, `>` `$97` |
| `$5800` | A-Z = `$66`-`$7F` | 0-9 = `$80`-`$89` | space `$53`, `:` `$F6`, `'` `$FA` |

The letters and digits of both are the C64 character ROM's own: the
start-up banks the ROM in (`$01` = `$21`) and copies `$D008`-`$D0D7` and
`$D180`-`$D1CF` into both sets (`$3965`-`$398E`); the image as loaded has
zeros there.

Strings in the `$4800` order: the terminal (`$A01E`-`$A0DD`), PASSWORD
REQUIRED and PASSWORD ACCEPTED (`$A229`), the tally and high score
(`$B8A7`-`$B979`), the name entry and restart prompt (`$BD99`-`$BDE0`).
In the `$5800` order: the password words (`$208E`), the status texts
(`$3431`), the phone menu and answers (`$7C44`-`$7D4B`), the messages
(`$8208`-`$82B7`).

### Sprites

- The agent is three sprites (1-3) in 28 frames (`tbl_agent_pointers`,
  `$8D43`); each frame is stored facing one way and mirrored in place
  through the bit-reversal table at `$C500` when he turns
  (`agent_frame`, `$8729`).
- A robot is a sprite (4-7) in seven turning steps, pointers `$C0`-`$C6`
  (`robot_turn`, `$90B6`); the zap is sprite 0 (`$14`-`$17`), as is the
  ball (`$1F`).
- The hand pointer is sprite 4 (`$10`), the map marker sprite 6.

### The end picture

Professor Elvin Atombender at his controls: a multicolour character
picture (screen `$DC00`, glyphs `$D000`, colours `$F800`) shown in video
bank 3 when the mission is won, with his mouth animated from two sets of
13 glyphs (`$AB93`, `$ABA0`) while voice line 4 plays, and random lights
twinkling (`end_twinkle`, `$ABBA`). *Live:* forced by filling the
password line and starting `$AA40`; screenshot `reference/end-elvin.png`.

## Mechanics

### A new stronghold every game

At the start of each game `new_game_setup` (`$7236`) randomises:

- the map: the 32 rooms shuffled in four groups of eight and placed on a
  9 × 6 grid joined by shafts and corridors (`make_map`, `$B2BD`);
- every robot's behaviour, a random script from `$2212` (the second half
  of the choices in rooms with a ball) (`randomise_robots`, `$B088`);
- the password, one of eight nine-letter words (`choose_password`,
  `$B0CD`). *Live:* SWORDFISH in this snapshot's game;
- the nine puzzle images, from random 8-byte patterns
  (`make_puzzle_images`, `$B0F3`);
- the 36 pieces: each puzzle cut by pairs of 16 mask shapes, no pair used
  twice, with random flips (`make_pieces`, `$B180`). The four pieces of a
  puzzle divide its picture exactly (a first mask and its complement, each
  split by its own second mask); every piece also carries the picture's
  frame, the only part they share;
- where the 36 pieces, 9 snooze passwords and 9 lift-init passwords are
  hidden among the 128 searchable pieces of furniture (`hide_items`,
  `$B26D`);
- every room's lifting platforms back to their starting positions
  (`reset_room_platforms`, `$B045`).

### The map

`make_map` (`$B2BD`) carves the map into 102 glyphs of one bit a pixel at
`$FC00`-`$FF2F`, 17 across and 6 down (136 × 48 pixels), all set at the
start. The room grid at `$FF96` is 9 columns by 6 rows; grid square
(X, Y) starts at glyph 2X - 1 of row Y (glyph 0 for column 0), so the
odd glyph columns hold the 8 lift shafts and the even ones the rooms.
The shuffled room numbers are at `$FFCC`, four groups of eight shuffled
within the group (16 swaps each). Room masks (`tbl_room_shapes`,
`$B59D`): rooms `$00`-`$0F` take 3 glyphs (shaft, room, shaft, with a
door to each), `$10`-`$17` 2 glyphs with the shaft and door on the left,
`$18`-`$1F` 2 glyphs with them on the right; `may_join` (`$B500`) never
joins a room from its closed side. `join_rooms` (`$B488`) checks the
neighbour in the row and, if it may not join it, searches up and then
down the column from that neighbour's square and cuts shaft segments
(`$E7`, `$B63D`) in the room's own column. The carving can reach past
`$FF2F` into the first bytes of the cell table. The display shows 17 × 6
cells (`draw_map_frame`, `$B699`) from the cell table `$FF30`, glyph
`$FC` (solid) until `reveal_map_cell` (`$B761`, index (x - `$68`)/8 + 17
× ((y - `$B8`)/8)) writes the cell's own glyph `$8A` + index. The frame
is glyphs `$F0`-`$F5`, copied from `$B56D` (corners, striped edges), in
yellow; the cells in green (colour 5) on the panel's black. *Checked:* a
port of `make_map` gives the same `$FC00`-`$FFEB` as the game's routine
run in the kit's 6502 simulator for 200 random byte streams, `random`
(`$82E3`) answered from the same stream; every roll placed all 32 rooms.

### Rooms

32 room records (`$0E70` pointers). Rooms `$11` and `$1B` are the code
rooms (a computer and a big screen of 32 squares); room `$05` holds
Elvin's control (furniture type `$15`, contents `$FE`). A room is drawn
off screen in the buffer at `$C100` (`draw_room`, `$A39C`) and revealed
with a wipe from the middle (`room_wipe_in`, `$A2F7`). The map shows a
room's cell only once it has been entered (`reveal_map_cell`, `$B761`).

### Searching

Up in front of furniture starts a search (`search_object`, `$97FB`). Each
piece has a search time (`tbl_furniture`, byte 4) that counts down while
up is held and is kept if the player lets go, so a search can be
resumed. Contents: nothing, a puzzle piece, a snooze or lift-init
password; a security terminal opens the terminal; the code rooms'
computer starts the musical puzzle; Elvin's control wins the game with
the full password.

### Robots and the ball

Each robot runs a bytecode script (`robots_run`, `$8ECC`) from the
interrupt: commands test which side of the robot the agent is on, whether
he is on its level (within 20 lines), or a random bit, and then turn, wait,
move or fire. A robot never walks off its platform: it stops where the
floor glyphs `$45`/`$46` end (`robot_move`, `$90FB`). The ball runs a
second, simpler script language (`ball_run`, `$92CB`) with waits, steps,
homing on the agent's centre, jumps and a counter.

### Death

`$43` set: 1 electrocuted (touching a robot or the zap: the sprite
collision register, `agent_hit_check` `$9504`), 2 fallen out of the
bottom of a room, 3 killed while a lifting platform moved. The room
restarts with the agent at its entrance and ten minutes are added to the
clock (`agent_death`, `$95E4`). *Live:* 12:24:47 became 12:34:47.

### Passwords at the terminal

`SNOOZES:n` and `LIFT INITS:n` count the passwords found (up to 9).
At a security terminal, "temporarily disable robots" spends a snooze:
`$47` = `$40` stops the robots and the ball until it has counted back up
to `$FF`, once every fourth tick: 764 ticks, about 15 seconds on PAL.
*Live:* the robots did not move for 300 frames, and `$47` reached `$FF`
after 770 frames (counted in steps of 10). "Reset lifting platforms"
spends a lift init and puts the room's platforms back.

### The pocket computer

Puzzle pieces found go into a memory list (`$4EF5`) shown two at a time
in a window that scrolls (left keys); pieces are dragged into six display
slots, flipped top to bottom or left to right, recoloured with the three
colour keys, cleared, undone. A piece placed in a slot must match the
colour of the pieces there (`COLORS MUST MATCH`) and must not overlap them
(`IMAGES CAN'T OVERLAP`). When a slot shows one of the nine solution
images, the puzzle is solved: its password letter appears in the PSW
line, its four pieces leave memory (`check_solution`, `$80C3`).

The phone (bottom left key) dials one of two numbers in dual tones
(767-8900 or 555-4213, `tbl_phone_numbers` `$7E36`), rings, and answers:
"correct orientations of leftmost pieces" turns the two pieces in the
memory window the right way up; "have we enough pieces to solve the
upper left puzzle" counts the pieces of the leftmost piece's puzzle and
answers A SOLUTION EXISTS (four or more) or NEED MORE PIECES. Each call
adds two minutes to the clock (`add_minutes` `$83CC` with A = 2).

### The code rooms

Searching the computer starts a musical puzzle (`code_room_puzzle`,
`$A771`): a number of notes (2 the first time, one more after each
success, up to 14; one level per code room) hidden among 32 squares must
be pressed in rising pitch. Success gives a lift init when the level was
even, a snooze when odd.

### Score

`compute_score` (`$BA08`): 100 points a piece found, 100 a password
found, 500 a puzzle solved; if the mission was completed, a point for
each second left before six o'clock and a 1,000 bonus. *Live:* winning
at 12:24:47 with nothing else found scored 20,113 + 1,000 = 21,113.
The hall of fame keeps 15 scores and five-letter names in `$CF00` until
the machine is switched off.

## Data tables

Each table is described in the listing; the main ones:

| Table | What |
|---|---|
| `$0E70` | 32 room record pointers |
| `$2112` | robot scripts (256 bytes of bytecode) |
| `$2212` | 32 robot behaviour choices (offsets into `$2112`) |
| `$2232` | ball scripts (command, argument pairs) |
| `$232C` | 27 furniture types: shape, size, search time |
| `$2763` | 16 mask shapes of 144 bytes that cut the puzzles into pieces |
| `$30F3` | the 128 searchable furniture slots |
| `$7E6E` | the phone keypad's dual tones |
| `$8D07`-`$8E22` | the agent's per-frame movement and bounding boxes |
| `$A9F8` | the code rooms' eight notes |

## Sound

- SID: voice 1 the lift hum and robot hum; voices 2 and 3 effects
  (footsteps, zap, turning, clicks, tones); the interrupt gates voices
  2 and 3 off when `$A4` runs out.
- Speech: eight voice lines in the file `words` (`$E000` table), played by
  writing 4-bit levels to the volume register `$D418` from NMIs; the game
  swaps in a minimal IRQ while a line plays (`say_line`, `$BED9`). Lines 2
  and 3 are spoken by the start-up, 1 on entering a room after a game
  hour has passed, 7 when the agent falls, 5 when time runs out, 4 over
  the end picture, 0 on the end screen; line 6 is never called.
- How the driver plays a line. Each NMI runs one step of a chain of
  handlers: `nmi_speech_up` plays a window of the buffer at `$0800`
  forwards, `nmi_speech_down` plays it backwards from where it stopped,
  then `nmi_speech_hold` writes level 7 once and `nmi_speech_wait` lets
  the gap run; the period ends in `speech_next_period` (`$08F2`). The gap
  is half the period length set by the pitch commands (`$0B1D`), so the
  gap sets the pitch. Frame headers (`$09B6`, the format in the listing):
  4-bit frames (`$0AE5`) and 1-bit frames (`$0B73`, levels 7 and 8, with
  the window sliding by `$0951`) are used; the 2-bit decoder (`$0A68`) and
  encoding 0 (`$0BE3`) are in the driver and no frame of the eight lines
  uses them. Silent frames carry no samples; bit 7 of a header's byte 3
  marks the last frame, bit 6 skips the blend between windows (`$0BFD`).
  None of the driver's state carries from one line to the next: every
  line starts with a silent gap and a first frame that overwrite it.
- Line lengths, as timer NMIs (PAL seconds): 0, 30,239 (3.10); 1, 24,268
  (2.49); 2, 14,861 (1.52); 3, 41,233 (4.23); 4, 32,040 (3.28); 5, 35,611
  (3.65); 6, 2,083 (0.21); 7, 36,831 (3.78). *Checked:* a port of the
  driver (on the Sound and speech tab) gives the same level on the same
  NMI as the game's own code for all eight lines, run on the kit's C64
  model with its CIA timers (`kit/c64/machine.js`). The model runs each
  NMI handler to its RTI, so the cycles of its writes are not
  comparable; the order and count of NMIs are.

### Hardware register census

From every absolute access in the traced code (`work/xref.py`); `R`/`W`
counts are instructions.

| Register | R | W | Use |
|---|---|---|---|
| `$D000`-`$D00F` | many | many | sprite positions: ball/zap (0), agent (1-3), robots (4-7) |
| `$D010` | 36 | 24 | ninth X bits, always read-modify-write |
| `$D011` | 11 | 16 | screen on/off, fine scroll shake at time-up |
| `$D012` | 22 | 4 | raster compares, waits and the two interrupt lines |
| `$D015` | 25 | 34 | sprite enable |
| `$D016` | 1 | 3 | multicolour on, fine scroll shake |
| `$D017`, `$D01D` | 10 | 16 | sprite expansion (zap, frames) |
| `$D018` | 5 | 10 | the three character sets, video matrix |
| `$D019`/`$D01A` | 1 | 2 | raster interrupt |
| `$D01C` | 4 | 9 | sprite multicolour |
| `$D01E` | 5 | 0 | sprite collisions: deaths |
| `$D020`-`$D02E` | 9 | 70 | colours; `$D024` is read every frame as a protection check |
| `$D400`-`$D418` | 0 | many | SID, write-only; `$D418` also carries the speech samples |
| `$DC00`/`$DC01` | 19 | 3 | joystick port 2, keyboard matrix |
| `$DC0D` | 1 | 1 | CIA 1 interrupts off |
| `$DD00`/`$DD02` | 4 | 4 | video bank |
| `$DD03` | 0 | 0 | executed as code (`jsr $DD03` in `wait_ticks`) |
| `$DD06`/`$DD07`, `$DD0D`, `$DD0F` | 7 | 6 | the speech timer and its NMI |

Named by no instruction: `$D013`/`$D014` (light pen), `$D01B` (sprite
priority), `$D41B`/`$D41C` (oscillator and envelope readback), the CIAs'
time-of-day clocks and serial registers. Indexed loops reach some of them
all the same: the start-up's SID clear (`$38AA`) writes `$D400`-`$D41C`,
read-only registers included.

## Copy protection

Three checks, all verified:

1. The loader's drive check repairs three bytes of the unpacker
   (`orientation.md`); without it the program crashes after loading.
2. `wait_ticks` (`$7F6D`), the game's delay, calls `jsr $DD03`: CIA 2's
   data direction register B, which the start-up's first instructions set
   to `$60`, the opcode of `rts`. *Live:* executed 47,272 times in 120
   frames; with `$EA` written there instead the program ran off and
   stopped at `$005C`.
3. Every frame the interrupt checks that `$D024` holds `$0A`, written by
   the loader's last stage, and jumps to a `$02` (jam) byte at `$799A`
   if not (`irq_tick_extras`, `$84FA`). *Live:* with `$D024` = 0 the
   processor was jammed at `$799A` within 30 frames; the control run went
   on normally.

## Live tests

| Test | Result |
|---|---|
| `$DD03`, `$D024`, `$AB2B` read in play | `$60`, `$x A`, `$6E` |
| Password in `$4FB5` | SWORDFISH |
| 600 frames: tick and clock | +600 ticks, +10 game seconds |
| IRQ entries in 120 frames in a room | 120 |
| `$D024` = 0 | jam at `$799A` within 30 frames |
| `$DD03` = `$EA` | crash (program counter `$005C`) |
| `$43` = 1 in a room | death sequence, clock +10:00, play resumes |
| `$47` = `$40` | robots still for 300 frames; `$47` back at `$FF` after about 764 ticks |
| Password line filled, start `$AA40` | the end picture, Elvin talking, then the tally (21,113) and the hall of fame |
| PC set to `$9D16` in a room | the security terminal: SECURITY TERMINAL 28 (room `$1C`) |
| Fire in the lift, hand to the bottom left key, fire | the phone menu |
| Fire from the title state, stop on `say_line` | no voice line at the start of a game |

## Open questions

- What each of the eight voice lines says: the code shows when each is
  spoken, and the Sound and speech tab plays them, but nobody has
  transcribed the words.
- The meaning of the agent's frame `$0F` (tested against lifting
  platforms by `platform_at`).
