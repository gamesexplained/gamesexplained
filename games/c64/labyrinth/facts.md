# Labyrinth — established facts

This Bronze contribution describes the playable text opening. The graphical continuation has partial gate, corridor, Brick Hallway, and Alph and Ralph analyses plus captured room images; its source partition and annotations are incomplete. The opening listing is in `parts/opening/listing.json`; the partial gate listing and its checked approach/transition facts are in `parts/scene-01/`.

Live screenshots establish the slot menu, character-setup questions, verb/object commands, several city locations, and the transition to a graphical gate scene. Controlled input also demonstrates movement and entry through the gate into the first graphical corridor. The later forced-room images do not establish player reachability or puzzle solutions. See `features.md` for the distinction between documented and observed behavior.

The opening’s code, alphabet, hardware census, and literal string sweep are documented in `parts/opening/facts.md`. The opening ledger describes 48,261 of 48,261 tracked bytes (100%); this includes explicit provenance-only descriptions of 2,365 opaque retained bytes whose purpose is unknown.

## Error rate

An independent fixed-seed sample on 19 October 2026 checked 60 of the 1,303 line comments across the two analysed images (59 opening, one gate), finding two wrong details in the opening; both were corrected after original-code confirmation. A full audit remains recommended.

## Scope

The complete game stays Bronze: the gate, first corridor, Brick Hallway, Alph and Ralph, Wall of Hands, and Stone Corridor are partially analysed and 15 other graphical parts have no analysis, and Silver also needs complete coverage and feature verification across its parts. Shared resident ownership is unresolved, so the combined 16.6% ledger is provisional rather than whole-game progress.

## First corridor

The natural first-corridor image has a partial listing (1,113/48,021 bytes). Its eight captured opening columns select scene 3, The Brick Hallway, across four entry-position banks. Ordinary movement through column 8 loaded scene 3 with entry 35, placing the player at world X=2272/depth 6. The remaining approaches remain open; see `parts/scene-02/facts.md`.

## Published player name

The opening, gate, and first-corridor listings use `work/publish-anonymous.vsf`; the Brick Hallway uses an anonymized `work/play.vsf` copy. Each replaces the entered player name with ANON (or lowercase anon). Original emulator captures remain private. The opening’s named fields fall outside its published records; the gate and corridor listings change only cached name bytes, including the gate speech field. Code, route tables, and measured movement values are unchanged. The two setup screenshots containing the entered name were removed from publication.

## Brick Hallway arrival checks

Ordinary-input trials restored the natural scene-3 play capture at world X=2272/depth 6 before each case. Idle for 120 frames retained depth 6; up for 300 frames reached depth 24; down for 300 reached depth 0. X stayed 2272, current scene stayed 3, and pending scene stayed $FF. Positive execute checkpoint $3423 recorded 12/30/30 hits respectively; $4115 and loader $5098 recorded zero hits in every trial. These bounded observations do not establish the absence of another return route.

The arrival map cell at column 35 ($0623) is zero, translated through $073E to type zero with depth bound 24 at $41F0 and negative exit flag $FF at $4200. Classifier/bound-table bytes $4171-$420F match the first corridor’s retained copy. This is captured scene-3 data, not the first corridor’s map. The direction trials confirm the wall/foreground behavior at this arrival; other positions remain open.

An ordinary keyboard trial typed OPEN, Space, DOOR, Return from the same arrival. Prefixes reached OPEN and DOOR; dispatch fields $6691/$6692 became [37,45]. The wheel service $5D36 ran 52 times and command dispatcher $5F43 once. After another 120 frames, the screenshot showed “Nothing happens.” with OPEN DOOR selected. Current scene remained 3, pending scene $FF and player X=2272/depth 6. This response is established only at the arrival position, not at the visible doors. The original emulator state and normal speed were restored after both batches. Screenshots: `reference/brick-up.png`, `reference/brick-down.png`, `reference/brick-open-door.png`. Raw observations remain private in work/.

## Opening the neighboring Brick Hallway door

The ordinary approach to column 36 (X=2348/depth 24) lets OPEN DOOR change map cell 7 to 6 and refresh the visible door from closed to open, retaining scene 3. The same door has a verified traversal to column 12 within the Brick Hallway; a route back to the first corridor remains unverified. `parts/scene-03/facts.md` records the handler, mutation and original-code tests. The new part has 1,123/48,587 described bytes; seven provisional scopes total 56,118/335,949 (16.7%). Their retained resident ownership overlaps and is not whole-game completion.

`reference/opening-anonymous.png` is an emulator capture of the anonymized publication state, with ANON/anon as the entered name. The original screenshot is private in work/.

## A door within the Brick Hallway

Holding up through the opened column-36 door produced request 0 / entry 12 while current scene stayed 3. The resident path retained that room and placed the player at X=800/depth 6, column 12. The live journey and all 256 selector-source bytes are checked as described in `parts/scene-03/facts.md`. Other entry variants and reverse travel remain unverified.

## Door-shaped panel at column 12

At the checked doorway destination, map cell1 translates to type11. Ordinary OPEN DOOR replied “Nothing happens.” and ASK DOOR replied “There's no door here.” The ASK prerequisite accepts types2/3 in the captured negative map mode and bypasses the remaining handler on rejection. A 300-frame up approach retained scene3 and reached depth24 with positive movement hits and no exit/loader hits. The panel's artwork does not establish acceptance by these commands; other actions and return paths remain open. `parts/scene-03/facts.md` records the live observations and original-code comparison.

## Alph and Ralph opening conversation

Inside a controlled scene-four load with the female avatar, ordinary movement beside the left door followed by CALL ALPH made Alph visible. Three ASK ALPH commands produced the two-door warning, the request to open every Brick Hallway door, and the refusal to say more. The shared conversation index changed0→1→2→2 with progress3. Handler checkpoints, four live captures, 45 original-code decisions and three original reply parses support the bounded stepper. The shared opening conversation is checked for both speakers below; the connecting journey and door puzzle's solution remain open. See `parts/scene-04/facts.md`. Its partial listing adds1,883/48,705 described bytes; seven overlapping scopes total56,118/335,949 (16.7%), not whole-game completion.

The scene-four publication snapshot also replaces the entered name with ANON/anon. Its original forced reference captures remain private.

## Switching from Alph to Ralph

Inside the same controlled room, ordinary CALL RALPH and three ASK RALPH commands beside the right door produced the same three opening replies as Alph, with shared index0→1→2→2. A separate trial restored Alph's first answer, walked to the right door and called Ralph. The call preserved index1; ASK RALPH then gave reply2 and advanced to2. Positive call/ask checkpoints accompany the live captures. The page's switch is checked against both real ASK prerequisite branches and the CALL RALPH path with the query intercepted. Later dialogue and door outcomes remain open. See `parts/scene-04/facts.md` and `test_ralph.js`.

## Guards acknowledge a door count of fifteen

The initial Brick Hallway strip has15 door cells:3 open and12 closed. New-game initialization sets $0569 to3; the checked closed-door OPEN DOOR path increments it. A repeated command at the already-open neighboring door kept count4 and replied “It's already opened.” In the controlled scene-four opening conversation, ASK ALPH at count14 retained the refusal and unacknowledged state; count15 produced thanks and stored15 as the acknowledgement. Each trial restored the same refusal state before changing only the count. Live handler/store checkpoints and1536 original-code comparisons support the page's threshold example; a complete ordinary fifteen-door journey remains unverified. See `parts/scene-04/facts.md` and `test_guard_progress.js`.

## Closing a door reduces the count

At the naturally reached neighboring Brick Hallway door, ordinary CLOSE,CLOSE,OPEN,OPEN produced counts4→3→3→4→4 and map cells6→7→7→6→6. Each command dispatched; only the successful close and reopening mutated the map. Repeats displayed already-closed/opened replies. The new example is compared with65,536 original CLOSE decisions and20 complete classifier/mutation calls, including the page's exact state and sequence. The repeated cycle restores its starting count; other commands, room crossings and disk persistence remain open. See `parts/scene-03/facts.md` and `test_brick_close.js`.

## Alph's reply after the thanks

Three ordinary follow-up ASK ALPH commands after the controlled count15 thanks selected “Figure it out for yourself.” The count, acknowledgement, phase1 and index2 stayed unchanged. This is an in-room continuation of the controlled threshold test. The phase-one decision and two response texts are checked against the original code; the left-door cycle below establishes the local flag changes. The checked left-door continuation is described below. Later phases, other door outcomes and the complete ordinary door-opening journey remain open. See `parts/scene-04/facts.md` and `test_guard_after.js`.

## Opening the guard's door changes the answer

An ordinary approach to X99/depth24 from the controlled thanks state allowed OPEN DOOR to change the left door cell1→2 and the local byte$FF→0. ASK ALPH then gave the unsure reply. CLOSE DOOR restored cell1/byte$FF; another ASK restored “Figure it out for yourself.” Positive command/mutation hits establish the cycle, while the Brick Hallway count, acknowledgement, phase1 and index2 stayed unchanged. Original-code comparisons cover262,144 bounded left-door/depth/flag cases and the actual four-command page sequence. The left-door continuation below reaches The Wall of Hands for the captured selector. Other outcomes, higher phases, complete ordinary entry and persistence remain open. See `parts/scene-04/facts.md` and `test_guard_door.js`.

## The checked left-door continuation reaches The Wall of Hands

Ordinary up input from the controlled opened-left-door state at X99/depth24, selector1 and phase1 reached depth45 and displayed “How did she figure it out?” The successful callback sequence advanced phase1→2 and loaded scene5/entry1, then arrived at X84/depth6 among the Wall of Hands. Positive phase/loader checkpoints and a separate arrival capture establish this local route. Original-code comparisons cover the entry choice, phase advance, successful countdown and reaction text. Ordinary entry to the guards, other selector/door outcomes, complete later-phase routes and Wall of Hands mechanics beyond the checked ASK conversation remain open. See `parts/scene-04/facts.md` and `test_guard_entry.js`.

## The checked right-door route ends in a loss

Within the same controlled guard-room/count15/phase1/selector1 setup as the checked left-door route, ordinary movement and OPEN DOOR opened the right doorway (cell1→3). Up input reached column3/X224/depth42 and scene-04's$8EAE losing branch. The subsequent$8EC1 sequence displayed the falling and “we lied” messages, then the purple loss panel. Original-code tests cover entry initialization, all255 nonzero outcome bytes through the countdown and the three text expansions. The opposite left doorway in this setup leads to The Wall of Hands. Other selector setups and restarting after the loss remain open. See parts/scene-04/facts.md and test_guard_right.js.

## A stored random bit chooses the guard entry branches

Scene-04's$8F15 setup prefix generates$8F06 from the first of two random-generator results, masking the returned high byte to one bit. It changes a negative guard at$8F03 to0; with a nonnegative guard, it returns without regenerating the bits. A saved controlled room entry and two explicitly seed-poked comparisons confirm the stored values. In the checked entry rule, selector0 reverses the column1/column3 continuation/loss choices seen with selector1. The page compares all65,536 random states and all256 guard bytes with the original prefix. Complete ordinary return-visit reset behavior and full selector0 traversals remain open; parts/scene-04/facts.md records the exact scope.

The Wall of Hands is a sixth started scope: its automatic opening question, five-reply ASK cycle, and manicure sequence through the ninth-command departure to the Stone Corridor are checked in parts/scene-05/facts.md. The combined provisional scopes are56,118/335,949 (16.7%); the larger denominator includes this newly started part and retains overlapping resident ownership. Fifteen parts have no analysis.

The Stone Corridor has a seventh started listing scope,730/48,410 bytes described. Its arrival OPEN DOOR refusal, ordinary approach to column2, cell1→7 opening, and repeated-open reply are checked in parts/scene-06/facts.md. The denominator grows to include this part; shared ownership and seven retained uncounted stretches remain unresolved.

The same scene6 door also closes7→1, then refuses a repeated CLOSE. Ordinary up input from the restored opened state requests refresh0/entry30 and reaches X1952/depth6 in scene6. This local crossing retains the earlier controlled setup; other destinations and return traversal remain open. See parts/scene-06/facts.md and test_stone_close.js.

Continuing up through the scene6 arch at column30 requests refresh0/entry26 and reaches X1696/depth6, with a ladder visible to the left. The first door’s cell remains7 through this in-room refresh. A no-input control stays at the arch. The shared nonnegative placement prefix matches the corridor image and computes64*entry+32. A return to the first door and persistence across actual disk loads remain open. See parts/scene-06/facts.md and test_stone_arch.js.

The scene6 column25 ladder accepts the checked centred approach at X1633, then completes its climb without held movement input. Its actual exit requests scene5/entry1 and returns to the Wall of Hands at X84/depth6; the hands’ opening question appears again. Off-centre X1641/1637 approaches stopped at depth24 in the checked trials. See parts/scene-06/facts.md, parts/scene-05/facts.md and test_stone_ladder.js.
