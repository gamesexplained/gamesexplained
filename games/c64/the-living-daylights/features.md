# The Living Daylights — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- Wikipedia, https://en.wikipedia.org/wiki/The_Living_Daylights_(video_game), read 17 November 2026
- C64-Wiki, https://www.c64-wiki.com/wiki/The_Living_Daylights, read 17 November 2026
- MobyGames credits, https://mobygames.com/game/11689/james-bond-007-in-the-living-daylights-the-computer-game/credits, read 17 November 2026
- MI6-HQ, https://varnish.mi6-hq.com/sections/games/tld, read 17 November 2026
- DJ Cube retrospective (C64 version played), https://djcube.co.uk/the-living-daylights-the-computer-game/, read 17 November 2026
- Games That Weren't, https://www.gamesthatwerent.com/2021/02/the-living-daylights/, read 17 November 2026
- The game's own title screen (credits: written by David Barbour for Sculptured Software Inc, designer Richard Naylor, music and effects David Whittaker, copyright Domark 1987)

## Features

| Feature | Status | Where |
|---|---|---|
| Fast loader offered at boot ("WOULD YOU LIKE TO USE THE FAST LOADER? (Y/N)") | live | loader `GM1` at `$8000` |
| Loading picture (Bond, the cast, the Aston Martin) | live | `TLD7`/`TLD6`, bitmap at `$5C00` during loading |
| Title screen with credits, score and high score, F7 to start | live | |
| Eight levels: Gibraltar, Concert Hall, The Pipeline, The Mansion, The Fairground, Tangiers, Afghanistan, Whitaker's House | live | level number `$012E` |
| Level intro screen: "LEVEL n", a picture of the place, its name, lives left | live | `$26E5` |
| Q branch: between levels, a countdown of five and a choice of four items | live | |
| "CHOOSE YOUR WEAPON" screen during play (C64-Wiki: move the cursor to the bottom border and press fire) | live | |
| Weapons and gadgets: paint gun, Walther PPK, missile pen, ghetto blaster, night vision, hand grenade, steel helmet, cigarettes, bomb, mortar, bazooka, dynamite, crossbow, sleep-dart gun | open | |
| Single-use items; a non-weapon choice falls back to the Walther PPK (MI6-HQ) | open | |
| Crosshair aims, fire shoots; crosshair at the far right makes Bond run | open | |
| Jump (right and up), roll or duck (right and down) | open | |
| Energy bar in the status panel; lives (four shown after one death) | live | lives `$0150` |
| Points lost for hitting innocents (C64-Wiki) | open | |
| Tripping over obstacles leaves Bond helpless for about three seconds (MI6-HQ) | open | |
| Level 1 ends after one hit on the agent with live ammunition (MI6-HQ) | open | |
| Ending: "CONGRATULATIONS / YOU HAVE COMPLETED YOUR MISSION / THE PRIME MINISTER THANKS YOU / YOU SCORED" | live | `$12AC` |
| High score not saved to disk (C64-Wiki) | open | |
| Music by David Whittaker; sound effects | open | driver at `$A000` |

## Beyond the documentation

Found in the code, not in the manual.

## Open questions

- C64-Wiki lists Zzap!64 at 57 % ("9/87") and links issue 29, page 99: check the magazine.
- Melbourne House's NTSC release: who made it, and how it differs.
