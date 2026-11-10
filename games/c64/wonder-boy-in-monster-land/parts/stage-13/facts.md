# Load 13 — verified technical facts

The resident draw loop at `$6D41–$6D63` ran 200 iterations in the first 200 frames after this forced load returned. Its four indexed reads use `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use the indexed attribute table at `$80CF`; the exact meanings of all its bit combinations remain open. This observation follows a forced transition and does not establish a route by ordinary play.

The entry snapshot has 44 row pointers in split tables at `$85CF` and `$8620`. They point to rows beginning at `$8671` and spaced 22 bytes apart; the address immediately after that storage is `$8A39`, the character-data pointer recorded at `$7F41`. The downward scroll check uses `$7F4C` as its vertical boundary. This does not establish that every stored cell is encountered during play.

The captured sound pointers select voice lists at $8FA8, $8FB2, $8FC6; their records name 11 distinct event patterns. In the captured selector-1 loop, the resident sequencer selected each pattern and reached its documented zero marker in the listing-based simulator. `test_stage_sound_patterns.js` checks the pointers, pattern boundaries and those visits. This observation does not establish when ordinary play selects the sound.

The captured descriptor names 1 six-byte trigger records at `$8F9E` and 0 sixteen-byte stage object records at `$8FA4`. `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions, stubbing the map updater for the sixteen-byte records. These captured records do not establish that ordinary play activates them.

In the forced play capture, 4 stable 63-byte sprite bitmaps from this load were named by active display-slot entries in VIC bank 3. Their entry and play bytes match; non-stopping checkpoints saw no instruction entry into those bitmap ranges during the following 200 frames. The observation covers those captured states and does not establish all animation or ordinary-play behavior.

The loaded pointer at `$7F3F/$7F40` targets `$8F89`, inside the eight-page character-copy source at `$8A39`. The entry was observed in the 200-frame forced-play probe and monitor collection. The code and graphics uses overlap; `codemap.json` records only observed instruction starts in that source whose bytes still matched the load-entry snapshot.

Sampling the forced play capture every ten frames through frame 200 found 4 additional active sprite pointers in this load. Their bitmap bytes matched the entry snapshot at their first sampled frame, and execution checkpoints recorded no instruction entries in those ranges during the same 200-frame probe. The recorded display settings and first sampled frame are in `display-observations.json`; natural reachability remains open.

The supplied side A file with index $0D supplies two compressed streams. Executing the game’s decoder on those bytes in the 6502 simulator consumed 619 and 1888 bytes and wrote $EB40–$F43F and $7EDF–$973C, respectively. All written output bytes match the forced VICE load-entry snapshot. The extracted file has 33 further bytes after the two streams; their role is not established. This establishes these stream writes for the supplied image, not natural reachability or ownership of repeated data across loads.

The load’s type-$09 entity vector selects a dispatcher at $9541. Its four captured state-table pairs point to $955B, $9594, $968C, $96B0; the state byte is not locally bounded. The listing test checks all four dispatches in each of the six loads. Controlled VICE calls checked all four targets in loads 5 and 24 and one each in loads 7 and 22. The state index and ordinary-play reachability remain open.

Type-$09 state 0 at $955B initializes fields from the X and Y returned by $71DB, calls $3020 twice for a signed step and a low nibble, increments the state byte and falls through to state 1. The six-load listing test checks representative sign and wrapping cases with both callees stubbed; five VICE calls checked loads 5, 13, 22 and 24 using the same stubs. Natural contexts remain open.

The shared type-$09 animation routine at $96D1 updates the frame and a signed countdown on even visits. If its nonnegative-phase addition of 8 wraps to zero, it returns carry set before storing a frame or decrementing that countdown. A six-load listing test checks the ordinary, countdown and wrap cases; five VICE calls checked loads 5, 22 and 24. Natural reachability remains open.

Type-$09 state 2 at $968C returns to state 1 when $1A8F,X is zero; otherwise it calls the shared routine and chooses $4574 or $45BC from the sign of $1B06,X. State 3 at $96B0 returns on clear carry or selects callbacks according to entity type on set carry. A six-load test checks these paths with shared and external callbacks stubbed; eight VICE calls cover load 5 and cases in loads 22 and 24 with the same stubs. Natural reachability remains open.

Type-$09 state 1 at $9594 updates a signed step and frame, calls the contact routines and selects later states from their carry and the sign of $1A6D,X. Its direction helper at $966A subtracts 8 in eight-bit arithmetic: with column 3, anchor 0 and threshold 16, the subtraction wraps and selects $F0. The listing test exercises representative movement and contact branches and 49,152 helper combinations across the six copies with external routines stubbed. Ten VICE calls checked state-1 paths and four checked the helper in loads 5, 13, 22 and 24 with the same stubs. All 103 state-1 instructions match across the five relocated copies; natural reachability and unbounded state indexes remain open.

1 simple eight-row glyphs in the character-copy source are referenced by metatiles in the captured map. Listing tests reconstruct their map references and run the $717C copy; seven controlled VICE reads check representative destination glyphs in loads 2, 20, 27 and 31. These observations do not establish ordinary-play reachability or exclude other possible code uses.

The captured map references 11 additional described glyphs through its tile-quadrant tables. Their source bytes match the copied character RAM in the play capture, and `test_map_glyphs_expanded.js` checks each map reference and runs the $717C copy. Controlled VICE reads of 18 glyphs in loads 2, 9, 16, 20, 27 and 31 agree with the captures. Ordinary-play reachability and other uses remain open.

The load’s type-$03 entity vector selects a dispatcher at $93DB. Three captured state-table pairs point to $93F3, $94F8, $9532; the state index is not locally bounded. Listing tests check all three targets in loads 13, 14, 15, 17, 18, 24, 26 and 27; the state-index range and ordinary-play reachability remain open.

Type-$03 state 1 at $94F8 chooses a movement callback by a signed field and updates two frames; when the first frame addition wraps to zero, it calls both movement callbacks. State 2 at $9532 calls $4B20 and $5DB9 with A=2. VICE checked five controlled cases per load with callbacks stubbed in loads 13, 14, 15, 17, 18, 24, 26 and 27. Natural reachability remains open.

The type-$03 state-0 entry at $93F3 can return immediately, select state 1 or 2 based on callback carry and a signed field, or continue to the movement path. VICE checked seven controlled entry cases per load with external callbacks stubbed in loads 13, 14, 15, 17, 18, 24, 26 and 27. Natural reachability remains open.

The type-$03 state-0 movement tail at $94AE reads a signed byte from a 40-byte table at $94D0, calls $4342 for negative values or $4368 otherwise, and advances the returned Y with an equality wrap at 40. VICE checked four controlled indices per load with callbacks stubbed in loads 13, 14, 15, 17, 18, 24, 26 and 27. The input-index range and natural reachability remain open.

The type-$03 state-0 frame path at $942A uses carry returned by $72FC and the parity of $1B28,X to update $1AD3,X and two frame bytes. VICE checked six controlled cases per load with the callback stubbed in loads 13, 14, 15, 17, 18, 24, 26 and 27. Natural reachability remains open.

The type-$03 horizontal calculation at $947C subtracts 6 from negative magnitudes but 5 from nonnegative values before deciding whether to call a movement routine. The difference comes from carry left clear by ADC 1 on the negative path. VICE checked seven controlled inputs per load with movement callbacks stubbed in loads 13, 14, 15, 17, 18, 24, 26 and 27. Whether ordinary play reaches these inputs remains open.

The load’s type-$01 entity vector selects a dispatcher at $91DA. Three captured state-table pairs point to $91F2, $9257, $928E; the state index is not locally bounded. Listing tests check all three targets in loads 3, 13, 14, 15, 17, 19 and 26; the state-index range and ordinary-play reachability remain open.

Type-$01 state 0 at $91F2 can select state 1 or 2 based on carry from $732A and the sign of $1A6D,X. Its other active paths update $1AD3,X, $1AE4,X and a frame byte and set $1A7E,X if clear; when $1A29,X is zero it only sets that flag if clear. Listing tests exercise these branches across seven loads with external callees stubbed; natural reachability remains open.

Type-$01 state 1 at $9257 returns to state 0 when $1A8F,X is zero; otherwise it calls $45BC or $4574 according to $1B28,X and updates the frame. State 2 at $928E decrements $1B17,X, uses the same frame update when the result is nonzero, and calls $4B0E before jumping to $5DB9 when it is zero. Listing tests cover both states across seven loads with callbacks stubbed; natural reachability remains open.

The load’s type-$02 entity vector selects a dispatcher at $929D. Three captured state-table pairs point to $92B5, $937F, $93B9; the state index is not locally bounded. Listing tests check all three targets in loads 13, 14, 15, 17 and 19; the state-index range and ordinary-play reachability remain open.

Type-$02 state 2 at $93B9 computes a frame based on whether $1AD3,X equals $80, decrements $1AE4,X and can call $4B0E and $5DB9. VICE checked four controlled cases per load with callbacks stubbed in loads 13, 14, 15, 17 and 19. Natural reachability remains open.

Type-$02 state 1 at $937F decrements a timer, chooses a movement callback by a signed byte, and either resets to state 0 or updates a frame. VICE checked five controlled cases per load with callbacks stubbed in loads 13, 14, 15, 17 and 19. Natural reachability remains open.

The type-$02 helper at $935A toggles bit 7 of $1AD3,X. The frame helper at $9363 patches an immediate operand to 0 or 8 and combines it with a timer bit and $19E5,X. VICE checked three controlled frame cases per load in loads 13, 14, 15, 17 and 19. Natural reachability remains open.

The type-$02 state-0 entry at $92B5 can select state 1 or 2 or continue to the timer path. VICE checked seven controlled entry cases per load with callbacks stubbed in loads 13, 14, 15, 17 and 19. Natural reachability remains open.

The type-$02 state-0 timer path at $92F8 can update a frame, select a movement callback, or reset a timer and toggle two direction bits. VICE checked seven controlled cases per load with callbacks stubbed in loads 13, 14, 15, 17 and 19. Natural reachability remains open.

A forced $717C call copied all 2,048 bytes from the entry character source to RAM at $D000–$D7FF. The selected bytes matched the captured play snapshot, and a 200-frame play capture recorded no instruction entry into those selected ranges. 158 eight-byte characters before the nearest discovered code entry or update pointer were described from their row patterns; whether each is displayed and other possible code uses remain open.
