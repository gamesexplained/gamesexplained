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
| Weapons and gadgets: paint gun, Walther PPK, missile pen, ghetto blaster, night vision, hand grenade, steel helmet, cigarettes, bomb, mortar, bazooka, dynamite, crossbow, sleep-dart gun | confirmed: fourteen names, the night vision is "INFRA SIGHT" and the helmet "HARD HAT" | `weapon_names` `$2A84`, `weapon_lethal` `$2BBE` |
| Single-use items; a non-weapon choice falls back to the Walther PPK (MI6-HQ) | differs: weapons 5 and up fire once; after a timed weapon the game switches back to the Walther PPK and stops switching. A gadget that does not kill stays in hand as the second weapon | `fire` `$2CE7`, `weapon_switch_timed` `$2C3E` |
| Crosshair aims, fire shoots; crosshair at the far right makes Bond run | confirmed | `crosshair_right` `$151F`, `fire` `$2CE7` |
| Jump (right and up), roll or duck (right and down) | confirmed: running, up jumps and down with right rolls; standing, fire held 15 frames turns up into a jump and down into a duck | `stick_vertical` `$1442` |
| Energy bar in the status panel; lives (four shown after one death) | live | lives `$0150` |
| Points lost for hitting innocents (C64-Wiki) | confirmed: knocking down a figure that is not a real enemy takes 500 off; hitting one with a weapon that does not kill scores 100 | `enemy_shot` `$2D67` |
| Tripping over obstacles leaves Bond helpless for about three seconds (MI6-HQ) | differs: a trip is a nine-frame roll and then 60 frames lying down, and costs 4 energy | `trip` `$3440`, `lie_down` `$3367`, `obstacle_check` `$238B` |
| Level 1 ends after one hit on the agent with live ammunition (MI6-HQ) | confirmed: only a weapon that kills knocks him down | `enemy_hit_anim` `$1E9C` |
| Ending: "CONGRATULATIONS / YOU HAVE COMPLETED YOUR MISSION / THE PRIME MINISTER THANKS YOU / YOU SCORED" | live | `$12AC` |
| High score not saved to disk (C64-Wiki) | confirmed: kept in memory only | `hiscore_update` `$2642` |
| Music by David Whittaker; sound effects | confirmed: five tunes, 17 effects, played by the game's code on the Music tab | driver at `$A000` |

## Beyond the documentation

Found in the code, not in the manual.

| Finding | Status | Where |
|---|---|---|
| Level 8's intro pause can never run: the level is compared with 7 and then with 4 | traced | `level_intro` `$2734` |
| Tune 4 and effects 1 and 9 are never started | traced | `music_start` callers, `sfx_start` callers |
| Leftover source text and assembler symbols in the file | traced | `$3FCF`, `$77D4`, `$2378`, `$3BEE` |
| Music command `$86` stores `$AB` as the voice flags | traced | `cmd_step_up` `$A39A` |
| The frame divider at `$A241` plays every frame either way | traced | `music_irq` `$A13C` |
| Each level's map is 160 columns; the far layer goes round twice, the near layer six times | traced, and seen live | `level_events` `$3004`, `scroll_fine` `$3A07` |
| Obstacles are map columns compared with the middle layer's count, not collisions | traced | `obstacle_check` `$238B` |
| The helicopter is worth 1000 points and takes 10 Walther PPK shots or one of anything else | traced | `helicopter_move` `$1764`, `helicopter_shot` `$2E71` |
| Finishing a level adds 1000 for each level before it | traced | `bond_walk_off` `$32FF` |
| On Tangiers every weapon clears a doorway, but only the sleep dart gun scores | traced | `door_shot` `$2EFA` |
| The hard hat is drawn into 25 sprite shapes by exclusive-or | traced, and run on the simulator | `hard_hat_step` `$70EF` |

## Open questions

- Zzap!64 29, page 99: checked. 57 %, the C64 version (`index.html`).
- The NTSC release: Melbourne House; two of its files differ from the PAL disk's (`orientation.md`). What the differences change is open.
- What the player sees at an obstacle: the map holds nothing at the obstacle columns. Open.
- What the Fairground's doorway target looks like. Open.
