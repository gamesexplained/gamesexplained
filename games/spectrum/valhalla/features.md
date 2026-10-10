# Valhalla — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- Spectrum Computing, entry 7152, https://spectrumcomputing.co.uk/entry/7152/ZX-Spectrum/Valhalla, read 10 October 2026: credits (Richard Edwards, Graham Asher, Charles Goodwin, Andrew Owen, James Learmont, Jan Ostler), release date 2 October 1983, Legend, £14.95, the note that the engine is called Movisoft, and the known error about six objects to a location.
- The inlay card text, as kept by the Spectrum Game Database, https://spectrumcomputing.co.uk/pub/sinclair/games-info/v/Valhalla.txt, read 10 October 2026 (with a fan walkthrough of the quests appended).
- The manual, scanned, https://spectrumcomputing.co.uk/zxdb/sinclair/entries/0007152/Valhalla(EN).pdf, read 10 October 2026: the same text as the inlay, with "Loading takes about four minutes" and the note that the machine code uses "many of the Z80's more advanced facilities", so Interface 1 and other peripherals that use RAM or interrupts will not work.
- Screenshots: the loading screen and an in-game screen from Spectrum Computing, saved in `reference/`.

## Features

| Feature | Status | Where |
|---|---|---|
| Three windows: the picture at the top, a white information window, a black command window with a flashing cursor | live | `print_text_window` ($D6EB) prints five lines of the 20-line text area; `print_input_line` ($D4B6); the interrupt ($FE69) flips the cursor every 16 frames |
| Commands are typed and ENTERed; capitals and punctuation optional | live | `enter_pressed` ($D784) lower-cases letters and splits words at any other character; `key_pressed` ($D52B) takes letters, digits, space and `! " , - . ; ?` |
| A delay after ENTER while the other characters take their turns | live | the BASIC main loop, line 8100: the flag (8110), the comings and goings (5500) and one character's turn (4010) on each pass, the command when ENTER has set `enter_flag` |
| Editing: CAPS SHIFT 5–8 move the cursor, CAPS SHIFT 0 deletes left | live | `key_pressed` ($D52B): 5 and 8 move a character, 6 and 7 a whole screen line, 0 is `delete_left` ($D63E); each tried in play |
| CAPS SHIFT 1 deletes the whole input line | live | `clear_line` ($D616) |
| CAPS SHIFT 2 pulls the last entry back into the input window | live | `recall_line` ($D6D1) gives back the line `clear_line` last emptied, and ENTER ends with `clear_line`, so after ENTER it is the command just typed (seen in play) |
| SYMBOL SHIFT Q, A, Z scroll the white text window over a 20-line text area | live | `scroll_text_back` ($D726), `scroll_text_on` ($D740), `print_text_window` ($D6EB); the area is `n$`, 640 characters at $AD5A |
| Minor spelling mistakes are put right (`ge sord` reads as `get sword`) | live | `find_word` ($D937): one wrong, missing or extra letter, or the entry with most letters matched if that is within two of the word's length |
| An entry the parser cannot understand is highlighted in red and left for editing | live | `show_bad_word` ($D8C8) puts PAPER 2 round the first word the dictionary lacks; the line never reaches BASIC |
| "This doesn't make sense" and "what?" for entries it cannot use | live | line 2900 (`ver`): "This doesn't make sense:-" and the command read back ("You drop."); line 115: "what?" for every parser error but 4 |
| Thirty-six characters, each with a sort and six qualities (badness or goodness, charisma, strength, bravery, brains) that govern how they behave | differs | `c$` (`characters_table`, $BC23) holds them as nibbles from 1 to 15; the inlay's 1 to 5 are those divided by three and rounded up, for every character but Gripe (charisma 2 in the game, 4 on the inlay). No line reads bravery (`FN b`, line 50), so it changes nothing. A sixth nibble the inlay leaves out, `FN p`, decides who moves on. Snake and Raven make 39 rows with you |
| Characters act on their own: they move, eat, drink, fight, pick things up and drop them | live | lines 4010–4610: one character here a pass picks one of six actions at random |
| Six quests, each for a special object, found only in order: Ofnir (key), Drapnir (ring), Skornir (shield), Skalir (sword), Felstrong (axe), Grimnir (helmet) | differs | nothing counts quests: the order comes from the special places that let you through only with a quest object (`s$`, $C644). Felstrong (location 6) needs no other quest object and can be the first; the rest come in the manual's order; Grimnir needs Felstrong, Skalir and Skornir; Valhalla needs Grimnir. A search over the map's tables |
| Quest objects weigh more than ordinary ones | confirmed | `p$` ($BAEF): Felstrong 12 to the axe's 5, Skalir 14 to the sword's 8, Skornir 20 to the shield's 12, Grimnir 20 to the helmet's 10, Drapnir 7 to the ring's 5, Ofnir 2 to the key's 1 |
| Ofnir opens no chest and Drapnir works no ringway | traced | line 1955 needs the key (80), line 1505 the ring (85); neither accepts the quest object |
| Dying of hunger or in a fight sends you to hell, keeping only helmet, sword or axe, money and the quest objects other than Ofnir and Drapnir | differs | lines 5615–5625: you keep slots 1–3, the weapon, the shield and the helmet, and your crowns, so an ordinary shield stays too; everything else goes, Ofnir and Drapnir with it. You arrive at location 30, 39 or 21, at random |
| You come back from hell very strong | traced | line 5625: the dead come back at full strength (`csa` with 1024, capped), 175 for you |
| Other characters who die lose everything but their weapons, Ofnir and Drapnir included, and reappear elsewhere | differs | the same lines as for you: they keep weapon, shield, helmet and crowns, lose the rest, and go to any location |
| Objects lost at death are scattered at random through the world | traced | line 5615: each goes to a random location other than this one with a free place, so a lost Ofnir or Drapnir lies somewhere on the map |
| One helmet, one shield, and one sword or one axe at a time | traced | `bput` (line 3110): slot 1 the weapon, 2 the shield, 3 the helmet; a second is error 7 |
| Strength drains with everything you do, more with more carried; eating and drinking restore it; food does more than wine | differs | `dov` (line 5450): every command costs 5 strength, whatever is carried; the load only limits what can be picked up (weight plus load at most the strength now, line 3110). Food gives 64 back and wine 32 (lines 7150, 7200) |
| A fixed amount of food and drink in the world | differs | line 5110: while the food tally `fo` (230 at the start, 2 off for each meal and 1 for each drink) is under 100, each empty place at a location you enter is filled one time in three with new food or wine |
| Fights are won, lost or drawn, two characters at a time, by strength and weapons, with a small luck factor; a sword beats an axe except when thrown | differs | lines 1360–1376: each side scores its strength plus 40 for a weapon and 40 more for a sword; within 20 it is a draw, by 64 or more a kill. No random number enters it. Thrown, an axe does 20 and a sword 10 (line 1471) |
| Throwing any object but money starts a fight; fireballs and lightning can kill | traced | line 1452: the target attacks the thrower; line 1471: lightning takes 30 strength and a fireball 40, and a character with none left dies at its next action (line 5450) |
| Who likes you depends on whom you attack: attack baddies and the goodies co-operate | traced | line 1356: one attack in two moves your goodness a step, up for a bad victim, down for a good one; lines 210, 4410 and 4510 decide refusals, attacks and gifts by the gap in goodness |
| Get or take, drop, give, and asking characters to give | live | lines 1201, 1402, 1752 |
| Buying and selling with crowns; 200 crowns at the start; characters accept or refuse | differs | you start with 200 crowns (`c$`); a seller far from you in goodness may refuse (line 1122). Crowns received are counted wrong: `moba` (line 3410) adds the receiver's own number, so you get 1 crown however many you pick up ("You get 50 crowns." then "You have 151 crowns.", seen in play) |
| Chests and cupboards: locked when closed, one key opens all, opening takes strength, closed again when you leave | live | line 1955: the opener needs (35 − n) × 6 strength at special place n, which at locations 4, 6, 37, 44 and 81 is more than your 175 ("You are not strong enough to open the cupboard.", seen at location 6); line 5105 closes them |
| Klepto steals | live | line 5300: only when an object is put down where all six places are taken; Klepto comes and carries off an ordinary object: the one put down, or, when that is a quest object, an ordinary one it takes the place of (line 5305); only when every place holds a quest object or a container does he take whatever is in the last. He carries it to a neighbouring location. Seen in play: "Klepto steals the rock.", the rock then at location 61 with Klepto |
| Summoning a character, who may refuse ("Sorry...") | live | line 2002: "Sorry.." when nobody else is here or more than six are |
| Asking characters to do things, which they may refuse; they will not buy or sell for you | live | line 210: one time in three, seven in eight when you ask the same character twice running, always when the gap in goodness less half your charisma is above 2; line 1102 |
| `what`, `where`, `who`, `how`, `list` | live | lines 6450, 6500, 6200, 6600, 6100 |
| `help`: directions that need or forbid an object or character, what a random character carries, where a ringway leads; sometimes "Sorry..." | differs | line 6555: the directions that need something are shown, but the text for one that forbids something never is (seen in play, with the conditions set by hand); "Sorry.." one time in two, and nineteen in twenty once help has been given here |
| Ringways: `jump` with a ring to another location | live | line 1505; `m$` byte 3 is where each leads |
| `l` and `r` step left and right; `go to` an object or character | live | lines 600–630 and 1080; seen in play, your column from 27 to 26 to 25 and back, and "You go to Thor." |
| `go` with a direction or its abbreviation; you always face north; huts cannot be entered | live | lines 1055–1065, `cango` (3860), `mnex` (3810) |
| The faster you move, the harder it is for others to keep up | traced | a character at the location you just left may follow you: each character turn picks one of the 38 others at random, and one still there comes after you when its restlessness (`FN p`) beats RND × 8 and it likes or loathes you, 0 to 4 or 12 and more apart in goodness (line 4010). Turns run only while no command is waiting (line 8100), so the sooner you move on, the fewer chances it gets |
| `pause` freezes the game until the next command | live | line 6020 |
| `save` and `load` a game position on tape; open containers close | traced | lines 6050 and 6255: the code in the `REM` of line 1 saves and loads the variables. Pressing BREAK while the tape runs resets the Spectrum (seen in play) |
| `print`, `noprint` and `copy` on the ZX printer | traced | lines 6300–6400, through the ROM's printer channel; no printer was attached |
| A location holds at most six objects; dropping a container with more inside crashes the game (Spectrum Computing's known error) | differs | `m$` has six places for each location, and what lies inside a chest takes one of them. A chest or cupboard weighs nothing and cannot be carried ("You can't carry the chest.", seen in play). The crash is real but comes another way: putting an ordinary object into a container where all six places are taken stops the game with "3 Subscript wrong, 5310:5" (seen in play) |

## Beyond the documentation

Found in the code, not in the manual.

| Feature | Status | Where |
|---|---|---|
| Every location's picture is drawn by code, not stored: the random-number generator is seeded from the location's number before each picture, so a place looks the same on every visit | live | `seed_random` ($DE35), the terrain drawers from `terrain_table` ($E352), the scene features (`feature_table`, $FAF1). Seen in play: Valheim left and entered again, its picture (character rows 0–11, pixels and colours) the same to the byte |
| The castle's flag flaps one pass of the main loop in two | live | line 8110, `gfx_flag` ($FBCB); seen in play, the flag's cell redrawn with no key pressed |
| Food, wine, a key or anything numbered above 66 counts as the better weapon in a fight, and `attack Thor` with no weapon named is bare hands even with a sword carried | traced | line 1362 |
| Mary arrives, unamused, when you swear: fourteen swear words are in the dictionary | live | line 120; `d$` words 241–254; "damn" typed in play brought "Mary is not amused..." |
| SYMBOL SHIFT S would leave the game for BASIC, but line 9800 disables it | traced | `escape_to_basic` ($D5DD) |
| BREAK while `save` or `load` runs resets the machine | live | lines 6050, 6255; the `REM` code at $5CD0 |
| A thrown object that lands too close ("too close to throw") still does its damage, and is lost | live | line 1482 |
| Characters 2 to 37 file past at Valhalla to congratulate you | traced | line 5135 |
| Error 18, "... not strong enough", is never raised; errors 8, 11, 15 and 16 have no message | traced | lines 9909–9918 |

## Open questions

- Whether the quests can all be done in one game was searched on the map's own tables only (`s$` and `m$`): the search took every condition but a quest object as met (the right ordinary object or character at hand, a ring for every ringway, someone strong enough to open each container). The order it gives is the order those gates force; it is not a route someone has played.
- Spectrum Computing's known error speaks of dropping a container with more objects inside. In this release a container cannot be carried at all; whether another release allowed it is not known.
