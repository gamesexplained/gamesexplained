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
| Account number: typed on a Y answer; "INVALID ACCOUNT NUMBER." | live | text at `$AC94`, `$ACB1`; decode `$9155`; VENKMAN,PETER with 64405104 gives $123,400, one digit changed is refused |
| Account number encodes the balance in units of $100, checked against the name (ready64, gbaccount) | confirmed | encode `$90EE`, LFSR `$91A6`, name sum `$91B6`; a Python model agrees with the game |
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
| Ghost vacuum sucks up Roamers on the road (manual) | traced | `$8001`-`$8073`; only if owned (`$6D` bit 5), on a new press of fire; a catch takes 32 frames, pays nothing and sends the Roamer back to the map |
| Arrival at a building: street scene | live | `reference/building.png` |
| Busting: first man drops the trap, second walks right, beams on, men move inward, streams must not cross, trap sprung (manual) | live | states `$8279`-`$8896`; with the streams on, the stick only closes the gap between the men |
| "He slimed me!" on a miss; the man is out of action | traced | the Slimer escapes, PK rises by 300, speech phrase 2 |
| Crossed streams: "YOU CROSSED THE STREAMS... FORTUNATELY YOUR BACKPACKS SHORTED OUT IN TIME. GO BACK TO GHQ." | live | text at `$3B80`; backpacks to 0, two men lost (3 to 1 in the simulator), the Slimer escapes |
| A Slimer caught pays $300 to $1,000 (FAQ), or according to response time (Apple II guide) | confirmed | table `$A1E4`, by how long the building has been haunted, $1,000 down to $300; +$500 seen |
| No empty traps, no men, discharged backpacks: "GO BACK TO GHQ" | open | text at `$3A04`-`$3AAE` |
| GHQ empties traps and revives men (Wikipedia) | live | `$88B6`; 3 men, backpack power 99, traps emptied |
| SPACE in play: status report | open | text "BACKPACK POWER AT XX% OF MAXIMUM... X EMPTY TRAPS... X MEN LEFT..." at `$3FB9` |
| MARSHMALLOW ALERT flashes; B drops bait | open | text at `$3AB0` |
| Bait averts the Marshmallow Man: the mayor pays $2,000 | traced | text at `$3B21`; `$8925`-`$8A03` |
| The Marshmallow Man destroys a building: $4,000 deducted | traced | text at `$3AC5`; four stages, the charge at `$8983` |
| RUN/STOP pauses; RUN/STOP and RESTORE return to the title (manual) | open | NMI vector `$6425` |
| Keymaster and Gatekeeper reach Zuul at PK 9999, ending the game | open | text at `$B12B` |
| Loss: not more money than at the start, the bank forecloses | live | text at `$B12B`; end pages `$8C74`-`$8D7F` |
| "GO TO ZUUL! SNEAK PAST THE MARSHMALLOW MAN AND CLOSE THE PORTAL..." | open | text at `$B3B0` |
| Win: two of three men past the Marshmallow Man into Zuul, $5,000 reward | live | text at `$B2D4`; the door at x `$5B`-`$5E`; +$5,000 seen |
| Partial: enough money but Zuul not reached, "GOOD TRY" | differs | text at `$B1B9`; shown when the Marshmallow Man catches two men on the Zuul street; the pages then give a credit limit and a new account number as a win does |
| A winning game gives a new account number | live | text at `$B221`-`$B298`; `$8CC6` calls the encoder `$90EE`; F3 then starts with that account |
| Digitised speech: "Ghostbusters!", "He slimed me!", a laugh | live | heard at start-up; player `$F080`, run by the NMI of CIA 2 timer B at 9,659 samples a second (PAL), 4-bit samples to `$D418`; phrases and samples `$F4EA`-`$FF9B`; which phrase says which words is not settled from the code |
| Music: Russell Lieblich's arrangement of the theme | live | player `$93E2`/`$93F0`; voice 3 lent to sound effects at `$9593` |
| Credits on the title: "DESIGNED BY DAVID CRANE COPYRIGHT 1984" | live | text at `$3671` |

## Beyond the documentation

Found in the code, not in the manual.

| Feature | Status | Where |
|---|---|---|
| Account digits 8 and 9 are read as 0 and 1: 64485184 works like 64405104 | live | digit parse `$9CFC` keeps 3 bits |
| The decoded balance is not checked as decimal: ANDY with 777 shows YOU HAVE $?<0000 | live | `$9155` |
| Names with the same byte sum (anagrams) share every account; about one random number in 256 passes the check | confirmed | 8-bit check byte |
| PK energy stops at 9999; it rises 1 every 64 passes below 1000, every 32 below 2000, every 16 above; crossing a thousand at 5000 or more marks a random building | confirmed | `$9895` |
| Money saturates at $999,900 and stops at 0 | confirmed | BCD add `$9664`, subtract `$9636` |
| `POKE 38454,96` makes the subtract routine return at once: purchases cost nothing | live | `$9636`; buying the hearse left $10,000 |
| The laser confinement system stores up to 10 ghosts instead of using a trap | traced | `$6D` bit 6 |
| Each drive leaves two bytes on the stack: state `$14` reaches `next_state` by JSR, not JMP | live | `$8070`; the stack pointer went `$FF` to `$FD` and stayed |
| "YOU MADE MORE MONEY" is printed when the balance only equals the starting one | traced | end pages |
| A sixth speech phrase, phrase 0 (0.95 s, beginning like phrase 1), is stored but never played | confirmed | the game asks only for phrases 1-4 |
| The speech player has 2-bit sample decoders no phrase uses | confirmed | `$F267`-`$F2E3`, `$F3E2`; all four decoders hooked while every phrase played |
| A turbo tape loader, never run, is left at `$CE00`; its RESTORE handler fills memory with the JAM opcode `$02` | confirmed | `$CE00`-`$CED9`, `$CEC1`; a dead chain at `$CF80` calls it and `$0A00`, `$0E00`, likely the original tape's loading sequence (inference) |
| Dead code: `sprite_y_distance` `$9C76`, `set_balance_10000` `$9CF1`; three-NOP runs at `$90D1`, `$90DB` look like a patched-out call | confirmed | no reference, never executed |

## Open questions

- F1 and F3: no source says they choose a number of players; the manual
  says F3 skips the introduction.
- `POKE 22014,9` ("unlimited lives", `$55FE`, in the video bank the start-up
  rebuilds) is untested. `POKE 38454,96` is settled above.
- Published name and account pairs with digits 8 and 9 are explained by
  the digit parse (8 reads as 0, 9 as 1). A blank name with `458` is
  untested.
