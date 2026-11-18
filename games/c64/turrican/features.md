# Turrican — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, "Turrican", https://www.c64-wiki.com/wiki/Turrican, read 17 November 2026 (story, controls, extra symbols, display, high-score list, cheats, credits).
- The box's back cover (German, French and Italian), as C64-Wiki shows it, read 17 November 2026: "13 levels with more than 1000 screens", "50 different aliens", continue feature and high-score list. The Italian text says 12 levels. The screenshots on it are from the Amiga version.
- The game's own screens: the loading picture, the title's credit pages, "TURN THE DISK ! THEN PRESS SPACE", the panel.

## Features

| Feature | Status | Where |
|---|---|---|
| 13 levels in 5 worlds (three worlds of three levels, two of two) | live | thirteen level files on side 2, each loaded by the route in `orientation.md`; the loading text's world and stage digits, engine `level_text_codes` ($67D9): 1-1 to 1-3, 2-1, 2-2, 3-1 to 3-3, 4-1 to 4-3, 5-1, 5-2 |
| Each level is loaded from side 2 when the one before it ends | live | engine `state_next_level` ($096D), the next file named in the level's header at $8CA7 |
| Loading picture with "PRESS SPACE", then the title with credit pages | live | boot; title `title_start` ($6C00) |
| "TURN THE DISK ! THEN PRESS SPACE" before the first level | live | title $6C7D: loads `CD` until it reads side 2 |
| Speech at start-up ("Welcome to Turrican...") | confirmed | the boot program's own code at $C330 plays a 4-bit sample from $0B30-$C1FF through the volume register ($D418), about 6,400 samples a second for about fifteen seconds, with the screen off, before the loading picture (`orientation.md`); nothing in the engine, title, levels or ending plays samples |
| Run left and right with the stick | confirmed | engine `hero_move` ($0E94), `hero_walk_right` ($10E4) |
| Stick up jumps; up again while rolled up turns back to normal | confirmed | engine `hero_jump_start` ($107B): up as the wheel unrolls him, only when he faces the way he rolls |
| Stick down ducks | confirmed | engine `hero_move` ($0E94) |
| Down and fire lays a mine that explodes after a short time | confirmed | engine `weapon_buttons` ($2CAA): fire held 35 frames while crouching; a 50-frame fuse, `mine_update` ($2DB2) |
| Down and SPACE turns the hero into a rolling wheel (three times a life): invulnerable, rolls by itself, steered left and right | confirmed | engine `hero_move` ($0E94), three wheels a life in `life_start` ($567C), the panel's icons `draw_wheels` ($3F3E) |
| Holding fire brings out the lightning whip, swung by left and right; its length grows with blue symbols | confirmed | engine `whip_update` ($391B): fire held 20 frames, standing, the view still; 16 long at the start, two longer for each blue symbol |
| A short press of fire shoots: normal shot, scatter shot (red symbol, three levels) or laser (green symbol, grows longer) | confirmed | engine `fire_shot` ($3251), `shot_level` ($3595): one shot, three, three with a wider volley every other press; `fire_laser` ($3596) |
| SPACE fires the energy lines: two lines that run up and down the screen and destroy what they reach, stopped by walls | confirmed | engine `energy_lines_start` ($302B): two upright lines, each as tall as the space between the walls above and below the hero, that move apart to the left and the right |
| F7 throws a grenade: a smart bomb on walls and end bosses, a strong shot on other enemies | differs | engine `grenade_update` ($2E6C): it flies forward until a wall or an enemy, then every object on the screen explodes with it, except in a boss's level; there it does 99 damage (`weapon_damage`, $0720) |
| CTRL pauses; fire continues | confirmed | engine `main_loop` ($08EA), `frame_logic` ($0B48), `irq_bottom` ($0C65) |
| Extra symbols: red scatter, green laser, blue whip, light blue shield, yellow P energy, white G grenade, white M mine, white L energy line, grey 1UP life | confirmed | engine `bonus_symbol` ($5D6C), `symbol_colours` ($5EFD) |
| Diamonds: 300 give a continue | confirmed | engine `irq_bottom` ($0C65): 50 points a diamond, a continue for every 300 |
| A time limit for each level | confirmed | engine `frame_logic` ($0B48), the time from the level's header ($AE07-$AE09), TIME OUT (`message_sprites`, $6006) |
| Panel: lives, wheels, continues, time, diamonds, grenades, mines, energy lines, score, energy bar | live | engine `panel_layout` ($0748) |
| Secret rooms with extras, extra lives and diamonds | confirmed | hidden blocks that show only when shot and give a stream of symbols: level 2-1's prize block ($7DCD), level 4-1's bonus block |
| End bosses and mid-level bosses | confirmed | the fish (2-1), the machine (2-2), the tower (3-1), the gunship (3-3), the falling block (4-1), the creature (4-3), the Machine (5-2), each in its level's listing |
| A shoot'em-up stage (level 3-1) with music; the walking levels have no music | differs | level 3-1's flight and level 3-3's dive both play a tune with sound effects off; the other levels play effects only |
| High-score list: enter a name with RETURN; fire saves it to the disk, S asks for side 1, RUN/STOP returns | live | title $7272, $7285, $729D: S shows INSERT SIDE 1 OF YOUR GAMEDISK, fire then saves and RUN/STOP goes back to the title; fire without S goes back to the title. A save that fails shows DANN EBEN NICHT !! (`title_save`, $74C3) |
| Continue screen | confirmed | engine `continue_choice` ($60DF): YES or NO with left and right, fire to take it |
| Pause and fire held together: the hero walks and no enemies appear (C64-Wiki, cheats) | live | engine `main_loop` ($08EA) sets the pause flag $0203 again every time round while CTRL is held; fire clears it in `frame_logic` ($0B48), so the hero, the time and the scroll run, but by `irq_bottom` ($0CAB) it is set again and the objects are neither made nor moved. In level 1-1, six seconds of CTRL, fire and right scroll the view exactly as walking right does, with no object made; walking right alone fills ten slots |

## Beyond the documentation

Found in the code, not in the manual.

- An anti-cracker message from Manfred Trenz in the title's memory, "HI FOLKS, THE MANIAC IS BACK !!!", with the date he started (01.02.1989). No screen reached in the run shows it.
- Pale blocks spell 1989 inside the rock of level 1-1's map, and DTE on its side inside a rock of level 1-3's; DTE also opens the title's unread line DTE+DTZ+ACU+MWS+AV IN 1990 (`facts.md`, Mechanics; the Levels tab).
- The default high-score table names the team, from Manfred Trenz's 100,000 at 4-2 down: MANFRED TRENZ, RAMIRO VACA, ADAM BULKA, MARKUS W., ALEXANDER ERNST, CHRIS HUELSBECK, MARC A. ULRICH, then !COPYRIGHT 1990!, !      BY      ! and ! RAINBOW ARTS ! (engine `high_scores`, $6860, from the file `IH`).
- After the ending the game over reads the level's name from the ending's own bytes, so the result screen and the hall of fame show LEVEL !-! (title $7087; live).
- RETURN with no name enters ♥ MR. RETURN ♥ in the hall of fame (title $7CE2; live).
- Beating level 2-1's fish with a whip shorter than 22 gives the whip back as whatever $BE9E held, a byte the fight writes only for a longer whip; a length of 0 acts as no limit, and the next blue symbol makes it 2 (level 2-1 $6D31, $704F; engine $3A25, $5E69; the lengths 0 and 2 tested live, poked). What $BE9E holds in normal play is open.

## Open questions

- C64-Wiki's extra-lives trick in level 1-1 (jump blind off the tower's left edge onto a tiny platform). The level's lists hold four 1UPs in a row near the top of the map, at characters (313-336, 18), and two more elsewhere (`facts.md`, Mechanics); whether the trick's platform is the one under the four is not checked.
