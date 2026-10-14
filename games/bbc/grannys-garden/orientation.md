# Granny's Garden — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`Granny's Garden (1983)(4Mation)[GRAN1].ssd` from the TOSEC Acorn BBC set
on archive.org (`Acorn BBC - Games - [SSD].rar`, the zip of the same name;
the TOSEC flag `[GRAN1]` names the file to run), 45,056 bytes, SHA-256
`71511f3fe37f35e461ccad2a69d07f48820749db09e9aa086e8bfffa670d60f0`. An
`.ssd` has no header: it is the disc's sectors in logical order, here the
first 176 of the 800 the catalogue declares (an 80-track side), the rest
empty and left out.

The DFS catalogue (sectors 0 and 1): title `Granny's` followed by four
spaces, cycle number 0, boot option 0 (no `!BOOT`, so SHIFT-BREAK does
nothing), two files, neither locked:

| File | Load | Execute | Length | Start sector | What it is |
|---|---|---|---|---|---|
| `$.GRAN1` | &30E00 | &38023 | &59C5 (22,981) | 2 | Part 1, a BBC BASIC program |
| `$.GRAN2` | &30E00 | &38023 | &53DE (21,470) | 92 | Part 2, a BBC BASIC program |

Both execution addresses are BASIC's entry point (&8023 in the language
ROM), as `SAVE` from BASIC writes them, and both load addresses are
&0E00: each file was saved from a machine whose PAGE was &0E00, a Model B
with no disc interface, or one that had moved the program there.

Whether this is 4Mation's own disc is unknown. Acorn User (November 1983)
lists the game at £10 on tape and £12 on disc. The files carry two marks
of having been saved from memory after a run rather than as 4Mation
wrote them: line 100 of each is a `REM` over a relocation test that line
110 turns into a `REM` itself once the program runs at &0E00 (below), and
Part 2's program ends `&0D &81` where BASIC II writes `&0D &FF`. No other
copy was compared.

## From power-on to play

1. Start the server (`tools.py --platform bbc jsbeeb`), `boot` (a hard
   reset to the BASIC prompt) and put the image in drive 0 (`disc`).
2. There is no loader, menu or trainer. `CHAIN"GRAN1"` loads Part 1 at
   PAGE (&1900 on the kit's machine, with DFS 1.20) and runs it. **Run that
   way, Part 1 cannot be finished**: its variables and BASIC's stack fill
   the 2,363 bytes between the program's end (&72C5) and the screen
   (&7C00), and BASIC stops with `No room`, which `ON ERROR` cannot catch.
   On 14 October 2026 it stopped at line 880 (PROCh, which prints
   double-height text) on the way back down the stairs by the route
   through the house, and at line 2670 at the pond by the password route,
   with 97 and 125 bytes free at the wait before. Part 2 at &1900 was
   played to its end, with 1,524 bytes free at the lowest.
3. **What the program was written to do**: its own lines 3280-3320 (Part 1)
   and 2590-2600 (Part 2), which line 100 no longer reaches, select the
   cassette filing system (`*TAPE`), copy the program four bytes at a time
   to &0E00, lower TOP's high byte by the distance moved, set PAGE to
   &0E00 and `RUN`. The analysis runs them: after `LOAD"GRAN1"`, type
   `GOTO3280` (Part 2: `LOAD"GRAN2"`, `GOTO2590`). This gives each part
   2,816 bytes more and both play to their ends. The program bytes at
   &0E00 are the file's, byte for byte, compared with the `LOAD` at &1900
   (`parts/<part>/work/load-1900.json.gz`).
4. The first wait is `Ready to start?`. **The hand-over** is the machine
   there, at the first OSRDCH wait (&E581, the loop jsbeeb's own
   `runUntilInput` watches): `parts/part-1/work/entry.json.gz` (SHA-256
   `1ed510b7382beb268757ab8458d006fcedd3fee03f8595d423a3c6b899df4cac`)
   and `parts/part-2/work/entry.json.gz`
   (`6e4f855caa6d925b4ade78d84cc0106bd1d03f4de1fa6c77a00a3a57f9ef5e3d`).
   The program has not changed by then and never does: the one byte it
   writes into itself (line 110's `?&E04=244`) already holds 244.
5. Play is driven by `work/scripts/play.py <route>` with the answers in
   `work/scripts/routes.py`. At each wait it reads BASIC's text pointer
   (&0B-&0C) to find the line waiting: a line with `GET=32` gets the space
   bar, one with `a=GET` (the game's input routine, PROCi) or `INPUT`
   the next answer, and `st=GET` (the restart key) ends the route. Every
   wait's screen is kept as `work/shots/<route>-NNN.png`.

| Route | From | Answers | Ends |
|---|---|---|---|
| `p1-esther` | power-on | the trees, no password, the house: Fig, an apple, the stairs and the snake, the cupboard twice, the green broomstick | Esther found, password `snow`; `parts/part-1/work/play-esther.json.gz` |
| `p1-tom` | `play-esther` after S | `Snow`; the pond, the wood, the flower bed, the dog and the tree with the butterfly, the snail, the worm, the bee and the spider | Tom found, password `sky`; `play-tom.json.gz` |
| `p2-clare` | power-on | `Sky`; the keeper; buns, lollies, oranges, chips | Clare and Anna, password `river`; `parts/part-2/work/play-clare.json.gz` |
| `p2-end` | `play-clare` after S | `River`; cottage (cake), forest, cottage (key), hill (stone), lake by the troll, castle (Daniel), lake (water), forest by the dwarf (Jessica) | the end, `And Granny says it's time for tea.`; `play-end.json.gz` |
| `p1-wander`, `p2-wander` | | in and out of one room, or between two places, over and over | the restarts below |
| `p1-1900`, `p1-1900-tom`, `p2-1900` | `CHAIN` | as above, at PAGE &1900 | `No room` in Part 1; Part 2's end |

## The parts

Two parts, each a whole program that replaces the other: `parts/part-1`
(`GRAN1`) and `parts/part-2` (`GRAN2`). They share no memory that matters,
since each is a BASIC program loaded at PAGE and `RUN` clears the
variables; the only thing passed between them is the password the player
writes down. Part 1 ends `The rest of the adventure is on the next
program. Find someone to help you.`, and its third password (`river`)
answers `you will need to call an adult to help you`: the player, or the
adult, loads Part 2 by hand.

## Steady state

- **Vectors**: every vector in page 2 at the MOS's own values in play
  (IRQ1V &DC93, BRKV &B402, BASIC's error handler, WRCHV &E0A4); after
  `*TAPE`, FILEV is the MOS's &F27D. No machine code: the game is BASIC
  from end to end, and its only writes outside its own variables are VDU
  codes, `*FX`, `SOUND`, `ENVELOPE`, `TIME` and the one poke in line 110.
- **Memory at &0E00**: the program &0E00-&67C4 (Part 1) or &0E00-&61DD
  (Part 2); BASIC's variables from TOP upward (VARTOP &6CE8 and &66A7 at
  `Ready to start?`); BASIC's stack below HIMEM; the Mode 7 screen
  &7C00-&7FE7.
- **Free memory**, the gap between the top of the variables (VARTOP,
  &02-&03) and BASIC's stack (&04-&05), falls as variables and strings are
  made and never comes back: in Part 1 from 3,821 bytes at `Ready to
  start?` to about 2,170 at Tom; in Part 2 from 5,422 to about 4,150.
- **Nothing is reloaded within a part.**
- **The restarts**: the game moves from room to room by calling on and
  never returning, and BASIC II allows 20 REPEATs and 26 GOSUBs at once
  (measured on the kit's machine on 14 October 2026: the 21st REPEAT and
  the 27th GOSUB stop with `Too many REPEATs` and `Too many GOSUBs`).
  Both parts set `ON ERROR RUN`, so the error starts the part again at
  `Ready to start?`: in Part 1 the 20th time the player is in the hallway
  (`p1-wander`; the 19th after a guess at the trees rejected for its form),
  in Part 2 the 27th journey on the map (`p2-wander`).

## Files to memory

| File | Part | Lands at | Equal |
|---|---|---|---|
| `GRAN1` | 1 | PAGE, &1900 by `LOAD`, then &0E00 by the program's own copy | all 22,981 bytes |
| `GRAN2` | 2 | PAGE, &1900 by `LOAD`, then &0E00 | all 21,470 bytes |

## The loader, in a paragraph

There is none: each part is one BASIC program, loaded by `CHAIN` or
`LOAD` and run. The first line was a test, `IF PAGE<>&E00 GOTO 3280` as
line 110's poke shows (it writes the `REM` token over the line's first
byte at &0E04), that moved a program loaded at a higher PAGE down to
&0E00 under the cassette filing system. On this disc that line is
already a `REM`, so `CHAIN` leaves the program where the DFS put it.
