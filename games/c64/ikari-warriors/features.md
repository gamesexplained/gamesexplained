# Ikari Warriors — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki (German), "Ikari Warriors (Elite)", https://www.c64-wiki.de/wiki/Ikari_Warriors_(Elite), read 17 November 2026: credits, controls, the power-up colours, tips.
- Zzap!64 issue 35, March 1988, pages 12-13, review of the Elite version (OCR text from archive.org, `zzap64-magazine-035`), read 17 November 2026: story, tanks, mines, two-player mode, scores.
- Wikipedia, "Ikari Warriors", https://en.wikipedia.org/wiki/Ikari_Warriors, read 17 November 2026: the arcade original (SNK, 1986), its rotary joystick, its names.
- GameBase64 entry 3709, https://gb64.com/game.php?id=3709, read 17 November 2026: credits, joystick in port 2, two players at once.
- MobyGames, https://www.mobygames.com/game/6739/ikari-warriors/, read 17 November 2026: the US version is Quicksilver's, the European one Elite's.
- The game's own text: the credits at `$21F2`-`$229A`, the ending message at `$B7FA`-`$B8B0`, the high-score messages at `$CC88`-`$CCE7` (strings sweep of `work/entry.vsf`).

## Features

| Feature | Status | Where |
|---|---|---|
| One player, or two at once as a team; either can shoot or grenade the other (Zzap!64) | confirmed | `update_bullet_hits` `$BA25` tests every bullet against both players, skipping only the one who fired it; `blast_hits` `$BE58` kills every player on foot but the thrower |
| Joystick in port 2 for player one (GameBase64); player two's port | confirmed | `lower_panel_irq` `$3D44`: port 2 for player 1 and port 1 for player 2 in a two-player game; both ports ANDed in a one-player game |
| Eight directions of movement (C64-Wiki) | confirmed | `move_player` `$C485` moves a pixel in each direction the joystick holds |
| A short press of fire shoots, a long press throws a grenade (C64-Wiki) | live | `player_fire` `$233A`: a bullet on the press, a grenade at the ninth count, counted every second frame; holds of 16 frames fired once, 20 and 30 threw a grenade |
| Limited bullets and grenades, both shown in the panel (`99` and `50` at the start, `reference/play-start.png`) | confirmed | `player_fire` takes a bullet from the BCD count `zpa_6D`; `draw_panel_digit` |
| Tokens left by soldiers refill ammunition (Zzap!64) | confirmed | `item_cycle` `$B53C` gives every so-many soldiers an item; `drop_item` `$C192`; `pick_up_item` |
| Power-ups by colour: purple, white and black add 50 bullets and/or grenades, black refuels a tank; green kills every enemy on screen with no points; red widens the grenade blast; yellow lengthens the shot; light blue shoots through obstacles (C64-Wiki) | confirmed | `pick_up_item`, colours from `item_colours` `$C36E` read as multicolour; black fills bullets, grenades and shells to 99 rather than adding 50; green also brings down a helicopter for 1,000 |
| Every power-up is lost with a life (C64-Wiki) | confirmed | `init_player`, called by `respawn_players` `$C376` |
| Tanks marked with a flashing `IN` can be boarded; immune to bullets, killed by grenades; a fuel bar drains, and the tank explodes when it runs dry or after a grenade, unless the player gets out in time (Zzap!64) | confirmed | `player_fire` boards and leaves; `update_bullet_hits` never hits a player in a tank; `update_fuel` `$BC90`: 100 frames from an empty tank or a hit to the explosion; sprite `$DE` is the sign |
| Gun emplacements, helicopters and enemy tanks: bullets do not hurt them, grenades do (Zzap!64) | confirmed | `update_guns` `$263C`; `update_bullet_hits` skips soldiers riding a vehicle; `blast_hits` destroys vehicles, a flying helicopter and guns |
| Land mines appear only when stood on, flashing and beeping, just in time to step off (Zzap!64, C64-Wiki) | confirmed | `update_mines`: shown within 16 by 32 pixels, set off within 5 by 12; the places come from `route_list` |
| Water: enemies dive under, the player slows down (C64-Wiki) | confirmed | `move_player` slows a player on foot and stops a tank; a soldier in water uses frame `$6F` and is not hit by bullets |
| Standing still stops new enemies appearing, except in a few places that attack from behind (C64-Wiki) | confirmed | `spawn_from_route` `$194E` starts soldiers by scroll position, and the screen scrolls only while a player is above line `$BC`; the attacks from behind were not looked for |
| Extra lives from points (C64-Wiki, "valuable for the extra lives") | live | `add_score`: 20,000, 50,000 and every 50,000 after, run on the simulator |
| The start beside the crashed aircraft (Zzap!64; `reference/play-start.png`) | live | |
| One long vertically scrolling route to the village of Ikari, ending with Colonel Cook's rescue (C64-Wiki; the ending text at `$B7FA`) | confirmed | `map_script` `$92E1`, 1,891 rows run by `draw_map_row` `$7F80`; checked live against 49 drawn rows |
| Ending: "Congratulations, you have rescued Colonel Cook" and a bonus of 100,000 points (the text at `$B7FA`) | live | `route_finished`; shown with the map script moved to its last commands |
| High-score table of ten, entry of a name for a top-ten score (`reference/high-scores.png`; the text at `$CC88`) | confirmed | `enter_high_score` `$CA90`: a name of nine letters spelt with the joystick |
| Title sequence: high scores, the island map with "Warriors" written across it, a demo (`reference/title-attract.png`, `reference/high-scores.png`) | live | |
| Music: a "film-style" soundtrack during play (Zzap!64); composer Jason C. Brooke, with Mark Cooksey (GameBase64; the game's own credits name only Jason Brooke) | confirmed | `music_tick` `$E000`; three tunes in `tune_table` `$E681`; the credits at `$21EE` |
| The loading picture, shown by the loader while the game loads (`reference/loading-screen.png`) | live | `GM1`, `$03C0`-`$03E1` |
| Score panel and status bars drawn in the opened upper and lower borders (MobyGames; `work/frame-play.json`) | confirmed | `$D011` writes on lines 249 and 308 |

## Beyond the documentation

Found in the code, not in the manual.

- An eighth token, purple, worth 800 points, is in `pick_up_item` but `item_cycle` never gives it.
- Three places in the code read player 1's power-up for both players: the long shot in `player_shot` `$2527`, the shoot-through grenades in `update_grenade_hits` `$B935`, and `throw_grenade`, which picks a long shell's range by slot rather than facing. The first two were run on the simulator.
- The route is 1,891 map rows, with 118 objects built into it (`map_script`).
- The music driver has a frame-skip switch for the other television standard (`$E00E`) that nothing sets.
- The ending text spells "RESCVED" for "rescued" (`$B815`).

## Open questions

- Where the C64-Wiki's "attacks from behind" come from: soldiers that enter from the bottom of the screen were not looked for.
