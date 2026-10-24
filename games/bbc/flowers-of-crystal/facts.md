# Flowers Of Crystal — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

- The disc is `Flowers of Crystal (1984)(4Mat).ssd` from the TOSEC Acorn
  BBC set, 101,632 bytes, SHA-256
  `0f591a690ad0d2d2b404a65f28cea63c7f74fa1703f4a514c2dbc1314dfe57d0`: a
  40-track DFS side, catalogue title `FLOWERSOFCRY`, boot option 3, 17
  files (`orientation.md`, "The image").
- The game is eight BBC BASIC II programs, each a part with its own
  listing: `GO` (logo), `UNEM` (menu), `STORY` (story), `N1` (sound-1),
  `AD1` (adventure-1), `N2` (sound-2), `AD2` (adventure-2) and `K`
  (worksheets), and four files of machine code, `CODE1/1` and `CODE1/2`
  for part 1 and `CODE2/1` and `CODE2/2` for part 2, which are in the
  adventure parts' listings. `!`, the file with no name, `DUMMY` and
  `DUMMY2` are loaded by nothing.
- Each listing is built from its part's hand-over snapshot: the machine
  once `CHAIN` has loaded the program at &1900, before its first
  statement runs, on jsbeeb 2.4.0's Model B (MOS 1.20, BASIC II, DFS 1.20
  on the 8271).
- `STORY` is saved one byte short: its length stops after the `&0D` of its
  end mark, and on the kit's machine the byte after it is &01, so `BASIC`
  stops with `Bad program` straight after the menu's choice 1 (*live*;
  `story` listing, `end_mark`).
- The adventure programs end `&0D &DD`; BASIC II writes `&0D &FF`, and any
  byte from &80 up after a `&0D` ends a program, so both run (`AD1` and
  `AD2`, `end_mark`).

## Memory layout

| Thing | Where |
|---|---|
| Every program as `CHAIN` loads it | &1900, PAGE on the kit's machine |
| An adventure program in play, after it moves itself | &0E00 to TOP (&64EA in part 1, &6421 in part 2) |
| The resident integers `@%`, `A%` to `Z%` | &0400 + 4 × n: `A%` at &0404, `Z%` at &0468 |
| Function key f0's definition (from `N1` or `N2`) | the MOS's soft-key buffer, &0B00 |
| Part 1's pictures (`CODE1/1`, `CODE1/2`) | &0900-&0AFF, &0C00-&0CEE |
| Part 2's flower (`CODE2/1`, `CODE2/2`) | &0900-&0AFE, &0C00-&0CFE |
| Two bytes every machine-code routine zeroes, which nothing reads | &70, &71 |
| BREAK's effect, set by `*FX200` | &0258 |
| The escape character, set to &90 (SHIFT-f0) by `UNEM` | &026C |
| The Mode 7 screen | &7C00-&7FE7 |
| `GO`'s Mode 1 logo, `K`'s Mode 0 printing | &3000-&7FFF |

The resident integers are the only variables that outlive `RUN` and
`CHAIN`, and the adventures keep their progress in them:

| Integer | Part 1 (`AD1`) | Part 2 (`AD2`) |
|---|---|---|
| `A%` | 0 on a fresh start; 1 once play is under way (`centre`) | 0 on a fresh start; 6 after The Face's first visit (`FNL1`) |
| `B%` | bag of soil found (`desert_storm`) | the river crossed without a spell (`FNL9`); line 100 does not clear it |
| `C%` | city pass (`factory_inside`) | |
| `E%`, `L%`, `O%`, `R%` | | parts 5, 3, 2 and 4 of the flower dream (`PROCfl`) |
| `F%` | fertiliser (`city_blue`) | part 6 of the dream |
| `G%` | gold pot (`forest_gold`) | the spell `FNflsp` last picked |
| `H%`, `M%`, `R%` | snow, sun and rain forecast (`PROCw`) | |
| `I%` | lie detector (`city_yellow`) | the relocation loop's counter only |
| `K%` | sand goggles (`FNHills`) | the sound level, set by `N2` |
| `N%`, `P%` | the place travelled to, and the place travelled from | |
| `S%` | the sound level, set by `N1` | the spells held, one bit each (`PROCspst`) |
| `T%` | | the spells used, one bit each |
| `W%` | special water (`fibber_five`) | part 1 of the dream |
| `Z%` | | the place, 1 to 10 (`main`) |

Part 1's equipment is not in an integer: it is in `DIM e% 11` (`dims`),
twelve bytes, of which `e%?1` to `e%?11` hold the eleven items. Each `RUN`
reserves them at the same address and never clears them, so the equipment
survives the `RUN` that ends every journey.

## Timing

- `PROCd(t)` in both adventures waits until `TIME` reaches t×1000
  centiseconds on, by an exact comparison (`TIME=m+(t*1000)`). Every value
  the programs pass, 0.001 to 0.4 and `RND(5)/100`, comes to a whole
  number of centiseconds in BASIC's arithmetic (*live*, at the prompt), so
  no wait can miss its moment: `PROCd(.1)` is one second.
- `GO`'s pause before the menu is an empty loop of 5,000 steps; `N1` and
  `N2` change the title's colours after empty counts of 100 and 1,000
  (`N1`) or 200 and 2,000 (`N2`), so part 2's title changes half as fast.

## Controls

- Every answer is typed into `FNi`'s field of dots: only the characters
  it is given are accepted (`Y$`, `YN$` `YESyesNOno`, digits, letters),
  DELETE takes one back, anything else beeps, and RETURN ends it. Most
  questions take the first one or two letters of the answer (`PROCds`,
  `city_buildings`, `FNL8`).
- `< S >` means the space bar (`PROCs`, `PROCS`, `PROCcsp`).
- The arrow keys scroll part 1's map (`PROCq`), steer part 2's bubble
  under a moving spell (`PROCmbb`), and lead the Exiles (`exiles_game`),
  each after `*FX4,1` makes them give codes. Part 1's map gives them back
  to editing with `*FX4,0`; part 2 never does.
- `UNEM`'s `*FX220,144` makes SHIFT-f0 the escape key and leaves ESCAPE
  as an ordinary key (*live*). SHIFT-f0 in an adventure raises an error,
  which its `ON ERROR` turns into a fresh start (`on_error`, `restart`).
- `*FX200,2`, set by `GO`, `UNEM`, `N1`, `N2` and `K`, makes BREAK clear
  memory; `STORY`'s `*FX200,3` also disables ESCAPE.

## Graphics

- Everything is Mode 7 teletext except `GO`, which draws the 4Mation logo
  in Mode 1, and `K`, which prints its worksheets in Mode 0 (`logo`,
  `worksheets` listings).
- The pictures are teletext graphics characters in `PRINT` statements,
  with colour and new-background codes; the forest's trees, the factory,
  the Fright Freak, Super Jim, the castle and the rest are drawn in BASIC.
- Fifteen pictures are machine code: each routine zeroes &70 and &71 and
  prints a table of VDU codes, `TAB` moves and characters through OSWRCH,
  a faster `PRINT`. Part 1 has nine (the City's ruin in four pieces, the
  Lake in three, the weather report's title and the Bird of Doom); part 2
  has six, one for each part of the flower dream, which together draw the
  Crystal Flower (`flower_picture`, *live*).
- `ruin_upper` at &900 has no RTS of its own and runs on into
  `ruin_ledge` at &994, and `FNCity` then calls &994 itself, so the ledge
  is drawn twice. `flower_W`'s table prints its rows 5 and 6 twice.
- `PROCwhl`, the whirlwind at Rumala's Row, spins the screen by writing
  the CRT controller's start address register 13 (`VDU 23,0,13`) 1,008
  times. `PROCgnd` writes the scrolling ground of the bubble's flight
  straight into screen memory from &7DB8.
- `GO`'s large 4 is painted in white on white, invisible until line 90
  turns the background cyan (`reveal`, *live*).

## Mechanics

### The loader

`!BOOT` chains `GO`, which chains `UNEM`. `N1` and `N2` define f0, load
their part's machine code and chain the adventure. Loaded at &1900, the
adventure's line 1 sends it to lines 32220-32225, which select the
cassette filing system (`*TAPE`), copy the program to &0E00 four bytes at
a time, lower TOP by 11 pages, set PAGE to &0E00 and `RUN`; lines 5-6 then
shrink the text window to one character, put f0 in the keyboard buffer and
`STOP`, and at the prompt the MOS types f0's definition, which deletes
lines 1-6, 32220 and 32225, selects Mode 7 and runs the game
(`relocate`, `handover_f0`, *live*).

### Part 1: the journey

- The eight places and their map positions are line 20000's DATA
  (`places_data`). `FNl` is the distance between two places: the
  straight-line distance, with the across distance counted at two
  thirds, rounded down to a whole number.
- `PROCp` decides each journey by that distance and by the two places'
  numbers (Centre 0, City 1, Factory 2, Forest 3, Lake 4, Hills 5, Desert
  6, Mountains 7):

  | From \ To | Centre | City | Factory | Forest | Lake | Hills | Desert | Mountains |
  |---|---|---|---|---|---|---|---|---|
  | Centre | | path | path | to the Factory first | none | none | none | none |
  | City | path | | path | to the Hills first | path | path | none | none |
  | Factory | path | path | | path | none | none | none | none |
  | Forest | to the Factory first | to the Hills first | path | | path | path | river | river |
  | Lake | none | path | none | path | | none | path | none |
  | Hills | none | path | none | path | none | | none | none |
  | Desert | none | none | none | river | path | none | | none |
  | Mountains | none | none | none | river | none | none | none | |

  A path brings one hazard (`path`); no path asks `Are you sure?` and
  brings two (`no_path`); the river is `You fall in the river`, Super Jim
  and the Centre (`PROCriv`); "first" journeys go to the Hills or the
  Factory instead. Every one of the 56 journeys was tried live and gave
  what the table says. No path leads to the Mountains, and the Desert's
  only path is from the Lake.
- `River` and `Danger Area` are refused as places (`choose_place`).
- Each arrival at the Centre gives a new weather report (`PROCw`), one of
  six forecasts with equal chances, two for each of sun, snow and rain;
  `PROChaz` then rejects the two kinds of weather the forecast did not
  give, so each of a journey's hazards is one of seven with equal
  chances: green fog, the forecast weather, Fright Freak, Blids, Pouncer,
  Grubble's Grabbers or a scene, never the same one twice on one journey.
- The hazards' outcomes are in `hazard_fog` to `hazard_grabbers`: each
  offers two choices, and the equipment decides most of them. The
  `Some of your belongings` messages of the Fright Freak, the Pouncer and
  the Grabbers all clear every item (`PROCc(11)`).
- Equipment is chosen afresh at every visit to the Centre, and putting it
  on clears what was carried first (`PROCe`): one of warm coat, raincoat
  and drink; one of the four testers; two of fright stick, radio,
  bubble-gum and disguise kit.
- The seven treasures and where each is found (the City's buildings are
  entered only with the city pass): lie detector (City, the yellow
  building), sand goggles (Hills, for the radio), city pass
  (Factory, with the disguise kit), gold pot (Forest, square 2,1, with the
  metal detector), special water (Lake, Fibber beaten, with the water
  tester), fertiliser (City, the blue building, with the fertiliser
  tester), bag of soil (Desert, the
  sandstorm, with goggles and the soil tester). All seven at the Centre
  end part 1 (`centre`, `PROCend`, *live*).
- The forest is a grid of 8 by 7 squares. What each holds depends on
  g%×h%, the product of its coordinates (`forest_squares`); the loop that
  walks it ends only at the gold pot's square or a Zap Gate, because its
  flag `of` is never set TRUE (`forest_move`).
- Fibber's first instruction and three of the five that follow are lies,
  four of six, though he says three (`fibber_data`).
- `PROCds` re-enters its `REPEAT` on every `Map` or `Carry` without
  leaving the one already open; BASIC holds 20, so the 19th `Map` or
  `Carry` at one place stops with error 44, `Too many REPEATs`, and
  `ON ERROR` turns it into a fresh start (*live*).
- `PROCend`'s `Press key F to finish` prints `END` and asks again; only S
  leaves.

### Part 2: the Danger Area

- The places are `FNL1` to `FNL10`, called by name from `Z%` (`main`):
  1 The Face, 2 Rumala's Row, 3 the Exiles, 4 the Horror, 5 the Globs,
  6 the walk, 7 the bubble's flight, 8 the three paths, 9 the river,
  10 the castle. Each visit ends with `RUN`.
- The Face asks the player's age on the first visit; only 197, the answer
  part 1's last screen gives, goes on (`face_first`, *live*).
- Twenty spells in four kinds of five: moving 1-5, vanishing 6-10, flower
  11-15, lucky dip 16-20. The player starts with spells 4, 8, 12, 16 and
  20; on each later visit The Face gives the first of 5, 9, 13 and 17
  the player has never had (`spells_start`, `face_again`); places to look give or take one at
  random (`PROCsplc`, `FNflsp`). Each is 0 (never had), 1 (held) or 2
  (used) in `s%()`, packed into `S%` and `T%` between visits
  (`PROCspst`, `PROCspre`). With none held, the game starts again
  (`PROCgr`).
- A spell offered at a danger (`PROCspu`) does what `spell_effects` says,
  by its kind and `Z%` at the time, and the next place comes from line
  28720 (flower), 28730 (nothing happens) or 28740 (vanishing). A lucky
  dip is a spell from 1 to 15 at random, except at the castle, where it
  is always the flower spell.
- Spells are offered with `Z%` 2 (stones 1, 2, 5 and 8), 4 (the Horror),
  5 (Glob 2), 7 (the storm, the cave, the sky spitter), 8 (the left
  path), 9 (the river) and 10 (the castle); never with 1, 3 or 6. Line
  28730 is read only with `Z%` 2, 5, 8 and 10, and line 28740 only with
  2, 4, 5 and 9 (line 10044 names 6 too, where no spell is offered). The DATA decides the next place only at the Horror and the
  river, and at the stones only through its 0, the whirlwind: the Globs
  then set `Z%`=3, the flight 2 or 10, the left path 9, the castle 8 and
  the stones their own number (`FNL2`, `FNL5`, `FNL7`, `FNL8`, `FNL10`).
  The conditions `Z%=6ANDc>10` and `Z%=7ANDc>10` of line 10042 are never
  true, since line 10041 has taken every spell above 10 (traced).
- A flower spell in the flight reads line 28720's seventh value, 1, so
  `Z%` is 1 for the flight's later dangers, and line 10050 then takes a
  vanishing spell there for a moving one (`PROCmbb`) (traced, not
  played).
- The flower dream's six parts, one from each of six places, are kept in
  `W%`, `O%`, `L%`, `R%`, `E%` and `F%` (parts 1 to 6), which spell FLOWER
  in the order the flower's picture draws them; the castle's part with the five
  others ends the game (`PROCfl`, `the_end`).
- The river (`FNL9`, *live*): the fee takes one held spell at random.
  Declining the spell that follows sets `B%` TRUE and starts the bubble's
  flight (`Z%`=7); a vanishing spell uses up a second spell and leads to
  the castle; a moving spell leads to the three paths.
- The bubble's flight (`FNL7`, `cave`, `spitter`) has three dangers, each
  survived by luck or a spell. At its end the player goes to Rumala's
  Row, or to the castle when `B%` is TRUE, which is then cleared. Line 100
  clears `Z%`, `S%`, `T%` and the six dream parts on a fresh start but not
  `B%`, so a river crossed without a spell in one game sends the next
  game's first surviving flight to the castle (*live*).
- Each of the flight's dangers is one line built the same way: the storm
  4010, the cave 4048, the sky spitter 4052. The danger runs inside
  `IFNOTsk%`, and the line's only `ELSE` belongs to the `IF` after it,
  which asks whether the bubble was hit. When the danger has vanished,
  the false `IF` carries on at that `ELSE`, so the player still reaches
  `You are safe.` (*live*, all three); on line 4052 the same `ELSE` holds
  `Z%=2` and the test of `B%`, the end of the flight.
- `PROCde`'s description picks each word with `RND(5)` from lists of six,
  so the sixth word of each list never appears (`words_data`).

### Sound levels

`N1` sets `S%` and `N2` sets `K%` to -3 × the level chosen, 0 to -15.
Part 1 gives `S%` to every `SOUND` as its loudness and to envelope 1's
targets; part 2's `SOUND`s use envelopes 1-3, whose targets are
-(K%×5)+40 (`read_key`, `start_part`). Level 0 also turns the MOS's sound
off with `*FX210,1`, which nothing turns on again.

## Data tables

| Table | Line | What |
|---|---|---|
| `places_data` | `AD1` 20000 | the eight places and their map positions |
| `scene_data` | `AD1` 20050 | hazard 9's four sentences |
| `corners_data` | `AD1` 20060 | the forest's corners |
| `equipment_data` | `AD1` 20070-20090 | the eleven items, in the order of `e%` |
| `weather_data` | `AD1` 20100 | the six forecasts |
| `treasures_data` | `AD1` 20200 | the seven treasures, each after its integer variable, which `READ` evaluates |
| `hazard_fog` ... | `AD1` 3020-3096 | each hazard's warning, choices and outcome lines |
| `map_north`, `map_south` | `AD1` 5140-5200 | the map's 42 rows, runs stored as counts |
| `fibber_data` | `AD1` 12280-12290 | Fibber's five instructions, lie or truth |
| `messages_data` | `AD2` 28000-28005 | the dangers' two-line messages |
| `clues_data` | `AD2` 28300-28305 | the Clue Stone's ten clues |
| `face_data` | `AD2` 28700-28710 | The Face's points and colours |
| `flower_moves`, `nothing_moves`, `vanish_moves` | `AD2` 28720-28740 | the next place after a spell, by place |
| the story | `STORY` 100-620 | seven DATA items to a page; `*` prints nothing, and seven of them end the story |

## Sound

The census of the eight programs (`work/files/*.lst`):

| Program | `SOUND` | `ENVELOPE` | `*FX` |
|---|---|---|---|
| `GO` | | | 200,2 |
| `UNEM` | | | 15,0; 200,2; 220,144 |
| `STORY` | | | 15,0; 200,3 |
| `N1` | 2, the level's test notes | | 11,0; 15,0; 200,2; 210,1 |
| `AD1` | 8, through `PROCsound` too | envelope 1, in `PROCsound` | 4,0; 4,1; 11,0; 11,25; 15,0; 138,0,128 |
| `N2` | 2 | envelopes 2 and 3 | 11,0; 15,0; 200,2; 210,1 |
| `AD2` | 15 | envelope 1 | 4,1; 11,0; 11,8; 11,25; 12,5; 15,0; 21,0; 138,0,128 |
| `K` | | | 200,2 |

- `PROCsound` in part 1 redefines envelope 1 in a loop, with pitch steps
  that rise or fall, and plays two notes on two channels each time: the
  Centre's coloured squares, the factory's lorry, the Fright Freak and the
  Pouncer use it.
- The map's scroll plays a note whose pitch falls as the map goes south
  (`PROCq`); the City's falling stone plays pitch 1020/W, falling as it
  drops, and a noise when it lands (`city_rubble`); the sandstorm plays
  noise against silent notes on channel 1 (`desert_storm`).
- In part 2 the volcano's flashes rise in pitch (`PROCmt`), the storm's
  thunder is on the noise channel (`PROCstm`), and the Globs, the Exiles'
  moves and the spitter's shots each have their notes.

## The listing's error rate

A sample of 60 of the listing's 350 comments, drawn with the seed
20261024 from every part in proportion to its comments (25 from part 1's
adventure, 23 from part 2's, 4 from the story, 3 from the worksheets, 2
from the logo, and one each from the menu and the two sound programs),
was checked by a checker that wrote none of them, on the model that wrote
them (`game.json`, `accuracy`). It marked five wrong in a detail and one
doubtful, and each was read against the program: all six were wrong in a
detail. That is 10 %, between 5 % and 20 % at 95 % confidence, and a
lower bound, since a checker misses some. The six: the factory's green
gates taken for gum trees, and a set of answer characters (`N$`) listed
as used when nothing uses it (`strings`); the forest's back row of trees
called the front (`PROCt1`); the Pouncer's arms, which conceal code 152
swaps for arms held out level rather than hiding (`PROCar`, `PROCup`,
whose crouch was also misread as feet lifted); The Face's last spell,
which can run out before it has given all four (`face_again`); and the
castle's cyan ground called water (`PROCcas`). All six were corrected,
with the comments that said the same (`FNFactory`'s gum trees, `PROCt2`'s
front and back). The audit of every comment is recommended.

## Live tests

All on jsbeeb 2.4.0 in the kit's server, 24 October 2026.

- **The loader.** Every part reached from power-on through SHIFT-BREAK
  and the menu (`orientation.md`, "From power-on to play"); both
  adventures moved to &0E00 and ran there.
- **STORY.** Menu choice 1 stops with `Bad program`; &FF written at &49F4,
  `OLD` and `RUN` give the story.
- **ESCAPE.** At the menu, ESCAPE raised no error and SHIFT-f0 raised one.
- **LIST.** `LOAD"AD1"` and `LIST` show lines 1-4, the copyright in
  green, and nothing after; &D0 then holds &80, the VDU disabled
  (`reference/15-part1-list-protection.png`).
- **REPEAT.** At the Centre's `Where do you wish to go next?`, `Map` and
  RETURN again and again: BASIC's REPEAT level (&24) rose by one each
  time, and the 19th raised error 44 and restarted the game at `To begin
  press < S >`.
- **Journeys.** From the Centre's question, `P%` set to each place and
  each other place typed, the permit answered yes: all 56 journeys gave
  the table's way (`work/scripts/journeys.py`). Forest to Desert fell in
  the river and Super Jim rescued the player; City to Forest gave `First
  you must go to the Hills` and `N%` 5.
- **The river.** `Z%`=9 with spells 1-3 held: yes took spell 3 as the fee;
  declining the next spell set `B%` to -1 and `Z%` to 7, and `There is a
  storm coming.` followed. With spells 1, 2, 3, 6 and 7, the fee took 7;
  vanishing spell 6 used up spell 3 as well and set `Z%` to 10; moving
  spell 1 gave `You move away from the river.` and `Z%` 8.
- **B% across a fresh start.** After that crossing, SHIFT-f0 started part 2
  again at The Face with `A%`, `Z%`, `S%` and `T%` cleared and `B%` still
  -1. A flight with `B%` -1 and spells 6, 7 and 8, each danger vanished
  (`The storm disappears.`, `The cave disappears.`, `The sky spitter
  disappears.`, each with `You are safe.`), ended with `Z%` 10, the
  castle, and `B%` 0.
- **The places.** Most of part 1's places and hazards, and part 2's Face,
  Globs, castle and ending, were played and their screens saved
  (`reference/`); the hazards and the dream parts were reached by setting
  `N%`, `Z%` and the integers before a `RUN`.
- **The flower.** Each of part 2's six routines run alone from a stub at
  &80, and the six together: the whole Crystal Flower.
- **Delays.** `PRINT` at BASIC's prompt of t×1000 less its rounding for
  every delay the programs use: 0 each time.
