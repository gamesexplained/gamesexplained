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
| One player, or two at once as a team; either can shoot or grenade the other (Zzap!64) | open | |
| Joystick in port 2 for player one (GameBase64); player two's port | open | |
| Eight directions of movement (C64-Wiki) | open | |
| A short press of fire shoots, a long press throws a grenade (C64-Wiki) | open | |
| Limited bullets and grenades, both shown in the panel (`99` and `50` at the start, `reference/play-start.png`) | open | |
| Tokens left by soldiers refill ammunition (Zzap!64) | open | |
| Power-ups by colour: purple, white and black add 50 bullets and/or grenades, black refuels a tank; green kills every enemy on screen with no points; red widens the grenade blast; yellow lengthens the shot; light blue shoots through obstacles (C64-Wiki) | open | |
| Every power-up is lost with a life (C64-Wiki) | open | |
| Tanks marked with a flashing `IN` can be boarded; immune to bullets, killed by grenades; a fuel bar drains, and the tank explodes when it runs dry or after a grenade, unless the player gets out in time (Zzap!64) | open | |
| Gun emplacements, helicopters and enemy tanks: bullets do not hurt them, grenades do (Zzap!64) | open | |
| Land mines appear only when stood on, flashing and beeping, just in time to step off (Zzap!64, C64-Wiki) | open | |
| Water: enemies dive under, the player slows down (C64-Wiki) | open | |
| Standing still stops new enemies appearing, except in a few places that attack from behind (C64-Wiki) | open | |
| Extra lives from points (C64-Wiki, "valuable for the extra lives") | open | |
| The start beside the crashed aircraft (Zzap!64; `reference/play-start.png`) | live | |
| One long vertically scrolling route to the village of Ikari, ending with Colonel Cook's rescue (C64-Wiki; the ending text at `$B7FA`) | open | |
| Ending: "Congratulations, you have rescued Colonel Cook" and a bonus of 100,000 points (the text at `$B7FA`) | open | |
| High-score table of ten, entry of a name for a top-ten score (`reference/high-scores.png`; the text at `$CC88`) | open | |
| Title sequence: high scores, the island map with "Warriors" written across it, a demo (`reference/title-attract.png`, `reference/high-scores.png`) | live | |
| Music: a "film-style" soundtrack during play (Zzap!64); composer Jason C. Brooke, with Mark Cooksey (GameBase64; the game's own credits name only Jason Brooke) | open | |
| The loading picture, shown by the loader while the game loads (`reference/loading-screen.png`) | live | `GM1`, `$03C0`-`$03E1` |
| Score panel and status bars drawn in the opened upper and lower borders (MobyGames; `work/frame-play.json`) | confirmed | `$D011` writes on lines 249 and 308 |

## Beyond the documentation

Found in the code, not in the manual.

- The ending text spells "RESCVED" for "rescued" (`$B815`).

## Open questions

- How a long press is told from a short one.
- Where the route is stored, and how far it is.
- What the green power-up's "no points" means in the code.
- Which tunes the game holds, and which plays where.
