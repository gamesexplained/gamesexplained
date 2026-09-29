# Ghostbusters — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources, all read on 29 September 2026. Every web page was read through a
fetch tool that summarises, so a quotation below is near-verbatim, not a
transcription; `work/research.md` has the notes, source by source.

- The Commodore 64 manual, as text:
  <https://www.abandonwaredos.com/docawd.php?sf=ghostbustersmanual.txt&st=manual&sg=Ghostbusters&idg=3463>
  (it says `LOAD "*",8,1` and a joystick in port one, so it is the C64's).
  The main source. It gives no prices.
- C64-Wiki, <https://www.c64-wiki.com/wiki/Ghostbusters>, and the German
  <https://www.c64-wiki.de/wiki/Ghostbusters>: credits, vehicles, cheats.
- Cobra1's C64 FAQ on GameFAQs,
  <https://gamefaqs.gamespot.com/c64/575568-ghostbusters/faqs/22229>:
  controls per screen, prices, fees. An Apple II guide filed under the C64
  (`.../faqs/58788`) agrees on the prices.
- English Wikipedia,
  <https://en.wikipedia.org/wiki/Ghostbusters_(1984_video_game)>: credits
  and history.
- Zlin, "Ghostbusters: generiamo il nostro account number personale",
  ready64.org, 3 November 2008,
  <https://ready64.org/articoli/leggi/idart/66/ghostbusters-generiamo-il-nostro-account-number-personale>,
  and John L. Scarfone's `gbaccount.py`,
  <https://github.com/lagomorph/gbaccount>: the account number.
- Not reachable from this session: the Internet Archive's scan of the
  instructions (`Ghostbusters_1984_Activision_524_Instructions`), Lemon64,
  MobyGames, StrategyWiki's game page. No external screenshot could be
  saved (the network refuses downloads here), so `reference/` holds the
  game's own screens only.
- The game's own screens, from the contributor's image in VICE and in the
  kit's simulator (`orientation.md`), and its stored text (the string
  sweep, `facts.md`).

## Features

| Feature | Status | Where |
|---|---|---|
| Title screen: logo, no-ghost sign, "PRESS F1 OR F3 TO START" | live | `reference/title.png` |
| Bouncing-ball sing-along of the theme song, lyrics on screen | live | lyrics stored in PETSCII at `$645A`-`$68D8` |
| SPACE during the sing-along makes the game shout "Ghostbusters!" (manual) | open | |
| F1: the introduction and interview; F3: straight to vehicle selection (manual) | open | F1 live |
| Interview: name "LAST,FIRST", "DO YOU HAVE AN ACCOUNT?" | live | text at `$AB8D`, `$ABE1` |
| New franchise: the bank advances $10,000 | live | text at `$AC2B` |
| Account number: typed on a Y answer; "INVALID ACCOUNT NUMBER." | open | text at `$AC94`, `$ACB1` |
| Account number encodes the balance in units of $100, checked against the name (ready64, gbaccount) | open | |
| Vehicles: Compact $2,000, 1963 Hearse $4,800, Station Wagon $6,000, High-Performance $15,000 | live | vehicle page |
| Vehicle options on SPACE: 5, 9, 11, 7 items of cargo; 75, 90, 110, 160 mph | open | text at `$38F1`-`$39EC` |
| Equipment shop, three pages on keys 1-3, E to end | live | |
| Forklift driven by the joystick carries an item to the car | live | |
| Prices: PK energy detector $400, image intensifier $800, marshmallow sensor $800, ghost bait $400, traps $600, ghost vacuum $500, portable laser confinement system $8,000 | live | shop pages |
| "YOUR CAR IS LOADED TO CAPACITY." | open | text at `$3B5F` |
| Joystick in control port 1 | live | the forklift and the map answer port 1 only; reads at `$96CA` |
| City map: GHQ, Zuul, streets, CITY'S PK ENERGY and the balance | live | `reference/map.png` |
| PK energy rises with time | live | 003 to 036 over about 15 s on the map |
| Haunted building flashes red | live | |
| PK energy detector turns a building pink before a Slimer arrives (manual) | open | |
| Marshmallow sensor turns a building white before the Marshmallow Man (manual) | open | |
| Roamers drift towards Zuul; each one that arrives adds 100 PK (manual) | open | ghosts seen moving on the map |
| An escaped Slimer adds 300 PK (manual) | open | |
| Route: the Ghostbusters logo moves along the streets, leaving a dotted path; fire sets off (manual, FAQ) | live | |
| Driving: overhead street, the car steered with the joystick | live | `reference/drive.png` |
| Ghost vacuum sucks up Roamers on the road (manual) | open | |
| Arrival at a building: street scene | live | `reference/building.png` |
| Busting: first man drops the trap, second walks right, beams on, men move inward, streams must not cross, trap sprung (manual) | open | |
| "He slimed me!" on a miss; the man is out of action | open | |
| Crossed streams: "YOU CROSSED THE STREAMS... FORTUNATELY YOUR BACKPACKS SHORTED OUT IN TIME. GO BACK TO GHQ." | open | text at `$3B80` |
| A Slimer caught pays $300 to $1,000 (FAQ), or according to response time (Apple II guide) | open | |
| No empty traps, no men, discharged backpacks: "GO BACK TO GHQ" | open | text at `$3A04`-`$3AAE` |
| GHQ empties traps and revives men (Wikipedia) | open | |
| SPACE in play: status report | open | text "BACKPACK POWER AT XX% OF MAXIMUM... X EMPTY TRAPS... X MEN LEFT..." at `$3FB9` |
| MARSHMALLOW ALERT flashes; B drops bait | open | text at `$3AB0` |
| Bait averts the Marshmallow Man: the mayor pays $2,000 | open | text at `$3B21` |
| The Marshmallow Man destroys a building: $4,000 deducted | open | text at `$3AC5` |
| RUN/STOP pauses; RUN/STOP and RESTORE return to the title (manual) | open | NMI vector `$6425` |
| Keymaster and Gatekeeper reach Zuul at PK 9999, ending the game | open | text at `$B12B` |
| Loss: not more money than at the start, the bank forecloses | open | text at `$B12B` |
| "GO TO ZUUL! SNEAK PAST THE MARSHMALLOW MAN AND CLOSE THE PORTAL..." | open | text at `$B3B0` |
| Win: two of three men past the Marshmallow Man into Zuul, $5,000 reward | open | text at `$B2D4` |
| Partial: enough money but Zuul not reached, "GOOD TRY" | open | text at `$B1B9` |
| A winning game gives a new account number | open | text at `$B221`-`$B298` |
| Digitised speech: "Ghostbusters!", "He slimed me!", a laugh | open | speech heard at start-up; NMI player at `$F0C3`, CIA 2 timer B (`$F47E`) |
| Music: Russell Lieblich's arrangement of the theme | live | |
| Credits on the title: "DESIGNED BY DAVID CRANE COPYRIGHT 1984" | live | text at `$3671` |

## Beyond the documentation

Found in the code, not in the manual.

## Open questions

- F1 and F3: no source says they choose a number of players; the manual
  says F3 skips the introduction.
- The cheats found online are untested: `POKE 22014,9` ("unlimited lives")
  and `POKE 38454,96: SYS 24576` ("cheat mode"; `$9636` and `$6000`).
- Published name and account pairs, several impossible under the
  documented algorithm (digits 8 and 9, a blank name with `458`): test
  them against the code.
