# Last Ninja Remix — features

What the game is documented to do, with its status against the code.
Statuses: **open** (documented, not found yet), **traced** (in the code,
not exercised), **confirmed** (in the code, consistent with the
emulator), **live** (observed directly), **differs** (the code does
something else).

Sources:

- The game's manual (System 3, cartridge edition), archive.org item
  `Last_Ninja_Remix_The_1990_System_3`, read 24 October 2026
- [Lemon64](https://www.lemon64.com/game/last-ninja-remix) and the [C64-Wiki](https://www.c64-wiki.com/wiki/Last_Ninja_Remix), read 24 October 2026

## Features

| Feature | Status | Where |
|---|---|---|
| Seven levels, each one load: Central Park, The Street, The Sewers, The Basement, The Office, The Mansion, The Final Battle (the manual lists six loads, by other names) | live | every level reached and played in the emulator; each level file is unpacked in two segments by engine `$1000`; the Maps tab draws every area of all seven, and `test_levels.js` holds each play window against the emulator |
| Isometric areas drawn from pieces | confirmed | the scene renderer (`$8A52` in Central Park); 13,297 pictures over the seven levels, each inside its box (`index.html`, section 04) |
| Movement relative to the way the ninja faces; J turns the stick's directions an eighth of a turn | traced | `ScanAndNormalizeInput` (`$9418` in Central Park); J steps `$03F3` from 0 to 2, added to the heading at `$A50D` |
| Keys: F1 sound, F3 and F5 the items, F7 pause, Space the weapons, RUN/STOP kills the ninja | traced | engine `$1EEA` (F1, `$AA`), `$02B7` (pause), `$0267` and `$B6` (RUN/STOP); see `facts.md`, "Controls" |
| A joystick with a second button (the C64GS's pad): whichever starts the level fires, the other selects the weapon, both together the item | live | POTX of port 2 (`$D419`) with `$DC00` = `$80`; `$8EE8`-`$8EF9`, `$951B`, `$9497` in Central Park |
| Picking an item up (fire with the stick down and to one side) | open | the object records (`object_record_00`, `$C0D0` in Central Park) and their scripts are traced; the move that takes an item is not |
| Somersaults | open | not found |
| Fighting moves, unarmed, armed and thrown | open | combat overlap (`ResolveCombatOverlapForActorSlotX`, `$AB67`), damage (`DamagePlayer`, `$B54A`) and projectile hits (`$B767`) are traced; the table from stick to move is not |
| Weapons and items: keys, map, nunchakus, shuriken, staff, bottle, sword, hamburger, credit card, terminal | traced | 40 item flags at `$03D8`; each level's object records say where an item lies and what taking it does |
| The player's and the enemy's energy | confirmed | `$0229` and `$022A`, 44 each, shown as two spirals (engine `$1D4B`, `$1D78`); `test_index.js` holds the spiral against engine `$1E67` |
| Lives | traced | item 26's flag (`$03F2`), four at the start (engine `$0EAF`); `LoseLife` (`$93C4` in Central Park) |
| Score | traced | engine `$1183`; 5,000 at the end of each level (`ResolveLevelCompletion`), 50,000 at the end of the game (`PlayEnding`, `$8CA5` in The Final Battle) |
| Clock | live | engine `$1F1B`, a second every 50 raster interrupts: 10 seconds in 500 PAL frames |
| The final problem "is always in the picture": the last door's lock | confirmed | the code is the clock's minutes and seconds as The Basement ends (`CopyClockToCode`, `$B9B2` in The Basement); `test_index.js` runs it for all 3,600 times |
| Music for each level | confirmed | each title load's player at `$4000`; `test_music.js` holds the page's player against all seven, 6,000 frames each |

## Beyond the documentation

- A joystick sequence that ends any level (`$95AB` in Central Park, the
  same in every level). *Live*.
- Hidden credits in the intro, scrolled while L is held on the logo
  (intro `$112E`). *Live*.
- An unused title screen at `$6000` of Central Park's first load, whose
  interrupt would crash. Confirmed on the kit's 6502.
- The clock runs a fifth fast on NTSC machines, where the tune is slowed
  to match (engine `$1EFB`). Traced.
- A beaten enemy gets its energy back with the time away
  (`RebuildEnemyMeterFromElapsedTicks`, `$B3D6` in Central Park), and is
  down for good only after a number of knock-downs that rises level by
  level; the Final Battle's enemies always get up. Confirmed.
- Each tune carries a line of text at `$400C` that nothing reads,
  crediting the musicians.

## Open questions

- Who wrote the intro's tune: its driver is not the levels' and it
  carries no credit.
- The 15 bytes at intro `$1797`, which nothing reads.
- The moves listed above as open: picking up, somersaults, the fighting
  moves.
