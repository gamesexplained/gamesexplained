# Load 24 — verified technical facts

The resident draw loop at `$6D41–$6D63` ran 200 iterations in the first 200 frames after this forced load returned. Its four indexed reads use `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use the indexed attribute table at `$80CF`; the exact meanings of all its bit combinations remain open. This observation follows a forced transition and does not establish a route by ordinary play.

The entry snapshot has 72 row pointers in split tables at `$85CF` and `$8620`. They point to rows beginning at `$8671` and spaced 25 bytes apart; the address immediately after that storage is `$8D79`, the character-data pointer recorded at `$7F41`. The downward scroll check uses `$7F4C` as its vertical boundary. This does not establish that every stored cell is encountered during play.

The captured sound pointers select voice lists at $9230, $9238, $9240; their records name 6 distinct event patterns. In the captured selector-1 loop, the resident sequencer selected each pattern and reached its documented zero marker in the listing-based simulator. `test_stage_sound_patterns.js` checks the pointers, pattern boundaries and those visits. This observation does not establish when ordinary play selects the sound.

The captured descriptor names 4 six-byte trigger records at `$91B5` and 1 sixteen-byte stage object records at `$91CD`. `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions, stubbing the map updater for the sixteen-byte records. These captured records do not establish that ordinary play activates them.

In the forced play capture, 2 stable 63-byte sprite bitmaps from this load were named by active display-slot entries in VIC bank 3. Their entry and play bytes match; non-stopping checkpoints saw no instruction entry into those bitmap ranges during the following 200 frames. The observation covers those captured states and does not establish all animation or ordinary-play behavior.

The loaded pointer at `$7F3F/$7F40` targets `$9199`, inside the eight-page character-copy source at `$8D79`. The entry was observed in the 200-frame forced-play probe and monitor collection. The code and graphics uses overlap; `codemap.json` records only observed instruction starts in that source whose bytes still matched the load-entry snapshot.

The seven entity-state handlers and their shared update are relocated copies of load 16. `test_entity_code_copies.py` compares all 212 dispatcher and handler instruction encodings, accounting for internal address relocation, and checks the seven split-table targets and eight animation offsets. This does not establish their natural reachability in this load.

Sampling the forced play capture every ten frames through frame 200 found 4 additional active sprite pointers in this load. Their bitmap bytes matched the entry snapshot at their first sampled frame, and execution checkpoints recorded no instruction entries in those ranges during the same 200-frame probe. The recorded display settings and first sampled frame are in `display-observations.json`; natural reachability remains open.

The supplied side B file with index $18 supplies two compressed streams. Executing the game’s decoder on those bytes in the 6502 simulator consumed 2078 and 4436 bytes and wrote $EB40–$FDBF and $7EDF–$A238, respectively. All written output bytes match the forced VICE load-entry snapshot. This establishes these stream writes for the supplied image, not natural reachability or ownership of repeated data across loads.

Controlled record-copy, frame-restore and display-routine simulations selected 4 additional bitmap pointers in this load. Slot assignment, position, effect state and one colour were forced. The bitmaps match the load-entry and play captures; no instruction entered their ranges during a 200-frame probe. These examples do not establish natural reachability.

The load’s type-$09 and type-$1C entity vectors selects a dispatcher at $9BFB. Its four captured state-table pairs point to $9C15, $9C4E, $9D46, $9D6A; the state byte is not locally bounded. The listing test checks all four dispatches in each of the six loads. Controlled VICE calls checked all four targets in loads 5 and 24 and one each in loads 7 and 22. The state index and ordinary-play reachability remain open.

Type-$09 state 0 at $9C15 initializes fields from the X and Y returned by $71DB, calls $3020 twice for a signed step and a low nibble, increments the state byte and falls through to state 1. The six-load listing test checks representative sign and wrapping cases with both callees stubbed; five VICE calls checked loads 5, 13, 22 and 24 using the same stubs. Natural contexts remain open.

The shared type-$09 animation routine at $9D8B updates the frame and a signed countdown on even visits. If its nonnegative-phase addition of 8 wraps to zero, it returns carry set before storing a frame or decrementing that countdown. A six-load listing test checks the ordinary, countdown and wrap cases; five VICE calls checked loads 5, 22 and 24. Natural reachability remains open.

Type-$09 state 2 at $9D46 returns to state 1 when $1A8F,X is zero; otherwise it calls the shared routine and chooses $4574 or $45BC from the sign of $1B06,X. State 3 at $9D6A returns on clear carry or selects callbacks according to entity type on set carry. A six-load test checks these paths with shared and external callbacks stubbed; eight VICE calls cover load 5 and cases in loads 22 and 24 with the same stubs. Natural reachability remains open.

Type-$09 state 1 at $9C4E updates a signed step and frame, calls the contact routines and selects later states from their carry and the sign of $1A6D,X. Its direction helper at $9D24 subtracts 8 in eight-bit arithmetic: with column 3, anchor 0 and threshold 16, the subtraction wraps and selects $F0. The listing test exercises representative movement and contact branches and 49,152 helper combinations across the six copies with external routines stubbed. Ten VICE calls checked state-1 paths and four checked the helper in loads 5, 13, 22 and 24 with the same stubs. All 103 state-1 instructions match across the five relocated copies; natural reachability and unbounded state indexes remain open.


1 three-line message records in this load were identified from instruction sequences that load their addresses in X/Y before reaching $77E0. With selector $77E1 forced to zero, listing tests check the pointer and copy of every recorded line into the message buffers; spaces become glyph zero. Eight controlled VICE calls check representative records from loads 2, 4, 9, 12, 19, 22, 29 and 31 with the same selector. Glyph $60 is a downward-pointing triangle; its role and ordinary-play reachability remain open.

1 simple eight-row glyphs in the character-copy source are referenced by metatiles in the captured map. Listing tests reconstruct their map references and run the $717C copy; seven controlled VICE reads check representative destination glyphs in loads 2, 20, 27 and 31. These observations do not establish ordinary-play reachability or exclude other possible code uses.

The captured map references 39 additional described glyphs through its tile-quadrant tables. Their source bytes match the copied character RAM in the play capture, and `test_map_glyphs_expanded.js` checks each map reference and runs the $717C copy. Controlled VICE reads of 18 glyphs in loads 2, 9, 16, 20, 27 and 31 agree with the captures. Ordinary-play reachability and other uses remain open.

The load’s type-$03 entity vector selects a dispatcher at $95FB. Three captured state-table pairs point to $9613, $9718, $9752; the state index is not locally bounded. Listing tests check all three targets in loads 13, 14, 15, 17, 18, 24, 26 and 27; the state-index range and ordinary-play reachability remain open.

Type-$03 state 1 at $9718 chooses a movement callback by a signed field and updates two frames; when the first frame addition wraps to zero, it calls both movement callbacks. State 2 at $9752 calls $4B20 and $5DB9 with A=2. VICE checked five controlled cases per load with callbacks stubbed in loads 13, 14, 15, 17, 18, 24, 26 and 27. Natural reachability remains open.

The type-$03 state-0 entry at $9613 can return immediately, select state 1 or 2 based on callback carry and a signed field, or continue to the movement path. VICE checked seven controlled entry cases per load with external callbacks stubbed in loads 13, 14, 15, 17, 18, 24, 26 and 27. Natural reachability remains open.

The type-$03 state-0 movement tail at $96CE reads a signed byte from a 40-byte table at $96F0, calls $4342 for negative values or $4368 otherwise, and advances the returned Y with an equality wrap at 40. VICE checked four controlled indices per load with callbacks stubbed in loads 13, 14, 15, 17, 18, 24, 26 and 27. The input-index range and natural reachability remain open.

The type-$03 state-0 frame path at $964A uses carry returned by $72FC and the parity of $1B28,X to update $1AD3,X and two frame bytes. VICE checked six controlled cases per load with the callback stubbed in loads 13, 14, 15, 17, 18, 24, 26 and 27. Natural reachability remains open.

The type-$03 horizontal calculation at $969C subtracts 6 from negative magnitudes but 5 from nonnegative values before deciding whether to call a movement routine. The difference comes from carry left clear by ADC 1 on the negative path. VICE checked seven controlled inputs per load with movement callbacks stubbed in loads 13, 14, 15, 17, 18, 24, 26 and 27. Whether ordinary play reaches these inputs remains open.

The load’s type-$22 entity vector selects a dispatcher at $A0FA. Three captured state-table pairs point to $A112, $A145, $A18B; the state index is not locally bounded. Listing tests check all three targets in loads 2, 4, 6, 14, 15, 17, 24 and 25; the state-index range and ordinary-play reachability remain open.

Type-$22 state 2 at $A18B increments a counter and updates a frame while the counter is below 2; otherwise it clears a field in a slot selected by $1AD3,X and calls $4454 with the original X. VICE checked four controlled counter values per load with $4454 stubbed in loads 2, 4, 6, 14, 15, 17, 24 and 25. The alternate index range and ordinary-play reachability remain open.

Type-$22 state 1 at $A145 can call a sign-selected movement routine, then uses carry from $44DE to increment a counter or initialize state 2. VICE checked five controlled cases per load with callbacks stubbed in loads 2, 4, 6, 14, 15, 17, 24 and 25. Natural reachability remains open.

Type-$22 state 0 at $A112 can enter alternate-slot cleanup, or call a helper and choose a movement callback by a sign byte; callback carry controls its transition to state 1. VICE checked five controlled cases per load with callbacks stubbed in loads 2, 4, 6, 14, 15, 17, 24 and 25. Natural reachability remains open.

The type-$22 collision helper at $A1AF can return directly or enter state-2 setup after either of two carry checks. State-2 setup returns to the helper’s caller, so a state-0 call continues after it. VICE checked five controlled cases per load with callbacks stubbed in loads 2, 4, 6, 14, 15, 17, 24 and 25. Natural reachability remains open.

The type-$05 entity vector selects a dispatcher at $975D. Six captured state-table pairs point to $977B, $9809, $98B7, $9903, $9942, $9965. The dispatcher does not bound the state index. VICE and the listing test checked all six patched jumps in loads 24 and 25; handler behavior and ordinary-play reachability remain open.

Type-$05 state 4 decrements $1AC2,X and copies $1AE4,X to the state when the result is negative or the selected $45BC/$4574 callback returns a value whose bits 1–2 are not 2. VICE checked six forced cases in loads 24 and 25 with callbacks stubbed. Ordinary-play reachability remains open.

Type-$05 state 5 decrements $1AC2,X. A negative result calls $4B0E with A=$50, loads A=$14 and jumps to $5DB9; otherwise it indexes the four captured offsets 4, 4, 2, 2, updates $19C3,X and advances $1AD3,X. The input index is not bounded before the read. VICE checked four forced cases in loads 24 and 25 with the exit callback stubbed. Ordinary-play reachability remains open.

Type-$05 helper $999F saves $1B17,X and calls $792C and $732A. Carry set from $732A selects state 4 for positive $1A6D,X or state 5 otherwise, sets $1AC2,X to 10 and discards one return address; the positive path also saves the previous state and updates position. Carry clear calls $7227 and may tail-jump to $5D7A with A=4. VICE checked six forced cases in loads 24 and 25 with callbacks stubbed. Ordinary-play reachability remains open.

Type-$05 states 2 and 3 call the event helper, use four captured offsets 2, 2, 0, 0 to update position, and decrement $1AD3,X. A negative countdown or a callback result with bits 1–2 other than 2 triggers a transition: state 2 loads the timer from a patchable immediate byte (captured as $FF and set to 10 by one state-0 path), toggles bit 7 of $1B17,X and selects state 3; state 3 selects state 0. VICE checked six forced cases in loads 24 and 25 with callbacks stubbed. The offset index is not bounded before its read and ordinary-play reachability remains open.

Type-$05 state 0 can select state 1 or 2 after a comparison involving the X value and $6F3C. Its state-2 path sets $1AD3,X=10 and patches the immediate byte used by a later state-2 transition to 10. VICE checked four forced close, far, busy and inactive-slot cases in loads 24 and 25 with callbacks stubbed. Callback effects and ordinary-play reachability remain open.

Type-$05 state 1 updates direction and position, calls its event helper and counts down. After the second countdown reaches its allocation path, it calls $190B and may initialize a type-$22 slot; both allocation outcomes restore X from Y and select state 0. VICE checked seven forced cases, including successful and failed allocation, in loads 24 and 25 with callbacks stubbed. Callback effects and ordinary-play reachability remain open.

The type-$17 handler at $9DCB updates a timer and position and can allocate a type-$2C slot when its decremented timer is $FC. That timer resets to 20 even when the active-slot check skips allocation. Its event helper can call $4B0E and jump to $5DB9. VICE checked six handler cases and five event cases in loads 19, 24 and 28 with callbacks stubbed. Callback effects and ordinary-play reachability remain open.

The type-$2C handler at $9E7E initializes parameters when $1B28,X is zero, or updates a position and frame before returning or jumping to $4454 when it is nonzero. Type-$17 can initialize a type-$2C slot. VICE checked six forced cases in loads 19, 24 and 28 with callbacks stubbed and cleanup paths stopped at $4454. Callback effects, indexed-value bounds and ordinary-play reachability remain open.

The load-24 type-$1D dispatcher has two captured states. State 0 calls $190B and $4454, initializes a type-$2F slot and falls through into state 1; the code has no local carry check after allocation. State 1 and its movement helpers update a linked slot and a 16-bit coordinate, with boundary-dependent carry returns. VICE checked both dispatch targets, two forced allocation-carry cases, seven state-1 cases, six movement boundaries, four position cases, six event cases and five effect cases with callbacks stubbed. Allocation-failure behavior, index bounds and ordinary-play reachability remain open.

The load-24 type-$2F handler builds a contact box, applies a signed linked movement byte and then adds a signed byte from $56A8,Y while subtracting $5778,Y from a vertical byte. It patches an immediate operand for sign extension and masks Y to $80–$8F. VICE checked four forced signed-motion cases with callbacks stubbed. Type-$1D can initialize a type-$2F slot; ordinary-play reachability remains open.
