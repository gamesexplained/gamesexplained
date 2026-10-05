# Wasteland — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources (every page read on 5 October 2026; each claim below carries its
source's tag):

- Command Summary Card, "COMMODORE C64/128", EA part 139408: https://archive.org/details/vgmuseum_ea_wasteland-refcard (CC below)
- Manual, EA part 139205: https://archive.org/details/c64man_wasteland and https://archive.org/details/vgmuseum_ea_wasteland-manual (MAN)
- Paragraph book, EA part 139215: https://archive.org/details/vgmuseum_ea_wasteland-paragraphbook (PB)
- C64-Wiki: https://www.c64-wiki.com/wiki/Wasteland (revision 39540) (C64W)
- Wikipedia: https://en.wikipedia.org/wiki/Wasteland_(video_game) (revision 1374310615) (WP)
- Per Jorner, "The Nearly Ultimate Wasteland Guide" v1.2: https://archive.org/details/wasteland1walkt (NUWG); his C64 notes come from an emulator
- The Digital Antiquarian, "Wasteland", 26 February 2016: https://www.filfre.net/2016/02/wasteland/ (DA)
- Zzap!64 #41, September 1988, pp.56-57: https://archive.org/details/ZZap64Issue0411988Sep (ZZ)
- Commodore User #59, August 1988, p.33: https://archive.org/details/commodore-user-magazine-59 (CU)
- Compute! #102, November 1988, p.78: https://archive.org/details/1988-11-compute-magazine (CMP)
- Computer Gaming World pages, written before the C64 release: https://archive.org/details/wasteland_cgw_archive (CGW)
- Aktueller Software Markt 9/88, as C64-Wiki reports its ratings (ASM)
- CSDb releases of the game, and the production notes of the 2026 EasyFlash conversion (CSDb 264233): https://csdb.dk/release/?id=264233 (CSDb)
- GameBase64 entry 8515: https://gb64.com/game.php?id=8515 (GB64) and c64sets set 16: https://c64sets.com/set.html?id=16 (C64S); "screenshots" means theirs
- Wasteland fandom wiki, through its API (FAN); much of it describes the PC version

The manual is shared by every version and names keys as `<ESC>` and
`<CONTROL>`; the card is the C64's own and wins where they differ.

## Features

### Boot, title, utilities and disks

| Feature | Status | Where |
|---|---|---|
| Boots with `LOAD "*",8,1` (a C128 boots itself) [CC] | live | `orientation.md`, "From power-on to play"; side 1's `PRODOS` and `2.0` files |
| Title: picture, credits, "Start" and "Utils" on the bottom line, "Written by Alan Pavlish" [CC, GB64] | live | `reference/title.png`; the bar is startup `$81AD`, and the title sequence (startup `$800E`) shows the credits as messages 1-4 |
| Introductory story text on the title screen [C64S] | live | `reference/title.png` holds one page of it. The title sequence (startup `$800E-$8130`) types "Place : EARTH", "Year  : 1998" and "Status: DEFCON 1" over the picture, then messages 8-17, with a siren, falling whistles and 14 explosions |
| Utils menu: Copy and Restart [CC] | live | `reference/utils.png`: "Copy Restart Start" (utils `$7E72`), handled by Copy `$7F16`, Restart `$80FE` and Start `$818A` |
| Copy menu 1 2 3 4 Exit; each side copied once, with prompts [CC] | live | `reference/copy-side-1.png`; the four play disks were made this way (`orientation.md`, "The play disks"). With one drive a side takes six read passes of up to 119 sectors and six write passes, each behind a disk prompt (utils `$83D1`, `$8334-$8449`) |
| Only disks made by Copy are accepted [CC] | live | the masters are refused in play (`orientation.md`): the side check (engine `$1897`) wants the identity byte `$00`, which Copy writes into each copy's T35/L8 (utils `$83ED-$83FD`) |
| Always boot from the original side 1 [CC] | confirmed | Copy writes 642 of a side's 683 sectors and never track 18 (utils `$8347-$8358`), so a copy has no CBM directory for `LOAD "*",8,1` to find; the copies made in the emulator hold zeros there. No copy was booted |
| Restart: same characters, without items and cash, near the Ranger Center [CC, NUWG] | traced | after a warning, every character loses items, weapon, armour and cash (utils `$8117-$8149`) and every party is put at column 62, row 62 of the world map (`$814B-$816E`); names, attributes, skills, rank and the clock stay. Not run |
| "Use last saved game (Y/N)?"; Y loads the party saved on side 1 [CC] | live | `reference/use-last-saved-game.png`; Y, then side 1, reached play (`orientation.md`, "From power-on to play") |
| N searches every side for the last autosave [CC] | traced | startup `$8228-$827C` reads each side's save in turn and loads the one whose game-time count (`$04-$06`, `$F4FD`) is largest, a tie going to the later side. Not tried |
| Prompts to insert a side, "Insert side 1. (RETURN)" [CC] | live | seen at Start (startup `$82B3`); in play the side check prints "INSERT SIDE n. (RETURN)" until the side is in: RETURN, space and back-arrow each lead to the check again, since it ignores the wait's carry, so there is no way out (engine `$1897`, `$18DE-$18E7`) |

### Saving and the persistent world

| Feature | Status | Where |
|---|---|---|
| Every change to a map is written back to its disk; the world is persistent [CC, DA] | live | the play copy of side 1 holds the world map as play left it (`orientation.md`, "The maps"); engine `$2856` writes a map back when the party leaves it, except a map entered by a number from `$80` up, which loads map 5 or 11 and is never written back (engine `$2603`) |
| "Enter new location (Y/N)?" saves the location's changes and the party [CC] | confirmed | `reference/enter-new-location.png`; Y enters the map (game `$8A36`), which writes the old map back (engine `$2856`) and ends by saving the party (engine `$2600`); N refuses the step (game `$8A60`). That holds for an exit to another map only: an asking exit within the same map, every shop, doctor and library door among them, writes nothing back and saves nothing (engine `$25BF-$25C1`), and a map held under a number of `$80` or more is never written back (engine `$2856-$2858`) |
| Save writes the party to side 1 after a confirmation [CC] | live | S and Y in play wrote T35/L7-L0 exactly as `save_game` forms them (`facts.md`, live tests); game `$8820` asks, waits for side 1 (`$882A`) and saves the party and the map (`$8833`) |
| Autosave on Radio, on entering a new area and after trading [NUWG] | traced | Radio saves before it loads (game `$880C`), every map change ends in a save (engine `$2600`), and a shop saves on the way out when anything was traded (module-1 `$CA85-$CA8A`), except for a party of one (`$CA98-$CA9C`); the doctor and the library never save |
| Only one saved game [CGW] | differs | each side keeps a save of its own at T35/L7-L0: Save writes side 1's (game `$882A`), a map change writes the side in the drive with no side check (engine `$18EA`), and Start loads side 1's on Y and the newest of the four on N (startup `$8228-$827C`) |

### Character creation (Ranger Center)

| Feature | Status | Where |
|---|---|---|
| Four pre-made Rangers: Hell Razor, Angela Deth, Thrasher, Snake Vargas [MAN] | live | `reference/ranger-center.png` |
| Ranger Center menu Create, Delete, Start; at most four player characters [CC] | live | `reference/ranger-center.png`; a fifth Create gives "You cannot create any more characters." (`reference/ranger-center-party-full.png`; ranger `$7F57-$7F85`) |
| Attributes rolled; Space rerolls, RETURN accepts [MAN] | live | in play Space rolled again, 32 attribute rolls were checked against the code, and RETURN kept the result (`facts.md`, live tests; `orientation.md`); ranger `$7FD8-$8025`, keys `$8032-$803F` |
| Attribute range 3-18 at creation; MAXCON 22-36 [FAN, NUWG] | differs | each attribute is 3-18, but MAXCON and CON are one more roll + 18, so 21-36, 21 coming from one throw in 7,776 (ranger `$7FE9-$7FF5`). The rolls are not the best three of five dice either (below, "Beyond the documentation") |
| Name of up to 13 letters, upper case only on the C64 [MAN, NUWG] | confirmed | ranger `$836C` sets the limit to 13, and the key table (engine `$C953`) has no shifted keys, so letters come only as capitals; the name KIT was typed in play |
| Sex and nationality choices (U.S., Russian, Mexican, Indian, Chinese) [MAN] | live | `reference/create-sex.png`, `reference/create-nationality.png`; ranger `$8064-$80A5` |
| Skills bought with points equal to IQ; keep the character Y/N [MAN] | live | `reference/create-skills.png` (12 points for IQ 12), `reference/create-skills-bought.png`; ranger `$80C0`, "Keep this char (Y/N) ?" at `$8193` |
| Starting gear: a pistol of random type, eight clips, rope, canteen, crowbar, knife, mirror, matches [FAN, NUWG] | live | KIT's record in play held the .45 with 7 rounds, eight .45 clips, rope, canteen, crowbar, knife, hand mirror and 40 matches (ranger `$8243`, `$8257`; the 9mm kit is `$824D`). The pistol is not equipped, so a new character fights with fists (`reference/ranger-center-new-member.png`) |

### Attributes, skills, experience and rank

| Feature | Status | Where |
|---|---|---|
| Attributes ST, IQ, LK, SP, AGL, DEX, CHR; skill points, rank, MAXCON, cash, sex, nationality [MAN] | confirmed | the character sheet (engine `$0FC5`) and its attribute block (engine `$10EE`, labels `$1152`), which the Ranger Center prints at creation (ranger `$801F`) |
| Attributes used directly as actions (Strength to force a door) [MAN] | traced | Use with an attribute tries it on the check square in a direction (game `$8BEF`): 15 + 5 × difficulty against 2d6 plus the attribute (engine `$0D0A`) |
| 35 skills with a minimum IQ and a cost; cost doubles per level [MAN, FAN] | confirmed | a byte a skill at ranger `$8502` and module-2 `$CC6C`, names in engine messages 1-35; the next level costs the base cost × 2 to the power of the level, at most 255 (ranger `$84C7`), and in play a purchase doubled the next level's price (`reference/create-skills-bought.png`) |
| Skills improve with use [NUWG] | traced | after a passed check of difficulty *d*, a skill the member has, below his rank and below *d*, rises one level on a d10 at or under (*d* − level) / 2 + 1 (engine `$0CA2`); an attack tries the weapon's skill (game `$AA35`) |
| At most 30 skills per character [NUWG] | traced | 30 skill pairs at `+$80-+$BB` (engine `$1392`); with all 30 taken a library says "Not even Einstein can learn anymore." and will not raise a known skill either (module-2 `$CA59-$CA7D`, `$CC1A`) |
| Library training of advanced skills [NUWG] | traced | module 2 runs eight libraries, on maps 7, 12, 13, 15, 21, 26, 36 and 38, each with its own list (module-2 `$CB5D-$CB66`); a known skill rises only while its level is below the rank (`$CAEE-$CAF2`) |
| Negative skill points: raising a skill that costs 192 or more can add points [NUWG] | traced | the library takes the price and tests the remainder with `BMI`, not the carry (module-2 `$CB03-$CB07`), so a price at least 129 above the points wraps them upward: +1 for a price of 255, +64 for 192. Creation cannot reach such prices (ranger `$8138-$813C`) |
| Hot desert squares give experience, even with a canteen [NUWG] | traced | the desert's checks try ST before the Canteen (map-00 `$4CD0`), and every attribute check adds its roll to the experience (engine `$0D0A`) |
| Radio: every character evaluated for promotion [MAN] | confirmed | `reference/radio.png` shows the question; the radio takes records 1 to `$0A` and passes over anyone not conscious (radio `$7F0B`), and in play it held 1,024, the rank-1 threshold, for Hell Razor (radio `$8019-$801B`) |
| Ranks every 1,000, 2,000, 3,000 … experience apart [NUWG] | differs | the threshold for rank *k* + 1 is 512 × *k* × (*k* + 1): 1,024, 3,072, 6,144 …, each gap 1,024 larger than the last (radio `$7F1B-$7F9E`) |
| Promotion: +2 MAXCON and 2 attribute points [MAN] | traced | MAXCON + 2 at once and 2 points to put on an attribute or MAXCON (radio `$7FF0-$7FFC`, `$801C-$80C1`), while CON stays; the check runs again, so one call can promote several times (`$7FFF`) |
| Rank names, up to "Supreme Jerk" [NUWG, DA] | traced | the table at radio `$81D8` names ranks 0-255; Supreme Jerk is rank 181 (NUWG's figure; DA gives 183), reached at 16,680,960 experience, the last rank the 24-bit threshold allows (radio `$7F46`, `$7F56`) |

### Screen and display

| Feature | Status | Where |
|---|---|---|
| Picture or map window top left, text window right, roster below, menu bar at the bottom [CGW, screenshots] | live | `reference/ranger-center.png`, `reference/world-map.png` |
| Roster header "# NAME AC AMM MAX CON WEAPON" [C64W] | live | `reference/ranger-center.png`; where C64W shows "#", the line holds the party number and the number of parties (engine `$15D5`) |
| Condition words UNC, SER, CRT, MRT, COM [MAN] | traced | engine `$1475`, `$148E`: UNC from −1 to −10, SER to −19, CRT to −29, MRT to −39, COM from −40 |
| Clock on screen [screenshots] | live | `reference/world-map.png`; it went from 1:24 to 1:36 over three idle turns (`facts.md`, live tests); game `$B143` |
| Space hides the roster for a full-width map [CC] | live | Space in play set `$6A` from 0 to 1 and drew the roster over the bottom of the map window (`facts.md`, live tests); game `$7F32` |
| Portraits with captions, limited animation, "nearly 100" [CMP, CGW] | differs | the picture directory at T35/L10 has 60 entries (engine `$2631`) and module 4 three more (module-4 `$CCE5`), 63 at most. Captions are live (`reference/ranger-center.png`, `reference/death.png`); a picture animates on up to four channels of frames (engine `$0586`), about seven steps a second on the title (`facts.md`, live tests) |
| The screen shakes when an explosion goes off (C64 only); routine at `$0746` writes `$D011` without masking bit 7 [NUWG, CSDb] | traced | engine `$0746`: sound 0, then twelve random fine-scroll jolts of `$D011` and `$D016`, each keeping its other bits as read, bit 7 of `$D011` included. Explosives call it (engine `$1469`), as do module 4 (module-4 `$CA4C`) and the map code of maps 3, 4, 9, 12, 18, 20, 27, 31, 33, 35, 36 and 39; not seen in play |

### Movement, maps and time

| Feature | Status | Where |
|---|---|---|
| I, J, K, L move one square [CC] | live | north, west, south and east: in play, I took the party from 55,62 to 55,61, J from there to 54,61, L from 55,62 to 56,62, and K from 56,62 was refused ("...progress would be hazardous to your health."); handlers game `$AE19`, `$AE46`, `$AE84`, `$AE65` |
| Maps nest: world map, towns, buildings, levels [CC, MAN] | traced | an exit names a map and a square and keeps the way back in the party's table (game `$89A3`, `$89BA-$89FD`); the world map's exit 20 leads to Las Vegas, map 12 (map-00 `$4E51`), whose doors lead to its houses, map 11 (engine `$2603`). No exit was taken in play |
| Every map has 1,024 squares, each able to do something [DA] | differs | the four maps 0, 12, 22 and 26 are 64 × 64, 4,096 squares (engine `$25D3`), and a square of class 0, 7, 13 or 14 does nothing (game `$ACF3`) |
| Squares hold messages, skill checks, loot and radiation [NUWG] | confirmed | 16 square classes, each with a handler (game `$ACF3`); a message square (map 1's gravestone), walls (map 33's poster) and a radiation square worked in play as the code says (`facts.md`, live tests) |
| Time per step depends on the map's scale; ← passes time [CC] | confirmed | each step adds the map record's `+$34` and `+$35`, a fraction of a minute and minutes (game `$AF32-$AF56`): 4 minutes on the world map, a quarter-minute on map 20; ← is a step in place (game `$AE21`). Four minutes a turn on the world map was seen in play (`facts.md`, live tests) |
| A location announces itself on entry [C64W] | confirmed | an exit shows its message (game `$8A6E`), "Entering Ranger Center." in `reference/enter-new-location.png`, and the arrival square's action runs at once (game `$8A34`, `$ACC1`), as with map 10's "You are in the desert north of the settlement of Highpool." (map-10 `$3AE6`) |
| Random encounters, "From the depths of the wasteland appears a hostile adversary." [C64W] | traced | after each step a 1-in-N roll, N from the map record's `+$2F`, fills a free class-15 slot (game `$B015`); the world map's slots (map-00 `$4F51`) show that sentence, its message 12 (map-00 `$5274`). An idle turn rolls too (game `$7E98`); none came in play |
| Special events are 6502 code in the area records [CSDb] | confirmed | an action square whose byte is below `$80` calls routine *n* of the code the map's record carries (game `$8845`, `$885C`), such as map 20's self-destruct (map-20 `$406B`) and map 4's sex swap (map-04 `$4206`); every map was loaded in the emulator with its code |
| Helicopter flight and transit squares [NUWG] | traced | map 42's helicopter needs Helicopter pilot twice (map-42 `$3B63`, `$3B70`), a failure wrecking it for good, and a question picks one of six destinations (map-42 `$3CC8`); a transit square is an exit a remote change puts under the party (map-00 `$4F35`), which runs at once (game `$ACC1`) and turns into a message square (map-00 `$4EBD`) |
| The world map changes during play (Base Cochise appears) [NUWG] | traced | the world map's remote changes 1 and 3 (map-00 `$4F21`, `$4F35`) turn column 2, row 3 into exit 33, the door of Base Cochise (map 16), and change 1 also opens 59,7 into map 7; after the blast module 4 changes the world map again (module-4 `$CBD3`) |

### Party

| Feature | Status | Where |
|---|---|---|
| Up to seven members: four characters and three NPCs [MAN] | confirmed | a party table has seven places (engine `$1759`); Hire refuses with seven records in use, "No room in roster." (game `$A3F1`), and the Ranger Center stops at four characters (`reference/ranger-center-party-full.png`) |
| Order re-sequences the marching order [MAN] | live | `reference/order.png`; order `$CA06` |
| Disband into up to four parties; View switches between them [MAN] | traced | Disband refuses a fifth party, "No more can disband." (game `$99EE`), View takes the next party with a conscious member (game `$9B8C`, `$9BBA`), and parties on one square merge (game `$9959`). With one party View passes time with no random-encounter roll (game `$9BAE`), NUWG's safe resting |
| Hire NPCs; NPCs may disobey [MAN, C64W] | traced | Hire needs a peaceful group with an NPC, room, and for most NPCs a roll on the hirer's CHR, IQ and rank (game `$A3F1`); a hired NPC may refuse a Use, "*name* disobeys you." (game `$8BEF`), or a trade (engine `$0F1F`, `$0D61`) |
| F1, F3, F5, F7 call Use for characters 1-4 [CC] | traced | the main loop compares each key with members 1-4's function keys (engine `$5BA3`; game `$7EBA-$7ECF`) and calls Use for that member (game `$8AA2`); members 5-7 have none |
| Pool and Divide cash [CC] | traced | Pool moves every other member's cash to one member (engine `$157E`); D on the character screen shares one member's cash among the party, the remainder to the giver (engine `$0E2A`, `$0E63`) |
| Dan Citrine in the first party place nullifies many hazards [NUWG] | traced | his record (map-06 `$44A0`) holds skill 37 at level 255, a marker outside the 35 skills, and 105 check pairs on 31 maps name skill 37. At difficulty 0 (22 pairs) knowing it passes (game `$8E9F-$8EAE`); at 1 or more (83) skill_check runs (game `$8EB4`), which his level passes unless the open 2d6 roll is under 5, 4 rolls in 36 (engine `$0C70-$0C75`); and 18 pairs are on squares whose flag bit 6 is clear, where nothing tests them (game `$8E33-$8E39`). Where the first member decides (game `$8E14`), a party he leads passes all but those rolls. Map 27's wrong launch code (difficulty 1) costs every member of a party without him in first place 20d6 CON, less a roll of the member's AC in d6, and his own party the same when his roll fails (map-27 `$3C9F`; its flags `$D0`: bit 4, the effect on everybody, and bit 0 clear, the armour roll, game `$90AF-$90B4`) |

### Encounters and combat

| Feature | Status | Where |
|---|---|---|
| Orders per character: Run, Use, Hire, Evade, Attack, Weapon, Load/unjam [CC] | confirmed | the prompt (game `$B40A`) lists those seven, as in `reference/web/c64wiki-combat-menu.png`, and Attack each round won the fight on map 1 (`facts.md`, live tests); it also takes space, to look at the map, and S, an attack chosen from a list, which it does not show (game `$B4AB`, `$B4BD`), for a player character; an NPC chooses its line itself (game `$B50B`) |
| Groups announced, "3 Animals appear at 10 feet." [C64W] | live | "3 Shambler Ghouls appear at 14 feet." on map 1 (`facts.md`, live tests); game `$BA8F`. An unidentified group is named by its kind: Animal, Mutant, Humanoid, Cyborg or Robot (game `$9E5D`) |
| Results scroll; the cursor keys change the speed [CC] | traced | combat turns on the slow scroll (game `$914D`), in which CRSR down and CRSR right step the speed down and up, 0-6 (engine `$253A`); C= gives the same code as CRSR right (engine `$C953`) |
| Single, Burst and Autofire for automatic weapons [MAN] | traced | classes 5-7 and 10-12 offer them (game `$AC04`), Burst with 3 rounds or more and Auto with 4 or more (game `$B5B8`); a burst makes 1 to 3 hits for 3 rounds, and Auto a d4 of hits for every four rounds left, using them all (game `$A0A7`, `$A98C`) |
| At most four monster groups at once [NUWG] | traced | each party has room for four groups (game `$BBC7`) and four encounter positions (engine `$5B4F`), so the four are per party |
| Melee attacks per round = 1 + Brawling / 2 [NUWG] | traced | game `$8057`: a member strikes 1 + Brawling / 2 times, whatever the weapon |
| Each point of AC removes one die of damage [NUWG] | confirmed | a member's AC is rolled in d6 and taken off the damage (game `$A8BB-$A8C5`), and a monster's armour dice likewise (game `$A735`, `$A9AD`); radiation counts armour only on a square whose message number is even (game `$90AF-$90B4`): with AC 30, the world map's square at 55,38 (message 23, 5d6) cost the members 22, 23, 16 and 14 CON as stored, and nothing with its message poked to 22 (`facts.md`, live tests) |
| AT weapons ignore armour [NUWG] | traced | classes 8 and 9 skip the armour roll (game `$A677`, `$A9C0`), and against armour of no more dice than their own they roll 2 × their dice less the armour's (game `$A81E-$A835`) |
| Monster hit points rolled at 25-125 % of a seed [NUWG] | traced | a quarter of the seed plus 1 to the seed (game `$9483-$94B9`); above 255 each byte of the seed is rolled on its own, so the few large seeds give a narrower, higher range |
| Experience for kills, "Hell Razor gains 28 experience." [C64W] | live | on map 1 three kills worth 40 each raised each killer's experience from 0 to 80 (`facts.md`, live tests; game `$8163`, `$8166`; the doubling is below). "*name* gains *n* experience." comes at the end of the fight (game `$B320`, messages 39 and 40), as in `reference/web/c64wiki-combat-result-experience.png`; none was printed at the kill |
| An unloaded gun is used as a club [NUWG] | differs | an empty or jammed gun is swung for 1d6 (classes 2 and 10, the pistols and the laser pistol) or 2d6, plus its class number, so a .45 swings for 1d6 + 2 (game `$A7F4-$A839`); NUWG gives dice of 2 to 7 |
| Gory kill descriptions [CGW] | traced | a kill that leaves a monster's HP below −14 prints one of the map's own messages (record `+$5A`, `+$5B`) in place of " killing it" (game `$ABE1`, `$ABF1`) |

### Items, shops and services

| Feature | Status | Where |
|---|---|---|
| 30 items per character [MAN] | traced | 30 item and count pairs at `+$BD-+$F8` (engine `$14F8`, `$124A`); with all 30 full a shop says "Your inventory is full." (module-1 `$CBAE`) and a trade "can't carry any more" (engine `$0F1F`) |
| Reload, Unjam, Drop, Trade, unEquip [CC] | traced | the item menu (engine `$0EA6`) offers Reload only for the equipped weapon's clip and Unjam only for a jammed weapon; a reload throws away the rounds left (engine `$1281`), and unEquip makes any item but armour the weapon, a canteen included (engine `$10A2`) |
| Weapon damage dice and clip sizes [NUWG] | confirmed | eight-byte item records from game `$3108`, byte 4 the clip and byte 6 the dice, agree with NUWG's table for every weapon it lists (the .45 at game `$3170`: 4 dice, 7 rounds); the roster shows AMM 7 for the .45 and 18 for the VP91Z (`reference/ranger-center.png`) |
| Shops, "Welcome to the shop. Who wants to enter?" [C64W] | traced | module 1 runs seven shops, on maps 1, 8, 9, 10, 21 (two) and 32; "Welcome to the shop." is map 10's greeting (map-10 `$3F6F`), and a party of one is not asked "Who wants to enter?" (module-1 `$CA63-$CA67`); `reference/web/c64wiki-shop.png` |
| Selling pays 75 % or 50 % [NUWG] | traced | the sell price is the price less the price shifted right by the shop's byte 4 (module-1 `$CCC7-$CCF7`): 75 % in the shops of maps 8, 9 and 10, 50 % in those of maps 1, 21 and 32; every shop sells at full price |
| Shop stocks are bytes, most at 255 [NUWG] | traced | byte 2 of an item's record; every item a shop can stock is at 0 or 255 but the LAW rocket (20) and the Howitzer shell (2) of item table 4. A purchase lowers 255 to 254 with no floor test, and a sale stops at 255 (module-1 `$CC12-$CC19`, `$CB2C-$CB37`) |
| Shop duplication: sell, then reset before leaving, and the shop keeps the items [NUWG] | traced | the item table is written back when the list is left after a trade (module-1 `$CB51-$CB56`, `$CC38-$CC3D`), except after a purchase that sells out the stock (module-1 `$CBD3`, `$CBBA`), and the party only when the shop is left (`$CA85-$CA8A`) |
| Hospitals, doctors, libraries [MAN] | traced | module 0 is the doctor, at seven places on maps 1, 10, 12, 13, 21, 26 and 38; module 2 is the library, at eight on maps 7, 12, 13, 15, 21, 26, 36 and 38 (both run from game `$8845`) |
| Loot bags fixed when first stepped on [NUWG] | traced | game `$9194`: the first opening turns each class entry into a random item of that class (an entry naming a class no item has is emptied, `$91CF`) and rolls the cash and counts, in the map's record, which goes back to disk with the map |

### Injury and hazards

| Feature | Status | Where |
|---|---|---|
| CON below 1 is unconscious; SER worsens to CRT, MRT, COM and death unless treated [MAN] | traced | a blow that brings CON to 0 leaves it at −1, and one below −49 at 0, dead (game `$A85B`); each health tick (every 16 counts of game time and every combat round, game `$B795`) gives UNC a point back and takes one from SER and worse, until death below −50 (game `$B83C`, `$B842`) |
| Diseases: radiation, Wasteland Herpes, Bug byte, Sewer rot, Desert dust, Rabies [NUWG] | traced | module 0 names them for bits 0-5 of `+$28`, with "D6" and "D7" for bits 6 and 7 (module-0 `$CCC2-$CCFC`); any of them stops natural healing (game `$B854`), and bits 4-7, Desert dust and Rabies among them, also cost CON over time (game `$B816`), as NUWG says |
| Radiation squares [NUWG] | live | on the world map's square at 55,38 the members lost 22, 23, 16 and 14 CON (`facts.md`, live tests); each member not wearing the Rad suit takes the record's dice in d6 (game `$82E0`, `$82F1`), less its AC rolled in d6 where the square's message number is even (game `$90AF-$90B4`, `$A8B2-$A8C5`) |
| Radioactive squares show a trefoil at night, 18:00 to 06:00 [NUWG] | live | the world map's radiation squares showed the sign at 5:00 and 18:00 and plain ground at 6:00, 12:00 and 17:00 (`facts.md`, live tests): a class 9 square is drawn as tile 8 from 18:00 to 05:59 only (engine `$0B80-$0B8A`), so by day nothing marks it |
| Desert heat without a canteen [NUWG] | traced | 1,346 world-map squares, nearly all red ground, run map-00 `$5072`, which sets a ST check of difficulty 1, 2 or 4; carrying a Canteen passes it at the cost of a charge, and failure costs 2d6, 4d6 or 6d6 CON by day and half as many dice at night (map-00 `$4CD0-$4D29`) |
| The game ends when every member is dead or worse than unconscious [NUWG] | live | `reference/death.png`; game `$7ED5-$7F09`: the game goes on while any character is conscious, or UNC with no disease, so an unconscious character with a disease counts as lost |

### Typed words and the paragraph book

| Feature | Status | Where |
|---|---|---|
| Free text typed for passwords and answers [C64W, NUWG] | traced | a question square takes a line of up to 16 characters and compares it with each answer in the map's text (game `$88E3`); capitals only, as the key table has no shifted keys (engine `$C953`) |
| The game names numbered paragraphs to read in the book [PB] | traced | the maps' texts name more than 80 of the book's 162 paragraphs, as map 2's message 105, "Read paragraph 23."; map 15 joins "Read paragraph" to a number held in another message (map-15 `$3A7A`) |
| Documented words: Caterpillar, Acapulco, Motekim, "30", cretin, gang [C64W, NUWG] | traced | each is an answer of a question square: CATERPILLAR map-08 `$3D4C`, ACAPULCO map-32 `$3F62`, MOTEKIM map-27 `$3CD5`, "30" map-27 `$3CB5`, CRETIN map-21 `$3D45`, GANG map-02 `$3E5E`. Map 10's answer BOBBY'S DOG cannot be typed, since the apostrophe needs SHIFT (map-10 `$3F9E`) |
| False passwords cause effects from a change of sex to a bomb [WP, FAN] | traced | AZRAEL and MORS swap every character's sex (map-04 `$4206`); MORTAR and ATOM set off map 27's blast (map-27 `$3C9F`); PHOENIX and CLOVER give every character Wasteland Herpes (map-39 `$3C58`) |

### Ending

| Feature | Status | Where |
|---|---|---|
| Ending at Base Cochise: a one-hour countdown, one minute per four steps [NUWG] | traced | map 20's terminal starts it (map-20 `$406B`), and when the elapsed count is 240 past the start the main loop writes the map back and runs module 4 (game `$82B5`); on map 20 a step is one count, a quarter-minute, so its clock starts at 1:00 (map-20 `$408B`) |
| "Grim Reaper" and "Your life has ended in The Wasteland..." [boot overlay strings] | live | `reference/death.png`; death `$7E06` |
| After Base Cochise a Radio call gives 10 character points and 10 MAXCON [NUWG] | traced | once for each character conscious at the call: the Ranger Center's congratulations, MAXCON + 10 and 10 points to spend (radio `$7EBC-$7EFD`), for every record module 4 marked (module-4 `$CA03-$CA1C`) |

### Sound and input

| Feature | Status | Where |
|---|---|---|
| Sound: sources disagree (none, per C64W, CU and ASM; some, per NUWG and FAN) | traced | the title has its own SID code (startup `$7E03-$7F29`: a two-voice siren, a falling whistle, noise explosions) and clicks as it types. In play the engine's player (engine `$C993`) has an explosion with the screen shake, a click on every step (game `$AE26`) and for the Geiger counter, and a third sound whose gate bit is clear, so it makes no sound; the radio has a fanfare of its own (radio `$7E06`), and the utilities make none |
| Joystick in port 2 [C64W, GB64]; the card lists keys only | differs | the game reads no joystick. Every operand in the 64 parts' listings that names CIA 1's ports belongs to the keyboard scan (engine `$2967-$2995`), which drives port A and reads port B, and nothing reads port A, where a port-2 joystick sits. In play a stick held on port 2 in each direction and on fire left the party where it was, and nothing read port A while it was held (*live*, `facts.md`, "Live tests"). A stick on port 1 shares port B with the keyboard and types keys: up brought up the first member's character sheet and fire turned it to the items page (*live*) |
| ← cancels any action [CC] | differs | ← backs out of the prompts tried in play, but not out of item or skill reordering (engine `$1005`, `$13B7`), a disk prompt (engine `$18DE`), Order after the first pick (order `$CA65`) or the radio's points (radio `$805E`); on the map it is a step in place (game `$AE21`) |

## Beyond the documentation

Found in the code and in play; no source above mentions them.

| Feature | Status | Where |
|---|---|---|
| Side 3 carries the boot files, a C128 boot sector named "A JERKVISION PRODUCTION" and a start-up of its own | live | booted on its own, side 3 halts on a `JAM` at `$2931` at the first raster interrupt, since its track 34 holds something else where side 1 has the engine. Its start-up (T4/L16) is an older build of side 1's, "Copyright 1986,87" against "1986-88", whose title sounds are three `RTS` stubs (`$7E03-$7E05`); run over side 1's engine it stops at "Computer defense initiative activated." (`reference/side-3-start-up.png`) |
| Walking into a poster wall on map 33 shows the game's credits, between three joke posters | live | the party walked south into the wall five times and got messages 91, 92, 93, 94 and 91 in turn, with the clock unmoved (`facts.md`, live tests): four wall records each change into the next (map-33 `$3FA7-$3FB2`), and message 92 is the credits poster |
| Map 1's graveyard has a gravestone for Ken St. Andre, one of the designers | live | stepping north onto column 27, row 24 printed "The gravestone is inscribed: Ken St. Andre, 4/28/47--4/28/87." (`facts.md`, live tests; map-01 `$3AA4`) |
| Armour stops a radiation square's damage only when the square's message number is even | live | game `$82E7` sets "ignore armour", but the damage routine replaces it with bit 0 of the record's byte 0, a radiation square's message number (game `$90AF-$90B4`); on message 23 the armour roll was skipped and the members lost CON, and with the byte poked to 22 they lost none (`facts.md`, live tests) |
| Attribute rolls average 10.6, not the best three of five dice | live | five dice are thrown and sorted, but the sort loses dice (the `BPL` at ranger `$83AB` in `$8382-$83C0`), so 1 2 3 4 5 gives 7 where the best three give 12; 21 of 32 rolls in play came out below the best three (`facts.md`, live tests) |
| A wall on map 11 always says "Ah! Fresh air and open spaces once again." | live | the square at column 24, row 13 is class 2 number 2, whose list word is 0, so its record is read from address 0 (engine `$09B8`); walked into three times, it printed message 53 and moved nothing (`facts.md`, live tests). Map 11 is the houses behind Las Vegas's doors (engine `$2603`), so this may be the "buggy wall square" NUWG reports there |
| With no key pressed, a turn passes about every 17 seconds | live | every 16,384 passes of the main loop the party steps in place and rolls for a random encounter (game `$7E87-$7E9E`); 3,000 frames with no key brought three such turns, four game minutes each on the world map (`facts.md`, live tests) |
| Close-combat kills give double experience | live | game `$8163` and `$8166` both add the kill's experience, where the other kill paths add it once (game `$A08A`, `$A719`); on map 1, three melee kills worth 40 each left each killer with 80 (`facts.md`, live tests) |
| A Throwing knife thrown with LK 3 or 4 kills whatever it hits when both its dice show 1 | live | the luck bonus (−3) is added to a shot's roll with plain `ADC`s (game `$A7EA-$A7F0`), so 2 − 3 comes back as 65,535, more than any monster's hit points; with the roll set to 2 at game `$A7E7`, Hell Razor's knife hit a Shambler Ghoul "for 65532 points of damage spinning it into a dance of death." (`facts.md`, live tests; `reference/unlucky-throw.png`). Melee adds the bonus through engine `$07C6`, which stops at 0 |
| Five of the people the credits name turn up in the maps | confirmed | Ken St. Andre's gravestone (map 1), a wanted poster for Nishan Hossepian (map 13), a sign for Bill Dugan (map 33), Dugan and Chris Christensen chalked on a wall (map 34), and a plaque, STANCE THE GREAT MAP MAKER (map 38): the squares come from each map's records, found by decoding all 4,920 messages (`facts.md`, "Build") |
| Ace drives the party to Needles in a jeep | traced | with Ace in the party the broken jeep at 29,41 is fixed (map-00 `$4C82`, skill 38, Ace's marker); the party is then drawn as the jeep (map-00 `$4FCD` swaps tiles 7 and 86) and drives itself along a chain of one-square exits (map-00 `$4EDD`) into exit 21, Needles (map 34) |
| Base Cochise's countdown is counted in game time, not steps | traced | the countdown is 240 counts of the elapsed count (game `$82B5`): one a step on map 20, so 240 steps there, but 16 a step on the world map, and every combat round adds a step's worth (game `$B393`), as does each V)iew that comes round to its first party (game `$9BAE`). Module 4 then runs wherever the party is and kills only parties still on maps 16-20 (module-4 `$CA69`) |
| A cash check passes a member with less than the amount | traced | one with that much or more fails at once, the later pairs untried (game `$8E73-$8E83`); 26 of the maps' 30 cash checks are payments written around it, the failure's effect taking the money (map 2's bar, map-02 `$3CA2`), but map 23's blade trap cuts a member who fails AGL only when he carries $16 or more, and its Acrobat pair is never tried (map-23 `$3CAD`) |

## Open questions

- Does the C64 skill table keep a slot for Combat shooting, the PC's skill 0x11? [NUWG, FAN] Yes. Skill 17 is Combat shooting (engine message 17), and both skill tables keep its byte, `$FF`: minimum IQ 31 and base cost 7 (ranger `$8513`, module-2 `$CC7D`). A rolled IQ is at most 18 and no library lists skill 17, so no character can learn it.
- The clip of the .45 pistol: 7 or 8 rounds? [MAN, NUWG, DA] Seven. Byte 4 of item 13's record is 7 (game `$3174`); a new character's pistol comes with 7 (ranger `$81AC-$81CE`), a shop sells it with 7 (module-1 `$CBFD-$CC0A`), a reload fills it to 7 (engine `$1281`), and the roster shows AMM 7 for the .45 (`reference/ranger-center.png`). NUWG and DA give 7; MAN's 8 differs.
