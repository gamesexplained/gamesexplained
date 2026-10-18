# Part 2 — verified technical facts

`GRAN2`: the City of the Dragons (Clare and Anna) and the Land of Mystery
(Jessica and Daniel). Every address here is this part's, in its
`listing.json`, with the program at PAGE &0E00. Unless marked *live*, a
fact comes from the program in `work/entry.json.gz`, stopped at `Ready to
start?`. The routes named are in `work/scripts/routes.py`.

## The program

| Lines | Address | What |
|---|---|---|
| 100-300 | `$0E00`-`$1364` | the relocation test, the copyright, `ON ERROR RUN`, the screen, the variables, `Ready to start?`, the title, the password |
| 310-720 | `$1365`-`$1CEF` | the shared procedures, the raven and the Witch |
| 730-920 | `$1CF0`-`$24A8` | DATA, the children's pictures, finding a child, the restart key, the theme |
| 930-1480 | `$24A9`-`$3A09` | the City of the Dragons (PROCdragon, PROCdrag, PROCland, PROCcl) |
| 1490-1510 | `$3A0A`-`$3BFC` | the Keeper of the Gates |
| 1520-2460 | `$3BFD`-`$5D06` | the Land of Mystery: the map, the journeys, the five places, the troll, the dwarf, the beast |
| 2470-2580 | `$5D07`-`$6190` | the Castle of Dreams, and the end |
| 2590-2600 | `$6191`-`$61DD` | the relocation |

## The password

- Part 2 starts with the password, PROCi(7,15,18,23), seven letters,
  matched by INSTR against `ky` and `iv` (line 750): sky gives Z=2, river
  Z=3, and so does any answer with either after its first letter (`Olive`
  gives Z=3, *live*). `snow`, or any other answer, is told `Please try
  again.` (lines 250-300).
- Z=2 goes to the City of the Dragons, Z=3 to the Land of Mystery (line 290).

## The City of the Dragons

- The Keeper of the Gates asks for a favourite food (PROCi(7,1,8,39), 37
  letters) and sneezes at whatever it is.
- The two big dragons leave by the screen moving sideways: for q=1 to 39,
  VDU 23,0,13,q writes the CRTC's register 13, the low byte of the screen's
  start (line 1040, *live*).
- **The baby dragons** (lines 1110-1230). Each dragon, red, green, blue
  and yellow (0-3), is in (0) or out (1). A throw is one letter,
  PROCi(6,18,9,20), looked up in the DATA at line 1270:

  | Food | Letter | Red | Green | Blue | Yellow |
  |---|---|---|---|---|---|
  | buns | B | +1 | 0 | 0 | −1 |
  | lollies | L | −1 | +1 | 0 | 0 |
  | oranges | O | 0 | −1 | +1 | 0 |
  | chips | C | 0 | 0 | −1 | +1 |

  Each dragon's state is held between 0 and 1. When exactly one dragon is
  out and has no collar, it gets one; the loop ends when all four have. A
  fourth throw of any food brings the Witch (line 1180), so each can be
  thrown three times. Buns, lollies, oranges and chips, in that order,
  collar all four in four throws *(live, `p2-clare`)*.
- The sentences after each throw come from the table at lines 1280-1290:
  a +1 is `loves`, a −1 `hates`, a 0 `sometimes eats`.
- The blue dragon is drawn and named in cyan: its colour code in the DATA
  at line 740 is &86, cyan text, and PROCdrag draws it with 150, cyan
  graphics (*live*, `reference/p2-09-the-red-dragon-loves-buns.png`).
- Clare and Anna are found with PROCfind, which shows ps$(2), `river`.

## The Land of Mystery

- The places are numbered forest 1, cottage 2, lake 3, castle 4, hill 5,
  and PROCw (lines 1640-1750) picks what happens on the road from the sum
  of where the player is (op) and where they go (np):

  | Sum | Roads | What happens |
  |---|---|---|
  | 3 | forest and cottage | nothing |
  | 4 | forest and lake | the dwarf, who wants a stone from the hill |
  | 5 | forest and castle, cottage and lake | `That was not a good idea.`, and the Witch |
  | 6 | forest and hill, cottage and castle | `You cannot go straight there.` |
  | 7 | cottage and hill, lake and castle | nothing |
  | 8 | lake and hill | the troll, who asks what trees grow in the forest (`pom`) |
  | 9 | castle and hill | the beast, who asks his brother's name (`horn`) |

  At the start op is 10, and only the forest and the cottage can be
  reached. Places are recognised by `or`, `ot`, `ak`, `as`, `il` (line
  1600).
- Each journey is an `ON np GOSUB` that never returns; the 27th stops with
  Too many GOSUBs, and ON ERROR starts the part again *(live, `p2-wander`)*.
  Once the lake has told its name it is the 26th, as the GOSUB 2340 that
  tells it never returns either *(live, audit)*.
- The troll's and the beast's answers are matched with INSTR against `pom`
  and `horn`, and PROCi makes an answer's first letter a capital, so
  `pom` and `horn` alone are refused and `Pompom` and `Redhorn` pass
  *(live, audit)*.
- The lake asks `Do you want to know my name?` on every visit until the
  name is heard (line 2230), and the hill offers a stone whenever the
  player carries none, so the dwarf, once paid, takes another if one is
  brought (lines 2040, 2390-2410).
- What each place gives: the cottage a key (K; it is offered on every visit
  until it is taken) and the Witch's cake (inside, once); the hill a stone,
  after the giant, who comes on every visit until he is answered Y; the lake water,
  for the key, and its name, Redhorn; the forest Jessica, once its fire is
  put out with the water; the castle Daniel, for the cake and with the key.
  One order that wins is `p2-end` *(live)*.

## Ways the Land of Mystery cannot be won

Each leaves the player able to wander the map but not to finish; the only
ways out are the Witch (S to start again) and the restart when the
journeys reach BASIC's limit.

- **The lake asked its name before its water.** Its name needs the key
  first (line 2320, PROCeatkey), the key is eaten, no water is given, and
  there is one key (keytake%). The lake then answers `What a pity that you
  don't have one.`, the castle door needs the key and brings the Witch, and
  the fire cannot be put out *(live, `p2-name`)*.
- **The castle left unexplored.** The keeper takes the cake at the door
  (cake% FALSE), and fed%, which would let a friend back in, is set TRUE
  nowhere (line 180 sets it FALSE; lines 2500 and 2510, the only others
  that name it, test it). Answering N to `Are you ready to explore?` sends the
  player out, and the keeper then asks for a cake there is no getting
  (caketake% sends the player out of the cottage) *(live,
  `p2-explore-no`)*. Any other answer but Y goes to line 1750 and into the
  castle again, to the same keeper (traced).
- **The tower refused.** Once the fire is out (fire% FALSE) the forest
  brings the Witch (line 2120), so answering N to `Do you want to go in?`
  at the tower loses Jessica (traced).

## Quirks

- **The giant answered twice.** Anything but Y or N to `Shall I eat you?`
  calls PROCgiant inside itself; when the inner call ends at Y, the outer
  one's line 2090 is done, BASIC passes over line 2100, DEFPROCfor, and runs
  Creepy Forest's lines 2110-2160 inside PROCgiant: the forest's words over
  the hill's picture, no stone offered, and the map then says `You are at
  the hill` *(live, `p2-giant`, `reference/p2-28-the-giant-runs-into-the-forest.png`)*.
- **The lake asked for at the lake.** 3 + 3 is 6, so line 1680 prints
  `You cannot go straight there.` and line 1690 `You are already there !`
  on the same row, the second over the first, before `Please try again.`
  (traced).
- **PROCnext** is called on line 2310 and defined nowhere. It is never
  reached: the GOSUB 2340 before it ends in PROCw, which never returns.
- **The BREAK key.** Line 140 is `ON ERROR RUN:*K.10OLD|MRUN|M`; the `*KEY`
  is part of the error handler and runs only after RUN, which is never.
  The soft-key buffer at &0B00 is empty in play *(live)*.
- With music off (on%), the end still plays the theme: PROCfin's PROCsnd1
  (line 2580) is not tested against on%.
- **Clare and Anna's names do not flash.** PROCfind puts flash codes at
  column 13 of rows 14 and 15 and then prints the name from column 10, so
  the name's second letter lands on them; Part 1's prints from column 15,
  and its names flash *(live, screen memory)*.
- The end's `THANKYOU` has a control code before each letter, Flash
  before the T and a colour before each of the others, so it shows as
  `T H A N K Y O U`, evenly spaced, with no gap between the words, and
  flashing *(live)*.

## Things nothing reaches

- Line 630, a second DEFPROCp: BASIC uses line 320's (the PROC table in play
  points there, *live*).
- Line 730, Part 1's DATA for the kingdom's trees: every READ in Part 2
  follows a RESTORE to another line.
- Line 1400, after PROC2's ENDPROC.
- Line 1830's second branch, `The lock has been changed.`: a second visit to
  the castle never gets past the keeper.
- Line 2200's test, water% AND key%: the water costs the key.
- Line 2270's ENDPROC: it needs the lake's name heard first, which costs
  the key, and line 2260's PROCeatkey then never returns.
- Line 2500's greeting and line 2520: fed% is never TRUE, and line 2510
  ends in ENDPROC or PROCw either way.
- Lines 2590-2600, the relocation, which line 100 no longer reaches.

## Memory

- Run at &0E00, VARTOP is &66A7 at `Ready to start?` and the free memory
  5,422 bytes, falling to about 4,150 after many journeys *(live)*.
- At &1900 the part was played to its end with 1,524 bytes free at the
  lowest *(live, `p2-1900`)*.
