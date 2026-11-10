# Load 25 — verified technical facts

The resident draw loop at `$6D41–$6D63` ran 200 iterations in the first 200 frames after this forced load returned. Its four indexed reads use `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use the indexed attribute table at `$80CF`; the exact meanings of all its bit combinations remain open. This observation follows a forced transition and does not establish a route by ordinary play.

The entry snapshot has 15 row pointers in split tables at `$85CF` and `$8620`. They point to rows beginning at `$8671` and spaced 128 bytes apart; the address immediately after that storage is `$8DF1`, the character-data pointer recorded at `$7F41`. The downward scroll check uses `$7F4C` as its vertical boundary. This does not establish that every stored cell is encountered during play.

The captured sound pointers select voice lists at $9526, $9532, $9536; their records name 8 distinct event patterns. In the captured selector-1 loop, the resident sequencer selected each pattern and reached its documented zero marker in the listing-based simulator. `test_stage_sound_patterns.js` checks the pointers, pattern boundaries and those visits. This observation does not establish when ordinary play selects the sound.

The captured descriptor names 3 six-byte trigger records at `$94AE` and 1 sixteen-byte stage object records at `$94C0`. `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions, stubbing the map updater for the sixteen-byte records. These captured records do not establish that ordinary play activates them.

In the forced play capture, 6 stable 63-byte sprite bitmaps from this load were named by active display-slot entries in VIC bank 3. Their entry and play bytes match; non-stopping checkpoints saw no instruction entry into those bitmap ranges during the following 200 frames. The observation covers those captured states and does not establish all animation or ordinary-play behavior.

The loaded pointer at `$7F3F/$7F40` targets `$9479`, inside the eight-page character-copy source at `$8DF1`. The entry was observed in the 200-frame forced-play probe and monitor collection. The code and graphics uses overlap; `codemap.json` records only observed instruction starts in that source whose bytes still matched the load-entry snapshot.

The update entry at `$9479` sets `$4DCB,X` and updates the horizontal-motion gate `$E1`. If both `$4DB6` and `$4DB3` are zero, it takes one value from the six-byte pattern at `$94A8` and advances the mutable index at `$94A7`; otherwise it writes `$FF` and leaves the index unchanged. The two resident directional speed-update paths return early on a zero gate. Afterward this entry jumps to `$0200`. Controlled tests cover these decisions; the pattern’s timing and reachability in ordinary play remain open.

Sampling the forced play capture every ten frames through frame 200 found 8 additional active sprite pointers in this load. Their bitmap bytes matched the entry snapshot at their first sampled frame, and execution checkpoints recorded no instruction entries in those ranges during the same 200-frame probe. The recorded display settings and first sampled frame are in `display-observations.json`; natural reachability remains open.

The supplied side B file with index $19 supplies two compressed streams. Executing the game’s decoder on those bytes in the 6502 simulator consumed 2508 and 4793 bytes and wrote $EB40–$FDBF and $7EDF–$A493, respectively. All written output bytes match the forced VICE load-entry snapshot. This establishes these stream writes for the supplied image, not natural reachability or ownership of repeated data across loads.

Controlled record-copy, frame-restore and display-routine simulations selected 2 additional bitmap pointers in this load. Slot assignment, position, effect state and one colour were forced. The bitmaps match the load-entry and play captures; no instruction entered their ranges during a 200-frame probe. These examples do not establish natural reachability.

1 three-line message records in this load were identified from instruction sequences that load their addresses in X/Y before reaching $77E0. With selector $77E1 forced to zero, listing tests check the pointer and copy of every recorded line into the message buffers; spaces become glyph zero. Twelve controlled VICE calls check representative records from loads 2, 4, 9, 12, 19, 22, 29, 30 and 31 with the same selector. Glyph $60 is a downward-pointing triangle; its role and ordinary-play reachability remain open.
9 simple eight-row glyphs in the character-copy source are referenced by metatiles in the captured map. Listing tests reconstruct their map references and run the $717C copy; seven controlled VICE reads check representative destination glyphs in loads 2, 20, 27 and 31. These observations do not establish ordinary-play reachability or exclude other possible code uses.

The captured map references 134 additional described glyphs through its tile-quadrant tables. Their source bytes match the copied character RAM in the play capture, and `test_map_glyphs_expanded.js` checks each map reference and runs the $717C copy. Controlled VICE reads of 18 glyphs in loads 2, 9, 16, 20, 27 and 31 agree with the captures. Ordinary-play reachability and other uses remain open.

The load’s type-$22 entity vector selects a dispatcher at $A37D. Three captured state-table pairs point to $A395, $A3C8, $A40E; the state index is not locally bounded. Listing tests check all three targets in loads 2, 4, 6, 14, 15, 17, 24 and 25; the state-index range and ordinary-play reachability remain open.

Type-$22 state 2 at $A40E increments a counter and updates a frame while the counter is below 2; otherwise it clears a field in a slot selected by $1AD3,X and calls $4454 with the original X. VICE checked four controlled counter values per load with $4454 stubbed in loads 2, 4, 6, 14, 15, 17, 24 and 25. The alternate index range and ordinary-play reachability remain open.

Type-$22 state 1 at $A3C8 can call a sign-selected movement routine, then uses carry from $44DE to increment a counter or initialize state 2. VICE checked five controlled cases per load with callbacks stubbed in loads 2, 4, 6, 14, 15, 17, 24 and 25. Natural reachability remains open.

Type-$22 state 0 at $A395 can enter alternate-slot cleanup, or call a helper and choose a movement callback by a sign byte; callback carry controls its transition to state 1. VICE checked five controlled cases per load with callbacks stubbed in loads 2, 4, 6, 14, 15, 17, 24 and 25. Natural reachability remains open.

The type-$22 collision helper at $A432 can return directly or enter state-2 setup after either of two carry checks. State-2 setup returns to the helper’s caller, so a state-0 call continues after it. VICE checked five controlled cases per load with callbacks stubbed in loads 2, 4, 6, 14, 15, 17, 24 and 25. Natural reachability remains open.

The type-$05 entity vector selects a dispatcher at $9C84. Six captured state-table pairs point to $9CA2, $9D30, $9DDE, $9E2A, $9E69, $9E8C. The dispatcher does not bound the state index. VICE and the listing test checked all six patched jumps in loads 24 and 25; handler behavior and ordinary-play reachability remain open.

Type-$05 state 4 decrements $1AC2,X and copies $1AE4,X to the state when the result is negative or the selected $45BC/$4574 callback returns a value whose bits 1–2 are not 2. VICE checked six forced cases in loads 24 and 25 with callbacks stubbed. Ordinary-play reachability remains open.

Type-$05 state 5 decrements $1AC2,X. A negative result calls $4B0E with A=$50, loads A=$14 and jumps to $5DB9; otherwise it indexes the four captured offsets 4, 4, 2, 2, updates $19C3,X and advances $1AD3,X. The input index is not bounded before the read. VICE checked four forced cases in loads 24 and 25 with the exit callback stubbed. Ordinary-play reachability remains open.

Type-$05 helper $9EC6 saves $1B17,X and calls $792C and $732A. Carry set from $732A selects state 4 for positive $1A6D,X or state 5 otherwise, sets $1AC2,X to 10 and discards one return address; the positive path also saves the previous state and updates position. Carry clear calls $7227 and may tail-jump to $5D7A with A=4. VICE checked six forced cases in loads 24 and 25 with callbacks stubbed. Ordinary-play reachability remains open.

Type-$05 states 2 and 3 call the event helper, use four captured offsets 2, 2, 0, 0 to update position, and decrement $1AD3,X. A negative countdown or a callback result with bits 1–2 other than 2 triggers a transition: state 2 loads the timer from a patchable immediate byte (captured as $FF and set to 10 by one state-0 path), toggles bit 7 of $1B17,X and selects state 3; state 3 selects state 0. VICE checked six forced cases in loads 24 and 25 with callbacks stubbed. The offset index is not bounded before its read and ordinary-play reachability remains open.

Type-$05 state 0 can select state 1 or 2 after a comparison involving the X value and $6F3C. Its state-2 path sets $1AD3,X=10 and patches the immediate byte used by a later state-2 transition to 10. VICE checked four forced close, far, busy and inactive-slot cases in loads 24 and 25 with callbacks stubbed. Callback effects and ordinary-play reachability remain open.

Type-$05 state 1 updates direction and position, calls its event helper and counts down. After the second countdown reaches its allocation path, it calls $190B and may initialize a type-$22 slot; both allocation outcomes restore X from Y and select state 0. VICE checked seven forced cases, including successful and failed allocation, in loads 24 and 25 with callbacks stubbed. Callback effects and ordinary-play reachability remain open.

The type-$1E entity vector selects a dispatcher at $9F28. Six captured state-table pairs point to $9F46, $9FDB, $A07B, $A0C7, $A106, $A129. The dispatcher does not bound the state index. VICE and the listing test checked all six patched jumps in load 25; handler behavior and ordinary-play reachability remain open.

Type-$1E state 4 decrements $1AC2,X and copies $1AE4,X to the state when the result is negative or the selected $45BC/$4574 callback returns a value whose bits 1–2 are not 2. VICE checked six forced cases in load 25 with callbacks stubbed. Ordinary-play reachability remains open.

Type-$1E state 5 decrements $1AC2,X. A negative result calls $4B0E with A=$80 and jumps to $5DB9; otherwise it indexes the four captured offsets 6, 6, 8, 8, updates $19C3,X and advances $1AD3,X. The input index is not bounded before the read. VICE checked four forced cases in load 25 with the exit callback stubbed. Ordinary-play reachability remains open.

Type-$1E helper $A161 saves $1B17,X and calls $792C and $732A. Carry set from $732A selects state 4 for positive $1A6D,X or state 5 otherwise, sets $1AC2,X to 10 and discards one return address; the positive path also saves the previous state and updates position. Carry clear calls $7227 and may tail-jump to $5D7A with A=4. VICE checked six forced cases in load 25 with callbacks stubbed. Ordinary-play reachability remains open.

Type-$1E states 2 and 3 call the event helper, use four captured offsets 2, 2, 4, 4 to update position, and decrement $1AD3,X. A negative countdown or a callback result with bits 1–2 other than 2 triggers a transition: state 2 loads the timer from a patchable immediate byte (captured as $FF and set to 10 by one state-0 path), toggles bit 7 of $1B17,X and selects state 3; state 3 selects state 0. VICE checked six forced cases in load 25 with callbacks stubbed. The offset index is not bounded before its read and ordinary-play reachability remains open.

Type-$1E state 0 can select state 1 or 2 after a comparison involving the X value and $6F3C. Its state-2 path sets $1AD3,X=10 and patches the immediate byte used by a later state-2 transition to 10. VICE checked four forced close, far, busy and inactive-slot cases in load 25 with callbacks stubbed. Callback effects and ordinary-play reachability remain open.

Type-$1E state 1 calls its event helper, counts down $1AF5,X and uses $1B06,X to choose a movement callback, a spawn call or the return to state 0. VICE checked six forced delay and timer cases in load 25 with callbacks and spawn stubbed. Callback effects and ordinary-play reachability remain open.

The type-$1E spawn helper at $A019 calls $190B and returns if carry is clear. On carry set it calls $447A, copies fields from slot Y into slot X, initializes a type-$2D entity and sets $1B28,Y=1 before returning with X restored from Y. VICE checked allocation success and failure with callbacks stubbed. Callback effects and ordinary-play reachability remain open.

The load-25 type-$2D dispatcher has a captured state-0 target at $A1C5. Its handler updates timers, calls direction-selected callbacks and may decrement a linked slot before jumping to $4454. Type-$1E can allocate this entity. VICE checked the captured dispatch target and eight forced handler cases with callbacks stubbed and cleanup stopped at $4454. Index bounds and ordinary-play reachability remain open.

The type-$1F entity dispatcher at $A248 uses $1AB1,X without a local bounds check. Three captured table pairs select $A260, $A280, $A30C; VICE checked all three in load 25. Ordinary-play reachability and index bounds remain open.

Type-$1F state 2 calls a position helper, selects a movement callback by the sign of $1B28,X, decrements it and restores the state from $1B17,X when its low seven bits reach zero. Three helpers update paired positions using $72FC carry and different offsets. VICE checked six forced timer cases and six position cases with callbacks stubbed. Ordinary-play reachability remains open.

Type-$1F state 0 initializes two bytes from $3020 and falls through into state 1. State 1 selects movement and timer paths, can return to state 0, and may select state 2 after a carry-set event. VICE checked three state-0 setup cases and eleven state-1 cases with callbacks stubbed. Ordinary-play reachability and callback effects remain open.

A forced $717C call copied all 2,048 bytes from the entry character source to RAM at $D000–$D7FF. The selected bytes matched the captured play snapshot, and a 200-frame play capture recorded no instruction entry into those selected ranges. 66 eight-byte characters before the nearest discovered code entry or update pointer were described from their row patterns; whether each is displayed and other possible code uses remain open.

The captured 48 low and high entity-handler bytes at $7EDF–$7F3E pair into 38 distinct addresses. The listing test runs the instructions from $2027 up to the call at $2036 for every index in this load. VICE checked indices 0, 1 and 47 in loads 2, 24 and 31 before the call. The code does not locally bound the index, and individual target reachability remains open.
