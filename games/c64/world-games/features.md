# World Games — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status. Every address names its part.

Sources:

- C64-Wiki, "World Games", https://www.c64-wiki.com/wiki/World_Games, read 30 October 2026: credits, the menu items, the eight events and their controls, players' tips under Cheats, the record table of the wiki's own players
- The Apple II manual, Epyx 1986 (part no. 19003D-60), scanned at https://archive.org/details/stx_EPYX_World_Games, OCR text read 30 October 2026: the menu options, each event's controls, scoring and strategy, the awards and champion ceremonies, the world records. It is another machine's manual: its keys (I, J, K, M and RETURN) are the Apple's, and its seventh option, sound on and off, is not on the C64's menu, which has the number of joysticks there instead
- The game's own screens and text, observed in VICE on 30 October 2026

Credits, from the title screen (title part): "Programmed by: K-Byte", Matt
Decker, Joe Simko, Chris Oesterling, Doug Dragin, Bob Maddwell, Jay
Braman, Jeff Webb, Brent DeGraaf and Steve Mage; "Graphics by" Michael
Kosaka, Jenny Martin, Suzie Greene and Courtney Granner. The C64-Wiki
gives Jeff Webb and Steve Mage as the musicians. Published by Epyx in 1986, and in
Europe by U.S. Gold.

## Features

| Feature | Status | Where |
|---|---|---|
| Title screen, fire to go on to the menu | live | title part, `$10B1`; seen 30 October 2026 |
| Menu: compete in all the events, in some, in one; practise one; number of joysticks; see the world records; travelogue on or off | live | menu part, `$1037`; the screen seen 30 October 2026 |
| Choice by joystick and fire, or by the option's number on the keyboard | live | menu part, `pick`, `$1AFC`: the 4 key chose practice, the A key weightlifting |
| Up to eight players enter their names and each chooses a country by its flag | live | menu part, `reg_name`, `$3C19`; `move_frame`, `$3DFF`: "#1 ENTER YOUR NAME" over the flags seen |
| Eighteen countries to represent, each with its anthem | live | menu part, `tune_list`, `$32C0`: eighteen anthems, one of them Epyx's; the S key played the anthem under the frame |
| A verification screen after the names, YES or NO | traced | menu part, `check_players`, `$1651`: "IS THIS CORRECT?" |
| Travelogue: before each event a page on the country and the sport, with a globe, an airliner and the event's picture | live | travelogue part, `event_page`, `$14AB` |
| Weightlifting (Russia): snatch and clean and jerk, three attempts at each, weight chosen left and right, the lift by down and up at the right moments | live | weightlifting part, `wl_round`, `$10F4`; `wl_choose_weight`, `$13B7`; `wl_script`, `$183D` |
| Weightlifting: three judges' lights, two white for a good lift; the timing gets harder as the weight rises | traced | weightlifting part, `wl_judges`, `$14ED`; `wl_vote`, `$1577`; `wl_timing`, `$1493`. The first judge's delay, `wl_divide` (`$1DF2`), was called live |
| Weightlifting: a lifter who holds the weight too long goes red and breaks through the platform (C64-Wiki) | traced | weightlifting part: the colour goes light red, orange, red, purple, blue every 64 frames (`wl_skin_colours`, `$1572`); at 255 frames script 5 or 6 plays (`$1546`). What each script shows was not watched |
| Weightlifting: above 225 kg the game counts on in 5 kg steps after each good lift (C64-Wiki, a player's report) | differs | weightlifting part, `$124F`, `$146C`: a good lift at 225 kg makes the next weight 230 kg, and from there right on the stick raises it 5 kg a push with no limit, since the stick stops only at exactly 225 kg. Past 225 kg the timing factor is read from code (live) |
| Weightlifting: the game crashes at 865 kg (C64-Wiki, a player's report) | live | weightlifting part, `wl_plates`, `$1985`; `wl_strip`, `$1C31`: at 865 kg the last plate's offset wraps to +127 and the column writer is entered at `$1C63`, the second byte of an `STA`, `$F2`, a code that halts the processor; in VICE the processor stopped there, and at 860 kg the plates were drawn |
| Barrel jumping (Germany): choose the number of barrels, skate by left and right in rhythm, fire jumps, down prepares for landing, three attempts | confirmed | barrel-jumping part, `bj_stride`, `$1A9D`; `bj_takeoff`, `$1105`; `bj_landing`, `$115D`; the event's screen seen |
| Cliff diving (Mexico): four heights, fire to dive, up arches the back, down straightens before the water, left avoids the bottom; wind shown by an arrow; the water rises and falls | differs | cliff-diving part: six levels, not four (`cd_choose_level`, `$1457`; `cd_level_score`, `$2879`); the rest is as documented (`cd_body`, `$20C6`; `cd_water`, `$1F65`; `cd_waves`, `$13D2`; `cd_wind_bars`, `$15E1`) |
| Slalom (France): left and right turn, fire held sharpens the turn and the speed; gates in alternating colours, five seconds for each one missed; a fall disqualifies | confirmed | slalom part, `sl_turn_frames`, `$8714`; `sl_gate_check`, `$F2E5`; `$C55E`; `$8755` |
| Slalom: a gate hit head-on wipes out | differs | slalom part, `sl_flag_hit`, `$F371`: head on, a fall only when the frame counter is below 100, 100 frames in 256; otherwise the flag bends. Live |
| Log rolling (Canada): two lumberjacks, left and right in rhythm, fire slows and reverses the log; balance meters; the last on the log wins, points from balance and time | confirmed | log-rolling part, `lr_step`, `$2183`; `lr_meters`, `$1CB2`; `lr_points`, `$33D0`. Fire reverses the way the lumberjack runs |
| Bull riding (USA): five bulls, Ferdinand, Elmer, Bob, Tornado and Earthquake; buck, spin and halt answered by the stick | confirmed | bull-riding part, `br_choose_bull`, `$190A`; `br_stick_left`, `$17A1`; `br_stick_right`, `$17C8` |
| Bull riding: an eight-second ride | differs | bull-riding part, `br_clock`, `$1C9F`: the clock counts 2 hundredths in 3 frames, so 8 on the clock is 1200 frames, 24 seconds on PAL. Live |
| Bull riding: in practice a second player controls the bull | traced | bull-riding part, `br_joystick_bull`, `$22E3`: the sixth bull, "JOYSTICK (PORT 1)" |
| Caber toss (Scotland): run by left and right in rhythm, fire held to plant, released to throw; the caber must turn over | confirmed | caber-toss part, `ct_hold_caber`, `$1A6B`; `ct_release`, `$1AD0`; `ct_landing`, `$22AC` |
| Sumo (Japan): moves without fire (forearm, push, slap) and with fire held (utchari, pull, grab, trips); stamina and balance; out of the ring or down loses | traced | sumo part, `su_standing`, `$2193`; `su_throw`, `$22F9`; `su_push`, `$2495`; `su_ring`, `$1F1F` |
| Two players at once in log rolling and sumo; otherwise in turns | traced | log-rolling part, `lr_draw_pairs`, `$3133`; sumo part, `su_choose`, `$1984` |
| Awards after each event: placings, medals, the winner's anthem | traced | menu part, `event_results`, `$17D4`; `award_medal`, `$15BE`; `ceremony`, `$184B` |
| Grand champion after all events: gold 5, silver 3, bronze 1 point | traced | menu part, `count_points`, `$157C` |
| World records saved to the disk, with the name and country | differs | shell part, `records`, `$0E00`: the name and the result, no country; saved by `save_records` (`$0A51`) after a new record, practice included |
| Bull riding: the bull's moves are fixed from the moment the ride starts (C64-Wiki, a player's report on VICE snapshots) | traced | bull-riding part, `br_random`, `$2351`: each move comes from the frame counter and the generator's own state; the generator is called only by the pennants, every third frame, and by the bull's choice of move, so nothing the rider does during the ride changes it, and a snapshot restored before a ride replays the same bull |

## Beyond the documentation

Found in the code, not in the manual.

- Two hidden credits screens, both opened by naming the first two
  players AUTHOR and OFTHEGAME: barrel jumping's "WRITTEN BY / MATT,JOE,
  & DOUG" (`$286A`) and bull riding's "WRITTEN BY / CHRIS PESTERLING"
  (`br_hidden_check`, `$2ED7`), the title's Chris Oesterling misspelt.
  Live.
- Epyx is one of the eighteen countries, with a flag and an anthem
  (menu, `move_frame`, `$3DFF`).
- The S key on the country screen plays an anthem without choosing it
  (menu). Live.
- The registration's template names a player NELSON S. before the name
  is typed over it (menu, `pick_country_text`, `$3CE9`).
- Slalom's final heat keeps whichever time wins a digit-by-digit
  comparison, which is not always the faster (slalom, `$F24D`). Live.
- Slalom writes the best time's colour into CIA 1 at `$DC47` instead of
  colour RAM at `$D847`; its timer runs to 10 minutes and restarts the
  run; a loop at `$F41C` would hang the game if the top colour cell of a
  flag being bent were already 1; a second bend of the flag is drawn
  and never played (slalom).
- Cliff diving's gull flies only for a score of exactly 101, which needs
  the highest level (cliff diving, `$1870`). Live.
- Caber toss's release always reads its upward speed from the byte at
  `$1DC7`, the opcode of an instruction, past the end of its table; its
  inches take a bit from a read of colour RAM's floating upper half
  (caber toss, `ct_release`, `$1AD0`; `ct_show_result`, `$2170`). Live.
- Log rolling's feet wrap round running backwards at full speed and all
  but stop (`lr_step`, `$2183`), and tune 6 is never heard (`$1FB9`).
  Live for the wrap.
- Weightlifting's plates halt the processor at 865 kg, and above 225 kg
  its timing factor comes from the code after its table (`$1985`,
  `$1C31`; `$1482`). Live.
- Weightlifting carries the text "Butch Badorsik (USA)", never printed
  (`wl_texts`, `$165C`), and picks one of the lifter's two collapses by
  comparing a random number with the letter C of "CURRENT WEIGHT" read
  as a number (`$1546`).
- Weightlifting's first judge always votes at once (`wl_divide`,
  `$1DF2`). Live.
- Sumo keeps a readout for the developers, never called (sumo,
  `su_debug`, `$2BC1`).
- Every copy of the music driver is tuned for an NTSC machine, so on a
  PAL machine the music is about 65 cents flat (each part's top
  octave).
- Bull riding's sixth bull is driven by the other joystick (bull
  riding, `br_joystick_bull`, `$22E3`).

## Open questions

- What weightlifting's two collapses, scripts 5 and 6, show on the
  screen. Searched: the scripts were read (`$1546`) and the choice
  between them run in VICE, but neither was watched; holding a lift for
  255 frames would show them.
