# Flowers of Crystal — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The Complete BBC Micro Games Archive, "Flowers Of Crystal",
  https://www.bbcmicro.co.uk/game.php?id=3576, read 24 October 2026: 1984,
  4Mation Educational Resources, by Mike Matson; educational adventure for
  one player; works on the Model B, not the Model A; no saved games; no
  disc image offered, because 4Mation still enforces its copyright. Its
  screenshot is `reference/bbcmicro-co-uk-screenshot.jpg`.
- 4Mation, "Retro Flowers of Crystal",
  https://www.4mation.co.uk/retro/retrofoc.html, read 24 October 2026: "the
  original 1983 BBC 32K version", converted to run on Windows without a
  separate emulator, sold on CD-ROM for £15.50 with a PDF of the story
  book and the teacher's guide; "an adventure on the theme of ecology and
  conservation" in which the player helps young Jim save the planet
  Crystal from greedy Mr Grubble.
- The story book, *Flowers of Crystal* by Mike Matson (4Mation, Barnstaple),
  a scan at https://mocagh.org/miscgame/flowerscrystal-story.pdf, read 24
  October 2026 (16 pages; never copied into this repository). It names
  Rumala, the four items she hid (a bag of soil, a sack of fertiliser, a
  bottle of magic spell water, an enchanted gold pot), the Crystal Flower
  she hid in what became the Danger Area, the Blids, Mr Grubble's bubble
  gum factory and gum forest, Grubble's Grabbers, Super Jim and The
  Centre. The teacher's guide was not found online.
- MobyGames' page (https://www.mobygames.com/game/124444/flowers-of-crystal/)
  answered with a browser check and was not read.
- The game's own screens and text, all of it read in the programs
  (`work/files/*.lst`) and most of it seen live in jsbeeb.

## Features

| Feature | Status | Where |
|---|---|---|
| A menu of four: the story, the adventure part 1, the adventure part 2, a printer utility | live | `UNEM` lines 100-210 |
| The story of Crystal, told on screen | live (after a fix: the file is one byte short, `orientation.md`) | `STORY` |
| A sound level, 0 to 5, chosen before each part, 0 silencing the MOS's sound | live | `N1`, `N2` lines 80-215; `S%` (part 1), `K%` (part 2) |
| Part 1: eight places on Crystal, travelled between with a travel permit issued by Jim | live | `AD1` PROCds, lines 470-546 |
| Paths between some places; elsewhere "There is no path", and two hazards on the way instead of one | live | `AD1` PROCp, PROChaz, lines 600-1050 |
| The river: some journeys fall in and Super Jim rescues the player back to the Centre | live (Forest to Desert, with `P%` set) | `AD1` PROCp line 600, PROCriv |
| A weather report at the Centre, which decides which of sun, snow and rain can happen | live | `AD1` PROCw, lines 2720-2790 |
| Equipment: one of warm coat, raincoat, drink; one tester of four; two of fright stick, radio, bubble-gum, disguise kit | live | `AD1` PROCe, PROCT, lines 400-438 |
| Nine hazards on a journey: green fog, rain, snow, sun, Fright Freak, Blids, Pouncer, Grubble's Grabbers, and a scary scene that does nothing | live (fog, sun, rain, Freak, Blids, Pouncer, Grabbers, scenes); traced (snow) | `AD1` lines 2000-3100, 15000-16700 |
| The map, "a Super Jim special", scrolled with the arrow keys | live | `AD1` PROCmap, lines 5060-5200 |
| "Carry": the equipment and treasures held | live | `AD1` PROCg, lines 900-920 |
| The City of Ruins: a pass needed, four buildings, two of them traps | live | `AD1` FNCity, lines 10500-10730 |
| Grubble's bubble gum factory: the disguise kit gets the player in, and the city pass is inside | live | `AD1` FNFactory, lines 11000-11191 |
| Grubble's gum forest, an 8 by 7 grid walked N, S, E, W, with Zap Gates, captures and the gold pot | live | `AD1` FNForest, lines 11500-11940 |
| Fibber of the Lake, whose instructions must be answered with the opposite where he lies | live | `AD1` FNLake, lines 12000-12300 |
| The lie detector, which shows whether each of Fibber's instructions is true | live | `AD1` line 12240 |
| The Hilltop Swapshop: radio for sand goggles, and back | live | `AD1` FNHills, lines 12500-12550 |
| The Desert's sandstorm, survived only with goggles; the soil found with the soil tester | live | `AD1` FNDesert, lines 13000-13070 |
| The Mountains and the Bird of Doom | live | `AD1` FNMountains, line 13500 |
| Seven treasures: lie detector, goggles, city pass, gold pot, special water, fertiliser, bag of soil (the book names four) | live | `AD1` DATA line 20200 |
| All seven, back at the Centre: CONGRATULATIONS, and the hint for part 2, "When you are asked your age you must say 197" | live | `AD1` PROCend, lines 19000-19037 |
| Part 2, the Danger Area: The Face, who asks the player's age | live | `AD2` FNL1, lines 3500-3770 |
| Five spells to start, of four kinds (moving, vanishing, flower, lucky dip), found and lost along the way | live | `AD2` lines 3745-3770, 10000-11240 |
| The six parts of the flower dream, to be found before the last Flower of Crystal | live (with a poke: the five found before the castle were set by hand) | `AD2` PROCfl, lines 26000-26190 |
| Ten places of the Danger Area: The Face, Rumala's Row and its Wisdom Stones, the Exiles, the Horror, the Globs, a walk into a Blid trap, the storm and the sky spitter, three paths, the river, the castle | live (The Face, the Globs, the river, the bubble's flight, the castle); traced (the rest) | `AD2` FNL1-FNL10 |
| The Utility: three worksheets for a printer, Crystal Log, Crystal Notes and Grubble's Gum Forest Grid | live (to the printer question); traced (the printing) | `K` |

## Beyond the documentation

Found in the code, not in the manual.

- The adventure parts move themselves from &1900 to &0E00 with a function
  key the program defines and presses itself (`orientation.md`, "The
  loader").
- `STORY` is saved one byte short, and stops with `Bad program` on a
  Model B with the 8271 DFS (`orientation.md`).
- Fibber says three of his six instructions are opposites; four are (the
  first, "You will have to leave my lake", and three of the five that
  follow).
- The forest has no way out but the gold pot's square or a Zap Gate: the
  loop's flag, `of`, is set FALSE and never TRUE.
- Typing `River` or `Danger Area` at "Where do you wish to go next?" gets
  "Permission is not granted" and "It is FORBIDDEN" (`AD1` lines 515-520).
- Part 1's "Press key F to finish" prints `END` and asks again: only S
  leaves the screen (`AD1` line 19037).
- Part 2's six dream parts are kept in `F%`, `L%`, `O%`, `W%`, `E%` and
  `R%`, which spell FLOWER; each draws one piece of the last Flower's
  picture through the machine code (`AD2` lines 26050-26095).
- The spells survive `RUN` as two 20-bit numbers, `S%` (held) and `T%`
  (used) (`AD2` PROCspst and PROCspre).
- The equipment survives `RUN` too, in `DIM e% 11`, which BASIC places at
  the same address after every `RUN`; nothing else holds it.
- Declining the spell after the river's fee sets `B%`, which a fresh
  start does not clear, so the next game's first surviving flight ends
  at the castle (live, `facts.md`).
- The 19th `Map` or `Carry` at one place of part 1 is one `REPEAT` too
  many: error 44, and a fresh start (live).
- Part 2's descriptions read each word list `RND(5)` times, so the sixth
  word of each, the hippopotamus among them, never appears (traced).
- Three hazards say some of the belongings are lost and take all eleven
  (live for the Fright Freak; traced for the Pouncer and the Grabbers).
- `LIST` rings the bell, shows the copyright in green and turns the
  screen off with VDU 21 (live).
- A vanished storm, cave or sky spitter still says `You are safe.`,
  through the `ELSE` of the next `IF` on its line (live).
- A flower spell in the bubble's flight sets `Z%` to 1, and a vanishing
  spell later in the flight then moves the bubble instead (traced).
- The disc carries an unused title program, `!`, and a file with no name
  that is probably the machine code it fails to find (`orientation.md`).

## Open questions

- Whether 4Mation's own disc had `STORY` one byte short: no original disc
  has been compared.
- The teacher's guide is not online; what it says the worksheets are for
  is not known beyond their titles.
- Why every machine-code routine zeroes &70 and &71 before it prints:
  nothing in the programs reads either.
- A flower spell in the bubble's flight: the code turns a later vanishing
  spell into a moving one, and nobody has played it to see the screen.
