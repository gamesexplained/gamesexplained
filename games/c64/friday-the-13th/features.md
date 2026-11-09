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
| Boots from the disk, shows a licence screen, waits for a key | live | the wait loop at `$2DA1` |
| Introduction shows the five characters' portraits with their names | live | |
| Character profiles: Gerry King, Wendy Watson, Amanda Baxter, Bryan Bone, Stuart Palmer, each with a paragraph of text, then "PRESS FIRE BUTTON." | live | text at `$962B` to `$9A23` |
| The player is one counsellor, picked at the start of each round | open | |
| Free roaming in rooms seen in perspective (church seen in play) | live | |
| Outdoor scenery seen from the side | open | |
| Fear meter drawn as a blonde head with a bar | live | |
| Score shown as seven digits | live | |
| Weapon slot beside the score | open | |
| Row of the other counsellors' pictures at the bottom of the screen | live | |
| Weapons picked up around the camp (chainsaw, pitchfork, machete and others) | open | |
| Jason disguised as one of the friends | open | |
| Death scene: "YOU SEEM TO HAVE LOST YOUR HEAD. WHAT A SHAME......HA HA HA" | open | text at `$944E` |
| Time limit: "YOU RAN OUT OF TIME BEFORE YOU FOUND HIM." | open | text at `$94CE` |
| Win: "CONGRATULATIONS ! JASON IS DEAD.....BUT FOR HOW LONG ?" and a bonus | open | text at `$95A1` |
| Five levels | open | |
| Title music and sampled scream | open | |

## Beyond the documentation

Nothing yet.

## Open questions

- How the five levels differ.
- How Jason's disguise is chosen and how a hit reveals him.
