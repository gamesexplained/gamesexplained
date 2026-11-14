# Rampage — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

The game owns the whole machine while it runs, BASIC included, so these
are changes made in an emulator's monitor (or with a freezer cartridge),
not `POKE`s typed at `READY.`. The decimal address is given beside each.

| Effect | Poke | Status |
|---|---|---|
| A monster's energy | `energy` (`$9B81`, 39809), `energy_1` (`$9B82`, 39810) and `energy_2` (`$9B83`, 39811), one byte each for the first, second and third player; a game starts them at 56, and the word `DAMAGE` is all white from 56 up | live: with the first player's set to 1, the next hit began the change back to a human (`work/scripts/t12.py`) |
| Any level | `level` (`$9083`, 36995), 0 to 19, set while the newspaper screen is up; the next level drawn is that one | live: set to 7 at `newspaper_screen`, and to `$12` at `level_init` (`t6.py`, `t5b.py`) |
| The hidden names `RHONA`, `I LOVE`, `YOU` | `level` (`$9083`) set to `$12` (18) before `level_init` (`$90DF`) runs, with nobody joined, so `demo_mode` (`$9C61`, 40033) is 1 | live (`t5b.py`, `reference/hidden-names.png`) |
| A building falls at once | `building_strength` (`$B353`, 45907, and the bytes after it, one for each building of the level) set to 0 | live: building 0 crumbled and fell (`t18.py`) |
| The weak road gives way, or mends | `weak_road_state` (`$9082`, 36994): 3 whole, 2 and 1 breaking, 0 the hole, 4 no weak road | candidate: tested on the page's processor (`test_city.js`), not in the emulator |
| Nothing loses energy | `demo_mode` (`$9C61`) set to 1 in play | candidate, and it has a cost: with it set the computer plays all three monsters and a fire button returns to the title |
