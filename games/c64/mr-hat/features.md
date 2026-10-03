# Mr. Hat — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources, all read on 30 September 2026 (`work/research.md` has the notes,
source by source). No C64-Wiki page exists for the game (English and
German both 404), and no manual beyond the magazine's blurb was found.

- The printed booklet of *Commodore 64 Club* n. 6 (Systems Editoriale,
  September 1988), scan and OCR text:
  <https://archive.org/details/commodore-64-club>. Its whole text on the
  game, checked against the OCR: "Le avventure/disavventure di un
  simpatico omino che, allo scopo di arricchire la sua collezione di
  cappelli, è alla ricerca, all'interno di un labirinto, del leggendario
  'Cappello d'oro'. Questo labirinto è custodito da numerosi guardiani,
  che non esiteranno a scagliarsi contro il nostro eroe. Riuscirà,
  aiutato da te, a raggiungere il suo obiettivo? Joystick in porta 2."
  In English: a little man who collects hats searches a labyrinth for
  the legendary Golden Hat; many guardians throw themselves at him;
  joystick in port 2.
- Lemon64, <https://www.lemon64.com/game/mr-hat>, read through the
  Wayback Machine copy of 11 March 2026 (the site answers an agent's fetch
  with 403): credits, joystick port 2, single-screen platformer, the
  dog-in-a-hat anecdote, two user comments.
- GameBase64, <https://gb64.com/game.php?id=5053>: Systems Editoriale /
  Commodore 64 Club #06 and #14, Francesco Chiola for code, graphics and
  music, 114 blocks, PAL.
- Ready64, <https://ready64.org/giochi/scheda_gioco/id/1643/mr.-hat>,
  through the Wayback copy of 13 May 2025: issue 6, September 1988, twelve
  screenshots (six kept in the gitignored `work/web-reference/`, not published: they are other people's), two comments.
- Ready64's 2008 interview with Francesco Chiola (Wayback copy), and
  <https://www.edicolac64.com/public/francesco-chiola.php>: the origin of
  the character, and that Lupenio (SIPE, 1988) came first and shares
  Mr. Hat's layout and jump routines.
- CSDb release pages 90535, 146567, 165550, 178985 and 204034: five cracks,
  dated from April 1988 to 1992.

## Features

| Feature | Status | Where |
|---|---|---|
| Joystick in port 2 | live | the title waits for `$DC00` = `$6F` at `$1770`; every room loop reads `$DC00` |
| Fire on the title starts the game | live | `$1770`-`$1788` |
| Title screen "SYSTEMS PRESENTS A NEW GAME WITH": Mr Hat, Octopus, Snaily, Dynky (so spelt), Kniffy, "and all others" | live | `$B683` draws it from the screen codes at `$C000`-`$C058`; `reference/title.png` |
| Title music | confirmed | the player `$C080`-`$C373` from the title's interrupt `$C0AF`; register activity seen, no sound in the session |
| Walk left and right | live | `$5340`/`$5370` and each room's copies, about 2.4 pixels a frame |
| Fire jumps, the way Mr Hat faces | live | from standing in room 1, fire held: sprite Y 204 to 183, 13 frames, back, again while held; `$DC00` = `$6F` at `$438D` and in every room loop but room 10's (a ladder loop); three phases of 21 steps |
| Stick up | live | does nothing on a floor (20 frames held in room 1); climbs ladders and rides lifts (`$4B20`, `$4000`, `$8265`) |
| Stick down: crouch, climb down, take a treasure | traced | `$7D` compared in the room loops and in `$8E10`, `$B100`-`$B4BB`; not tried live |
| Touching a guardian kills ("everything you touch kills you", Lemon64) | live | in room 1, Mr Hat sank into the floor and restarted at the room's entry (`reference/death.png`, `reference/room01-respawn.png`); `$D01E` read as exact values at `$55B0`, death `$A877` |
| Deadly spots in the rooms | traced | `$BB10`, by position and exact standing height; room 6's dark-only hazard |
| Lives, four marks at the bottom right | live | `$07B9`, `$07BA`, `$07E1`, `$07E2`: one recoloured to `$CC` per death (by the code, two for a death in room 3; not tried); after five deaths in room 1 the title came back |
| Game over | live | after the last life `$4475` returns to the title, which waits for fire for a new game; there is no game-over screen of its own |
| Status line: SCORE, ROOM, STAGE | live | bitmap rows 23-24, glyphs at `$1600`; `reference/stage1-room1.png` |
| Score in thousands | live | `$41DA`/`$8AD0` step the thousands digit; the 1,000, 10,000, 25,000 and 75,000 adders run in the simulator gave exactly those scores (`work/scoretest.js`); the 20,000 and 50,000 adders by the code |
| Eleven rooms in four stages (web screenshots reach ROOM 10, STAGE 4) | live | rooms 1-11 drawn by starting each set-up (`reference/room02-setup.png` to `room11-setup.png`); stage 1 room 1, stage 2 rooms 2-5, stage 3 rooms 6-9, stage 4 rooms 10-11 (rooms 4 and 7 keep the STAGE digit of the room before, so started from room 1 they show STAGE 1) |
| Room 1: three floors and a LIFT | traced | the lift ride `$4000` moves Mr Hat and sprite 5 56 pixels a floor; not ridden live |
| Ladders | traced | `$4B20`; rooms 2, 3, 5, 6, 9, 10, 11, and room 8's shaft |
| Guardians: Octopus, Snaily, Dinky, Kniffy and others | live | they move in room 1 (sprites 0, 1, 7); each room's IRQ moves its own (facts.md, "Guardians") |
| Treasures worth points | traced | `$8E10`, `$B100`-`$B4BB`: 10,000 to 75,000 each, taken with the stick down |
| Keys and doors (Lupenio's text: "each key opens one door and one only") | traced | room 9's two doors, which test for the objects carried from rooms 6 and 8, can never open: their fills were patched out (facts.md, "Leftovers") |
| Colour-coded switches opening barriers in other rooms | traced | `$B2E0`-`$B4BB`, five switch and barrier pairs (facts.md, "Barriers and switches") |
| The candle lights the dark rooms | live | rooms 6 and 9 dark with `$22` = 0, lit with `$22` = `$40` (`reference/room06-lit-setup.png`, `room09-lit-setup.png`); `$5519` sets it when room 2's candle is taken (traced) |
| Immunity | traced | the objects of rooms 3 and 7 call `$1250`, which writes `RTS` over the death `$A877` and the life loss `$4C52` until `$100F` reaches `$FE` |
| The Golden Hat, the goal, and the end | live | drawn in room 11 (`$7C00`, `$7C50`); `$7CC0`, with Mr Hat level with it on the bottom floor, anywhere left of X `$80`, shows "WONDERFUL / YOU HAVE FINISHED YOUR MISSION" (`$BFA8`, `$B7D8`) and starts a new game. Seen live (`reference/end-screen.png`, `work/room11win.py`), with Mr Hat placed on that floor carrying nothing. By design the way needs room 5's object to open a block; in this copy that object cannot be taken (tried live), and the block is open from the start because its fill was patched out (facts.md, "The end") |
| RUN/STOP | traced | the game never calls the KERNAL's STOP; the vector at `$0328` holds the KERNAL default `$F6ED` in every game snapshot. The tape's loader writes `$E1` to `$0328` (`$A220`), but the freezer's restore puts the saved value back |

## Beyond the documentation

Found in the code, not in the manual.

- **F1 switches the in-play tune off and on** (`$7C70`, `$1019`), live.
  It does not pause the game.
- **An in-play tune** runs in every room (`$8C00`), besides the title
  tune, and a second tune at `$89D0` that nothing plays; both
  ported and checked against the game's code, write for write.
- **Lupenio's room 9, as designed**: with five instructions put back, the
  room draws two doors and a treasure that its bitmap held all along.
- **Supermon** at `$97ED`-`$9FFF`, never called: the source of the image's
  calls to `CHRIN`. The game itself calls `CHROUT` at seven places (`$926B`,
  `$B68A`, `$B68F`, `$B700`, `$BFAA`, `$BFAF`, `$CDE6`).
- **The ending needs no object in this copy**: room 5's object cannot be
  taken, and room 11's block is open from the start, both because their
  colour fills were switched off. Seen live.
- **Lupenio's ending and instructions**, in Italian, never printed, and a
  dead ending routine with a 200,000-point replay bonus (`$7D70`, `$8000`).
- **The X high-bit slip at `$1020`**: it reads `$400B` (a code operand,
  always `$FC`) where it wrote `$40BB`, so the X high-bit check in `$A97C`
  never runs; 19 spots whose callers have chosen the left half work only
  because of it.
- **A store missing its index at `$18B3`** (`STA $2BF8` where its twin at
  `$916A` has `STA $35D8,Y`): only part of that drawing is done.
- **119 writes to `$D022`**, invisible in hires bitmap mode, several where a
  colour store or a call was switched off.

## Open questions

- Which pickups can actually be taken: room 8's item and lower bonus, room
  5's two pickups and room 2's two look impossible by the colour tests
  (facts.md, "Corner cases"). Room 5's object was tried live and could not
  be taken; the others were not tried.
- Is room 6's dark bonus repeatable?
- The way through: which order of rooms, keys and switches a player must
  take to reach room 11's bottom floor. In this copy room 5's object is
  not needed (facts.md, "The ending needs no object"); nobody has played
  the route through here.
- Who patched the stores to `$D022`, Chiola or a cracker? Comparing another
  copy of the game would tell.
- The owner's copy is a freezer backup of the title screen
  (`orientation.md`). Which issue it came from (n. 6, or the reissue in
  n. 14) is unknown.
