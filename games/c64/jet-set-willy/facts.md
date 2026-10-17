# Jet Set Willy — verified technical facts

Current truth for this game, the Berlin Cracking Service (BCS) disk
release (`orientation.md`). Every fact names the routine or table it
comes from. Unless marked *live*, a fact comes from reading the code in
`work/entry.vsf` and `work/play.vsf`.

## Build

- Three files: `LADER`, a BASIC chain loader; `JET`, $0801-$CFFF; `SET
  WILLY`, $E000-$FFFF (*live*: loaded from the disk and compared).
- `JET` begins with the crackers' `10 SYS2061`; the start-up at $080D
  stores $CBE5 at $033C/$033D, which nothing reads, sets $01 = $36 and
  jumps to the title at $A000.
- The game was saved from memory after a game had begun: the vectors at
  $CFF0 are already set, and screen RAM at $7C00 holds The Bathroom with
  its status line.
- Leftovers saved with it: a text editor at $0B41-$0F00, scraps of the
  assembly source at $6BC0, $768E, $80CF, $9A80 and $9FAA, copies of
  rooms 25 and 26 at $751A-$768C, three unused copy routines ($3F00,
  $AB80, $FF00), and the power-on pattern of $FF and $00 in the gaps.
- The 14 bytes at $FFF0 look like the vectors at $CFF0 from an earlier
  build: five of the seven are $23 lower than this build's.

## Memory layout

| Thing | Where |
|---|---|
| Player code (states 0-6, ropes, cheat) | $1000-$1CFF |
| In-game tune player and note table | $2005-$21AB |
| Item records, 80 of 4 bytes | $22C3 |
| Arrow records, 16 of 4 bytes | $2403 |
| Guardian records, 8 bytes each | $2443 |
| Room colours | $29EB |
| Initialiser, main loop, interrupts, death | $2C57-$39F0 |
| Code card (copy protection) | $3A02-$3CD2 |
| Sprites, 172 of 64 bytes (pointers $00-$AB) | $4000-$6AFF |
| Rope sprites as shown (pointers $AC-$AE) | $6B00-$6BBF |
| Title tune | $6C00-$7517 |
| Character set / screen | $7800 / $7C00 |
| Rope sprites, 34 positions of three | $8100-$9A7F |
| In-game tune | $9C00-$9FA9 |
| Title program, message and logo | $A000-$AA94 |
| Rooms 0-29 / 30-59, 256 bytes each | $B000-$CDFF / $E000-$FDFF |
| Dispatch vectors | $CFF0-$CFFD |
| Current room copy | $0840-$093F |

The processor port is $36 in play (BASIC ROM out, KERNAL and I/O in);
the room copy at $2E55 sets $34 while it reads a room. The video chip
uses bank 1, $4000-$7FFF, in extended colour mode.

## Timing

- The play interrupt at $33E1 runs at raster line 251 and line 0 of each
  frame. The bottom half moves the clock on once every 50 frames ($3446),
  so the clock runs in real seconds on a PAL machine.
- The clock starts at 07:00:00 ($2267) and the game ends when its hours
  read 12 ($33BB): five hours of real time.
- Both tunes tick three times every second frame, 75 ticks a second
  ($3435, $A801).

## Controls

- Joystick in port 2: left, right and fire ($3791).
- Keys ($380B): left on Q E T U O @ 1 3 5 7 9, right on W R Y I P * 2 4
  6 8 0, jump on Z X C V B N M , . / and Space, pause on A S D F G H J K L
  : ; ($2C2B, $2C36, $2C41, $2C4C). A key off the pause list ends a pause
  ($3114).
- Return turns the in-game music off and on, read after each item pass,
  every eighteenth pass of the main loop ($39F1).
- + and − raise and lower the volume, 0 to 15 from 12, read every 15
  frames while the music is on ($34EC); the title's message does not
  mention them (*live*: + took it from 12 to 15, − from 15 to 10).
- RUN/STOP ends the game, through the game-over sequence ($3132).

## Graphics

- The spare lives are drawn on the status line, each in the next colour
  from white ($3304), and walk only while the music is on: the play
  interrupt steps their glyphs every 15 frames in the same branch as the
  volume keys ($34E8).
- 172 sprites at $4000: the boot and barrel of game over ($00, $01),
  Maria ($02-$05), Willy ($06-$0D, four steps each way), the toilet
  ($0E-$11, of which the game shows $0E and $0F), the guardians
  ($12-$A9) and the arrow ($AA, $AB).
- Rooms are drawn from 2-bit cells with six glyphs each room carries
  (offsets $A0-$CF), in extended colour mode ($2E9C).
- The code card's five sprites at $0A00-$0B3F, in bank 0: a marker and
  keycaps 1 to 4.

## Mechanics

- 60 rooms. No code checks an exit before taking it ($10F8, $1130,
  $1236, $127A). Rooms 0-4 have exits of 60, which would load the 256
  bytes at $FE00, past the last room; 47 rooms have an exit that is their
  own number. Whether Willy can reach each of those edges is not checked.
  Room 6, Entrance to Hades, has all four exits leading to itself, so
  Willy can never leave it. Walking left off the end of the Security
  Guard's floor (room 5) drops him through its gap into room 6, where
  the guardians beside the gap kill him on the way down, and every life
  restarts at the top of the room in the same fall (*live*: nine lives
  lost in ten entries into room 6, then the title).
- On entering a room Willy is placed by which of the old room's exits
  names it, tested up, down, right, left ($2DC6). Coming through the
  bottom keeps the fall counter, so a fall goes on counting from room to
  room.
- The checkpoint a death goes back to is saved on entering a room
  ($2E7C), with the fall counter. A fall that reaches a cell boundary
  with 17 counts or more is deadly ($11FB), and Willy cannot steer a
  fall, so when a fall that came in through the top of a room ends in a
  deadly landing, every life restarts in the same fall and ends the same
  way. *Live*: jumping left over the wall on the Watch Tower's roof
  (room 49) drops Willy five cells into We Must Perform a Quirkafleeg
  (room 16) with a count of 20, and the game took all nine lives there,
  one landing after another, and went back to the title.
- 80 items. Taking one adds 1 to the decimal count at $0401; at 50,
  $164A sets $0400, and $3284 stops drawing Maria in the Master Bedroom.
  Nothing else reads $0400, so the bed does nothing: the game has no
  ending other than the clock or the last life (*live*: with $0400 set,
  the Master Bedroom showed Willy's sprite alone, and Willy stood on the
  bed for 200 frames with nothing happening).
- Nine lives: eight spare at $2CFF, and the death sequence at $3977 ends
  the game when the count drops below zero.
- Arrows: $314D processes 15 records, so the 16th, in The Beach, never
  fires. It flies a record only in the room its first byte names, less
  bit 7 ($315D), and records 7, 11 and 12 ($241F, $242F, $2433) name
  room 99, which does not exist, so they never fly either (*live*: over
  600 frames, sprite 6 showed an arrow in no frame in The Beach, in 83
  in Cuckoo's Nest and in 51 in I'm Sure I've Seen This Before).
- Touching a sprite kills Willy ($3392), except the toilet in The
  Bathroom; in a room with a rope only sprites 1-4 kill. Maria kills him
  too.
- On a rope, the check at $1B96 compares screen codes ($20-$26) with the
  tile kinds 0 and 3, so any contact with a cell's pixels makes Willy let
  go, and a hazard never kills him there.
- Five conveyors never move on screen, in Ballroom West, Master Bedroom,
  Emergency Generator, Conservatory Roof and The Bow: the play interrupt
  rotates conveyor glyphs from pointer tables ($2271, $2297), and those
  rooms have none (*live*: over 60 frames the conveyor glyph at $7928
  changed in The Bathroom and stayed the same in the Master Bedroom).
  West of Kitchen's top row turns right while the conveyor carries Willy
  left.
- The turn-round on the spot at $1091 needs $4B = $FE, which the test at
  $382C sets only when $49 XOR $60 = $FE. $60 is never set and stays 0,
  so the test never passes (*live*: a watch on stores to $60 through a
  stretch of random play saw none).
- The room-select cheat at $1BBC is switched off by an RTS ($60) in
  place of its first byte, $A5. With it restored, ↑ alone, then F, A, C,
  E, S, one at a time, turn the border white; two digits then choose a
  room, tens 0-5 from $1C46 and units 0-9 (*live*: ↑ FACES 5 7 took
  Willy to room 57, The Beach).

## Data tables

- Room record, 256 bytes: $00-$1F name; $20-$9F map; $A0-$CF glyphs;
  $D0-$D2 conveyor; $D3-$D5 ramp; $D6-$DB colours; $DC-$DF exits up,
  down, left, right; $E0 first guardian, $E1 count, $E2 rope.
- Guardian record, 8 bytes at $2443: type (bit 7 horizontal, bit 6
  starting direction), x cell, y cell, base frame, bound, frame mask,
  speed, lower bound.
- The code card's answers: for row r (0-19) and column c (0-17, shown
  as A-R), the four colours are the low two bits of the bytes at
  $2C57 + 4 × (18r + c) to that plus 3 ($3B3D-$3B7B). Keys 1-4 enter
  colours 0-3, shown red, green, blue and yellow ($3A74). *Live*: with
  the processor sent to $3A02 in play, the card asked for A14, cell 252;
  the four colours from $3047-$304A, green, yellow, green and green, were
  accepted, the success header went to $8000, and the title started.
- After a correct code, $3C83 copies a cartridge header ($3C62) to
  $8000 with both vectors at $0FA0, so that RESTORE restarts the title.
  A reset would not: it leaves the processor port's direction register
  $00 at 0, so $0FA0's write to $01 does not take BASIC out, and its
  jump to $A000 runs into BASIC ROM, where the processor jams on the
  byte at $A005 (*live*: header copied to $8000 by hand, then a reset;
  $0FA0 and $A000 each ran once, $00 read 0, and the PC stayed at
  $A005).

## Sound

- Both note tables, $20EC and $A207, hold the same 96 values, tuned for
  the NTSC clock: by it index 1 is C#0 and index 58 is A#4 at 466.2 Hz.
  On a PAL machine every note is 65 cents lower than on NTSC (A#4 at
  449.1 Hz).
  Index 79, 25271, is 30.6 cents flat of G6 even on NTSC.
- Title tune ($A0CD, $A139): three voices, the first 803 notes long, the
  opening of the Moonlight Sonata's first movement; named by the NTSC
  clock it opens G# C# E, in C# minor, the sonata's key.
- In-game tune ($2005, $2066): two voices, 246 and 221 notes, 4,224
  ticks; Bach's Invention No. 1 (BWV 772), opening C D E F D E C G by the
  NTSC clock, in C major, the invention's key. It loops when voice 1
  reaches its end marker.
- $2005 clears the SID by storing A into $D401-$D418 with A = 1 ($2020).
  That leaves $D415-$D417 at 1: the filter takes voice 1 and no filter
  mode is set, and nothing else in play writes those registers, so voice
  1 plays almost silent all game. *Live*: on VICE's 8580 model, voice 1
  alone recorded about 19 dB quieter than with $D415-$D417 cleared.
  Another crack of the game has 0 at $2020.

## The listing's error rate

The run's own sample, seed 20261016, drew 60 of the 781 comments in two
strata: 40 of the 447 written by hand and 20 of the 334 a decoder wrote
for the sprites, rooms and rope sprites. A checker on
claude-opus-5-5[1m] that wrote none of them, with each verdict settled
against the code, found 16 wrong, each in a detail: 15 of the 40
written by hand and 1 of the 20 from the decoder. Seven of the 12 drawn
from the 87 routine headers written in one Purpose, Inputs, Outputs and
Clobbers form were wrong, in inputs a routine does not take, registers it
does not leave alone, or a reader cited for the wrong path; the others
were tables whose continuation records claimed the whole table's count,
a note table called PAL that is tuned for NTSC, a frame list given for
the wrong direction of travel, a guardian's colour said to match the
background, and the code card's slots, of which only the first is
emptied. All 16 were corrected, and with them every one of the 87
headers was rewritten from the code, as were 29 other comments saying
the same things. The plain rate is 16 in 60, 27 % (95 % interval 17 % to
39 %), and weighted by the strata's sizes 24 %; a checker misses some,
so both are lower bounds.

## Live tests

- Boot: `LADER` autostarted from a hard reset reaches $080D and the title
  ($A000); Return starts a game in The Bathroom, 07:00:00.
- The room-select cheat, with $1BBC set to $A5: ↑, F, A, C, E, S turned
  the border white; 5, 7 took Willy to The Beach.
- The in-game tune's first voice, recorded with and without $D415-$D417
  cleared.
- RESTORE during play: the game went on, unaffected.
