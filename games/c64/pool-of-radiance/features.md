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
| Two wrong code words and the game stops | traced | title part (wrong_word, `$12DF`: the second wrong word jumps to itself at `$12F4`) |
| Party Creation Menu: create, drop, modify, train, view, add, remove, load saved game, save, begin adventuring | live | gen part |
| Create a character: race (6), gender, rolled ability scores (reroll or keep), class, alignment, name (15 letters) | open | gen part |
| Portrait chosen from heads and bodies; combat icon chosen (weapon, head, colours, size) | open | gen part, camp part (Alter, Icon) |
| Modify a new character's ability scores and hit points | open | gen part |
| Training raises a level when the experience is there and the gold paid; Phlan's hall trains to fighter 8, thief 9, cleric and magic-user 6 | open | gen part |
| Pre-rolled party stored as a saved game on side 1 | live | `SAVEDGAME0`, `SAVEDGAME1` on side 1 |
| Up to 6 player characters and 2 NPCs; NPCs have morale and may flee or betray | open | |
| Adventure Menu: move, view, cast, area, encamp, search, look | live | dungeon part |
| 3D view in town and underground; I/J/K/M or the joystick move and turn; each step is one minute, ten with Search on | live | dungeon part, view part |
| Area command: an overhead map of the block, not always available | open | dungeon part |
| Blocks of 16 by 16 squares, entered through low corridors, stairs and caves | open | ECL scripts, GEO maps |
| Wilderness travel in eight directions, half a day a square | open | |
| Search mode: slower, more wandering monsters, finds secret doors and traps | open | dungeon part |
| Look: treat the square as searched | open | dungeon part |
| The clock: the longer a mission takes, the harder it becomes | open | |
| New Phlan's places: city council, docks, inns, taverns, training hall, shops, temples | open | ECL scripts of block 0 |
| Shop Menu: buy, view, take, pool, share, appraise, exit; sold items vanish from the shop; ID costs money | open | |
| Temple Menu: heal spells for a price | open | |
| Encamp Menu: save, view, magic, rest, alter, exit | live | camp part |
| Rest: each 24 uninterrupted hours heals 1 HP; memorising takes at least 4 hours, 6 for third level; rest can be interrupted | traced | camp part: daily_heal (`$1FB6`) gives every member 1 hit point each 24 hours of rest, counted from arrival in camp, so two rests on one visit add up; rest_hours_by_level (`$1A83`) 4 hours before spells of levels 1-2, 6 before 3-4, then 15 minutes per spell level; the interruption roll at `$1E0F` |
| Alter: order (first four are the front rank), drop, speed (slower, faster), icon, pics (characters on/off, monsters on/off) | traced | camp part: alter_command (`$08E9`) and its five routines; the front rank is not in this module |
| Encounter Menu: combat, wait, flee, advance or parlay | live | dungeon part |
| Surprise: a free round for whichever side surprises the other | open | |
| Parlay attitudes: haughty, sly, meek, nice, abusive | open | |
| Combat Menu: move, view, aim, use, cast, turn, quick, done | live | combat part |
| To hit: a d20 roll at least THAC0 minus the target's AC | open | combat part |
| First two attackers strike the front, later ones the rear, where AC is worse; a thief opposite the first attacker backstabs | open | combat part |
| Missile weapons need no adjacent enemy and a line of sight; bows attack twice a round | open | combat part |
| Moving away from an adjacent enemy gives it a free attack | open | combat part |
| Fighters sweep several weak targets | open | combat part |
| Running off the battlefield depends on speed against the fastest enemy | open | combat part |
| Aim: next, previous, manual, target | open | combat part |
| Turn undead (clerics) | open | combat part |
| Quick hands a character to the computer; Q sets all to Quick, space all to manual, M toggles their spells | open | combat part |
| Done: guard, delay, quit, bandage a dying character | open | combat part |
| Left arrow exits a menu, and in combat takes back the current move | open | resident (menu code), combat part |
| Status: OK, unconscious, dying, dead, fled, gone | open | |
| Treasure Menu after combat: view, take (items, money), pool, share, detect, exit, with a reminder of treasure left | live | post-com part |
| Experience shared after a won fight | live | post-com part |
| Coins: copper, silver, electrum, gold, platinum, gems and jewelry; weight slows a character | open | |
| Magic: clerics and magic-users memorise spells in camp; first to third level spell lists | traced | camp part: magic_command (`$14E2`), memorize_command (`$184A`), scribe_command (`$152E`), spell_level (`$2B35`) |
| Item Menu: ready, use, trade, drop, halve, join, sell, ID; some items ready only in combat or camp ("NOT HERE") | traced | camp part: camp_item_actions (`$1082`) fills READY, USE, TRADE, DROP, HALVE and JOIN, and the camp lets NOT HERE items be readied (`$6DE4` = 1); SELL and ID are not in the camp |
| Portraits shown only in the civilised area | open | |
| Saving and loading games on a save disk | traced | camp part: save_command (`$0CAB`) writes SAVEDGAME1 and SAVEDGAME0; gen part loads them |
| Runes shown in play, translated with the wheel | open | |
| Journal entries named by number in messages | open | ECL scripts |
| Ending: the dragon dies and Tyranthraxus speaks from its body | live | final part |

## Beyond the documentation

Found in the code, not in the manual.

| Feature | Status | Where |
|---|---|---|
| Casting a combat-only spell in camp asks ARE YOU SURE, then loses the spell with no effect | traced | camp part, combat_only_spell (`$1467`) |
| ORDER moves each member's timed effects one slot at a time, so an effect can be moved twice and end on the wrong member | traced | camp part, `$0AF9` |
| Days rested in camp add to the days-gone-by count (`$49EC`) only when a month turns over; the adventure module adds every day | traced | camp part, clock_add (`$124A`); dungeon part, count_step (`$7A5F`) |
| Spells cast from a scroll are cast at level 6 | traced | camp part, camp_use (`$1156`) |
| The heading for fourth-level spells reads 7TH LEVEL | traced | camp part, level_headings (`$2AC1`) |
| Cancelling DROP for a character: BREATHES A SIGH OF RELIEF; a dropped character who is down IS DUMPED IN A DITCH | traced | camp part, drop_command (`$0BC8`) |
| A battle in a town or dungeon is fought over the 25 squares round the party: each square becomes a slanted block of the battlefield with its walls drawn on: a door that opens as the wall's two ends only, a locked door as a whole wall | traced | com-prep part, read_walls_around (`$0ADB`), draw_walls (`$0BE2`) |
| Outdoors the battlefield is scattered at random: 133 tries at a random square, about one in five a two-square piece | traced | com-prep part, random_terrain (`$169C`) |
| A combatant that finds no room on the battlefield, and every later one of its side, is out of the battle before it starts | traced | com-prep part, no_room (`$0F0B`) |
| Outdoors, three times in four the monsters' four start squares are written to the wrong place, and all of them start in the same corner block | traced | com-prep part, `$15C2` |

## Open questions
