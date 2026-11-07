# Zak McKracken and the Alien Mindbenders — verified technical facts

What is true of the game as a whole: how its parts follow one another, and what they share.
Each part's own facts are in `parts/<id>/facts.md`.

## The parts

- **main**, the program (`parts/main/facts.md`): `AA`, loaded once at
  start-up, with everything it copies away, and the resource heap at
  `$77D5`-`$C7FF` that rooms, scripts, costumes and sounds are read into
  during play. Its facts hold the game's build, memory map, timing,
  controls, graphics, mechanics, sound engine, the listing's error rate
  and the live tests.
- **music**, the music's own program (`parts/music/facts.md`): sound 1,
  1,078 bytes of 6502 code and tables, which a script loads over the top
  five pages of the heap, always to `$C300`-`$C735`, before a tune plays.
  It lies over main, which owns every other address.
- The SCUMM scripts, 116,884 bytes on the two disk sides, are programs
  for main's interpreter, read into the heap as they are needed. The kit
  cannot list them yet, so they are a `coverage.virtual` row in main's
  `part.json`.

## The story's scripts

Read from the SCUMM scripts with `kit/scumm/world.py` and `scode.py`, and
played in the kit's ScummVM from the first morning to THE END (seed 1,
`--no-copy-protection`; the input is `work/replay/final.txt`). On that
run's trace, `strace.py check` reported 1,233,386 instructions at 11,244
places in 713 scripts, and none where the decoder and ScummVM disagree.
Script and room numbers are the game's resource numbers.

- **Names.** Script 108 names the kids Zak, Annie, Melissa and Leslie;
  script 53 their full names (Zachary McKracken, Annie Larris, Melissa
  China, Leslie Bennett). The news is script 102 (Lori Amore, the
  newscaster); the boss's assignment script 127; the Caponians' secret
  room script 140; the Skolarians' recording script 47.
- **Rooms that are several places.** pseudoRoom maps 141-145 onto room 8
  (London 141, Mexico City 142, Miami 143, Seattle 144, San Francisco 145)
  and 146-149 onto room 9 (Cairo, Kinshasa, Katmandu, Lima); 206-220 and
  187 onto room 23 (the Sphinx's maze, and inside the Martian pyramid);
  129, 130, 192 and 193 onto room 14 (the crystal chambers); 152 and 188
  onto room 15. The Sphinx maze's doorways are constants in room 23's
  entry script: the same in every game.
- **Random picks at the start** (script 48): the pilot's tune,
  `Var[113..116]` = 230 + random(5) (buttons 230-235: red, blue, green,
  light blue, yellow, purple); the Lotto digits `Var[212..215]`, the first
  never 0; the Face's buttons `Var[131..134]` = 531 + random(2). Seed 1:
  pilot 231 232 235 230; Lotto 4 3 0 5.
- **The two tunes.** Script 103 writes the alien's sequence: note i (from
  0) is the pilot's note moved on i + 1 buttons, 236 and up going round
  to 230. Room 10 object 239 tracks both as buttons are pressed (bits
  1570 and 1571); either starts script 64. The pilot's tune runs script
  50, the fall; the alien's sends Zak to room 1 when he stands in a walk
  box numbered 2 or less.
- **The Lotto.** Reading the Lott-O-Dictor (room 10 object 237) the first
  time picks the digits again (seed 1: 7 0 3 0). Script 24 sells the
  ticket and starts 73, which sets bit 1455 after delay(14400); script 72
  draws: right digits pay $10,000, pick new digits and reset the
  Dictor; more than four wins gets Lou's refusal; wrong digits pay $10 to
  $1,000 one time in ten. Played: Zak's CashCard went from $2,322 to
  $12,322.
- **The Sphinx's legs.** In room 20 the first leg visited marks the
  other Locked; the markings and the entry are at the leg visited second
  (played: seed 1).
- **Teleport** (script 60): only Zak, only with the Yellow Crystal (81)
  Locked, not in room 19. Pads on the map (room 29, pseudo 153 or 154):
  480 Mt. Rainier cave to 129, 481 Mayan pyramid to 130, 482 Peruvian eye
  cave to 137, 484 Egyptian pyramid to room 25, 486 Mars face chamber to
  193; 483 Atlantis and 485 Mars pyramid print "Nothing's happening!".
- **Deaths** (script 78): `Var[166]` 1 fell (set by script 50), 2
  drowned (86), 3 suffocated (82), 4 the Katmandu jail (113, when
  `Var[49]` is not 0), 5 the Guardian of the Sphinx (room 23 object 410),
  6 blood boiled (82). Script 78 takes objects 14-83 from the kid except
  the helmet (65), then hands play to another kid; it ends the game when
  the drop slot (169) is not Locked or no kid is left, with tune 103 and
  script 128, which loops tune 104.
- **The exit visa.** Script 30 asks for it when the departure airport is
  143-145 and the destination is not 661-663. Script 110 picks the travel
  key, section 1-7, column A-G, row 1-30 (a random 0 counts as 1), and
  computes the four symbols, `Var[139..142]`, from it by arithmetic; no
  table is stored. Script 15 checks the entry; the fifth wrong entry
  chains to script 135: jail, the policeman's speech, THE GAME IS OVER,
  restart.
- **The stupidity machine** (script 88) prints Zak's headline scrambled
  in four steps; script 92 releases him; script 89 gives the verbs back
  one at a time as `Var[236]` counts down, and prints "Ah, back to
  normal!". Object 328, the cabinet in The Phone Company's back room, returns what the Caponians
  took (objects 33-81 owned by actor 7).
- **Stonehenge** (room 44, script 136): the flagpole (59) and the shards
  (33, 56) on the altar (648), then the scroll (79) read: "`Gnik Sisi
  Vle`", and the Yellow Crystal (81).
- **The ending.** Room 25: glowing object (78) on 426, candelabra (80) on
  427, crystals 55, 58 and 81 on 428, switches 425 and 424; script 66,
  then script 149, the epilogue, with tune 102.
- **Tunes.** 95 the opening (scripts 1, 48); 102 the epilogue (48, 149);
  103 game over (78, 135); 104 looped after 103 (script 128) and after 102
  (room 25 object 432). Sound 36 is the splash (room 1 object 103 with the
  fish bowl, the faucet 123, script 46).
- **The box.** The National Inquisitor, dated March 29, 1997, written by
  Victor Cross (the manual's credits); scans at the Internet Archive,
  `zak-mckracken-newspaper` and `game_manual_Zak_McKracken_Manual`. The
  manual's code book section: "Travel key is: Section 4 (C 22)".
