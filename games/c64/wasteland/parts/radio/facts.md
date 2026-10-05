# Radio and promotion — verified technical facts

The program behind the game's Radio command: the reward for destroying
Base Cochise, and promotions. The game asks "Radio (Y/N)?" and, on Y,
saves the game and the map to the disk in the drive, waits for side 1
and loads the program from T26/L17, ten pages to `$7E00-$87FF` (game
`$8802-$881A`). It goes through the character records and then loads
the game program back over itself (`$8190-$81A1`); it never returns by
`RTS`.

## Load and layout

- The file begins `JMP $7EA3`, then the load address `$7E00` and the
  page count 10, which the engine's `load_program` reads
  (`$7E00-$7E05`). Every side-1 disk image holds it at T26/L17-L8,
  equal to `entry.vsf`'s `$7E00-$87FF`; the images of the other sides
  hold other bytes there.

| Range | What |
|---|---|
| `$7E06-$7EA2` | the fanfare and its SID settings |
| `$7EA3-$8018` | the start, the Base Cochise reward and the promotions |
| `$8019-$801B` | the promotion threshold, 24 bits |
| `$801C-$80C1` | spending the points |
| `$80C2-$818F` | the menu's keys and strings, the caption "Ranger Ctr." |
| `$8190-$81D7` | the return to the game and the text routines |
| `$81D8-$82D7` | the rank names' table, ranks 0-255 |
| `$82D9-$8748` | the packed text |
| `$8749-$87FF` | nothing the radio uses; from `$874B` the game's own bytes from another build (the game's facts, "Build") |

- Nothing in the radio reads `$8749-$87FF`: no absolute operand of its
  code reaches past `$81D8` + 255, the pointers it builds are `$80C2`,
  `$80CB` and `$82D9`, and the text's last message ends with the last
  bit of `$8748`. `$8749-$874A`, `$A0 $20`, differ from the game's
  `$03 $4C`.
- Also unread: `$82D8`, `$EA`, between the rank table and the text; the
  word `$8335`, a 17th in the room before the first message; and
  `$81A4`, a cursor-placing entry in front of the message printer, which
  nothing calls.

## What it looks at

- Its code reads no map number and no position: its zero-page operands
  are `$0A`, `$10`, `$11`, `$1C-$1E`, `$23`, `$24`, `$31`, `$32`, `$38`,
  `$43`, `$44`, `$66`, `$92` and `$AC`. The game's Radio command asks
  only Y or N before loading it (game `$8802-$880A`), so neither the
  reward nor a promotion depends on where the party is.
- Both loops take the records 1 to `$0A` in order and pass over, without
  a word, any character not conscious, CON 0 or below (engine `$02C3`;
  `$7EC4`, `$7F13`).
- It shows portrait 8, a man holding a rifle, under the caption "Ranger
  Ctr." (`$7EA7-$7EB9`), and portrait 11, a man in sunglasses and a
  shirt with two breast pockets, with each reward and promotion
  (`$7EEB`, `$7FBE`).

## The Base Cochise reward

- A conscious character whose record has bit 0 of `+$4B` set (module 4
  sets it in every record when the base is destroyed, module-4
  `$CA03-$CA1C`) and bit 0 of `+$4C` clear is rewarded, and `+$4C` bit 0
  is set so that it happens once (`$7EBC-$7EDD`).
- The first character rewarded in a call brings message 61, the Ranger
  Center's congratulations in four screens, from "Congratulations
  Rangers on a mission well done." to "...your heroic efforts will be
  rewarded." (`$7EDF-$7EE8`).
- Each one then gets portrait 11, the fanfare and 10 points: MAXCON + 10
  at once and 10 points to spend (`$7EEB-$7EFD`).
- A character unconscious at the call is rewarded at a later call, since
  `+$4C` is set only with the reward.

## Promotions

- A character of rank *k* (`+$24`) is promoted when the experience
  (`+$21-$23`, 24 bits) reaches 512 × (*k* + 1) × *k*: 1,024 at rank 1,
  3,072 at rank 2, 6,144 at rank 3, each threshold 1,024 × *k* above the
  one before (`$7F1B-$7F9E`). Run on the 6502 simulator for every rank
  0-254, the code gives exactly that. `play-radio.vsf` holds 1,024 at
  `$8019-$801B` for Hell Razor, rank 1.
- The threshold must fit in 24 bits (`$7F46`, `$7F56`), so nobody is
  promoted past rank 181, reached at 16,680,960 experience.
- At rank 255 the rank plus one wraps to 0, the threshold is 0, and the
  character is promoted to rank 0, a Private (`$7F22`, run on the
  simulator); no promotion reaches rank 255.
- After a promotion the check runs again (`$7FFF`): one call can promote
  a character several times.
- A promotion shows portrait 11, plays the fanfare and prints "*name*
  has achieved the rank of *rank*" or, when the new rank has the old
  one's name, "*name* is still a *rank*" (`$7FBB-$7FE2`). It writes the
  rank to `+$24` and the name, decoded with its zero, to `+$32` on
  (`$7FE6-$7FEE`, `$81BC-$81D7`), then ". You get 2 adventure points to
  distribute among your stats." and 2 points: MAXCON + 2 at once and 2
  to spend (`$7FF0-$7FFC`).
- Every conscious character's turn ends with portrait 8 and "*name*
  doesn't have quite enough experience to be considered for
  promotion.", with "another" before "promotion" after a promotion in
  the same call (`$7FA0-$7FB8`).
- The rank names are the radio's messages 1-55, by the table at `$81D8`:
  ranks 0-1 Private, 2-11 a name each, from Private 1st class to Master
  Grenadier, 12-29 two ranks a name, 30-74 three, 75-130 four, ending
  with Technical General; from 131 on General Argent, but for Imperial
  Scarscalp at 141, 1st Class Fargo at 151, Photon Stud at 161,
  Revenant Argent at 171 and Supreme Jerk at 181. Those five come back
  every ten ranks from 191 to 231 and at 251-255, which nobody reaches.

## Spending the points

- The menu: "*name* has *n* points to distribute.", "Choose an
  attribute:", then 1) Strength, 2) IQ/Skill, 3) Luck, 4) Speed, 5)
  Agility, 6) Dexterity, 7) Charisma with their values and 8) Maxcon
  (`$8024-$8050`).
- Keys 1-7 add 1 to that attribute (`+$0E-$14`), and an attribute at 255
  refuses the point, which is kept (`$808D-$8098`). A point on IQ also
  adds a skill point (`+$20`), unless that is 255, when the IQ point is
  spent all the same (`$809A-$80A7`).
- Key 8 adds 1 to MAXCON; at 32,768 MAXCON is set back to 32,767 and the
  point kept (`$8066-$8076`). The 10 or 2 added at the start are not
  checked (`$801F-$8021`, `$80B3-$80C1`).
- Back-arrow is ignored: every point must be spent (`$805E`). Other keys
  are ignored too (engine `$1B15`).
- MAXCON rises and CON (`+$1D/+$1E`) does not: the radio's code writes
  only `+$0E-$14`, `+$1B/+$1C`, `+$20`, `+$24`, `+$32` on and `+$4C` of
  a record (every store through `$66`).
- The character's roster line, which shows MAX, is drawn again only
  after a point on key 8, when the character is in the current party
  (`$8079-$8087`), not after the 10 or 2 added at the start.

## The fanfare

- Six notes on SID voice 1, triangle, attack and decay 0, sustain 12,
  release 0, volume 15 (`$7E98-$7EA2`): frequency values `$2187` three
  times, `$2A3E`, `$2CC1` and `$323C` (`$7E34`, `$7E3A`), held 2, 1, 1,
  2, 2 and 4 rounds of the engine's `delay_a` with A = `$C0` (`$7E40`),
  each gated off and followed by a short pause (`$7E06-$7E33`).
- By f = value × clock / 16,777,216 they are C5 C5 C5 E5 F5 G5 at the
  NTSC clock, 1,022,727 Hz: 523.2, 659.2, 698.4 and 783.9 Hz, each 0.11
  to 0.12 cent flat of equal temperament at A = 440. At the PAL clock,
  985,248 Hz, every note is 65 cents flat: 504.0, 635.1, 672.8 and 755.2
  Hz.
- The six notes take 1,176,865 processor cycles, 1.19 seconds at the PAL
  clock, without the time interrupts take (run on the 6502 simulator).
- It plays before each reward and each promotion (`$7EF0`, `$7FC3`).

## Back to the game

- The radio turns the picture's animation off (`$AC`), sets `$92` to 0,
  so that the game starts without the turn on the spot it takes after
  the start-up (game `$7E5C-$7E60`), waits for side 1 and loads the game
  program, T31/L9, 72 pages over `$7E00-$C5FF` (`$8190-$81A1`).
- It writes nothing to disk. Its changes are in the character records at
  `$F500-$FBFF`, which the game's load leaves alone, and the game's start
  enters the party's map afresh, which saves the game (game
  `$7E46-$7E56`, engine `$2600`).

## Text

- The packed text block is at `$82D9` (`$81B3-$81BB`): the alphabet, a
  table of 16 group words at `$8315`, and messages 0-62 at
  `$8337-$8748`: 0 empty, 1-55 the rank names, 56 "has achieved the rank
  of", 57 "is still a", 58 the points, 59 "doesn't have quite enough
  experience to be considered for", 60 "another", 61 the
  congratulations, 62 "promotion.".
