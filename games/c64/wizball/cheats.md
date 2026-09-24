# Wizball — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Collisions stop ending lives, except during "colour completed" and the bonus stage (the game's own BOREWIZ flag) | `$BB07` = 7 in play, or type B O R E W I Z on the title or the player menu | live: the flag set by typing, and a poked collision ignored with it set |
| Start any of levels 1-6: the continue keys accept up to this level | `$AF7D` = 5 on the title, then press 0-5 | live: key 4 started level 5 with levels 1-4 marked done |
| Complete the current colour: the level's first target is red on level 1 | red cauldron `$B12B` = 20 in play (green `$B12C`, blue `$B12D`; the recipe for each colour is at `$B2C0`) | live: "colour completed" 22 frames later |
| A shield for 36 seconds | `$7F06` = 40 (the cat's copy `$89B6`) | live: counted down one unit per 50 frames; a collision cost 8 units and no life |
| The next kill leaves a pearl | `$A9A9` = 8 | live |
| Wizballs left for side 1 and side 2, the one in play included (the HUD shows one less, up to 9) | `$B278`, `$B279` | candidate: read during play (2 after a first life lost), not poked |
