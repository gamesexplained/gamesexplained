# Green Beret — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, "Green Beret", https://www.c64-wiki.com/wiki/Green_Beret
  (last edited 22 May 2022), read 28 October 2026: credits, controls,
  weapons, enemy colours, the four stages and their end bosses, hints,
  the "hold 1 in a jump" cheat. Its two animations and its cover scan are
  in `reference/` as `ext-c64wiki-*`.
- The game's own screens: the loading picture, the title page ("PRESS FIRE
  TO START", "PROGRAMMED BY D C", "SOUND BY M G", "GRAPHICS BY S W",
  "1986 LICENCED BY IMAGINE 84"), the "RESCUE THE CAPTIVES" opening, and
  the status line ("LIVES", "SCORE", "HI SCORE", "STAGE").

## Features

| Feature | Status | Where |
|---|---|---|
| Loading picture with music, waiting for a key or the stick before the game unpacks | live | the loader at `$CE8C` (not annotated) |
| Title page, "PRESS FIRE TO START", fire on port 2 starts a game | live | |
| Opening scene "RESCUE THE CAPTIVES": four captives tied to posts, guards walking | live | |
| Four stages: Missile, Harbour, Bridge, Prison Camp (names in the code at `$0697`) | open | |
| Joystick in port 2: left and right walk, up jumps or climbs a ladder, down lies down or climbs down, diagonals jump left and right | open | |
| Fire stabs with the knife | open | |
| Space fires the extra weapon (flame thrower 3 shots, bazooka 4, hand grenades 3) | open | |
| Run/Stop pauses, fire continues; Q in pause ends the game | open | |
| Weapons dropped by the white enemies, picked up by walking over them | open | |
| Enemy types told apart by colour: white (stands, drops a weapon, climbs ladders), blue (shoots, climbs), brown (runs; later crawls or carries a bazooka), green (jumps at you; skydivers on the Harbour), green-black (mortar), dogs (Harbour boss), grey-blue (grenades, Prison Camp boss) | open | |
| End boss announced by a siren after reaching the end of a stage; Missile: a truck letting out waves; Harbour: green soldiers with dogs; Bridge: helicopters; Prison Camp: waves from both sides | open | |
| A jet bombs the player who stays in one place too long | open | |
| Mines on the ground hurt only the player | open | |
| Checkpoints within a stage: a life lost restarts from the last one passed | open | |
| 2 lives at the start ("LIVES 2"); an extra life every 25,000 points | open | |
| Points for each enemy hit | open | |
| Between stages, the hero climbs over a fence into the next stage | open | |
| End: "CONGRATULATIONS", "MISSION ACCOMPLISHED", "NOW PROCEED TO NEXT CAMP", and the game starts again | open | strings at `$FD93` |
| "GAME OVER" | open | string at `$FD86` |
| "WELL DONE", "TARGET OVERCOME" between stages | open | strings at `$7ABA` |
| Siren at the start of a stage, drum roll during play, loading tune and end tune by Martin Galway | open | |
| High score kept between games ("HI SCORE") | open | |
| Cheat: hold 1 during a jump and the player hangs in the air until it is released | open | |

## Beyond the documentation

Found in the code, not in the manual.

## Open questions
