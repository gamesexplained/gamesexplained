# The Spy Who Loved Me — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The manual, all versions, archive.org `TheSpyWhoLovedMe`, read 2026-11-17
- Zzap!64 69 (January 1991), Your Commodore 74 (December 1990), Commodore
  Format 4 (January 1991) reviews, scans on archive.org, read 2026-11-17
- The game's credits screen (`reference/credits.png`)
- The full list with links: `/mnt/project-files/the-spy-who-loved-me/research.md`
  in the contributor's project, summarised on the About page

## Features

| Feature | Status | Where |
|---|---|---|
| Joystick in port 2 (credits screen) | confirmed | `$3774` reads `$DC00` |
| SPACE pauses, C= toggles the music (credits screen) | confirmed | `read_keyboard` `$3724` |
| Scene 1: car from the harbour, then a speedboat to Atlantis (manual) | live | sections 0 and 1, `enter_water` `$33C5`; `reference/harbour-road.png`, `pier.png` |
| Q tokens collected on the road (manual) | confirmed | collision handler `$308C`, `$6A/$6B` BCD |
| Q-truck: drive in to buy weapons and repairs (manual) | live | `q_truck_contact` `$310D`, overlay `q_truck_shop` `$428C`; `reference/q-truck-shop.png`, a purchase observed |
| Sub capability for 75 tokens, needed to reach the sea bed (manual, Your Commodore) | confirmed | `shop_items` `$4000`, `hit_ramp` `$3237` tests `$65` |
| Road goes round until the car dives (Your Commodore) | confirmed | event 3 at `$8CCD` restarts section 2's map and list |
| Underwater: bolts, torpedoes, laser (manual) | confirmed | stores `$62-$64` moved to `$5C-$5E` by `section_3` `$1A6A` |
| Scene 5: wet bike on the open sea (manual, Zzap!64) | live | section 4, `reference/open-sea.png` |
| Game wraps round after the last stage (Zzap!64) | confirmed | `section_end` `$26E4` back to section 0 |
| Innocent people cost points (Commodore Format: 50) | differs | `hit_person` `$2F85` takes 500 |
| Smoke screen as a rear defence (manual) | confirmed | `make_smoke` `$391D`, `$5A` |
| Scenes 3, 4 and 6 (supertanker, puzzle, Jaws) | open | marked 16-bit only in the manual; no trace in the C64 code or data |
| James Bond theme (HVSC tune 1) | confirmed | tune 0 at `tune_table` `$F43F`; `test_music.js` |
| High-score table with three-letter names | live | overlay `game_over_scores` `$4187`; `reference/game-over.png` |

## Beyond the documentation

Found in the code, not in the manual.

- The development link at `$0810` and the parking loop at `$0A00`.
- Score signs show a tenth of the points scored (`add_score` `$2C9F`).
- The armour's price falls back as the damage passes each quarter
  (overlay `show_item` `$447C`).
- Tunes 6 and 7 are never started; the voice-3 test at `$EA82` is for
  tunes from 40 up.
- A lost life empties the stores of sea-bed weapons (`after_death` `$3979`).
- RESTORE is ignored (`nmi_ignore` `$119E`).

## Open questions

- None that the pages depend on.
