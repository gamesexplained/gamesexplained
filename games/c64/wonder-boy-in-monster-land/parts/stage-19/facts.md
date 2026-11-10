# Load 19 — verified technical facts

The resident draw loop at `$6D41–$6D63` ran 200 iterations in the first 200 frames after this forced load returned. Its four indexed reads use `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use the indexed attribute table at `$80CF`; the exact meanings of all its bit combinations remain open. This observation follows a forced transition and does not establish a route by ordinary play.

The entry snapshot has 29 row pointers in split tables at `$85CF` and `$8620`. They point to rows beginning at `$8671` and spaced 128 bytes apart; the address immediately after that storage is `$94F1`, the character-data pointer recorded at `$7F41`. The downward scroll check uses `$7F4C` as its vertical boundary. This does not establish that every stored cell is encountered during play.

The captured sound pointers select voice lists at $B44F, $B455, $B45B; their records name 5 distinct event patterns. In the captured selector-1 loop, the resident sequencer selected each pattern and reached its documented zero marker in the listing-based simulator. `test_stage_sound_patterns.js` checks the pointers, pattern boundaries and those visits. This observation does not establish when ordinary play selects the sound.

The captured descriptor names 9 six-byte trigger records at `$985C` and 3 sixteen-byte stage object records at `$98AE`. `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions, stubbing the map updater for the sixteen-byte records. These captured records do not establish that ordinary play activates them.

In the forced play capture, 2 stable 63-byte sprite bitmaps from this load were named by active display-slot entries in VIC bank 3. Their entry and play bytes match; non-stopping checkpoints saw no instruction entry into those bitmap ranges during the following 200 frames. The observation covers those captured states and does not establish all animation or ordinary-play behavior.

The loaded pointer at `$7F3F/$7F40` targets `$9851`, inside the eight-page character-copy source at `$94F1`. The entry was observed in the 200-frame forced-play probe and monitor collection. The code and graphics uses overlap; `codemap.json` records only observed instruction starts in that source whose bytes still matched the load-entry snapshot.

Sampling the forced play capture every ten frames through frame 200 found 2 additional active sprite pointers in this load. Their bitmap bytes matched the entry snapshot at their first sampled frame, and execution checkpoints recorded no instruction entries in those ranges during the same 200-frame probe. The recorded display settings and first sampled frame are in `display-observations.json`; natural reachability remains open.

The supplied side A file with index $13 supplies two compressed streams. Executing the game’s decoder on those bytes in the 6502 simulator consumed 2200 and 7745 bytes and wrote $EB40–$FFBF and $7EDF–$BFCB, respectively. All written output bytes match the forced VICE load-entry snapshot. The extracted file has 215 further bytes after the two streams; their role is not established. This establishes these stream writes for the supplied image, not natural reachability or ownership of repeated data across loads.

Controlled record-copy, frame-restore and display-routine simulations selected 6 additional bitmap pointers in this load. Slot assignment, position, effect state and one colour were forced. The bitmaps match the load-entry and play captures; no instruction entered their ranges during a 200-frame probe. These examples do not establish natural reachability.

18 three-line message records in this load were identified from instruction sequences that load their addresses in X/Y before reaching $77E0. With selector $77E1 forced to zero, listing tests check the pointer and copy of every recorded line into the message buffers; spaces become glyph zero. Twelve controlled VICE calls check representative records from loads 2, 4, 9, 12, 19, 22, 29, 30 and 31 with the same selector. Glyph $60 is a downward-pointing triangle; its role and ordinary-play reachability remain open.
The item-message selector at $9D8B computes an eight-bit table offset from A with decimal mode clear and passes a selected pointer in X/Y to $77E0. Controlled inputs 0–23 select 24 pointer entries and 21 distinct three-line records, including item names. Listing tests check every selection and copy with selector $77E1 forced to zero; ten controlled VICE calls check representative selections in loads 2, 4, 9, 19, 27 and 30. The input range in play and ordinary-play reachability remain open.

The price selector at $9CF7 sends the first two bytes of an eight-byte item row to $7901 as a packed-decimal amount. The game subtracts that amount from the selected player’s gold when funds suffice; otherwise it restores the balance and returns clear carry. Listing tests cover all 24 captured prices at zero, one below the price, the exact price and 9,999 gold (where distinct), and ten controlled VICE calls check representative deductions. Item index 4 selects the Winged Boots message and has a price of 30 in these captured tables; ordinary-play reachability remains open.

The two pointer pairs at offsets 2–5 in each item row supply subroutine-call operands. Three selectors copy these pairs into JSR instructions; listing tests check all 24 captured rows at each selector, and eleven controlled VICE calls check representative patches. Ordinary-play reachability remains open.

The item-row targets at offset 4 select routines at $A212–$A277. Controlled item inputs call helpers for Wing Boots, Helmet, Gauntlet or Revival Medicine, update one of three selected-player fields, or pass fixed A/X values to $536F. Listing tests cover all 24 item paths for both player indices with external routines stubbed; sixteen controlled VICE calls check representative paths. Natural purchase reachability and the external callbacks’ remaining effects remain open.

The item-row targets at offset 2 select drawing routines at $A106–$A150. Depending on the target, they return or write a 4-by-3 or 4-by-4 block of consecutive tile bytes using a 40-byte row stride. Listing tests check all 24 item targets in 17 loads with decimal mode clear; eleven controlled VICE calls check representative tile writes. Natural shop contexts remain open.

1 simple eight-row glyphs in the character-copy source are referenced by metatiles in the captured map. Listing tests reconstruct their map references and run the $717C copy; seven controlled VICE reads check representative destination glyphs in loads 2, 20, 27 and 31. These observations do not establish ordinary-play reachability or exclude other possible code uses.

The purchase path at $9CEC selects an item index, charges its packed-decimal price and branches away on insufficient funds. On success it decrements $4753,X, selects an effect target, calls it with the item index plus 1, passes a message pointer to $77E0 and waits while $4D6B is nonzero. Listing tests cover 68 controlled purchase paths across 17 loads and eight VICE calls check representative paths, with effect and message callbacks stubbed. The gate at $9CC3 supplies that flag from $9DFC on one path; other entry paths and ordinary-play purchase reachability remain open.

The shop gate at $9CC3 can branch to the purchase choice using the sign of $9DFC, or pass one of two message pointers according to $4753,X. Listing tests check 102 controlled gate cases and the extended purchase paths across 17 loads; eight VICE calls check gate cases and eight check purchases. The gate byte’s role, the mode’s possible values and natural reachability remain open.

The shop input choice at $9C60 tests active-low fire, left and right in that order. Its direction handlers decrement or increment the mode byte at $9DFC, can pass the corresponding item index to the message selector, and call another helper. Listing tests check 204 controlled input and mode cases across 17 loads with callbacks stubbed; eleven VICE calls check representative paths. Ordinary-play timing, mode ranges and callback effects remain open.

The shop initializer at $9C32 sets the mode byte to 0 and its countdown to $DC. Starting from 0, the traced left and right handlers keep the mode among $FF, $00 and $01 if no other code changes it. Listing tests check initialization and every transition among those three values in 17 loads; ten controlled VICE calls check representative cases with callbacks stubbed. Other possible writes and ordinary-play timing remain open.

The shop wait paths at $9C3C and $9C4F call $3C2A and decrement the countdown. Starting from $DC, controlled paths reach zero after 220 calls; the timeout then either branches on the gate byte or marks $4753,X and passes a message pointer. Listing tests check both wait paths and timeout branches in 17 loads with callbacks stubbed; eight controlled VICE calls check representative paths. Seconds, ordinary-play timing and other exits remain open.

The captured map references 80 additional described glyphs through its tile-quadrant tables. Their source bytes match the copied character RAM in the play capture, and `test_map_glyphs_expanded.js` checks each map reference and runs the $717C copy. Controlled VICE reads of 18 glyphs in loads 2, 9, 16, 20, 27 and 31 agree with the captures. Ordinary-play reachability and other uses remain open.

The load’s type-$01 entity vector selects a dispatcher at $B765. Three captured state-table pairs point to $B77D, $B7E2, $B819; the state index is not locally bounded. Listing tests check all three targets in loads 3, 13, 14, 15, 17, 19 and 26; the state-index range and ordinary-play reachability remain open.

Type-$01 state 0 at $B77D can select state 1 or 2 based on carry from $732A and the sign of $1A6D,X. Its other active paths update $1AD3,X, $1AE4,X and a frame byte and set $1A7E,X if clear; when $1A29,X is zero it only sets that flag if clear. Listing tests exercise these branches across seven loads with external callees stubbed; natural reachability remains open.

Type-$01 state 1 at $B7E2 returns to state 0 when $1A8F,X is zero; otherwise it calls $45BC or $4574 according to $1B28,X and updates the frame. State 2 at $B819 decrements $1B17,X, uses the same frame update when the result is nonzero, and calls $4B0E before jumping to $5DB9 when it is zero. Listing tests cover both states across seven loads with callbacks stubbed; natural reachability remains open.

The load’s type-$02 entity vector selects a dispatcher at $B828. Three captured state-table pairs point to $B840, $B90A, $B944; the state index is not locally bounded. Listing tests check all three targets in loads 13, 14, 15, 17 and 19; the state-index range and ordinary-play reachability remain open.

Type-$02 state 2 at $B944 computes a frame based on whether $1AD3,X equals $80, decrements $1AE4,X and can call $4B0E and $5DB9. VICE checked four controlled cases per load with callbacks stubbed in loads 13, 14, 15, 17 and 19. Natural reachability remains open.

Type-$02 state 1 at $B90A decrements a timer, chooses a movement callback by a signed byte, and either resets to state 0 or updates a frame. VICE checked five controlled cases per load with callbacks stubbed in loads 13, 14, 15, 17 and 19. Natural reachability remains open.

The type-$02 helper at $B8E5 toggles bit 7 of $1AD3,X. The frame helper at $B8EE patches an immediate operand to 0 or 8 and combines it with a timer bit and $19E5,X. VICE checked three controlled frame cases per load in loads 13, 14, 15, 17 and 19. Natural reachability remains open.

The type-$02 state-0 entry at $B840 can select state 1 or 2 or continue to the timer path. VICE checked seven controlled entry cases per load with callbacks stubbed in loads 13, 14, 15, 17 and 19. Natural reachability remains open.

The type-$02 state-0 timer path at $B883 can update a frame, select a movement callback, or reset a timer and toggle two direction bits. VICE checked seven controlled cases per load with callbacks stubbed in loads 13, 14, 15, 17 and 19. Natural reachability remains open.

The type-$0A entity dispatcher at $B966 uses $1AB1,X without a local bounds check. Five captured table pairs select $B982, $B99F, $B9F1, $BA4C, $BA6D; VICE checked all five in loads 6, 19 and 28. Ordinary-play reachability and index bounds remain open.

Type-$0A state 3 decrements $1B17,X and either tail-calls a direction-selected callback or toggles bit 7 of $1AD3,X and restores the state from $1B28,X. State 4 decrements $1AC2,X and on a negative result calls $4B0E with A=$50 and jumps to $5DB9. VICE checked seven forced cases in loads 6, 19 and 28 with callbacks stubbed. Ordinary-play reachability remains open.

Type-$0A helper $BAA1 saves the state in $1B28,X and calls $792C and $732A. Carry set from $732A selects state 3 for positive $1A6D,X or state 4 otherwise, then discards one return address. The positive path rotates a working byte through carry from $72FC; the other sets $1A8F,X=$FF and $1AC2,X=10. Carry clear calls $7227 and may tail-jump to $5D7A with A=4. VICE checked six forced cases in loads 6, 19 and 28 with callbacks stubbed. Ordinary-play reachability remains open.

Type-$0A state 0 calls the event helper, stores masked results from two $3020 calls, sets $1AE4,X=4 and state 1, and falls through to state 1. If the second helper call returns normally, state 1 decrements $1AE4,X to 3. VICE checked three forced $3020 values in loads 6, 19 and 28 with callbacks stubbed. Ordinary-play reachability remains open.

After its initial delay, type-$0A state 1 decrements $1AC2,X. A nonnegative result calls its frame helper and a direction-selected callback, and selects state 0 when the callback result masked with 6 differs from 2. A negative result calls $3020 and selects state 0 or, for a negative result, calls it again and selects state 2. VICE checked six forced cases in loads 6, 19 and 28 with callbacks stubbed. Ordinary-play reachability remains open.

The type-$0A frame helper at $BA7B increments $1B06,X, resetting it for values at least 3, and uses twice that value plus a direction-dependent offset and $19E5,X to set $19C3,X. VICE checked four forced cases in loads 6, 19 and 28. Ordinary-play reachability remains open.

Type-$0A state 2 calls its event helper and, after a delay, updates $1AF5,X and either selects state 0 or calls the frame helper and a direction-selected callback. Negative $1AF5,X values below $8C increment before returning to the frame update; values at least $8C remain unchanged. VICE checked eight forced cases in loads 6, 19 and 28 with callbacks stubbed. Ordinary-play reachability remains open.

The type-$17 handler at $BAEA updates a timer and position and can allocate a type-$2C slot when its decremented timer is $FC. That timer resets to 20 even when the active-slot check skips allocation. Its event helper can call $4B0E and jump to $5DB9. VICE checked six handler cases and five event cases in loads 19, 24 and 28 with callbacks stubbed. Callback effects and ordinary-play reachability remain open.

The type-$2C handler at $BB9D initializes parameters when $1B28,X is zero, or updates a position and frame before returning or jumping to $4454 when it is nonzero. Type-$17 can initialize a type-$2C slot. VICE checked six forced cases in loads 19, 24 and 28 with callbacks stubbed and cleanup paths stopped at $4454. Callback effects, indexed-value bounds and ordinary-play reachability remain open.

A forced $717C call copied all 2,048 bytes from the entry character source to RAM at $D000–$D7FF. The selected bytes matched the captured play snapshot, and a 200-frame play capture recorded no instruction entry into those selected ranges. 27 eight-byte characters before the nearest discovered code entry or update pointer were described from their row patterns; whether each is displayed and other possible code uses remain open.

The captured 48 low and high entity-handler bytes at $7EDF–$7F3E pair into 12 distinct addresses. The listing test runs the instructions from $2027 up to the call at $2036 for every index in this load. VICE checked indices 0, 1 and 47 in loads 2, 24 and 31 before the call. The code does not locally bound the index, and individual target reachability remains open.

The 42 captured bytes at $7F58–$7F81 supply sound pointers, reward and item values, map replacements, sampled-map comparisons and a visual-resource selector. The listing test checks the bytes and exercises the sound-pointer and visual-selector reads for this load; VICE checked those reads in loads 2, 24 and 31. Other fields are tied to their documented resident readers; their ordinary-play reachability remains open.

The captured bytes at $7F43–$7F49 supply initial colour shadows, player frame and position; $7F4D/$7F4E supply view-origin values that later code can change. A listing test checks their initialization paths for this load. VICE checked both paths in loads 2, 24 and 31 with the HUD callback stubbed. Ordinary-play reachability remains open.

16 stable 63-byte ranges match shapes verified in other loads and lie at VIC bank-3 sprite-slot boundaries. VICE read the entry bytes and observed no instruction entry into those ranges during a 200-frame play capture. The listing test compares each range with its source shape and the graphics gallery. Display use in this load and other possible code uses remain open.

6 stable 63-byte aligned ranges form one-bit patterns that recur in other loads. VICE checked their entry bytes and observed no instruction entry into those ranges during a 200-frame play capture. The listing test compares every matching range and the viewer. Display use, actual colours and other possible code uses remain open.

14 stable 63-byte aligned ranges form one-bit patterns in this load. VICE checked their entry bytes and observed no instruction entry into those ranges during a 200-frame play capture. The listing test compares every range and the viewer. Display use, actual colours and other possible code uses remain open.

A forced $717C call copied all 2,048 bytes from the entry character source to RAM at $D000–$D7FF. The selected bytes matched the captured play snapshot, and a 200-frame play capture recorded no instruction entry into those selected ranges. 101 eight-byte characters excluding typed code, discovered entry bytes, update pointers and existing annotations were described from their row patterns; whether each is displayed and other possible code uses remain open.
