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
| Title screen: logo, no-ghost sign, "PRESS F1 OR F3 TO START" | live | `reference/title.png`; `draw_title_screen` `$619A` |
| Bouncing-ball sing-along of the theme song, lyrics on screen | live | lyrics stored in PETSCII at `$6443`-`$68EF`, cues `$68F0`, ball `$91C8` |
| SPACE during the sing-along makes the game shout "Ghostbusters!" (manual) | live | `$6385`-`$6393` calls the speech routine `$8DB9` with phrase 1 when no lyric is scrolling (hooked, agent 3); that phrase 1 is the chant is by its use here, not heard |
| F1: the introduction and interview; F3: straight to vehicle selection (manual) | differs | `$6399`, `st00_interview_start` `$747E`: F3 skips the interview only once a name has been typed since power-on (`$6328`, kept through RUN/STOP + RESTORE); it then decodes the stored account ($10,000 if it fails). With no name F3 is F1. Live (`work/verify/t5-f1f3.js`) |
| Interview: name "LAST,FIRST", "DO YOU HAVE AN ACCOUNT?" | live | text at `$AB8D`, `$ABE1` |
| New franchise: the bank advances $10,000 | live | text at `$AC2B`; `st02_account_answer` `$74D8` |
| Account number: typed on a Y answer; "INVALID ACCOUNT NUMBER." | live | text at `$AC94`, `$ACB1`; decode `$9155`; VENKMAN,PETER with 64405104 gives $123,400; STANTZ,RAY with 03452601 gives $54,300; one digit changed is refused |
| Account number encodes the balance in units of $100, checked against the name (ready64, gbaccount) | live | encode `$90EE`, LFSR `$91A6`, name sum `$91B6`; a number computed from the Python model was accepted by the game (`t11-account.js`); the algorithm is in `facts.md` |
| Vehicles: Compact $2,000, 1963 Hearse $4,800, Station Wagon $6,000, High-Performance $15,000 | live | vehicle page; prices `$A1D4`/`$A1D8` |
| Vehicle options on SPACE: 5, 9, 11, 7 items of cargo; 75, 90, 110, 160 mph | live | text at `$38F1`-`$39EC`, shown in turn by SPACE (`t9-misc.js`); the capacities are `car_capacity` `$AA9A`; the speeds are text only, the cars' real limits `$AA9E` are `$60`, `$70`, `$80`, `$A0` |
| Equipment shop, three pages on keys 1-3, E to end | live | `shop_keys` `$7A5B`; E needs a trap |
| Forklift driven by the joystick carries an item to the car | live | `st0F_shop_forklift` `$7749` |
| Prices: PK energy detector $400, image intensifier $800, marshmallow sensor $800, ghost bait $400, traps $600, ghost vacuum $500, portable laser confinement system $8,000 | live | shop pages; `item_price` `$A1DC` |
| "YOUR CAR IS LOADED TO CAPACITY." | live | text at `$3B5F`; `shop_fire_at_car` `$78EA`; load 9 of 9 refused, nothing paid (`t10-capacity.js`) |
| Joystick in control port 1 | live | the forklift and the map answer port 1 only; reads at `$96CA` |
| City map: GHQ, Zuul, streets, CITY'S PK ENERGY and the balance | live | `reference/map.png` |
| PK energy rises with time | live | 003 to 036 over about 15 s on the map; `frame_pk_rise` `$73F3` |
| Haunted building flashes red | live | red and green, 16 frames each (`$7106`, `t2b-flash.js`) |
| PK energy detector turns a building pink before a Slimer arrives (manual) | differs | `map_building_under_logo` `$7D23`, `warn_needs` `$A9B0`: the building turns purple in its first warning stage only while the logo is on a street beside it, and goes back when the logo leaves; with the detector a building in the last stage before the Slimer turns red (haunted) as soon as the logo passes. Live (`t2-warnings.js`) |
| Marshmallow sensor turns a building white before the Marshmallow Man (manual) | differs | same routine: white only while the logo is beside the building, for the 15 to 20 s between the pick and the alert. Live (`t2-warnings.js`) |
| Roamers drift towards Zuul; each one that arrives adds 100 PK (manual) | live | `st12_city_map` `$7BB7`-`$7BCB`; 0007 to 0108 (`t3-roamer-zuul.js`) |
| An escaped Slimer adds 300 PK (manual) | live | unanswered: `frame_building_timers` `$73D9`, 76.6 s after the building turned red (`t4-escape.js`); after a missed trap: `$8704` (agent 5) |
| Route: the Ghostbusters logo moves along the streets, leaving a dotted path; fire sets off (manual, FAQ) | live | `$7CAD`, `$7F29`, `$7E55` |
| Driving: overhead street, the car steered with the joystick | live | `reference/drive.png` |
| Ghost vacuum sucks up Roamers on the road (manual) | live | `$818C`-`$8274`; only if owned (`$6D` bit 5), on a new press of fire; a catch takes 32 frames, pays nothing and sends the Roamer back to the map (`t13-vacuum.js`) |
| Arrival at a building: street scene | live | `reference/building.png` |
| Busting: first man drops the trap, second walks right, beams on, men move inward, streams must not cross, trap sprung (manual) | live | states `$8279`-`$8896`; with the streams on, the stick only closes the gap between the men |
| "He slimed me!" on a miss; the man is out of action | live | `st1D_slimer_escapes` `$8704`: a man lost, PK +300, speech phrase 2 (agent 5's run) |
| Crossed streams: "YOU CROSSED THE STREAMS... FORTUNATELY YOUR BACKPACKS SHORTED OUT IN TIME. GO BACK TO GHQ." | live | text at `$3B80`; backpacks to 0, two men lost (3 to 1 in the simulator), the Slimer escapes |
| A Slimer caught pays $300 to $1,000 (FAQ), or according to response time (Apple II guide) | live | table `$A1E4` by the haunted building's timer: $1,000 at first, $100 less every 10.2 s, $300 at the end; $300 if the building is no longer marked (`t8-reward.js`) |
| No empty traps, no men, discharged backpacks: "GO BACK TO GHQ" | live | text at `$3A04`-`$3AAE`; `map_fire_select` `$7E55` refuses with messages 0, 1, 3 (`t9-misc.js`) |
| GHQ empties traps and revives men (Wikipedia) | live | `$88B6`; 3 men, backpack power 99, traps emptied |
| SPACE in play: status report | live | `frame_status_report` `$7175`; "BACKPACK POWER AT 99% OF MAXIMUM... 3 EMPTY TRAPS... 3 MEN LEFT..." scrolled on the bottom row (`t1-status-pause.js`) |
| MARSHMALLOW ALERT flashes; B drops bait | live | text at `$3AB0`; `map_marshmallow_check` `$7ED8`, `map_bait_key` `$7F70`; only bait dropped after the alert counts (`t7-marshmallow.js`) |
| Bait averts the Marshmallow Man: the mayor pays $2,000 | live | text at `$3B21`; `st26_mm_baited` `$89DC`; $2,500 to $4,500 (`t7-marshmallow.js`) |
| The Marshmallow Man destroys a building: $4,000 deducted | live | text at `$3AC5`; `st25_mm_stomps` `$8970`, the charge at `$8983`; $10,000 to $6,000, the block flattened (`t7-marshmallow.js`) |
| RUN/STOP pauses; RUN/STOP and RESTORE return to the title (manual) | live | pause `frame_pause_key` `$70BA` in states `$12`-`$29` only; restart `nmi_restore_handler` `$6425` (`t1-status-pause.js`, `t5-f1f3.js`) |
| Keymaster and Gatekeeper reach Zuul at PK 9999, ending the game | differs | `st12_city_map` `$7BF8`, `map_zuul_meeting` `$7C2E`: from PK 5000 each is sent to Zuul when it passes a crossing next to it, from 9500 at once; the game ends when both stand on Zuul, at whatever PK: 8495 to 9999 in eight runs (`t6b-keymaster-spread.js`). 9999 is only the meter's cap |
| Loss: not more money than at the start, the bank forecloses | live | text at `$B12B`; end pages `$8C74`-`$8D7F`; only a balance below the starting one forecloses, an equal one goes on to Zuul (`t14-endings.js`) |
| "GO TO ZUUL! SNEAK PAST THE MARSHMALLOW MAN AND CLOSE THE PORTAL..." | live | text at `$B3B0`, message 9 at the meeting (`t14-endings.js`) |
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
| The decoded balance is not checked as decimal: ANDY with 777 shows YOU HAVE $?<0000; a blank name with 458 gives `$A00000`, shown $:00000 | live | `$9155`; `t11-account.js` |
| A blank name with 458 can never win: the starting balance `$A00000` is above anything the balance can reach again ($999,900 at most), so the meeting at Zuul always forecloses | live | `money_add` `$9664`, `map_zuul_meeting` `$7C2E`; the high-performance car leaves `$985000` (`t11-account.js`, `t12-458-end.js`) |
| Names with the same byte sum (anagrams) share every account; about one random number in 256 passes the check | confirmed | 8-bit check byte |
| PK energy stops at 9999; it rises 1 every 64 passes below 1000, every 32 below 2000, every 16 above; crossing a thousand at 5000 or more marks a random building | live | `$9895`; a Roamer taking 4950 to 5050 marked building 6 (`t3-roamer-zuul.js`) |
| The map speeds up with PK: Roamers and the two keepers move every 64th frame below 1000 and every other frame from 5000 | confirmed | `$3C` from `pk_rate_masks` `$9DBA`, `map_move_sprites` `$7C85` |
| A building about to be haunted already holds a Slimer before it turns red, and pays by the time since that stage began | live | stage bits `%11` accept `$xC`-`$xF` (`$8505`, `$9A8A`, `$87DF`); `t8-reward.js` |
| A Marshmallow building replaced by a newer pick stays marked for the rest of the game and never brings the Marshmallow Man | live | `bldg_next_stage` `$A9B4` sends stage 2 to `$F8` again (`t17-mm-orphan.js`) |
| Ten or eleven empty traps print as `:` and `;` in the status report | live (by poking) | `bcd_to_ascii` `$99B7` on the binary count `$6B` (`t15-traps10.js`); needs the wagon and at least $12,000 |
| The image intensifier puts the Slimer in front of the building; without it he passes behind the building's foreground colours | live | `slimer_update` `$9AA6`, `$D01B` bit 4 (`t16-intensifier.js`) |
| Money saturates at $999,900 and stops at 0 | live | BCD add `$9664`, subtract `$9636`; `t7-marshmallow.js` |
| `POKE 38454,96` makes the subtract routine return at once: purchases cost nothing | live | `$9636`; buying the hearse left $10,000; the Marshmallow Man's $4,000 is not taken either (`t20-poke-mm.js`) |
| The laser confinement system stores up to 10 ghosts instead of using a trap | live | `$6D` bit 6, `$87C9`; stored 0 to 1 and 9 to 10 with the traps untouched, at 10 a trap is used (`t18-laser.js`) |
| Each drive leaves two bytes on the stack: state `$14` reaches `next_state` by JSR, not JMP | live | `$8070`; the stack pointer went `$FF` to `$FD` and stayed |
| "YOU MADE MORE MONEY" is printed when the balance only equals the starting one | live | an equal balance opened the Zuul phase (`t14-endings.js`), whose endings all print it |
| A fifth speech phrase, phrase 0 (0.95 s, beginning like phrase 1), is stored but never played | confirmed | the game asks only for phrases 1-4 |
| The speech player has 2-bit sample decoders no phrase uses | confirmed | `$F267`-`$F2E3`, `$F3E2`; all four decoders hooked while every phrase played |
| A turbo tape loader, never run, is left at `$CE00`; its RESTORE handler fills memory with the JAM opcode `$02` | confirmed | `$CE00`-`$CED9`, `$CEC1`; a dead chain at `$CF80` calls it and `$0A00`, `$0E00`, likely the original tape's loading sequence (inference) |
| A shop item with a price ($600, item 4, sprite shape `$37`) is on no shelf, so it cannot be bought | confirmed | `item_price` `$A1DC` entry 4, `shelf_shapes` `$AAB3` |
| Dead code: `sprite_y_distance` `$9C76`, `set_balance_10000` `$9CF1`; three-NOP runs at `$90D1`, `$90DB` look like a patched-out call | confirmed | no reference, never executed |

## Open questions

- F1 and F3: the code accepts only these two keys to start (`$6399`); no
  player count is chosen anywhere (the title loop reads nothing else).
- `POKE 22014,9` ("unlimited lives") lands in the screen at `$5400`, which
  the start-up clears and nothing reads (agent 2, seven states, 900
  frames each): it does nothing in this image. `POKE 38454,96` is settled
  above.
- Which words each speech phrase says: not settled from the code, and the
  simulator's samples were not listened to.
