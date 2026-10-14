# Granny's Garden — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the programs in the snapshots named in `orientation.md`.

What is true of the game as a whole: how its two parts follow one another,
and what they share. Each part's own facts, with its line numbers and
addresses, are in `parts/part-1/facts.md` and `parts/part-2/facts.md`.

## Build

- Two BBC BASIC II programs on one DFS disc, `GRAN1` (Part 1, 22,981
  bytes) and `GRAN2` (Part 2, 21,470 bytes), from the TOSEC set
  (`orientation.md`, The image). There is no machine code: no `CALL`,
  `USR` or assembler in either, and every vector in page 2 holds the MOS's
  own value in play *(live)*.
- Both were saved from &0E00 and both start with the same relocation test,
  line 100, turned into a REM by line 110's poke (`?&E04=244`). The bytes
  after the REM are tokenised as a statement (PAGE and GOTO as tokens, the
  line number after &8D), which BASIC's tokeniser does not do after a REM
  typed in: the REM was written over the first token later, by a run of the
  program.
- Part 1 ends with BASIC's end mark `&0D &FF`, Part 2 with `&0D &81`.

## How the parts follow one another

- Each part is a whole program that replaces the other. Nothing passes from
  one to the next but the password the player writes down: `RUN` clears the
  variables, and neither program reads memory left by the other.
- The passwords: Esther is found in Part 1 and gives `snow`; Part 1 with
  `snow` goes on to Tom, who gives `sky`; Part 2 takes `sky` (the City of
  the Dragons: Clare and Anna, who give `river`) and `river` (the Land of
  Mystery: Jessica and Daniel, the end). Part 1 answers `sky` and `river`
  with `you will need to call an adult to help you`, and Part 2 does not
  take `snow`.
- Each password is recognised by two letters inside it, matched with INSTR
  against the answer as the input routine spells it (first letter a
  capital, the rest lower case): `no`, `ky`, `iv`.

## Memory layout

| Thing | Where |
|---|---|
| The program | PAGE to TOP: &0E00-&67C4 (Part 1), &0E00-&61DD (Part 2), when run as the analysis runs it (`orientation.md`) |
| BASIC's variables | from TOP up to VARTOP (&02-&03): &6CE8 (Part 1) and &66A7 (Part 2) at `Ready to start?` *(live)* |
| BASIC's stack | down from HIMEM, &7C00 |
| The Mode 7 screen | &7C00-&7FE7 |
| The soft-key buffer | &0B00, empty in play *(live)*: Part 2's `*KEY10` is never executed |

Free memory, the gap between VARTOP and BASIC's stack pointer (&04-&05),
falls as the game runs and is never given back: in Part 1 from 3,821 bytes
at `Ready to start?` to about 2,170 at Tom, in Part 2 from 5,422 to about
4,150 *(live)*. Run from PAGE &1900, where `CHAIN` puts it with the DFS,
Part 1 has 2,816 bytes less and stops with `No room` before it can be
finished (`orientation.md`).

## Timing

- Each part's pauses are PROCp(c). In Part 1 it is an empty FOR loop of
  1000×c turns; in Part 2, and in Part 1's PROCP (capital P, the Witch's),
  a wait on the clock until `TIME` reaches c×50 centiseconds. 1,000 turns
  of the same loop took 50 centiseconds in a bare machine *(live)*, so both
  are about half a second for c=1.
- There is no frame timing: the game waits for keys (GET) and runs as fast
  as BASIC goes between them.

## Controls

- Only the keyboard: no ADVAL, so no joystick, in either part.
- Answers are typed into PROCi, each part's own input routine (Part 1 line
  1020, Part 2 line 460). It empties every buffer first (`*FX15,0`), the
  sound queues as well as the keyboard's, so a note still playing stops
  *(live, in a bare machine)*; then it takes letters, DELETE and RETURN and nothing else, shows the first letter
  as a capital and the rest in lower case, and builds the answer the same
  way. When the cursor reaches the field's end column, the next key,
  whatever it is, is taken as DELETE, so a field set up as PROCi(col,x,y,len)
  holds len−x−1 letters.
- **A DELETE in an empty field is counted.** PROCi keeps the letters in l
  and does `l=l-1:in$=LEFT$(in$,l)` on DELETE, so a DELETE with nothing to
  delete puts l at −1, one short of the letters shown, where it stays.
  `LEFT$` with a length below 0 gives the whole string, so each later
  DELETE takes one letter too many off the answer, or none, and the answer
  read is not the one on the screen *(live, 14 October 2026: at `Ready to
  start?`, X DELETE Y RETURN starts the game; DELETE X DELETE Y RETURN
  shows Y, gives `XY` in in$ and asks again; DELETE s n o x DELETE w shows
  `Snow` and gives `Snw`)*. The page's port of PROCi agreed with the game
  on 236 keys in 35 sequences, read from in$, l, x and the screen after
  each key (`work/scripts/answer_trace.py`).
- The space bar is read by PROCsp, after `*FX15,0`: `REPEAT UNTIL GET=32`.
- Both parts turn the keyboard's auto-repeat off (`*FX11,0`, line 150).
- The key S at the end of every way the story can end (the Witch, a child
  found, the call for an adult) RUNs the part again (PROCkey). The restarts
  on Too many REPEATs or GOSUBs go through `ON ERROR RUN` instead, with no
  key.
- Part 1's magic trees are the one question asked with INPUT (line 340).

## Graphics

- Mode 7 throughout, the mode the machine starts in: neither part has a
  MODE statement. Every picture is a PRINT of teletext graphics characters
  (160-255) and control codes (128-159) inside strings, often built from
  shared runs (`f$`, five &FF blocks; `w$` and `v$`, fourteen and seven).
- PROCh prints every sentence in double height: CHR$141, a colour code and
  the text, on two rows.
- PROCb sets a colour or background down a run of rows, at the cursor's
  column, which is most often a row's first; 157 (New
  Background) is how the pictures get their coloured skies and grounds.
- Some things move by changing a control code in place rather than
  redrawing: the toadstool's mouth and eyes (Part 1 PROCmth, PROCeye), the
  raven (PROCrav1, its rows hidden with 152, conceal, and shown a band at
  a time), the castle
  keeper's eyes (Part 2 PROCI).
- Part 2 moves the whole screen sideways by writing the CRTC's register 13,
  the low byte of the screen's start address, with VDU 23,0,13,q (the big
  dragons, line 1040; the dream, line 2550) *(live)*.
- Part 1's room frame, PROCw, ends with a line feed on the bottom row,
  which scrolls the screen up a row: its bands come out a row higher than
  they are written, and in the hallway the CRTC starts the screen at &7C28,
  a row on *(live)*.
- Line 150 of both parts writes 32 to the CRTC's register 10 (VDU 23,0,10,32),
  which jsbeeb reads as no cursor (src/video.js, R10 bits 5-6 = 1).

## Mechanics

- **The restarts.** Rooms and places are entered by calling on and never
  returning. Part 1's hallway opens a REPEAT on each visit and never closes
  it; Part 2's map makes each journey with an ON np GOSUB that never
  returns. BASIC II allows 20 REPEATs and 26 GOSUBs *(live, measured on the
  kit's machine)*, and both parts set `ON ERROR RUN`, so the 20th visit to
  the hallway and the 27th journey on the map start the part again at
  `Ready to start?` *(live)*. Hearing the lake's name leaves one GOSUB
  more open, since GOSUB 2340 never returns either, and after it the 26th
  journey is the last *(live, audit of Part 2)*. A guess at the trees rejected for its form
  (a letter alone, say) leaves the trees' own REPEAT open for the rest of
  the game, since lines 440-450 run on into the kingdom, and then it is
  the 19th visit *(live, audit of Part 1)*. In Part 1 the stairs, once the snake is dead,
  leave two GOSUBs open each trip, and on that route Too many GOSUBs comes
  first, at the 15th visit to the hallway *(live,
  `work/reports/checker/t8.json`)*.
- **Dead ends.** Several choices leave a part unwinnable without saying so;
  each needs S, after the Witch, or BREAK. Part 1: the bee called in the
  wood (*live*). Part 2: the lake asked its name before its water, the
  castle left at `Are you ready to explore?`, and the tower refused once the
  fire is out (the first two *live*). The part files have the detail.
- **Wrong spellings.** Every place, creature and password is recognised by
  INSTR on a fragment of two to four letters, so most misspellings that keep
  the fragment are accepted.

## Data tables

Each part's DATA lines are listed in its facts file: the tune (both),
Part 1's trees, raven, children and creatures, Part 2's dragons, foods and
places.

## Sound

- **The theme**, PROCsnd1, is the same in both parts (Part 1 lines
  3200-3240, Part 2 lines 880-920): 103 steps read from DATA, 52 notes, each
  followed by a step with pitch 0. Each length is divided by 1.5 and SOUND
  keeps the whole part: lengths 4, 9, 14, 19 and 30 play for 2, 6, 9, 12
  and 20 twentieths of a second *(live: 0.09 s, 0.29 s, 0.44 s in the
  recording)*.
- Channels 2 and 3 play each note an octave apart (pitch A and A+48), both
  at full volume (−15); the step with pitch 0 gives them volume 0 and length
  0, a gap of about 10 ms between notes *(live)*.
- Channel 1 plays the note two octaves above channel 2 (A+96), softer
  (−12), and is given as `SOUND &00011`. The 1 in its flush digit starts
  each of its notes as soon as line 3220 runs and cuts off the one before
  (bbc-reference, "Sound"), and BASIC waits only for room in the queues of
  channels 2 and 3. So channel 1 runs ahead of them, by 0.5 to 1.2 seconds,
  and its first four notes are cut to 20-30 ms while the queues fill; the
  rest play for about 10 ms less than their length, and its last ends at 12.7 s
  against their 13.7 s *(live, the recording)*.
- **The kingdom's tune**, Part 1's PROCsnd2 (lines 3250-3260), is fifteen
  notes of random pitch: (RND(10)+22)×4 on channel 2 at −13, 48 higher on
  channel 3 at −15, each RND(10)+10 twentieths long and the last 30.
  Channel 1's, 32 higher than channel 2's at −12, is given as
  `SOUND &00111`, and its synchronise digit holds each note until a note on
  another channel with the same digit is ready. None is, so channel 1 never
  plays *(live: the recording, and the three statements in a bare
  machine)*. Channel 2's `&012` flushes, so it runs ahead of channel 3 and
  ends 5 seconds before it.
- **The Witch's sound**: three times, five notes on channel 1 at pitch 1,
  with ENVELOPE 1 redefined before each with larger steps (Q = 10 to 90),
  then a note on channel 2 (Part 1 line 2290, Part 2 line 690). In the
  first round BASIC queues the five in a few hundredths of a second; in
  the second and third the queue still holds earlier notes, and the last
  two or three SOUNDs each wait about a second for room *(live, in a bare
  machine)*. The MOS reads an
  envelope while its note plays, so the first note's steps grow (10, 30,
  50 and then 90 quarter-semitones in the recording) as the definitions
  change under it, and each later note plays the definition in force while
  it plays, for most of them a round's last, a warble of six steps *(live,
  the recording)*.
- An answer ending in `f` at `Ready to start?` sets on% FALSE, which turns
  all three off, except the theme at Part 2's end (PROCfin, line 2580),
  which is played whatever on% holds.
- The recordings, every byte the MOS wrote to the sound chip, were made
  with jsbeeb's `sound` capture on 14 October 2026 (`work/scripts/sound.py`)
  and are what the page's player replays.

## The listing's error rate

A sample of 60 of the listing's 189 comments (33 from Part 1 and 27 from
Part 2, drawn with the seed 20261014) was checked by a checker that wrote
none of them, on the model that wrote them (`game.json`, `accuracy`). It
marked 10 wrong in a detail and one doubtful, and each was read against the
program: the ten were wrong and the doubtful one held, but read two ways.
That is 17 % wrong, between 9 % and 28 % at 95 % confidence, and a lower
bound, since a checker misses some. The ten: what an IF governs to the end
of its line (line 550), the rows PROCb colours (b−t+2 from the cursor, not
t to b), the cottage's key and the giant taken to come on the first visit
only (they come until taken or answered), what moves in the snail's and
the castle keeper's pictures, Anna and Clare's password (empty in Part 1),
which stages line 3180 serves (2 to 5), the kingdom tune's channel 1 (it
never plays), and the restarts (Too many GOSUBs can come before the
hallway's 20th visit). All ten were corrected, and with them the comments
that said the same: the hallway, a room's frame, the worm's picture and
Part 2's PROCb (the rows), the key on the ground (the visits), and the
theme's channel 1 (the flush digit). The doubtful one was reworded.

Then every comment was audited, 189 of 189, by two fresh checkers on the
same model, one part each and one after the other, each told the kinds of
error the sample had found. Part 1's checker marked 16 of its 98 comments
wrong in a detail and Part 2's 25 of its 91; each of the 41 was read
against the program, and all held. Besides the sample's kinds, they were
wrong about what a picture shows when it runs (the raven, never seen
whole; the Witch's one eye; Jessica, always magenta; Clare and Anna's
names, which do not flash), about every way a part ends or restarts (the
lake's name leaves a GOSUB open, so the 26th journey can be the last),
about first visits taken for every visit and the reverse (the lake's
question, the dwarf's stone), about what a sound statement does as it
plays (`*FX15,0` empties the sound queues too; an envelope redefined
while its notes wait is the one they play), about how an answer is
matched (INSTR after the input routine has made the first letter a
capital, so `pom` and `horn` alone fail and `Olive` is a password), and
about the order of a DATA table's items. All 41 were corrected, with
one more Part 1 comment that said the same (the buffers PROCsp empties),
42 in all, and Part 1's Witch's sound a second time, and the notes and
the page with them.

A second sample was then drawn, 60 of the 189 comments (35 from Part 1
and 25 from Part 2, with the seed 2026101402), and checked by a fresh
checker on the same model that had taken no part in the audit. It marked
4 wrong in a detail, and each held: 7 %, between 3 % and 16 % at 95 %
confidence, over the mark of 2 in 60. All four were comments the audit
had rewritten, 4 of the 15 such comments in the sample, while none of the
45 it had left alone was wrong: the raven's three poses in the wrong
order, the Witch's notes queued at once in every round (only in the
first), `You are at the` on every journey (not the first), and the end's
`THANKYOU` given a colour code before every letter (the first is Flash,
and the word flashes). All four were corrected, with the notes that said
the same.

## Live tests

- Both parts played to their ends at &0E00, and Part 2 at &1900; Part 1 at
  &1900 stopped with `No room` on two routes (`orientation.md`).
- The restarts: 19 visits to the hallway, then `Ready to start?` on the 20th;
  27 journeys on the map (`p1-wander`, `p2-wander`).
- The REPEAT and GOSUB limits, in a bare machine: the 21st REPEAT and the
  27th GOSUB stop.
- The soft-key buffer at &0B00, read in Part 2's play: empty.
- In the audit: `*FX15,0` while a note plays, in a bare machine, silences
  the chip; the Witch's sound recorded in play and in a bare machine; the
  lake's name heard after five journeys, then the 26th journey restarts
  Part 2; `pom`, `horn` and `Olive` typed at the troll, the beast and the
  password; the screens of the raven, the Witch, the keeper, PROCfind and
  the dream read from screen memory.
- BASIC's PROC table, read in play: PROCp at Part 1 line 870 and Part 2
  line 320.
- 1,000 turns of an empty FOR loop: 50 centiseconds.
- The theme, the kingdom's tune and the Witch, recorded from the sound chip;
  and SOUND's flush and synchronise digits, and the queue, in a bare machine.
- Each dead end and quirk in the part files, played on the route named there.
