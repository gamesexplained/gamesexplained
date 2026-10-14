# Part 1 — verified technical facts

`GRAN1`: the magic trees, the Kingdom of the Mountains, the woodcutter's
house (Esther) and the Giant's garden (Tom). Every address here is this
part's, in its `listing.json`, with the program at PAGE &0E00. Unless
marked *live*, a fact comes from the program in `work/entry.json.gz`,
stopped at `Ready to start?`. The routes named are in
`work/scripts/routes.py`.

## The program

| Lines | Address | What |
|---|---|---|
| 100-260 | `$0E00`-`$12C1` | the relocation test, the copyright, `ON ERROR RUN`, the screen, the variables, `Ready to start?`, the title, the main line |
| 270-450 | `$12C2`-`$1612` | the magic trees (PROCtr, PROCtx) |
| 460-850 | `$1613`-`$22E3` | the kingdom, the password, the cave, the raven (PROCkn, PROCpass, PROCcave) |
| 855-1090 | `$22E4`-`$2662` | the shared procedures: the pauses, the text, the space bar, the colours, the input |
| 1110-1720 | `$2663`-`$3AD6` | the woodcutter's house: the secret word, the hallway, the kitchen, the backroom, the cupboard, the stairs |
| 1730-2230 | `$3AD7`-`$47E4` | the toadstool, the spider, the worm, the butterfly, the bee, the snail, the raven |
| 2240-2320 | `$47E5`-`$4C25` | the Witch |
| 2330-2420 | `$4C26`-`$4E89` | DATA |
| 2430-3190 | `$4E8A`-`$64FC` | the children's pictures, finding a child, the restart key, the Giant's garden |
| 3200-3260 | `$64FD`-`$6765` | the two tunes |
| 3270-3320 | `$6766`-`$67C4` | a line never run, and the relocation |

## Ready to start?

- on% (music) is TRUE and t% FALSE before the question, which repeats
  until an answer begins with Y (lines 220-240, `ready`).
- An answer ending in f sets on% FALSE; one beginning with T sets t%. Both
  last until the part is run again, so `T`, then `Y`, works *(live)*.
- The field is PROCi(7,17,22,21): three letters. `Yf` and `Tf` fit; `Yesf`
  cannot be typed, as the f is shown and then deleted by the RETURN after
  it *(live)*.

## The magic trees

- Twelve trees, four columns (a-d) by three rows (3 at the top, 1 at the
  bottom). Line 290 picks the column as L=RND(3)×9+4 (13, 22, 31: b, c, d)
  and the row as M=RND(2)×6 (6, 12: rows 2 and 1). Six trees can be magic;
  a1-a3, b3, c3 and d3 never are *(live: `p1-esther` answers a3, which can
  never be the tree)*.
- t% sets L=4, M=12: a1, a tree that is otherwise never magic *(live)*.
- PROCtx reads the guess with INPUT, lowercases it, and turns letter and
  digit into a column and row by the DATA at lines 2350 and 2360. Answers
  longer than two characters, or with a letter outside a-d or a digit
  outside 1-3, get `Please try again.`; a first character below `A` gets
  `Please put the letter first.`
- A malformed guess is handled by GOSUB 440 or 450, which call PROCtx again
  and never return as written: when the right tree is guessed, line 450
  runs on through line 460 (a DEF, passed over) into PROCkn's body, with one
  or two GOSUBs left open. The kingdom runs as usual *(live, `p1-badguess`:
  `a`, then the right tree; two GOSUBs open in the kingdom)*.
- PROCtx sets try=1 the first time. The snake reads try later.

## The kingdom and the password

- The password is PROCi(1,3,6,9), five letters, matched against `no`, `ky`
  and `iv` (line 2400): Z=1, 2 or 3, the last match winning (PROCpass).
- Z=1 (snow): the list of children found and the search for Tom (line
  2800). Z=2 (sky): the list, `Now you have to find Anna and Clare`, and the
  call for an adult (line 3190). Z=3 (river): the call for an adult at once.
- `Are you sure you have a password?` answered N calls PROCkn inside
  PROCpass, from the beginning of the kingdom.
- The cave's two questions and the raven's offer take anything: an answer
  that is not Y is told `Yes you can.`, `Yes you do.`, or that the King and
  Queen say the raven must help.

## The woodcutter's house

- The secret word is compared with `Fig` exactly (PROCfig). PROCi spells
  any answer with a capital first, so `fig` passes. The three hints are on
  the wall, in blue letters, and the word itself.
- The apple is offered once, outside (line 1180), and sets ap%.
- The hallway (PROChall) matches `itch`, `ack`, `upb` and `rs`: the
  kitchen, the backroom, the cupboard, the stairs. `Stars` reaches the
  stairs.
- The stick is offered in the hallway on every visit until it is taken
  (line 1340); it sets stick%.
- The kitchen's pot brings the Witch (`p1-witch`, *live*).
- The backroom's box holds the note `It's not in this room that you will
  find the Witch's broom.` (line 1460).
- The cupboard: the first visit shows only a red broomstick; taking it
  brings the Witch, and leaving sets cup%. From the second visit there is a
  green one too, whatever else has been done; `reen` finds Esther (lines
  1480-1580, *live*).
- The stairs (PROCstairs): the snake calls the Witch when try reaches 3. The
  trees leave try at 1, so one wrong throw is allowed and the second brings
  the Witch *(live, audit of Part 1)*. The stick thrown is an
  evil magic wand and brings the Witch; the apple kills the snake and shows
  the note `Esther is in the house hidden well from you. Look again and you
  may find that one broom is now two.` With neither, the Witch comes at
  once (line 1720). The snake is optional: the green broomstick needs only
  a second visit to the cupboard.
- Every visit to the hallway opens a REPEAT that is never closed (line
  1280), and PROCi's own REPEAT is open while it waits: the first visit
  shows two open, the 19th twenty, and the 20th stops with Too many REPEATs,
  which ON ERROR turns into a restart *(live, `p1-wander`)*. After a guess
  at the trees rejected for its form, PROCtr's REPEAT (line 300) is open
  too, since lines 440-450 run on into PROCkn, and the 19th visit stops
  *(live, audit of Part 1)*.
- Once the snake is dead, each trip up the stairs ends in a GOSUB to line
  1710, which GOSUBs to line 1700, which goes back to the hallway: two
  GOSUBs open a trip. After 14 trips 26 are open, and the stick's question
  at the 15th visit to the hallway (GOSUB 1340) stops with Too many GOSUBs
  and starts the part again, before the REPEATs run out *(live, the
  checker's route, `work/reports/checker/t8.json`)*.

## The Giant's garden

Five stages, st=1 to 5, each passed by one creature. The answer is matched
against `rm`, `ee`, `na`, `pi`, `ut` (line 2410), giving X=1-5: worm, bee,
snail, spider, butterfly; `ON X GOSUB 2490,2730,2490,2490,2660` takes the
reply.

| Stage | Place | Helps | What the others do |
|---|---|---|---|
| 1 | the pond | the butterfly carries the player over | the worm, the snail and the spider can't swim; the bee tries to fly with the player, who is far too heavy; the toadstool says `Back again are you?` |
| 2 | the wood and its falling nuts | the snail's shell | the butterfly tries again, is hit by a nut (bf=1); the bee stings the nut trees, is hurt (be=1); the worm stays in bed; the spider's web lets nuts through |
| 3 | the flower bed and the ants | the worm's tunnel | a hurt butterfly or bee brings the Witch (line 2960) |
| 4 | the twisty path and the Giant's dog | the bee, unhurt, chases the dog (bee=1) | the worm, the spider, or a hurt butterfly or bee bring the Witch (line 3020) |
| 5 | the very tall tree | the spider's thread (v=1) | the toadstool says `Come on. Let's find Tom.` |

- The stages are entered by GOSUB from inside the reply that passed the
  last one (lines 2720, 2620, 2630, 2790), and each wrong try GOSUBs again
  before it GOTOs back, so the stages pile up GOSUBs: ten are open at Tom
  by the route `p1-tom` *(live)*.
- **The bee called in the wood is lost for good**: at the dog it says `Have
  you forgotten what happened? A nut made my nose bleed.` and the Witch
  comes, and no other creature passes the dog *(live, `p1-beewood`)*.
- Tom is found when v=1 (line 2640), with PROCfind showing name$(1) and
  password$(1): Tom and `sky`. Part 1 then says `The rest of the adventure
  is on the next program. Find someone to help you.`

## Things nothing reaches

- Line 2230, a second DEFPROCp: BASIC uses line 870's, the first from PAGE
  (the PROC table in play points there, *live*).
- Line 3270, `PRINT ERR:PRINT ERL`, after PROCsnd2's ENDPROC.
- Line 3090, a RETURN after the tall tree's GOTO loop.
- Line 260's END: every ending RUNs the program, through PROCkey or through
  `ON ERROR RUN`; `No room` stops it.
- Lines 3280-3320, the relocation, which line 100 no longer reaches.

## Memory

- Run at &0E00, VARTOP is &6CE8 at `Ready to start?` and the free memory
  3,821 bytes, falling to about 2,170 at Tom *(live)*.
- At &1900 the part stops with `No room` at line 880 (the house route) or
  2670 (the password route), with 97 and 125 bytes free at the wait before
  *(live, `p1-1900`, `p1-1900-tom`)*.
