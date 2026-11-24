# The Last Ninja — features

## Sources

Read 22 November 2026. The [original instructions](https://heechee.net/c64/ninja/manual1.php) describe cassette operation, controls, items and lives. [The Last Ninja – C64-Wiki](https://www.c64-wiki.com/wiki/The_Last_Ninja) gives the level order and documented keyboard shortcuts. The local screenshots show the supplied Side 1 tape running on VICE.

| Feature | Status | Evidence or question |
|---|---|---|
| Automatic cassette loading | live | Cyberload boots straight to the Wastelands. Side 1 carries chapters A–C and Side 2 carries D–F. Switching to Side 2 in the loader brought up the Dungeons. |
| Relative movement on joystick port 2 | live | Right moved the player in each of the six chapters in 24 PAL frames. Diagonal movement, turning and walking backwards are documented and open. |
| Attacks and defence | traced | The contact test uses attack class and direction to choose its four bounds, then checks the defender’s pose. Tested the standard attack family for all six weapon slots. A native input test matched the fire script selection for eight directions and six weapons. Following each selected script through the fight remains open. |
| Somersaults and hazards | open | The manual describes three jump lengths and distinguishes starting with movement from starting with fire at obstacles. |
| Crouch, search and pickup | traced | Facing changes the hand’s pickup rectangle test. Direct calls verified both orientations and the item-slot gate. A new fire press while moving checks for an item on wider turns. Holding fire and choosing an odd heading also checks the item outside boundary actions 16–19. A live test collected the final scrolls. |
| Object and weapon selection | traced | F3/F5 cycle occupied item slots and Space cycles available weapons. The Run/Stop branch sets the forfeit request. |
| Pause and game speed | live | F7 holds the game tick. Shift and plus or minus change the CIA timer period. Measured both speed changes in the Wastelands. |
| Weapon and puzzle items | open | Staff, sword, nunchaku, shuriken, smoke bombs, sleeping potion, amulet, claw, flower, glove, key, pouch, rope, apples and scrolls. Check inventory limits and where each item is used. |
| Shrine and fountain hints | open | The instructions describe prompts to collect nearby items. Check activation and the relation between hint and pickup. |
| Status panel | live | The opening play screen shows Enemy, Wounds, Using, Holding, Power and Weaponry. The item painter and both panel positions matched their stored bitmap bytes. The weapon colours depend on the owned slots. The raster interrupt moves the power meter towards its new value one cell at a time. |
| Life count and retry | traced | The chapter-exit routine converts an apple to a life and saves the inventory. It carries at least two lives out of the Wastelands if the player leaves with one. Respawn location during play remains open. |
| Temporary Ninja Magic | open | The manual describes hidden pickups that produce short-lived effects without a Found notification. |
| Six areas and the scrolls | live | Wastelands, Wilderness, Palace Gardens, Dungeons, Palace and Inner Sanctum all reached gameplay. A VICE test staged room 15 and collected the scrolls by joystick, reaching the closing card. The route to that room and its hazard requirements remain open. |
| Music | confirmed | The two tapes supply six loading tracks and six gameplay tracks. The player checks timed SID writes from both sets of entry points. F1 mutes and resumes the gameplay tune in place. |

## Captures

- [Cyberload title image](reference/cyberload-title.png)
- [Opening Wastelands screen](reference/wastelands-start.png)
- [Wilderness](reference/play-wilderness.png)
- [Palace Gardens](reference/play-palace-gardens.png)
- [Dungeons](reference/play-dungeons.png)
- [Palace](reference/play-palace.png)
- [Inner Sanctum](reference/play-inner-sanctum.png)
