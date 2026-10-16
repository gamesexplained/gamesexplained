# Labyrinth: features

## Sources

Read on 17 October 2026:

- [Labyrinth: The Computer Game — Player’s Guide](https://www.mocagh.org/activision/labyrinth-manual.pdf), disk edition, printed pages 3–13. Primary source for the controls and saving below.
- [Labyrinth — C64-Wiki](https://www.c64-wiki.de/wiki/Labyrinth). Secondary source for the opening, character choices, and reference pictures. The manual outranks conflicting wiki claims about saving.
- [Cassette Player’s Guide](https://www.mocagh.org/activision/labyrinth-alt-manual.pdf). Its saving restriction belongs to that edition; it does not establish the disk edition’s behavior.
- Contributor’s two G64 disks, exercised in VICE. Live observations are distinguished from documented features.

## Checklist

| Feature | Status | Evidence / question |
|---|---|---|
| Choose among three game slots with F1, F3, or F5 | live | `reference/title.png` shows the empty-slot menu. |
| Enter a player name | live | EUAN was accepted; `reference/gender.png`. |
| Choose gender and favorite color | live | M and BLUE were accepted; `reference/colour.png` and `reference/opening.png`. |
| Text opening before the graphical adventure | live | `reference/opening.png`; the cinema sequence leads to `reference/maze-intro.png`. Interactive maze play remains open. |
| Reach Jareth through the maze before thirteen hours expire | open | Disk guide pp. 2–3; clock rate and failure behavior untraced. |
| Move the character with joystick port 1 | open | Disk guide p. 4 and p. 6; test in graphical play. |
| Compose commands from verb and object wheels | live | GO HOME, TAKE CAMCORDER, and the cinema commands changed the displayed state. |
| Space changes the active wheel | live | Used between verbs and objects throughout the opening route. |
| Horizontal cursor keys change wheels; vertical cursor keys scroll | open | Disk guide pp. 7–9; cursor input was not tested. |
| Typing selects matching words | live | Entered words in the active wheels during the opening route. |
| Delete clears the prefix | open | Disk guide pp. 8–9; Delete was not tested. |
| Return executes commands | live | Repeatedly exercised in the text adventure. |
| Fire executes commands after the movie starts | open | Disk guide p. 8; no stable interactive maze state reached. |
| An invalid prefix flashes the border red | open | Disk guide p. 9. |
| Scene entry automatically saves to the active slot | open | Disk guide p. 9; verify writes on a working disk copy. |
| SAVE GAME and LOAD GAME use the three slots | open | Disk guide pp. 10–12. |
| Save/load menus stop the clock | open | Disk guide p. 9. |
| Shift plus left arrow restarts | open | Disk guide p. 13. |
| Goblins, oubliettes, the bog, Hoggle, Fireys, Ludo, and Didymus | open | Cassette guide’s introduction documents these encounters; later scenes unreached. |

## Reference pictures

`wiki-title.png`, `wiki-gate.png`, and `wiki-hoggle.png` are independent C64-Wiki reference screenshots, from the image links on the cited page. They are game imagery, not evidence of states reached in this emulator session. Original game imagery © its owners. Emulator captures use state names and are identified separately in the orientation.
