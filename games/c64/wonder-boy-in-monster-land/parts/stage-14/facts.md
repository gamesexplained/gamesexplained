# Load 14 — verified technical facts

The resident draw loop at `$6D41–$6D63` ran 200 iterations in the first 200 frames after this forced load returned. Its four indexed reads use `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use the indexed attribute table at `$80CF`; the exact meanings of all its bit combinations remain open. This observation follows a forced transition and does not establish a route by ordinary play.

The entry snapshot has 14 row pointers in split tables at `$85CF` and `$8620`. They point to rows beginning at `$8671` and spaced 102 bytes apart; the address immediately after that storage is `$8C05`, the character-data pointer recorded at `$7F41`. The downward scroll check uses `$7F4C` as its vertical boundary. This does not establish that every stored cell is encountered during play.

The captured sound pointers select voice lists at $9EBC, $9EC0, $9EC4; their records name 3 distinct event patterns. In the captured selector-1 loop, the resident sequencer selected each pattern and reached its documented zero marker in the listing-based simulator. `test_stage_sound_patterns.js` checks the pointers, pattern boundaries and those visits. This observation does not establish when ordinary play selects the sound.

The captured descriptor names 2 six-byte trigger records at `$8F3A` and 2 sixteen-byte stage object records at `$8F62`. `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions, stubbing the map updater for the sixteen-byte records. These captured records do not establish that ordinary play activates them.

In the forced play capture, 2 stable 63-byte sprite bitmaps from this load were named by active display-slot entries in VIC bank 3. Their entry and play bytes match; non-stopping checkpoints saw no instruction entry into those bitmap ranges during the following 200 frames. The observation covers those captured states and does not establish all animation or ordinary-play behavior.

The loaded pointer at `$7F3F/$7F40` targets `$8F25`, inside the eight-page character-copy source at `$8C05`. The entry was observed in the 200-frame forced-play probe and monitor collection. The code and graphics uses overlap; `codemap.json` records only observed instruction starts in that source whose bytes still matched the load-entry snapshot.

The seven entity-state handlers and their shared update are relocated copies of load 16. `test_entity_code_copies.py` compares all 212 dispatcher and handler instruction encodings, accounting for internal address relocation, and checks the seven split-table targets and eight animation offsets. This does not establish their natural reachability in this load.

Sampling the forced play capture every ten frames through frame 200 found 4 additional active sprite pointers in this load. Their bitmap bytes matched the entry snapshot at their first sampled frame, and execution checkpoints recorded no instruction entries in those ranges during the same 200-frame probe. The recorded display settings and first sampled frame are in `display-observations.json`; natural reachability remains open.

Sampling the forced play capture every ten frames through frame 200 while holding right, alternating fire every 20 frames and adding up after frame 100 found 2 additional active sprite pointers in this load. Their bitmap bytes matched the entry snapshot at their first sampled frame, and execution checkpoints recorded no instruction entries in those ranges during the same 200-frame probe. The recorded display settings and first sampled frame are in `display-observations.json`; natural reachability remains open.

The supplied side A file with index $0E supplies two compressed streams. Executing the game’s decoder on those bytes in the 6502 simulator consumed 1899 and 5698 bytes and wrote $EB40–$FCBF and $7EDF–$A91D, respectively. The decoded output differed from the forced VICE load-entry snapshot at $9D4E–$9D50; the resident selector-14 patch at $2A90 makes all output bytes match. The extracted file has 23 further bytes after the two streams; their role is not established. This establishes these stream writes for the supplied image, not natural reachability or ownership of repeated data across loads.

Controlled record-copy, frame-restore and display-routine simulations selected 2 additional bitmap pointers in this load. Slot assignment, position, effect state and one colour were forced. The bitmaps match the load-entry and play captures; no instruction entered their ranges during a 200-frame probe. These examples do not establish natural reachability.

5 three-line message records in this load were identified from instruction sequences that load their addresses in X/Y before reaching $77E0. With selector $77E1 forced to zero, listing tests check the pointer and copy of every recorded line into the message buffers; spaces become glyph zero. Twelve controlled VICE calls check representative records from loads 2, 4, 9, 12, 19, 22, 29, 30 and 31 with the same selector. Glyph $60 is a downward-pointing triangle; its role and ordinary-play reachability remain open.
The item-message selector at $99CF computes an eight-bit table offset from A with decimal mode clear and passes a selected pointer in X/Y to $77E0. Controlled inputs 0–23 select 24 pointer entries and 21 distinct three-line records, including item names. Listing tests check every selection and copy with selector $77E1 forced to zero; ten controlled VICE calls check representative selections in loads 2, 4, 9, 19, 27 and 30. The input range in play and ordinary-play reachability remain open.

The price selector at $993B sends the first two bytes of an eight-byte item row to $7901 as a packed-decimal amount. The game subtracts that amount from the selected player’s gold when funds suffice; otherwise it restores the balance and returns clear carry. Listing tests cover all 24 captured prices at zero, one below the price, the exact price and 9,999 gold (where distinct), and ten controlled VICE calls check representative deductions. Item index 4 selects the Winged Boots message and has a price of 30 in these captured tables; ordinary-play reachability remains open.

The two pointer pairs at offsets 2–5 in each item row supply subroutine-call operands. Three selectors copy these pairs into JSR instructions; listing tests check all 24 captured rows at each selector, and eleven controlled VICE calls check representative patches. Ordinary-play reachability remains open.

The item-row targets at offset 4 select routines at $9E56–$9EBB. Controlled item inputs call helpers for Wing Boots, Helmet, Gauntlet or Revival Medicine, update one of three selected-player fields, or pass fixed A/X values to $536F. Listing tests cover all 24 item paths for both player indices with external routines stubbed; sixteen controlled VICE calls check representative paths. Natural purchase reachability and the external callbacks’ remaining effects remain open.

The item-row targets at offset 2 select drawing routines at $9D4A–$9D94. Depending on the target, they return or write a 4-by-3 or 4-by-4 block of consecutive tile bytes using a 40-byte row stride. Listing tests check all 24 item targets in 17 loads with decimal mode clear; eleven controlled VICE calls check representative tile writes. Natural shop contexts remain open.

The purchase path at $9930 selects an item index, charges its packed-decimal price and branches away on insufficient funds. On success it decrements $4753,X, selects an effect target, calls it with the item index plus 1, passes a message pointer to $77E0 and waits while $4D6B is nonzero. Listing tests cover 68 controlled purchase paths across 17 loads and eight VICE calls check representative paths, with effect and message callbacks stubbed. The gate at $9907 supplies that flag from $9A40 on one path; other entry paths and ordinary-play purchase reachability remain open.

The shop gate at $9907 can branch to the purchase choice using the sign of $9A40, or pass one of two message pointers according to $4753,X. Listing tests check 102 controlled gate cases and the extended purchase paths across 17 loads; eight VICE calls check gate cases and eight check purchases. The gate byte’s role, the mode’s possible values and natural reachability remain open.

The shop input choice at $98A4 tests active-low fire, left and right in that order. Its direction handlers decrement or increment the mode byte at $9A40, can pass the corresponding item index to the message selector, and call another helper. Listing tests check 204 controlled input and mode cases across 17 loads with callbacks stubbed; eleven VICE calls check representative paths. Ordinary-play timing, mode ranges and callback effects remain open.

The shop initializer at $9876 sets the mode byte to 0 and its countdown to $DC. Starting from 0, the traced left and right handlers keep the mode among $FF, $00 and $01 if no other code changes it. Listing tests check initialization and every transition among those three values in 17 loads; ten controlled VICE calls check representative cases with callbacks stubbed. Other possible writes and ordinary-play timing remain open.

The shop wait paths at $9880 and $9893 call $3C2A and decrement the countdown. Starting from $DC, controlled paths reach zero after 220 calls; the timeout then either branches on the gate byte or marks $4753,X and passes a message pointer. Listing tests check both wait paths and timeout branches in 17 loads with callbacks stubbed; eight controlled VICE calls check representative paths. Seconds, ordinary-play timing and other exits remain open.

The captured map references 40 additional described glyphs through its tile-quadrant tables. Their source bytes match the copied character RAM in the play capture, and `test_map_glyphs_expanded.js` checks each map reference and runs the $717C copy. Controlled VICE reads of 18 glyphs in loads 2, 9, 16, 20, 27 and 31 agree with the captures. Ordinary-play reachability and other uses remain open.

The load’s type-$03 entity vector selects a dispatcher at $A239. Three captured state-table pairs point to $A251, $A356, $A390; the state index is not locally bounded. Listing tests check all three targets in loads 13, 14, 15, 17, 18, 24, 26 and 27; the state-index range and ordinary-play reachability remain open.

Type-$03 state 1 at $A356 chooses a movement callback by a signed field and updates two frames; when the first frame addition wraps to zero, it calls both movement callbacks. State 2 at $A390 calls $4B20 and $5DB9 with A=2. VICE checked five controlled cases per load with callbacks stubbed in loads 13, 14, 15, 17, 18, 24, 26 and 27. Natural reachability remains open.

The type-$03 state-0 entry at $A251 can return immediately, select state 1 or 2 based on callback carry and a signed field, or continue to the movement path. VICE checked seven controlled entry cases per load with external callbacks stubbed in loads 13, 14, 15, 17, 18, 24, 26 and 27. Natural reachability remains open.

The type-$03 state-0 movement tail at $A30C reads a signed byte from a 40-byte table at $A32E, calls $4342 for negative values or $4368 otherwise, and advances the returned Y with an equality wrap at 40. VICE checked four controlled indices per load with callbacks stubbed in loads 13, 14, 15, 17, 18, 24, 26 and 27. The input-index range and natural reachability remain open.

The type-$03 state-0 frame path at $A288 uses carry returned by $72FC and the parity of $1B28,X to update $1AD3,X and two frame bytes. VICE checked six controlled cases per load with the callback stubbed in loads 13, 14, 15, 17, 18, 24, 26 and 27. Natural reachability remains open.

The type-$03 horizontal calculation at $A2DA subtracts 6 from negative magnitudes but 5 from nonnegative values before deciding whether to call a movement routine. The difference comes from carry left clear by ADC 1 on the negative path. VICE checked seven controlled inputs per load with movement callbacks stubbed in loads 13, 14, 15, 17, 18, 24, 26 and 27. Whether ordinary play reaches these inputs remains open.

The load’s type-$22 entity vector selects a dispatcher at $A733. Three captured state-table pairs point to $A74B, $A77E, $A7C4; the state index is not locally bounded. Listing tests check all three targets in loads 2, 4, 6, 14, 15, 17, 24 and 25; the state-index range and ordinary-play reachability remain open.

Type-$22 state 2 at $A7C4 increments a counter and updates a frame while the counter is below 2; otherwise it clears a field in a slot selected by $1AD3,X and calls $4454 with the original X. VICE checked four controlled counter values per load with $4454 stubbed in loads 2, 4, 6, 14, 15, 17, 24 and 25. The alternate index range and ordinary-play reachability remain open.

Type-$22 state 1 at $A77E can call a sign-selected movement routine, then uses carry from $44DE to increment a counter or initialize state 2. VICE checked five controlled cases per load with callbacks stubbed in loads 2, 4, 6, 14, 15, 17, 24 and 25. Natural reachability remains open.

Type-$22 state 0 at $A74B can enter alternate-slot cleanup, or call a helper and choose a movement callback by a sign byte; callback carry controls its transition to state 1. VICE checked five controlled cases per load with callbacks stubbed in loads 2, 4, 6, 14, 15, 17, 24 and 25. Natural reachability remains open.

The type-$22 collision helper at $A7E8 can return directly or enter state-2 setup after either of two carry checks. State-2 setup returns to the helper’s caller, so a state-0 call continues after it. VICE checked five controlled cases per load with callbacks stubbed in loads 2, 4, 6, 14, 15, 17, 24 and 25. Natural reachability remains open.

The load’s type-$01 entity vector selects a dispatcher at $A038. Three captured state-table pairs point to $A050, $A0B5, $A0EC; the state index is not locally bounded. Listing tests check all three targets in loads 3, 13, 14, 15, 17, 19 and 26; the state-index range and ordinary-play reachability remain open.

Type-$01 state 0 at $A050 can select state 1 or 2 based on carry from $732A and the sign of $1A6D,X. Its other active paths update $1AD3,X, $1AE4,X and a frame byte and set $1A7E,X if clear; when $1A29,X is zero it only sets that flag if clear. Listing tests exercise these branches across seven loads with external callees stubbed; natural reachability remains open.

Type-$01 state 1 at $A0B5 returns to state 0 when $1A8F,X is zero; otherwise it calls $45BC or $4574 according to $1B28,X and updates the frame. State 2 at $A0EC decrements $1B17,X, uses the same frame update when the result is nonzero, and calls $4B0E before jumping to $5DB9 when it is zero. Listing tests cover both states across seven loads with callbacks stubbed; natural reachability remains open.

The load’s type-$02 entity vector selects a dispatcher at $A0FB. Three captured state-table pairs point to $A113, $A1DD, $A217; the state index is not locally bounded. Listing tests check all three targets in loads 13, 14, 15, 17 and 19; the state-index range and ordinary-play reachability remain open.

Type-$02 state 2 at $A217 computes a frame based on whether $1AD3,X equals $80, decrements $1AE4,X and can call $4B0E and $5DB9. VICE checked four controlled cases per load with callbacks stubbed in loads 13, 14, 15, 17 and 19. Natural reachability remains open.

Type-$02 state 1 at $A1DD decrements a timer, chooses a movement callback by a signed byte, and either resets to state 0 or updates a frame. VICE checked five controlled cases per load with callbacks stubbed in loads 13, 14, 15, 17 and 19. Natural reachability remains open.

The type-$02 helper at $A1B8 toggles bit 7 of $1AD3,X. The frame helper at $A1C1 patches an immediate operand to 0 or 8 and combines it with a timer bit and $19E5,X. VICE checked three controlled frame cases per load in loads 13, 14, 15, 17 and 19. Natural reachability remains open.

The type-$02 state-0 entry at $A113 can select state 1 or 2 or continue to the timer path. VICE checked seven controlled entry cases per load with callbacks stubbed in loads 13, 14, 15, 17 and 19. Natural reachability remains open.

The type-$02 state-0 timer path at $A156 can update a frame, select a movement callback, or reset a timer and toggle two direction bits. VICE checked seven controlled cases per load with callbacks stubbed in loads 13, 14, 15, 17 and 19. Natural reachability remains open.

Sampling a forced play capture every 20 frames through frame 400 while holding right, alternating fire and adding up after frame 100 found 4 additional active sprite pointers whose bitmap ranges had no prior descriptions. Their sampled bytes matched the entry snapshot; non-stopping execution checkpoints saw no instruction entry into those ranges during a replay with the same inputs. The recorded settings and first sampled frames are in `wide-display-observations.json`; ordinary-play reachability remains open.

A forced $717C call copied all 2,048 bytes from the entry character source to RAM at $D000–$D7FF. The selected bytes matched the captured play snapshot, and a 200-frame play capture recorded no instruction entry into those selected ranges. 60 eight-byte characters before the nearest discovered code entry or update pointer were described from their row patterns; whether each is displayed and other possible code uses remain open.

The captured 48 low and high entity-handler bytes at $7EDF–$7F3E pair into 38 distinct addresses. The listing test runs the instructions from $2027 up to the call at $2036 for every index in this load. VICE checked indices 0, 1 and 47 in loads 2, 24 and 31 before the call. The code does not locally bound the index, and individual target reachability remains open.

The 42 captured bytes at $7F58–$7F81 supply sound pointers, reward and item values, map replacements, sampled-map comparisons and a visual-resource selector. The listing test checks the bytes and exercises the sound-pointer and visual-selector reads for this load; VICE checked those reads in loads 2, 24 and 31. Other fields are tied to their documented resident readers; their ordinary-play reachability remains open.
