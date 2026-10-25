# Pool of Radiance — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, "Pool of Radiance", https://www.c64-wiki.com/wiki/Pool_of_Radiance, read 25 October 2026
- SSI, *Pool of Radiance* rule book (1988), the scan's text at https://archive.org/details/Pool_of_Radiance_Rulebook, read 25 October 2026
- SSI, *Adventurer's Journal* (1988), the scan's text at https://archive.org/details/Pool_of_Radiance_Adventurers_Journal, read 25 October 2026
- SSI, Commodore 64/128 Quick Start Card (1988), https://archive.org/details/Pool_of_Radiance_1988_SSI_Quick_Reference_Card, read 25 October 2026
- The game's own screens in VICE, from the v1.0 disks (`orientation.md`)

## Features

| Feature | Status | Where |
|---|---|---|
| Boot asks "DISABLE FASTLOADER (Y/N)"; N uses the game's own fast loader | live | BOOT line 30000; FAST1.O at `$B700` |
| Title picture with music, any key passes it, then the credits | live | title part |
| Code word from the translation wheel: two runes and a path, type the word read along the path | live | title part (INIT) |
| Two wrong code words and the game stops | live | title part (wrong_word, `$12DF`): after a first wrong word a new rune and path are shown; the second prints WRONG !!! and the machine stays at `$12F4`, a jump to itself (25 October 2026) |
| Party Creation Menu: create, drop, modify, train, view, add, remove, load saved game, save, begin adventuring | live | gen part |
| Create a character: race (6), gender, rolled ability scores (reroll or keep), class, alignment, name (15 letters) | live | gen part, create_character (`$0900`): the race menu offers DWARF, ELF, GNOME, HALF-ELF, HALFLING and HUMAN; a new human thief showed THACO 21, AC 10 and the alignments class_alignments (`$0EE3`) allows; ability_adjust raised a male human's STR and CON by one |
| Portrait chosen from heads and bodies; combat icon chosen (weapon, head, colours, size) | live | gen part, choose_portrait (`$12B6`): 14 heads and 12 bodies (portrait_heads, portrait_bodies); the icon editor is the icons part (ICON: PARTS COLOR SIZE EXIT), reached from creation and from the camp's ALTER, ICON |
| Modify a new character's ability scores and hit points | traced | gen part, modify_choice (`$1ADE`): first-level characters only (1ST LEVEL ONLY otherwise); modify_stats (`$143F`) edits the six scores with LEFT- and RIGHT+ |
| Training raises a level when the experience is there and the gold paid; Phlan's hall trains to fighter 8, thief 9, cleric and magic-user 6 | traced | gen part: can_train (`$1BBC`) raises one level at a time whatever the experience, for the classes the hall's byte `$6DA8` names, within class_max_level (`$1E5C`: magic-user 6, cleric 6, thief 9, fighter 8) and the race's limit; pay_training (`$1D63`) takes 1000 gold and gives the rest back as platinum, losing change under five gold |
| Pre-rolled party stored as a saved game on side 1 | live | `SAVEDGAME0`, `SAVEDGAME1` on side 1 |
| Up to 6 player characters and 2 NPCs; NPCs have morale and may flee or betray | traced | eight party slots (camp part, order_command's slots 0-7; combat part, quick_off from slot 7 down); an NPC is `$6BB8` bit 7: it stays under the computer's control and flees when hurt enough (combat part, morale `$20C1`, hurt_check `$211C`). Attacking an ally turns every NPC on the party's side against it (confirm_ally, `$0F08`). Betrayal outside combat is the scripts' and was not searched |
| Adventure Menu: move, view, cast, area, encamp, search, look | live | dungeon part |
| 3D view in town and underground; I/J/K/M or the joystick move and turn; each step is one minute, ten with Search on | live | dungeon part, view part |
| Area command: an overhead map of the block, not always available | traced | dungeon part: area_command (`$0CFD`) draws 11 by 11 of the block's 16 by 16 squares round the party (draw_area_map, `$1266`); show_menu_bar (`$09B5`) leaves AREA out when the area forbids it (`$49FB`) |
| Blocks of 16 by 16 squares, entered through low corridors, stairs and caves | traced | view part, square_index (`$C29D`): row times 16 plus column; each GEO map is four pages of 256 bytes, the walls, the squares' bytes and the doors (wall_at `$C39A`, door_state in the dungeon part `$1143`). The way between blocks is in the scripts (dungeon part, cmd_load_files `$2041`, cmd_new_ecl `$2011`) |
| Wilderness travel in eight directions, half a day a square | traced | dungeon part, overland_move (`$0ABA`): keys 1 to 8 or the joystick, and add_half_day (`$1241`) puts twelve hours on the clock for each move |
| Search mode: slower, more wandering monsters, finds secret doors and traps | traced | dungeon part: SEARCH toggles the flag `$6DCA` (DUNGEON2 `$7A91`), and a step then takes 10 minutes instead of 1 (step_minutes, `$08EA`). What it finds and how often monsters come are decided by the scripts, which read the flag; they were not decoded |
| Look: treat the square as searched | traced | dungeon part, look_command (`$111F`): Search on for the moment, LOOKING ..., ten minutes on the clock, the square's script run, then the flag as it was |
| The clock: the longer a mission takes, the harder it becomes | open | no module routine was found that reads the date or the days gone by except POST.COM's ageing (`$1E3F`, `$210F`); the scripts were not decoded, and the rule may be theirs |
| New Phlan's places: city council, docks, inns, taverns, training hall, shops, temples | live | Rolf's tour of the main street names them; the scripts ECL00 (New Phlan) and ECL08 (the city hall) hold their texts; the shops and temples run in the post-com part and training in the gen part |
| Shop Menu: buy, view, take, pool, share, appraise, exit; sold items vanish from the shop; ID costs money | traced | post-com part: postcom_menu (`$0A2F`) with menu_mask (`$16FB`) for a shop (`$6E6C`); sell (`$19AA`) removes the item and pays in platinum and gold; identify (`$1D82`) costs 200 gold pieces |
| Temple Menu: heal spells for a price | traced | post-com part, heal (`$209C`): the temple's own code and prices are in the file SQRPACI64, loaded at `$0400`, which no part holds: from 100 gold (cure light wounds) to 5500 (raise dead) |
| Encamp Menu: save, view, magic, rest, alter, exit | live | camp part |
| Rest: each 24 uninterrupted hours heals 1 HP; memorising takes at least 4 hours, 6 for third level; rest can be interrupted | traced | camp part: daily_heal (`$1FB6`) gives every member 1 hit point each 24 hours of rest, counted from arrival in camp, so two rests on one visit add up; rest_hours_by_level (`$1A83`) 4 hours before spells of levels 1-2, 6 before 3-4, then 15 minutes per spell level; the interruption roll at `$1E0F` |
| Alter: order (first four are the front rank), drop, speed (slower, faster), icon, pics (characters on/off, monsters on/off) | traced | camp part: alter_command (`$08E9`) and its five routines; the front rank is not in this module |
| Encounter Menu: combat, wait, flee, advance or parlay | live | dungeon part |
| Surprise: a free round for whichever side surprises the other | traced | combat part, surprise_round (`$15D9`): in the first round the surprised side loses 6 from each combatant's initiative |
| Parlay attitudes: haughty, sly, meek, nice, abusive | traced | dungeon part, cmd_parlay (`$2427`): PICK SPEAKER, the speaker's charisma figure, then PARLAY: HAUGHTY SLY NICE MEEK ABUSIVE; what each attitude brings is set by the script's operands |
| Combat Menu: move, view, aim, use, cast, turn, quick, done | live | combat part |
| To hit: a d20 roll at least THAC0 minus the target's AC | traced | combat part, hit_roll (`$1272`): the d20 plus 60 less THAC0 plus the side's bonus must reach 60 less the AC; a 1 always misses and a 20 always hits |
| First two attackers strike the front, later ones the rear, where AC is worse; a thief opposite the first attacker backstabs | traced | combat part, target_ac (`$12B1`): the rear AC (`$6C10`) counts for a backstab, for a swing at a combatant moving away, and once the target has been attacked twice since its turn from directions at least five apart, by an attack from where it does not face; backstab_check in the combat-set part (`$0680`) gives a thief the multiplier from behind the first attacker |
| Missile weapons need no adjacent enemy and a line of sight; bows attack twice a round | traced | combat part: aim (`$0F36`) lists the targets seen within the weapon's range, lines clear both ways; attacks_per_2 (`$1324`) takes a missile weapon's own count of attacks in two rounds |
| Moving away from an adjacent enemy gives it a free attack | traced | combat part, free_swings (`$1491`): every enemy within 2 squares that the mover moves away from swings once, at its rear AC |
| Fighters sweep several weak targets | traced | combat part, sweep_check (`$1550`) and sweep (`$1598`): against enemies of level 0 (under one hit die), one attack at each up to the fighter's sweeps |
| Running off the battlefield depends on speed against the fastest enemy | traced | combat part, flee (`$16FA`): with no enemy in sight it gets away; otherwise faster than the fastest enemy gets away, slower fails, equal is a coin toss |
| Aim: next, previous, manual, target | traced | combat part, aim (`$0F36`) and manual_aim (`$1D51`) |
| Turn undead (clerics) | traced | combat part, turn_undead (`$24AA`) and turn_roll (`$252B`), with COMBAT3's tables in the tables part (turn_number, `$7AF1`) |
| Quick hands a character to the computer; Q sets all to Quick, space all to manual, M toggles their spells | traced | combat part, player_turn (`$0A31`): Q puts the whole party on QUICK (all_quick `$22D2`), space takes it back (quick_off `$1E33`), M switches their spellcasting (magic_switch); quick (`$1437`) for one; ai_turn in the combat-set part (`$6774`) plays them |
| Done: guard, delay, quit, bandage a dying character | traced | combat part, done_menu (`$13EE`): GUARD DELAY QUIT BANDAGE SPEED EXIT |
| Left arrow exits a menu, and in combat takes back the current move | traced | combat part, move (`$0E08`) keeps the starting square and movement to put back; the menus' left arrow is read in the resident engine's menu code |
| Status: OK, unconscious, dying, dead, fled, gone | traced | the condition byte's low bits number the words in the resident engine's table (`messages`, `$3243`, 42-48): OK, GONE, DEAD, DYING, UNCONSIOUS (the game's spelling), RUNNING and STONED; bit 7 marks one out of the fight. Combat sets `$85` unconscious at exactly 0 hit points, `$84` dying below, `$83` dead at 10 below (combat part, apply_damage `$0CFE`); a monster that surrenders is made `$85` too (morale `$20C1`) |
| Treasure Menu after combat: view, take (items, money), pool, share, detect, exit, with a reminder of treasure left | live | post-com part |
| Experience shared after a won fight | live | post-com part |
| Coins: copper, silver, electrum, gold, platinum, gems and jewelry; weight slows a character | traced | resident part: max_load (`$472E`) is 1500 coins plus the strength allowance (carry_allowance, `$3AC1`); post-com part, money_menu (`$0E7B`) lists the seven kinds |
| Magic: clerics and magic-users memorise spells in camp; first to third level spell lists | traced | camp part: magic_command (`$14E2`), memorize_command (`$184A`), scribe_command (`$152E`), spell_level (`$2B35`) |
| Item Menu: ready, use, trade, drop, halve, join, sell, ID; some items ready only in combat or camp ("NOT HERE") | traced | camp part: camp_item_actions (`$1082`) fills READY, USE, TRADE, DROP, HALVE and JOIN, and the camp lets NOT HERE items be readied (`$6DE4` = 1); SELL and ID are not in the camp |
| Portraits shown only in the civilised area | traced | resident part, show_portrait (`$48A4`): only with portraits on (`$49FF` bit 7) and `$49EB` clear; which areas set `$49EB` is the scripts' |
| Saving and loading games on a save disk | traced | camp part: save_command (`$0CAB`) writes SAVEDGAME1 and SAVEDGAME0; gen part loads them |
| Runes shown in play, translated with the wheel | open | the code-word runes are the title part's (code_wheel, `$11DF`); in play, the one script text found that mentions runes (ECL17, six dwarvish runes over a door) prints words, and no rune graphics were searched for in the scripts |
| Journal entries named by number in messages | live | 28 texts in the scripts name journal entries by number (ECL18: "YOU PLACE IT IN YOUR JOURNAL UNDER ENTRY 53") |
| Ending: the dragon dies and Tyranthraxus speaks from its body | live | final part |

## Beyond the documentation

Found in the code, not in the manual.

| Feature | Status | Where |
|---|---|---|
| Casting a combat-only spell in camp asks ARE YOU SURE, then loses the spell with no effect | traced | camp part, combat_only_spell (`$1467`) |
| ORDER moves each member's timed effects one slot at a time, so an effect can be moved twice and end on the wrong member | live | camp part, `$0AF9`: an effect put on Lara Spellsword (slot 1) was on Arax the Bold after ORDER put Lara first and Arax second (25 October 2026) |
| Days rested in camp add to the days-gone-by count (`$49EC`) only when a month turns over; the adventure module adds every day. The count is what ages the party after a fight, so a day's rest in camp does not make anyone older | live | camp part, clock_add (`$124A`); tables part, count_step (`$7A5F`); post-com part, age_party (`$1E1B`). A day's rest in the slums moved the clock's day on and left `$49EC` at 0; a step at 23:59 in New Phlan put it at 1 (25 October 2026) |
| Spells cast from a scroll are cast at level 6 | traced | camp part, camp_use (`$1156`) |
| The heading for fourth-level spells reads 7TH LEVEL | traced | camp part, level_headings (`$2AC1`) |
| Cancelling DROP for a character: BREATHES A SIGH OF RELIEF; a dropped character who is down IS DUMPED IN A DITCH | traced | camp part, drop_command (`$0BC8`) |
| A battle in a town or dungeon is fought over the 25 squares round the party: each square becomes a slanted block of the battlefield with its walls drawn on: a door that opens as the wall's two ends only, a locked door as a whole wall | traced | com-prep part, read_walls_around (`$0ADB`), draw_walls (`$0BE2`) |
| Outdoors the battlefield is scattered at random: 133 tries at a random square, about one in five a two-square piece | traced | com-prep part, random_terrain (`$169C`) |
| A combatant that finds no room on the battlefield, and every later one of its side, is out of the battle before it starts | traced | com-prep part, no_room (`$0F0B`) |
| Outdoors, three times in four the monsters' four start squares are written to the wrong place, and all of them start in the same corner block | traced | com-prep part, `$15C2` |
| A lost battle ends the game: THE PARTY HAS LOST, and the program waits for ever in a jump to itself, unless a member was only marked out of the fight or the script let the party keep its fallen | live | post-com part, `$0938` and `$0957`: with nobody of the party standing after the kobold fight, the screen read THE PARTY HAS LOST and the machine stayed at `$0957` (25 October 2026) |
| Resting in New Phlan always ends after five minutes: the town sets the interruption to every pass (`$6DD2` = 1) at a chance of 101 in 100 (`$6DD3`), and its script answers with YOU ARE ROUSTED BY THE CITY WATCH AND TOLD TO MOVE ALONG. WHAT DO YOU DO? GO STAY | live | camp part, the interruption at `$1E0F`; the text is the script ECL00's. Seen resting in town, the clock five minutes on (25 October 2026) |
| The demonstration the title menu runs when nothing is pressed is the game advertising itself: its script, ECL1E, reads WELCOME TO POOL OF RADIANCE, THE FIRST ADVANCED DUNGEONS & DRAGONS COMPUTER ADVENTURE GAME | traced | title part, the menu's timeout; the script ECL1E |

## Open questions
