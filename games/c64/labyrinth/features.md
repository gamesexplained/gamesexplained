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
| Enter a player name | live | A player name was accepted; its captured value is anonymized in the published listing. |
| Choose gender and favorite color | live | M and BLUE were accepted; `reference/opening-anonymous.png`; the setup screenshots were removed for privacy. |
| Text opening before the graphical adventure | live | `reference/opening-anonymous.png`; the cinema sequence leads to `reference/maze-intro.png`. Graphical gate movement and the first brick corridor were reached in the continuation. |
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


## Checked gate approach

Observed with ordinary joystick input: aligned up from the natural gate starts the scripted corridor entry; left and right approaches stop at depth 24. The classifier, depth threshold, sound/delay sequence and deferred scene request are traced and tested in `parts/scene-01/facts.md` and `test_gate.js`. Remaining graphical movement and puzzles are open.


The gate resource’s seven stored introduction messages and phase/countdown selection are traced and checked against original-code execution. The player-name insertion is tested. Ordinary presentation of the complete speech and its early-phase fire skip remain open.


Joystick-port-one fire is **live** as the producer of the introduction interruption latch: press/hold/release/re-press checked. Its phase-below-seven skip is traced and tested in isolation; full speech replay remains open.

## First-corridor route evidence

- Confirmed live: ordinary movement along the corridor and into opening column 8 loads the Brick Hallway with entry 35, at X=2272/depth 6.
- Traced and original-code checked: eight opening columns, wall/opening approach bounds, four route banks, and the PRNG bank selector. Every stored opening selects the Brick Hallway.
- Open: the other seven complete walking approaches, other destination entry positions, reverse links and remaining corridor interactions.

## Brick Hallway arrival behavior

- Live: up from the checked arrival reaches depth 24; down reaches depth 0. Both trials retain scene 3.
- Live: OPEN DOOR at X=2272/depth 6 displays “Nothing happens.” One command dispatch was observed.
- Live: approaching the neighboring door at X=2348/depth 24 and using OPEN DOOR changes it from closed to open. The room stays scene 3.
- Live: walking through that doorway reaches entry 12 / column 12 in the same Brick Hallway.
- Open: the alternate entry 44, other door positions, and the route back to the first corridor.

## Column-12 panel

- Live: ASK DOOR says “There's no door here.” OPEN DOOR says “Nothing happens.” Up reaches depth24 while retaining scene3.
- Traced and original-code checked: cell1/type11 fails ASK's type2/3 prerequisite; failure bypasses the handler continuation.
- Open: other interactions at the panel and the route back.

## Alph and Ralph controlled-room check

CALL ALPH beside the left door made Alph visible; three ASK ALPH commands gave the opening warning, the Brick Hallway door request, and the refusal to continue. Positive call/ask checkpoints accompany the live captures in `reference/alph-0-call.png` through `alph-3-ask.png`. The room was selected in memory, using the female avatar; ordinary entry, later progress and door outcomes remain open. Ralph's corresponding opening exchange and the shared index across a speaker switch are checked in the continuation below. `parts/scene-04/facts.md` gives the bounded original-code comparison.

## Shared Alph and Ralph opening exchange

Ordinary CALL RALPH and three ASK RALPH commands beside the right door displayed the same three opening replies. Calling Ralph after Alph's first answer kept the shared index1; the next ASK RALPH gave the second reply and advanced it to2. Both trials started inside the forced scene-four reference. Positive handler hits, captured command IDs and the four images `ralph-0-call.png`, `ralph-1-ask.png`, `shared-0-call.png`, and `shared-1-ask.png` support these observations. The later puzzle remains open.

## Opened-door response threshold

The captured Brick Hallway strip has15 door cells, three initially open, and the new-game counter starts at3. The checked first opening raises it to4; repeating OPEN DOOR at that opened door leaves4 unchanged. In a controlled scene-four comparison restoring the same refusal state, count14 retained Alph's refusal and count15 gave thanks for opening the doors. Positive ASK/acknowledgement-store checkpoints and an original-code comparison accompany the captures. The counter was set directly for this response comparison; the complete ordinary fifteen-door journey remains open.

## Closing and reopening a Brick Hallway door

Ordinary CLOSE,CLOSE,OPEN,OPEN at the naturally opened column36 door changed counts4→3→3→4→4 and cells6→7→7→6→6. Successful actions had map-mutation hits; repeated commands had positive handler hits and already-closed/opened replies without another mutation. The page's cycle and CLOSE decision are checked against the original code. This establishes the checked door sequence, while other commands and complete persistence remain open.

### Post-thanks conversation

Confirmed in a controlled room: after the count15 thanks, three ordinary ASK ALPH commands gave “Figure it out for yourself.” Phase1, index2 and the nonzero local flag were retained. Original-code comparisons check every phase-one index/flag pair and the two new texts. The ordinary left-door cycle below reaches the zero flag. The complete ordinary door route and later phases remain open. Evidence: `parts/scene-04/facts.md`, `test_guard_after.js`, and the two `guard-after-thanks` reference captures.

### The guard door changes the answer

Confirmed within the controlled thanks room: walking up to depth24, opening the left door, asking Alph, closing it and asking again gives the unsure response then “Figure it out for yourself.” The local flag changes while the Brick Hallway count remains15. Original-code tests check the bounded left-door decision for all flag/depth bytes and the actual page sequence. The checked selector1 left-door continuation reaches The Wall of Hands, as recorded below. Other outcomes and higher phases remain open. Evidence: `parts/scene-04/facts.md`, `test_guard_door.js`, and five `guard-door` captures.

### Left doorway continuation

Confirmed inside the controlled guard-room setup: ordinary up input through the opened left door with selector1 gives the entry reaction, advances guard phase1→2 and loads The Wall of Hands at entry1. Arrival at X84/depth6 is captured. The entry choice, phase advance, successful countdown and reaction text are compared with original code. Other door/selector outcomes, ordinary entry to the guards and Wall of Hands mechanics remain open. Evidence: `parts/scene-04/facts.md`, `test_guard_entry.js`, and the three `guard-entry` reference captures.

### Right doorway in the controlled guard setup

Live-confirmed: ordinary movement and OPEN DOOR at the right doorway from the count15/phase1/selector1 setup reaches the falling message, “Ok, we lied. It wasn't endless,” and the loss panel. Original entry/countdown routines and all three text records are checked by test_guard_right.js. This complements the left-door Wall of Hands route within that setup. Other selector setups, the ordinary arrival from the Brick Hallway and post-loss restart remain open.

### Guard doorway selector

Traced and live-checked in the controlled scene4 entry: a guarded setup prefix stores one bit from a random result at$8F06, then a second bit at$8F07. The guard changes$FF→0 and the bits stay fixed over240 idle frames while random state advances. Explicit seed0/seed7 comparisons give selectors0/1. Original-code tests sweep65,536 states and256 guard bytes. The second bit changes the later answer described below. Reset on ordinary return visits and complete selector0 door traversals remain open.

### Later guard answer

Traced: the later ASK branch has three fixed replies followed by a capped castle/death answer, selected by equality of the two stored random bits. Live controlled phase4/index3 ASK ALPH trials with doorway selector1 show death for second0 and castle for second1. The marked speaker flag and answer pointers are checked against original code for32 valid combinations, with five original text expansions. The congratulations command is checked below. The controlled phase4 departure reaction is checked below; ordinary phase4 arrival remains open. Evidence: parts/scene-04/facts.md, test_guard_late.js and guard-later reference captures.

### Congratulating a guard

Live-checked with Alph in controlled room trials: phase4 requires his fourth later ASK before congratulations selects the lying/truth reply and remembers speaker0. Before asking, he says he hasn't done anything yet. INSULT then CONGRATULATE gives fickle and clears the insult flag. Earlier phase1 gives Don't mention it. Original-code comparisons cover both accepted speaker prerequisites and byte boundaries; live Ralph congratulations, ordinary phase4 arrival and the ordinary phase4 departure route remain open. Evidence: parts/scene-04/facts.md, test_guard_congratulate.js and guard-congratulate reference captures.

### Reaction after congratulating Alph

Live-checked: ordinary left-door movement inside the controlled phase4 snapshots gives the generic reaction when no guard is selected. After congratulating Alph, the other speaker gives the lying/truth accusation according to the second bit. All three queue at depth42 and complete before phase advancement. These snapshots retain40/44 thresholds from earlier setup; the original setup prefix writes54/64 when entry phase is at least2. The reaction gates, output selection and setup prefix are compared with original code. Ordinary phase4 arrival, remembered-Ralph live departure and other complete destinations remain open. The three controlled left-door loads are checked below. Evidence: parts/scene-04/facts.md, test_guard_reaction.js and guard-reaction captures.

### Later left-door destination

Live-confirmed from the three controlled phase4 reaction snapshots: unselected, Alph-lying and Alph-truth departures all request scene5/entry1 and arrive at the Wall of Hands at X84/depth6. Phase4 is retained by the capped increment. The resident request hand-off is compared with original code; the three real completed loads establish the destination. Ordinary phase4 arrival in the guard room, other full traversals and Wall of Hands mechanics remain open. Evidence: parts/scene-04/facts.md, test_guard_load.js and guard-later-arrival.png.

### Wall of Hands: interaction checklist

At the checked scene5/entry1 arrival, the live word wheels offer ASK and MANICURE, and the WALL object. ASK WALL and its automatic first question are checked below. The first MANICURE WALL comparison is checked below. Its stages after the ninth command, the command gate’s producer, other hand movement, exits and destinations remain open; the ninth-command Stone Corridor route is checked below. The steady snapshot remains scene5/X84/depth6 after120 idle frames; this follows the controlled phase4 guard departure. The arrival image and the available words establish the starting state, not the complete room's mechanics.

### The hands’ conversation

Live-confirmed: the room automatically asks the first of five questions, then five isolated ASK WALL commands cycle through the remaining replies and back to the opening. The original ASK handler, rejection gate, automatic prefix and all reply text are compared with the page. The part has its own snapshot/listing. MANICURE WALL stages after the ninth command, the gate’s producer, other movement and exits remain open; the ninth-command route is checked below. Evidence: parts/scene-05/facts.md, test_wall_ask.js and wall-ask captures.

### First MANICURE WALL

Live-checked missing shears at the unchanged arrival, explicitly added usable shears, and explicitly added shears with a negative damage flag. Replies are no tools, A manicure? How nice of you!, and Your shears were damaged. Only the accepted first command advances the counter0→1; both item-present trials retain item0. Original-code comparisons retain the real gate and inventory reader. Ordinary shears acquisition/damage and counter stages after the ninth command remain open. Evidence: parts/scene-05/facts.md, test_wall_manicure.js and wall-manicure captures.


### Seven MANICURE WALL replies

Live-confirmed in one controlled item-present session: seven ordinary commands advance counts0–7 and select the seven documented replies, ending with the green-liquid question. All retain the supplied shears unit. The original-code comparison covers initial counts0–6, gate/item/damage refusals, all byte values in the bounded selection prefix, and seven original text parses. The eighth-count path and ninth-command local departure are checked below; other room progression remains open. Evidence: parts/scene-05/facts.md, test_wall_manicure_sequence.js and wall-manicure-2..7 captures.


### Eighth MANICURE WALL: one hour later

Live-confirmed from the saved seventh-command sequence: the eighth command advances count7→8 and displays One hour later... . Hours12 become11 while minutes51 and the supplied shears unit remain unchanged at the decrement. The room is visible again after the event with counter8. A separate explicit zero-hour control just before the decrement reaches the time-expired panel. Ordinary acquisition and restart persistence remain open. The ninth-command departure is checked below. Evidence: parts/scene-05/facts.md, test_wall_eighth.js and the hour/return/expired captures.


### Ninth manicure: release into the Stone Corridor

Live-confirmed from the saved eighth-command return: the ninth ordinary command repeats the first reply, advances count8→9 and sets movement state12. No further input is needed for the captured descent and scene6/entry7 request. The actual loader reaches X480/depth6 in the Stone Corridor. The command retains the supplied shears unit. This is a local route with controlled item supply and the earlier controlled guard-room setup; ordinary acquisition, other hand interactions, and Stone Corridor gameplay beyond the checked first door remain open. Evidence: parts/scene-05/facts.md, test_wall_release.js and the ninth-command/Stone Corridor arrival captures.


### Stone Corridor: arrival checklist

Live arrival from the ninth-manicure route is scene6/entry7, X480/depth6. The screenshot shows a closed door to the left and an archway to the right. The captured resident word wheels offer OPEN, CLOSE, ASK, and DOOR among their general entries; availability alone does not establish a useful local action. Confirmed: arrival and nearby OPEN DOOR, followed by its already-open response. The first-door crossing is checked below. Open: other door/archway traversals, NPC encounters, items, and other routes. The shears and prior controlled setup remain part of this local route’s provenance.


### Stone Corridor: first door

Confirmed: OPEN DOOR at X480/depth6 gives Nothing happens. Ordinary movement stops at X147/depth6, column2, where OPEN changes cell1→7 and the door visibly opens. Repeating OPEN gives It’s already opened. The original query and mutation run in the comparison. The first door’s CLOSE and local crossing are checked below. The separate column24 check and persistence remain open. Evidence: parts/scene-06/facts.md, test_stone_door.js and stone-door captures.


### Stone Corridor: close and cross the first door

Live-confirmed from the opened X147/depth6 state: CLOSE changes cell7→1 and visibly shuts the door. Repeating CLOSE gives It's already closed. A separate continuation restores the opened state and uses up input, reaching X159/depth40 before requesting refresh0/entry30. The completed arrival is X1952/depth6 in scene6, beside an arch and bars. This route retains the earlier controlled setup and stored selector96. Other doors, return traversal, entry initialization and save/reload persistence remain open. Evidence: parts/scene-06/facts.md, test_stone_close.js and stone-door-closed/already-closed/crossed captures.


### Stone Corridor: through the archway

Live-confirmed: up input at the reached column30 archway leads through depth70 to refresh0/entry26 and arrival X1696/depth6 in scene6, with a ladder visible on the left. A300-frame no-input control stays at the arch. The first opened cell remains7 across this in-room refresh. The original exit and nonnegative placement prefix agree with the page’s recorded route and reused placement calculation. A return to the first door and save/disk-load persistence remain open. The ladder is checked below. Evidence: parts/scene-06/facts.md, test_stone_arch.js and stone-arch-threshold/arrival captures.


### Stone Corridor: climb the ladder

Live-confirmed: ordinary movement aligns at X1633 in column25, then up input starts a ladder climb at depth24. Releasing input at the accepted branch still completes it. The actual exit requests5/1 and loads the Wall of Hands at X84/depth6, where the opening question reappears and the manicure counter is0. Off-centre X1641 and1637 trials remain at depth24 after600 up frames. The original alignment gate accepts offsets28–35 inclusive within this ladder column; its state dispatcher, climb completion and actual exit are checked. Ordinary acquisition, a complete return to the first door, and save/restart persistence remain open. Evidence: parts/scene-06/facts.md, parts/scene-05/facts.md, test_stone_ladder.js and ladder captures.
