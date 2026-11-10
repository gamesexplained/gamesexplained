# R-Type — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, "R-Type - C64-Wiki", https://www.c64-wiki.com/wiki/R-Type, read 10 November 2026 (through a fetching agent's summary)
- Games That Weren't, "R-Type V1 (C64) - 1988 Electric Dreams - GTW64", https://www.gamesthatwerent.com/gtw64/rtype-v1, read 10 November 2026
- Wikipedia, "R-Type", https://en.wikipedia.org/wiki/R-Type, read 10 November 2026
- MobyGames, R-Type trivia, https://www.mobygames.com/game/r-type/trivia, read 10 November 2026
- Commodore User issue 65, review by Tony Dillon, https://everygamegoing.com/larticle/r-type/54089, read 10 November 2026
- The game's own title screen and in-game messages, seen in the emulator

## Features

| Feature | Status | Where |
|---|---|---|
| Horizontally scrolling shoot-'em-up, one player, joystick in port 2 | live | |
| Title screen: F1 starts a one-player game, F7 pauses (title text) | live (F1) | |
| Eight stages: The encounter, The living cave, The huge battleship, Fortress at the front, The nest, The transport system, A destroyed city, The heart of the Bydo empire (C64-Wiki) | live | each loaded as three files (A-X); all eight reached on 10 November 2026, `facts.md` "Live tests" |
| Each stage loads from tape (disk in this crack) after the one before is won | live | loader at `$6200` |
| Short press of fire fires the standard shot; holding fire charges the beam, shown on the BEAM bar | confirmed | `fire` `$3B74`, `charge_beam` `$40D1`, `release_beam` `$40EC` |
| The Force: a pod that docks at the front or the back of the ship, detached and recalled with space (C64-Wiki) | confirmed | `force_control` `$2A12`, `force_dock` `$2953` |
| The Force upgrades in three stages from laser crystals; undocked it fires three or five shots (C64-Wiki) | differs | the first crystal brings it and later ones raise it to level 4 (`collect` `$1B61`); a free Force fires one, two or four shots by level (`fire` `$3B74`) |
| Pickups from bonus containers: reflection laser, anti-aircraft laser, ground laser, homing missiles, extra speed, shield orbs (C64-Wiki) | confirmed | crystals by colour: red wave `$4CB3`, blue reflecting lasers `$42FA`, yellow crawling lasers `$47A1`; missiles `$1CBC`, speed and bits in `collect` `$1B61` |
| F7 turns the music on and off; Shift Lock pauses (C64-Wiki); the title says F7 pauses | differs | F7 pauses and fire resumes (`$0E85`); the music driver runs before the pause test, so the music plays on; no other key is read there |
| Three lives shown as ship icons; score for player 1; GAME OVER, then "PLEASE REWIND TAPE THEN PRESS F1 TO START" | live | |
| "READY" before each life | live | |
| A boss at the end of each stage | differs | bosses in stages 1, 2, 4, 5 and 8; stages 3, 6 and 7 end when the waves are gone (each stage's `facts.md`) |
| No high-score table is saved (C64-Wiki) | traced | GAME OVER goes straight to a cold start that loads stage 1 again (`game_over` `$5E47`); no score table was found in the code |
| Two-player code present but unused (C64-Wiki) | confirmed | the prompt loop at `$5EAA` loads where it should store, and only F1 is accepted (`two_players` `$2820`) |
| Music by Chris Hülsbeck (C64-Wiki) | live | the ending's credits name Ramiro Vaca and Chris Hülsbeck (ending, `$8373`) |
| An ending after stage 8 (MobyGames says there is none; the disk holds a ninth load, Y, which the loader jumps into at `$8000`) | live | reached after stage 8 on 10 November 2026 (ending, `ending_start` `$8000`) |

## Beyond the documentation

- MobyGames says stage 6 (The transport system) was dropped from the C64
  version. Files P, Q and R are that stage, with its own map and frame
  routine (level-6, `stage6_frame` `$9286`), reached live.

- The crackers (Oneway) added a key: `←` during play sets the "stage won"
  flag and loads the next stage (`$6290`, on the interrupt). Found by
  reading the loader; used for the route.
- Credits are stored as text in four places in the program, in plain
  PETSCII or screen codes, prefixed "EVEN:", "ALWAYS:" and "AND AGAIN:"
  (`$36AB`, `$3CFD`, `$429E`, `$5A86`).

## Open questions

- The reference screenshot `reference/level-1-later.png` shows a blue
  lattice that is not in stage 1's map; where it was taken is unknown.
