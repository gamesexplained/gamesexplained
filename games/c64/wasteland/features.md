# Wasteland — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources (every page read on 5 October 2026; the full notes, with a source
tag on every claim, are in `work/reports/web.md`, which stays in `work/`):

- Command Summary Card, "COMMODORE C64/128", EA part 139408: https://archive.org/details/vgmuseum_ea_wasteland-refcard (CC below)
- Manual, EA part 139205: https://archive.org/details/c64man_wasteland and https://archive.org/details/vgmuseum_ea_wasteland-manual (MAN)
- Paragraph book, EA part 139215: https://archive.org/details/vgmuseum_ea_wasteland-paragraphbook (PB)
- C64-Wiki: https://www.c64-wiki.com/wiki/Wasteland (revision 39540) (C64W)
- Wikipedia: https://en.wikipedia.org/wiki/Wasteland_(video_game) (revision 1374310615) (WP)
- Per Jorner, "The Nearly Ultimate Wasteland Guide" v1.2: https://archive.org/details/wasteland1walkt (NUWG); his C64 notes come from an emulator
- The Digital Antiquarian, "Wasteland", 26 February 2016: https://www.filfre.net/2016/02/wasteland/ (DA)
- Zzap!64 #41, September 1988, pp.56-57: https://archive.org/details/ZZap64Issue0411988Sep (ZZ)
- CSDb releases of the game, and the production notes of the 2026 EasyFlash conversion (CSDb 264233): https://csdb.dk/release/?id=264233 (CSDb)
- GameBase64 entry 8515: https://gb64.com/game.php?id=8515 and c64sets set 16: https://c64sets.com/set.html?id=16 (screenshots)
- Wasteland fandom wiki, through its API (FAN); much of it describes the PC version

The manual is shared by every version and names keys as `<ESC>` and
`<CONTROL>`; the card is the C64's own and wins where they differ.

## Features

### Boot, title, utilities and disks

| Feature | Status | Where |
|---|---|---|
| Boots with `LOAD "*",8,1` (a C128 boots itself) [CC] | live | `orientation.md`; side 1's PRODOS and 2.0 files |
| Title: picture, credits, "Start" and "Utils" on the bottom line, "Written by Alan Pavlish" [CC, GB64] | live | `reference/title.png`; startup part |
| Introductory story text on the title screen [C64S] | traced | the start-up's title sequence types "Place : EARTH", "Year  : 1998", "Status: DEFCON 1" over the picture, then messages 8-17 ("Computer defense initiative activated." to "...continues in the Wasteland!"), with a siren, falling whistles and 14 explosions; startup `$800E-$8130`, and run offline on the 6502 simulator |
| Utils menu: Copy and Restart [CC] | live | utils part; Copy used to make the play disks |
| Copy menu 1 2 3 4 Exit; each side copied once, with prompts [CC] | live | `work/copy.py` drove it for all four sides |
| Only disks made by Copy are accepted [CC] | live | masters are refused in play; see `orientation.md` |
| Always boot from the original side 1 [CC] | live | copies have no CBM directory |
| Restart: same characters, without items and cash, near the Ranger Center [CC, NUWG] | open | |
| "Use last saved game (Y/N)?"; Y loads the party saved on side 1, N searches every side for the last autosave [CC] | open | Y is live (`play-map`); N not tried |
| Prompts to insert a side, "Insert side 1. (RETURN)" [CC] | live | |

### Saving and the persistent world

| Feature | Status | Where |
|---|---|---|
| Every change to a map is written back to its disk; the world is persistent [CC, DA] | live | the map is written back on leaving it (load trace in `orientation.md`) |
| "Enter new location (Y/N)?" saves the location's changes and the party [CC] | open | |
| Save writes the party to side 1 after a confirmation [CC] | open | |
| Autosave on Radio, on entering a new area and after trading [NUWG] | open | |
| Only one saved game [CGW] | open | |

### Character creation (Ranger Center)

| Feature | Status | Where |
|---|---|---|
| Four pre-made Rangers: Hell Razor, Angela Deth, Thrasher, Snake Vargas [MAN] | live | `reference/` |
| Ranger Center menu Create, Delete, Start; at most four player characters [CC] | live | ranger part |
| Attributes rolled; Space rerolls, RETURN accepts [MAN] | open | |
| Attribute range 3-18 at creation; MAXCON 22-36 [FAN, NUWG] | open | |
| Name of up to 13 letters, upper case only on the C64 [MAN, NUWG] | open | |
| Sex and nationality choices (U.S., Russian, Mexican, Indian, Chinese) [MAN] | live | `work/shots/sex.png`, `nat.png` |
| Skills bought with points equal to IQ; keep the character Y/N [MAN] | live | `work/shots/skills1.png` |
| Starting gear: a pistol of random type, eight clips, rope, canteen, crowbar, knife, mirror, matches [FAN, NUWG] | open | |

### Attributes, skills, experience and rank

| Feature | Status | Where |
|---|---|---|
| Attributes ST, IQ, LK, SP, AGL, DEX, CHR; skill points, rank, MAXCON, cash, sex, nationality [MAN] | open | |
| Attributes used directly as actions (Strength to force a door) [MAN] | open | |
| 35 skills with a minimum IQ and a cost; cost doubles per level [MAN, FAN] | open | the skill names are packed text in the engine at `$29E4` |
| Skills improve with use [NUWG] | open | |
| At most 30 skills per character [NUWG] | open | |
| Library training of advanced skills [NUWG] | open | |
| Radio: every character evaluated for promotion; ranks every 1,000, 2,000, 3,000 … experience apart [MAN, NUWG] | live | radio part; `work/shots/radio.png` |
| Promotion: +2 MAXCON and 2 attribute points [MAN] | open | |
| Rank names, up to "Supreme Jerk" [NUWG, DA] | open | |

### Screen and display

| Feature | Status | Where |
|---|---|---|
| Picture or map window top left, text window right, roster below, menu bar at the bottom [CGW, screenshots] | live | `reference/` |
| Roster header "# NAME AC AMM MAX CON WEAPON" [C64W] | live | |
| Condition words UNC, SER, CRT, MRT, COM [MAN] | open | |
| Clock on screen [screenshots] | live | |
| Space hides the roster for a full-width map [CC] | live | Space in `play-map` set `$6A` from 0 to 1 and drew the roster over the bottom of the map window; game `$7F32` |
| Portraits with captions, limited animation, "nearly 100" [CMP, CGW] | open | 60 entries in the directory at T35/L10 (`orientation.md`) |
| The screen shakes when an explosion goes off (C64 only); routine at `$0746` writes `$D011` without masking bit 7 [NUWG, CSDb] | open | engine jump table entry `$044C` points at `$0746` |

### Movement, maps and time

| Feature | Status | Where |
|---|---|---|
| I, J, K, L move one square [CC] | live | north, west, south and east: from `play-map`, I took the party from 55,62 to 55,61, J from there to 54,61, L from 55,62 to 56,62, and K from 56,62 was refused ("...progress would be hazardous to your health."); handlers game `$AE19`, `$AE46`, `$AE84`, `$AE65` |
| Maps nest: world map, towns, buildings, levels [CC, MAN] | open | 42 maps in the directory at T35/L14 |
| Every map has 1,024 squares, each able to do something [DA] | open | |
| Squares hold messages, skill checks, loot and radiation [NUWG] | open | |
| Time per step depends on the map's scale; ← passes time [CC] | open | |
| A location announces itself on entry [C64W] | open | |
| Random encounters, "From the depths of the wasteland appears a hostile adversary." [C64W] | open | |
| Special events are 6502 code in the area records [CSDb] | open | |
| Helicopter flight and transit squares [NUWG] | open | |
| The world map changes during play (Base Cochise appears) [NUWG] | open | |

### Party

| Feature | Status | Where |
|---|---|---|
| Up to seven members: four characters and three NPCs [MAN] | open | |
| Order re-sequences the marching order [MAN] | live | order part; `work/shots/order.png` |
| Disband into up to four parties; View switches between them [MAN] | open | |
| Hire NPCs; NPCs may disobey [MAN, C64W] | open | |
| F1, F3, F5, F7 call Use for characters 1-4 [CC] | open | |
| Pool and Divide cash [CC] | open | |

### Encounters and combat

| Feature | Status | Where |
|---|---|---|
| Orders per character: Run, Use, Hire, Evade, Attack, Weapon, Load/unjam [CC] | open | |
| Groups announced, "3 Animals appear at 10 feet." [C64W] | open | |
| Results scroll; the cursor keys change the speed [CC] | open | |
| Single, Burst and Autofire for automatic weapons [MAN] | open | |
| At most four monster groups at once [NUWG] | open | |
| Melee attacks per round = 1 + Brawling / 2 [NUWG] | open | |
| Each point of AC removes one die of damage; AT weapons ignore armour [NUWG] | open | |
| Monster hit points rolled at 25-125 % of a seed [NUWG] | open | |
| Experience for kills, "Hell Razor gains 28 experience." [C64W] | open | |
| Gory kill descriptions [CGW] | open | |

### Items, shops and services

| Feature | Status | Where |
|---|---|---|
| 30 items per character [MAN] | open | |
| Reload, Unjam, Drop, Trade, unEquip [CC] | open | |
| Weapon damage dice and clip sizes [NUWG] | open | an eight-byte item record table at `$3100` (game part) |
| Shops, "Welcome to the shop. Who wants to enter?" [C64W] | open | |
| Selling pays 75 % or 50 % [NUWG] | open | |
| Shop stocks are bytes, most at 255 [NUWG] | open | |
| Hospitals, doctors, libraries [MAN] | open | |
| Loot bags fixed when first stepped on [NUWG] | open | |

### Injury and hazards

| Feature | Status | Where |
|---|---|---|
| CON below 1 is unconscious; SER worsens to CRT, MRT, COM and death unless treated [MAN] | open | |
| Diseases: radiation, Wasteland Herpes, Bug byte, Sewer rot, Desert dust, Rabies [NUWG] | open | |
| Radiation squares, desert heat without a canteen [NUWG] | open | |
| The game ends when every member is dead or worse than unconscious [NUWG] | live | death part; `work/shots/death.png` |

### Typed words and the paragraph book

| Feature | Status | Where |
|---|---|---|
| Free text typed for passwords and answers [C64W, NUWG] | open | |
| The game names numbered paragraphs to read in the book [PB] | open | |
| Documented words: Caterpillar, Acapulco, Motekim, "30", cretin, gang [C64W, NUWG] | open | |

### Ending

| Feature | Status | Where |
|---|---|---|
| Ending at Base Cochise: a one-hour countdown, one minute per four steps [NUWG] | open | |
| "Grim Reaper" and "Your life has ended in The Wasteland..." [boot overlay strings] | live | death screen |

### Sound and input

| Feature | Status | Where |
|---|---|---|
| Sound: sources disagree (none, per C64W, CU and ASM; some, per NUWG and FAN) | traced | the title has its own SID code (startup `$7E03-$7F29`: a two-voice siren, a falling whistle, noise explosions) and every typed title character clicks; in play the engine's player `$C993` has three sounds, an explosion with the screen shake, a click for the Geiger counter and for typed text, and one whose gate bit is clear, so it makes no sound |
| Joystick in port 2 [C64W, GB64]; the card lists keys only | open | the register census settles it |
| ← cancels any action [CC] | live | `work/drive.py` uses it |

## Beyond the documentation

Found in the code, not in the manual.

| Feature | Status | Where |
|---|---|---|
| Side 3 carries the boot files, a C128 boot sector named "A JERKVISION PRODUCTION" and a start-up of its own | live | booted on its own, side 3's 2.0 loads side 3's track 34, which holds something else where side 1 has the engine, and the first raster interrupt after the hand-over jumps into it and halts the processor on a `JAM` at `$2931`. Its start-up (T4/L16, entry `$7E06`) is an older build of side 1's: its credits read "Copyright 1986,87" where side 1's read "1986-88", and where side 1's calls its title sounds it calls three `RTS` stubs at `$7E03-$7E05`, so it has no sound; run over side 1's engine it draws a garbled title picture from side 3's track 3 and stops at "Computer defense initiative activated." (`reference/side-3-start-up.png`) |

## Open questions

- Does the C64 skill table keep a slot for Combat shooting, the PC's skill 0x11? [NUWG, FAN]
- The clip of the .45 pistol: 7 or 8 rounds? [MAN, NUWG, DA]
