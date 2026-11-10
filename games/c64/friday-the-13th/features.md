# Friday the 13th — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The game's own screens and stored text, read from the play snapshot's string sweep (`$944E` to `$9A23`), 9 November 2026.
- Wikipedia, "Friday the 13th: The Computer Game", read 9 November 2026: Domark, 1986, C64, Amstrad CPC and ZX Spectrum; five levels; the player is a random character each round; weapons lie about the camp and its buildings; a fear meter shows as a blonde woman's head; Jason often appears disguised as one of the friends.
- ZZAP!64 issue 10 (street date 9 January 1986), as quoted on the GameBase64 "Game of the Week" page, read 9 November 2026. Second-hand: the fetch tool could read the page but the review is a reviewer's opinion, not a statement of mechanics.
- The C64-Wiki has no page for this game (9 November 2026).

## Features

| Feature | Status | Where |
|---|---|---|
| Boots from the disk, shows a licence screen, waits for a key | live | intro `show_text_screen` `$29D4`, `wait_key` `$2D9B` |
| Introduction shows the five characters' portraits with their names | live | intro `show_portraits` `$2989` |
| Character profiles: Gerry King, Wendy Watson, Amanda Baxter, Bryan Bone, Stuart Palmer, each with a paragraph of text, then "PRESS FIRE BUTTON." | live | `choose_counsellor` `$92AD`, texts `$962A` to `$9A22` |
| The player is one counsellor, picked at the start of each round | differs | not picked: each round won moves to the next counsellor, Gerry to Stuart and round again (`round_won` `$925E`); a game over starts again from Gerry (`new_game` `$921E`) |
| Free roaming in rooms seen in perspective (church seen in play) | live | `draw_room` `$A2A2`, `walk_player` `$AA86` |
| Outdoor scenery seen from the side | confirmed | 24 outdoor rooms in a 4 by 6 grid, drawn over a flat grey field (`draw_backdrop` `$A909`); drawn on the Maps tab with the game's routine |
| Fear meter drawn as a blonde head with a bar | live | `draw_fear_head` `$C15C`; the bar is the danger clock (`draw_danger_bar` `$C191`) |
| Score shown as seven digits | live | six stored digits and a 0 (`print_score` `$C3E4`) |
| Weapon slot beside the score | confirmed | sprite 6 moved into the box by `irq_play` `$A71B` |
| Row of the other counsellors' pictures at the bottom of the screen | live | `draw_counsellors` `$C09C` |
| Weapons picked up around the camp (chainsaw, pitchfork, machete and others) | confirmed | ten weapons and a cross in random rooms (`start_play` `$9A7D`), used by `use_weapon` `$B5C4`; the pictures include a pitchfork, a knife, and an axe |
| Jason disguised as one of the friends | live | `pick_jason` `$9B5F`, `jason_reveal` `$A24C`; seen to reveal in a live test |
| Death scene: "YOU SEEM TO HAVE LOST YOUR HEAD. WHAT A SHAME......HA HA HA" | confirmed | text 0 at `$9428`, printed by `new_game` when the player's state is 0 |
| Time limit: "YOU RAN OUT OF TIME BEFORE YOU FOUND HIM." | live | `danger_clock` `$0821` at `$C0`; poked to `$BE`, the screen came 13.1 s later |
| Win: "CONGRATULATIONS ! JASON IS DEAD.....BUT FOR HOW LONG ?" and a bonus | confirmed | `round_won` `$925E`, run on the kit's processor: 100 points a survivor |
| Five levels | confirmed | five rounds, one for each counsellor; each round won adds 1 to the strength Jason's blow takes (`$09EF`, `jason_blow_lands` `$BD9D`) |
| Title music and sampled scream | differs | the introduction plays the scream and no music (intro `$2900`); the theme, tune 0, plays in the game (`play_tune` `$C4D8`); the scream is a 1-bit sample (`play_scream` `$3600`) |

## Beyond the documentation

- Jason can pick a dead friend as his victim and kill them again (live; Discoveries).
- At fear 80 the panel shows the calmest head (traced; Discoveries).
- The round bonus is 2,560 points with no survivors, more than the 900 for nine (run on the kit's processor; Discoveries).
- One visit to the safe room lets the player send friends to shelter from any room (live; Discoveries).
- Tune 4's room entry is `$FF`, which no room has, so it plays only when Jason reveals himself (traced).
- The footstep sound is switched off by an `RTS` (traced).

## Open questions

- Which counsellor colour Jason is drawn in once unmasked.
- What the disk's bad-checksum sector holds.
