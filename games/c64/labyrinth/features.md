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
| Text opening before the graphical adventure | live | `reference/opening.png`; the cinema sequence leads to `reference/maze-intro.png`. Graphical gate movement and the first brick corridor were reached in the continuation. |
| A theater ticket gates the eastward route past the counter | traced and simulator-checked | `$90F4` checks ticket inventory; `$9327` plus `$087F` charge five dollars. All location/ticket-byte decisions and owned-dollar purchase cases are checked by `test_ticket.js`. Arrival processing remains separate. |
| Reach Jareth through the maze before thirteen hours expire | open | Disk guide pp. 2–3; clock rate and failure behavior untraced. |
| Move the character with joystick port 1 | live | From the saved gate state, 100 right-input frames moved the figure; up input walked through the doorway into the brick corridor. `reference/gate-after-right.png` and `reference/corridor-play.png`. |
| Compose commands from verb and object wheels | live | GO HOME, TAKE CAMCORDER, and the cinema commands changed the displayed state. |
| Space changes the active wheel | live | Used between verbs and objects throughout the opening route. |
| Horizontal cursor keys change wheels; vertical cursor keys scroll | open | Disk guide pp. 7–9; cursor input was not tested. |
| Typing selects matching words | live | Entered words in the active wheels during the opening route. |
| Delete clears the prefix | live and traced | G, Z, O, then Delete produced prefixes G, G, GO, empty. The selected word remained go after Delete. `$61F7`; `test_wheel.js`. |
| Return executes commands | live | Repeatedly exercised in the text adventure. |
| Fire executes commands after the movie starts | open | Disk guide p. 8; graphical play was reached, but command execution by fire has not been isolated in a control test. |
| An invalid prefix flashes the border red | traced; rejection live | Z after G was discarded in VICE. `$612C` writes red to the border on rejection; the simulator checks that write. The flash duration is unmeasured. |
| Scene entry automatically saves to the active slot | open | Disk guide p. 9; verify writes on a working disk copy. |
| SAVE GAME and LOAD GAME use the three slots | open | Disk guide pp. 10–12. |
| Save/load menus stop the clock | open | Disk guide p. 9. |
| Shift plus left arrow restarts | open | Disk guide p. 13. |
| Goblins, oubliettes, the bog, Hoggle, Fireys, Ludo, and Didymus | open | Cassette guide’s introduction documents these encounters; room images captured with forced scene requests; encounter behavior remains unverified. |

## Reference pictures

`wiki-title.png`, `wiki-gate.png`, and `wiki-hoggle.png` are independent C64-Wiki reference screenshots, from the image links on the cited page. They are game imagery, not evidence of states reached in this emulator session. Original game imagery © its owners. Emulator captures use state names and are identified separately in the orientation.

Popcorn purchase: traced and simulator checked at `$93E1`. The first dollar payment costs two dollars and adds one box; a nonzero purchase flag refuses repeat payment. Two complaint phases recover the missing quarter; quarter collection, dropped-nickel pickup and return were verified through ordinary commands. `test_change.js` compares the page example with the original handlers and live scalar observations.

Opening dialogue: all 127 stored streams at `$7910-$833F` and `$968E-$A9E7` decoded and simulator checked, including setup, descriptions, transactions and hints. The original handler entries and pointer tables are described. Artificial state combinations in the tests do not establish ordinary reachability; the counter’s collect-first and complain-first paths are live checked. Later movie-transition timing remains open. Resident messages, sound-event formats, renderer, loader and IRQ services have opening-snapshot annotations; later loaded puzzles remain open.

Nickel disposition: the first accepted return writes `$0575=$FF`; keeping the dropped nickel leaves one. Isolated original-code tests show that an accepted later popcorn offer loses the whole box for one and retains it for `$FF`. The complete later encounter timing remains open.
