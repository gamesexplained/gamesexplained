# Load 18 — verified technical facts

The resident draw loop at `$6D41–$6D63` ran 200 iterations in the first 200 frames after this forced load returned. Its four indexed reads use `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use the indexed attribute table at `$80CF`; the exact meanings of all its bit combinations remain open. This observation follows a forced transition and does not establish a route by ordinary play.

The entry snapshot has 15 row pointers in split tables at `$85CF` and `$8620`. They point to rows beginning at `$8671` and spaced 128 bytes apart; the address immediately after that storage is `$8DF1`, the character-data pointer recorded at `$7F41`. The downward scroll check uses `$7F4C` as its vertical boundary. This does not establish that every stored cell is encountered during play.

The captured sound pointers select voice lists at $9FCE, $9FD4, $9FDA; their records name 6 distinct event patterns. In the captured selector-1 loop, the resident sequencer selected each pattern and reached its documented zero marker in the listing-based simulator. `test_stage_sound_patterns.js` checks the pointers, pattern boundaries and those visits. This observation does not establish when ordinary play selects the sound.

The captured descriptor names 1 six-byte trigger records at `$916D` and 1 sixteen-byte stage object records at `$9173`. `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions, stubbing the map updater for the sixteen-byte records. These captured records do not establish that ordinary play activates them.

In the forced play capture, 2 stable 63-byte sprite bitmaps from this load were named by active display-slot entries in VIC bank 3. Their entry and play bytes match; non-stopping checkpoints saw no instruction entry into those bitmap ranges during the following 200 frames. The observation covers those captured states and does not establish all animation or ordinary-play behavior.

The loaded pointer at `$7F3F/$7F40` targets `$9151`, inside the eight-page character-copy source at `$8DF1`. The entry was observed in the 200-frame forced-play probe and monitor collection. The code and graphics uses overlap; `codemap.json` records only observed instruction starts in that source whose bytes still matched the load-entry snapshot.

The supplied side A file with index $12 supplies two compressed streams. Executing the game’s decoder on those bytes in the 6502 simulator consumed 992 and 4355 bytes and wrote $EB40–$F53F and $7EDF–$A553, respectively. All written output bytes match the forced VICE load-entry snapshot. The extracted file has 241 further bytes after the two streams; their role is not established. This establishes these stream writes for the supplied image, not natural reachability or ownership of repeated data across loads.

Controlled record-copy, frame-restore and display-routine simulations selected 4 additional bitmap pointers in this load. Slot assignment, position, effect state and one colour were forced. The bitmaps match the load-entry and play captures; no instruction entered their ranges during a 200-frame probe. These examples do not establish natural reachability.

3 three-line message records in this load were identified from instruction sequences that load their addresses in X/Y before reaching $77E0. With selector $77E1 forced to zero, listing tests check the pointer and copy of every recorded line into the message buffers; spaces become glyph zero. Twelve controlled VICE calls check representative records from loads 2, 4, 9, 12, 19, 22, 29, 30 and 31 with the same selector. Glyph $60 is a downward-pointing triangle; its role and ordinary-play reachability remain open.
The item-message selector at $94C2 computes an eight-bit table offset from A with decimal mode clear and passes a selected pointer in X/Y to $77E0. Controlled inputs 0–23 select 24 pointer entries and 21 distinct three-line records, including item names. Listing tests check every selection and copy with selector $77E1 forced to zero; ten controlled VICE calls check representative selections in loads 2, 4, 9, 19, 27 and 30. The input range in play and ordinary-play reachability remain open.

The price selector at $942E sends the first two bytes of an eight-byte item row to $7901 as a packed-decimal amount. The game subtracts that amount from the selected player’s gold when funds suffice; otherwise it restores the balance and returns clear carry. Listing tests cover all 24 captured prices at zero, one below the price, the exact price and 9,999 gold (where distinct), and ten controlled VICE calls check representative deductions. Item index 4 selects the Winged Boots message and has a price of 30 in these captured tables; ordinary-play reachability remains open.

The two pointer pairs at offsets 2–5 in each item row supply subroutine-call operands. Three selectors copy these pairs into JSR instructions; listing tests check all 24 captured rows at each selector, and eleven controlled VICE calls check representative patches. Ordinary-play reachability remains open.

The item-row targets at offset 4 select routines at $9949–$99AE. Controlled item inputs call helpers for Wing Boots, Helmet, Gauntlet or Revival Medicine, update one of three selected-player fields, or pass fixed A/X values to $536F. Listing tests cover all 24 item paths for both player indices with external routines stubbed; sixteen controlled VICE calls check representative paths. Natural purchase reachability and the external callbacks’ remaining effects remain open.

The item-row targets at offset 2 select drawing routines at $983D–$9887. Depending on the target, they return or write a 4-by-3 or 4-by-4 block of consecutive tile bytes using a 40-byte row stride. Listing tests check all 24 item targets in 17 loads with decimal mode clear; eleven controlled VICE calls check representative tile writes. Natural shop contexts remain open.

The purchase path at $9423 selects an item index, charges its packed-decimal price and branches away on insufficient funds. On success it decrements $4753,X, selects an effect target, calls it with the item index plus 1, passes a message pointer to $77E0 and waits while $4D6B is nonzero. Listing tests cover 68 controlled purchase paths across 17 loads and eight VICE calls check representative paths, with effect and message callbacks stubbed. The gate at $93FA supplies that flag from $9533 on one path; other entry paths and ordinary-play purchase reachability remain open.

The shop gate at $93FA can branch to the purchase choice using the sign of $9533, or pass one of two message pointers according to $4753,X. Listing tests check 102 controlled gate cases and the extended purchase paths across 17 loads; eight VICE calls check gate cases and eight check purchases. The gate byte’s role, the mode’s possible values and natural reachability remain open.

The shop input choice at $9397 tests active-low fire, left and right in that order. Its direction handlers decrement or increment the mode byte at $9533, can pass the corresponding item index to the message selector, and call another helper. Listing tests check 204 controlled input and mode cases across 17 loads with callbacks stubbed; eleven VICE calls check representative paths. Ordinary-play timing, mode ranges and callback effects remain open.

The shop initializer at $9369 sets the mode byte to 0 and its countdown to $DC. Starting from 0, the traced left and right handlers keep the mode among $FF, $00 and $01 if no other code changes it. Listing tests check initialization and every transition among those three values in 17 loads; ten controlled VICE calls check representative cases with callbacks stubbed. Other possible writes and ordinary-play timing remain open.

The shop wait paths at $9373 and $9386 call $3C2A and decrement the countdown. Starting from $DC, controlled paths reach zero after 220 calls; the timeout then either branches on the gate byte or marks $4753,X and passes a message pointer. Listing tests check both wait paths and timeout branches in 17 loads with callbacks stubbed; eight controlled VICE calls check representative paths. Seconds, ordinary-play timing and other exits remain open.

The captured map references 40 additional described glyphs through its tile-quadrant tables. Their source bytes match the copied character RAM in the play capture, and `test_map_glyphs_expanded.js` checks each map reference and runs the $717C copy. Controlled VICE reads of 18 glyphs in loads 2, 9, 16, 20, 27 and 31 agree with the captures. Ordinary-play reachability and other uses remain open.

The load’s type-$03 entity vector selects a dispatcher at $A385. Three captured state-table pairs point to $A39D, $A4A2, $A4DC; the state index is not locally bounded. Listing tests check all three targets in loads 13, 14, 15, 17, 18, 24, 26 and 27; the state-index range and ordinary-play reachability remain open.

Type-$03 state 1 at $A4A2 chooses a movement callback by a signed field and updates two frames; when the first frame addition wraps to zero, it calls both movement callbacks. State 2 at $A4DC calls $4B20 and $5DB9 with A=2. VICE checked five controlled cases per load with callbacks stubbed in loads 13, 14, 15, 17, 18, 24, 26 and 27. Natural reachability remains open.

The type-$03 state-0 entry at $A39D can return immediately, select state 1 or 2 based on callback carry and a signed field, or continue to the movement path. VICE checked seven controlled entry cases per load with external callbacks stubbed in loads 13, 14, 15, 17, 18, 24, 26 and 27. Natural reachability remains open.

The type-$03 state-0 movement tail at $A458 reads a signed byte from a 40-byte table at $A47A, calls $4342 for negative values or $4368 otherwise, and advances the returned Y with an equality wrap at 40. VICE checked four controlled indices per load with callbacks stubbed in loads 13, 14, 15, 17, 18, 24, 26 and 27. The input-index range and natural reachability remain open.

The type-$03 state-0 frame path at $A3D4 uses carry returned by $72FC and the parity of $1B28,X to update $1AD3,X and two frame bytes. VICE checked six controlled cases per load with the callback stubbed in loads 13, 14, 15, 17, 18, 24, 26 and 27. Natural reachability remains open.

The type-$03 horizontal calculation at $A426 subtracts 6 from negative magnitudes but 5 from nonnegative values before deciding whether to call a movement routine. The difference comes from carry left clear by ADC 1 on the negative path. VICE checked seven controlled inputs per load with movement callbacks stubbed in loads 13, 14, 15, 17, 18, 24, 26 and 27. Whether ordinary play reaches these inputs remains open.

A forced $717C call copied all 2,048 bytes from the entry character source to RAM at $D000–$D7FF. The selected bytes matched the captured play snapshot, and a 200-frame play capture recorded no instruction entry into those selected ranges. 68 eight-byte characters before the nearest discovered code entry or update pointer were described from their row patterns; whether each is displayed and other possible code uses remain open.

The captured 48 low and high entity-handler bytes at $7EDF–$7F3E pair into 38 distinct addresses. The listing test runs the instructions from $2027 up to the call at $2036 for every index in this load. VICE checked indices 0, 1 and 47 in loads 2, 24 and 31 before the call. The code does not locally bound the index, and individual target reachability remains open.

The 42 captured bytes at $7F58–$7F81 supply sound pointers, reward and item values, map replacements, sampled-map comparisons and a visual-resource selector. The listing test checks the bytes and exercises the sound-pointer and visual-selector reads for this load; VICE checked those reads in loads 2, 24 and 31. Other fields are tied to their documented resident readers; their ordinary-play reachability remains open.

The captured bytes at $7F43–$7F49 supply initial colour shadows, player frame and position; $7F4D/$7F4E supply view-origin values that later code can change. A listing test checks their initialization paths for this load. VICE checked both paths in loads 2, 24 and 31 with the HUD callback stubbed. Ordinary-play reachability remains open.

8 stable 63-byte ranges match shapes verified in other loads and lie at VIC bank-3 sprite-slot boundaries. VICE read the entry bytes and observed no instruction entry into those ranges during a 200-frame play capture. The listing test compares each range with its source shape and the graphics gallery. Display use in this load and other possible code uses remain open.

8 stable 63-byte aligned ranges form one-bit patterns that recur in other loads. VICE checked their entry bytes and observed no instruction entry into those ranges during a 200-frame play capture. The listing test compares every matching range and the viewer. Display use, actual colours and other possible code uses remain open.

A forced $717C call copied all 2,048 bytes from the entry character source to RAM at $D000–$D7FF. The selected bytes matched the captured play snapshot, and a 200-frame play capture recorded no instruction entry into those selected ranges. 95 eight-byte characters excluding typed code, discovered entry bytes, update pointers and existing annotations were described from their row patterns; whether each is displayed and other possible code uses remain open.

Controlled visual-resource selections copied 172 additional eight-byte character patterns from their captured sources. VICE checked each copy and recorded no instruction entry into the selected bytes during 200 frames of captured play; a listing test repeats the copies. Display use, other possible code uses and ordinary-play reachability remain open.

A forced call to the price formatter at $94EF and digit writer at $94D4 converts packed price bytes into four character and colour cells. VICE and a listing test check both calls in this load. Input bounds, other values and ordinary-play reachability remain open.

Shop helpers at $9497 and $94AA test sampled input and choose a cursor position. Five forced VICE cases and a listing test checked both helpers in this load, with the sampler stubbed and display initialization stopped. The adjacent layout, selection, timeout and item bytes are read or written by the separately tested shop paths. Physical control mapping, other indexes and ordinary-play reachability remain open.

The shop conditional-item resolver at $9482 changes item $13 to $14 when the selected player has flag $10; other inputs pass through. Three forced VICE cases and a listing test check it in this load. Other callers and ordinary-play reachability remain open.

The captured shop message bank contains the same 34 records as the decoded first-load bank. VICE matched the complete message bytes in this load; listing tests check all record hashes and decode the first-load fields. Selection of each record in ordinary play and other overlapping uses remain open.

The captured split row-pointer tables contain 81 pairs. All follow a 128-byte stride from $8671; the first 15 correspond to the map rows described here. VICE compared the remaining table bytes to the entry snapshot, and `test_later_row_pointer_tails.js` checks all pairs. Whether gameplay uses the extra entries and the uses of their targets remain open.

This load has 2 captured motion-reader entries and encoded streams documented in `later-motion-streams.json`. Forced VICE calls checked each first value and reset; the listing test checks full decoded sequences. Ordinary-play reachability remains open.

The shop entry at $9183 configures two screen-page bytes, formats two stage prices and branches on the selected player’s balance and stage category. Five forced VICE cases and `test_later_shop_entries.js` check formatting, insufficient and sufficient balance, and message selection with display and gate callbacks stubbed. Some bytes also occur in captured character or graphics sources; ordinary-play contexts remain open.
