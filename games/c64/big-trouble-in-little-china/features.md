# Big Trouble In Little China — features

What the game is documented to do, with its status against the image.
Statuses: **open** (documented, not found yet), **traced** (in the code,
could not be exercised), **confirmed** (in the code, consistent with the
emulator), **live** (observed directly), **differs** (the code does
something else). Play was exercised in the emulator from the title to the sewers, with the temple and the prize reached by setting the scroll and the prize's bytes.

Sources:

- Wikipedia, "Big Trouble in Little China (video game)", read 10 November 2026: designer Mev Dinc, publisher Electric Dreams Software; Amstrad CPC, Commodore 64 and ZX Spectrum. Its lead says 1986 for all three and its infobox says 1987 for the Commodore 64.
- Commodore User, issue 44 (reviewer Bill Scolding), text on everygamegoing.com, read 10 November 2026.
- Games Database, "Big Trouble in Little China" (Commodore 64), read 10 November 2026: developer Focus Creative Enterprises; the levels.
- Electric Dreams' 1987 cassette, the Ultimate Tape Archive's `Big_Trouble_in_Little_China.tap` (571,243 bytes, SHA-256 `4498a483eaa0cd754285f5f4f38b653b7ef1c1c14e160ab9729f69d64baffb71`), loaded in VICE 3.10 on 12 November 2026: the credits and copyright lines on its loading screen.

## Features

| Feature | Status | Where |
|---|---|---|
| Title screen with the logo and three heroes' portraits, started with fire on port 1 | live | `wait_fire`, `$11EB` |
| Three playable heroes, Jack Burton, Wang Chi and Egg Shen, the active one lit in the panel | live | `highlight_portrait`, `$22FB` |
| Switching between the heroes at will, the other two following | live: keys B, C and S, and RETURN for the next living hero | `switch_hero`, `$1469` |
| One street walked from right to left: Chinatown, the sewers, Lo Pan's halls and the temple | confirmed: the parts drawn from the map; Chinatown and the sewers seen in play | `$0221`, `PART_STARTS` on the Maps page |
| One enemy at a time from the left, its kind picked from the street section's list | confirmed | `enemy_control`, `$127A`; `spawn_lists`, `$122C` |
| Energy that drains with blows and with time, 41 points a hero | confirmed; the timer live | `tick_energy`, `$23F6` |
| Jack's gun, Wang Chi's sword and Egg Shen's potion, 20 uses each, earned by score | traced | `place_bonus`, `$26C6`; `bonus_thresholds`, `$2603` |
| Food and a strength potion earned by score | traced | `check_threshold`, `$2716` |
| Monsters in the sewers that cannot be killed (Commodore User calls them dragons) | confirmed: faces drawn into the street at 16 places, seen in play | `items_update`, `$20D2`; `hazard_x`, `$20B2` |
| Lo Pan floating above the heroes at the temple | confirmed: seen with the scroll set to the temple | `boss_appear`, `$1372` |
| Taking the prize ends the game with GAME OVER | live, with the prize's bytes set by hand | `$21DB`, `draw_game_over` `$28FB` |
| Pause with fire on port 1 (the review's Pause key) | live | `pause`, `$11E0` |
| Sound effects through the SID | confirmed: eight effects, the Sound page plays them on the game's code | `start_sound`, `$2A8C`; `sound_update`, `$2AA6` |
| Music | differs: there is none; the jingle is effect 3 struck 29 times | `jingle`, `$2B44` |
| Two video banks flipped every frame, with a raster-interrupt sprite multiplexer | confirmed | `$0622`, `$0763`, `$0A68` |

## Beyond the documentation

- The disk image is a freezer-style crack, so the game's own loader and any copy protection are not in it (`orientation.md`).
- An enemy that walks off the right takes its points off the score (`score_lost`, `$1C0A`): traced.
- Two sound effects, a thirteenth spawn list of four Lo Pans and a 2,500-point table entry are never used: traced.
- The cassette's loading screen credits game and graphic design to Focus, and code and effects to M D Software and Edwin Rayner, calls the game a Software Studios production, and gives the program's copyright as 1987 Electric Dreams Software; under its last line, black on black, is an unfinished copy of `Electric Dreams S`: live, on the cassette (`graphics.html#loading`). Its title picture is the game's title screen, the same in all 64,000 pixels.

