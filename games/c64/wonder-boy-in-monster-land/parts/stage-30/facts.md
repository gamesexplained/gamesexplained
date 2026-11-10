# Load 30 — verified technical facts

The resident draw loop at `$6D41–$6D63` ran 200 iterations in the first 200 frames after this forced load returned. Its four indexed reads use `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use the indexed attribute table at `$80CF`; the exact meanings of all its bit combinations remain open. This observation follows a forced transition and does not establish a route by ordinary play.

The entry snapshot has 14 row pointers in split tables at `$85CF` and `$8620`. They point to rows beginning at `$8671` and spaced 128 bytes apart; the address immediately after that storage is `$8D71`, the character-data pointer recorded at `$7F41`. The downward scroll check uses `$7F4C` as its vertical boundary. This does not establish that every stored cell is encountered during play.

The captured sound pointers select voice lists at $B16E, $B176, $B17E; their records name 6 distinct event patterns. In the captured selector-1 loop, the resident sequencer selected each pattern and reached its documented zero marker in the listing-based simulator. `test_stage_sound_patterns.js` checks the pointers, pattern boundaries and those visits. This observation does not establish when ordinary play selects the sound.

The captured descriptor names 2 six-byte trigger records at `$92A4` and 4 sixteen-byte stage object records at `$935F`. `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions, stubbing the map updater for the sixteen-byte records. These captured records do not establish that ordinary play activates them.

The loaded pointer at `$7F3F/$7F40` targets `$9299`, inside the eight-page character-copy source at `$8D71`. The entry was not observed in the 200-frame forced-play probe and monitor collection. The loaded entry is decoded as code and also lies within the character-copy source. No instruction start in that source was observed in this bounded probe; the code path remains to be reached in ordinary play.

The supplied side B file with index $1E supplies two compressed streams. Executing the game’s decoder on those bytes in the 6502 simulator consumed 1866 and 7518 bytes and wrote $EB40–$F6BF and $7EDF–$B5F3, respectively. All written output bytes match the forced VICE load-entry snapshot. This establishes these stream writes for the supplied image, not natural reachability or ownership of repeated data across loads.

Controlled record-copy, frame-restore and display-routine simulations selected 2 additional bitmap pointers in this load. Slot assignment, position, effect state and one colour were forced. The bitmaps match the load-entry and play captures; no instruction entered their ranges during a 200-frame probe. These examples do not establish natural reachability.

15 three-line message records in this load were identified from instruction sequences that load their addresses in X/Y before reaching $77E0. With selector $77E1 forced to zero, listing tests check the pointer and copy of every recorded line into the message buffers; spaces become glyph zero. Twelve controlled VICE calls check representative records from loads 2, 4, 9, 12, 19, 22, 29, 30 and 31 with the same selector. Glyph $60 is a downward-pointing triangle; its role and ordinary-play reachability remain open.
The item-message selector at $AA8F computes an eight-bit table offset from A with decimal mode clear and passes a selected pointer in X/Y to $77E0. Controlled inputs 0–23 select 24 pointer entries and 21 distinct three-line records, including item names. Listing tests check every selection and copy with selector $77E1 forced to zero; ten controlled VICE calls check representative selections in loads 2, 4, 9, 19, 27 and 30. The input range in play and ordinary-play reachability remain open.

The price selector at $A9FB sends the first two bytes of an eight-byte item row to $7901 as a packed-decimal amount. The game subtracts that amount from the selected player’s gold when funds suffice; otherwise it restores the balance and returns clear carry. Listing tests cover all 24 captured prices at zero, one below the price, the exact price and 9,999 gold (where distinct), and ten controlled VICE calls check representative deductions. Item index 4 selects the Winged Boots message and has a price of 30 in these captured tables; ordinary-play reachability remains open.

The two pointer pairs at offsets 2–5 in each item row supply subroutine-call operands. Three selectors copy these pairs into JSR instructions; listing tests check all 24 captured rows at each selector, and eleven controlled VICE calls check representative patches. Ordinary-play reachability remains open.

The item-row targets at offset 4 select routines at $AF16–$AF7B. Controlled item inputs call helpers for Wing Boots, Helmet, Gauntlet or Revival Medicine, update one of three selected-player fields, or pass fixed A/X values to $536F. Listing tests cover all 24 item paths for both player indices with external routines stubbed; sixteen controlled VICE calls check representative paths. Natural purchase reachability and the external callbacks’ remaining effects remain open.

The item-row targets at offset 2 select drawing routines at $AE0A–$AE54. Depending on the target, they return or write a 4-by-3 or 4-by-4 block of consecutive tile bytes using a 40-byte row stride. Listing tests check all 24 item targets in 17 loads with decimal mode clear; eleven controlled VICE calls check representative tile writes. Natural shop contexts remain open.

3 simple eight-row glyphs in the character-copy source are referenced by metatiles in the captured map. Listing tests reconstruct their map references and run the $717C copy; seven controlled VICE reads check representative destination glyphs in loads 2, 20, 27 and 31. These observations do not establish ordinary-play reachability or exclude other possible code uses.

The purchase path at $A9F0 selects an item index, charges its packed-decimal price and branches away on insufficient funds. On success it decrements $4753,X, selects an effect target, calls it with the item index plus 1, passes a message pointer to $77E0 and waits while $4D6B is nonzero. Listing tests cover 68 controlled purchase paths across 17 loads and eight VICE calls check representative paths, with effect and message callbacks stubbed. The gate at $A9C7 supplies that flag from $AB00 on one path; other entry paths and ordinary-play purchase reachability remain open.

The shop gate at $A9C7 can branch to the purchase choice using the sign of $AB00, or pass one of two message pointers according to $4753,X. Listing tests check 102 controlled gate cases and the extended purchase paths across 17 loads; eight VICE calls check gate cases and eight check purchases. The gate byte’s role, the mode’s possible values and natural reachability remain open.

The shop input choice at $A964 tests active-low fire, left and right in that order. Its direction handlers decrement or increment the mode byte at $AB00, can pass the corresponding item index to the message selector, and call another helper. Listing tests check 204 controlled input and mode cases across 17 loads with callbacks stubbed; eleven VICE calls check representative paths. Ordinary-play timing, mode ranges and callback effects remain open.

The shop initializer at $A936 sets the mode byte to 0 and its countdown to $DC. Starting from 0, the traced left and right handlers keep the mode among $FF, $00 and $01 if no other code changes it. Listing tests check initialization and every transition among those three values in 17 loads; ten controlled VICE calls check representative cases with callbacks stubbed. Other possible writes and ordinary-play timing remain open.

The shop wait paths at $A940 and $A953 call $3C2A and decrement the countdown. Starting from $DC, controlled paths reach zero after 220 calls; the timeout then either branches on the gate byte or marks $4753,X and passes a message pointer. Listing tests check both wait paths and timeout branches in 17 loads with callbacks stubbed; eight controlled VICE calls check representative paths. Seconds, ordinary-play timing and other exits remain open.

The captured map references 78 additional described glyphs through its tile-quadrant tables. Their source bytes match the copied character RAM in the play capture, and `test_map_glyphs_expanded.js` checks each map reference and runs the $717C copy. Controlled VICE reads of 18 glyphs in loads 2, 9, 16, 20, 27 and 31 agree with the captures. Ordinary-play reachability and other uses remain open.

The type-$0B entity dispatcher at $B359 calls $B566 and, if it returns, uses $1AB1,X without a local bounds check. Seven captured table pairs select $B37C, $B3A4, $B440, $B47E, $B4B9, $B4ED, $B523; VICE checked all seven in loads 6, 7, 22 and 30 with the preliminary helper stubbed. Ordinary-play reachability and index bounds remain open.

The type-$0B preliminary helper at $B566 rotates a working byte through carry from $72FC and copies it to $1AC2,X. With $1A8F,X zero, carry set from $732A selects state 5 for positive $1A6D,X or state 6 otherwise, before the dispatcher reads the state. Other paths call $7227 and may tail-jump to $5D7A with A=4. VICE checked six forced cases in loads 6, 7, 22 and 30 with callbacks stubbed. Indexed-write bounds and ordinary-play reachability remain open.

Type-$0B state 5 decrements $1B28,X and either restores the state from an indexed working location or updates two positions and tail-calls a direction-selected callback. State 6 decrements $1AC2,X and on a negative result calls $4B20 with A=3 before jumping to $5DB9 with A=2. VICE checked six forced direct calls in loads 6, 7, 22 and 30 with callbacks stubbed. The preliminary helper also changes $1AC2,X; ordinary-play reachability remains open.

Type-$0B state 4 decrements $1AE4,X and, if it becomes negative, updates two positions, selects state 1, sets a five-count delay and conditionally jumps according to $3020. VICE checked four forced cases in loads 6, 7, 22 and 30 with $3020 stubbed. Ordinary-play reachability remains open.

Type-$0B state 3 copies an indexed direction byte and handles positive, zero and negative $1AE4,X values through $4342 or $4368 before jumping to another handler path or tail-calling a direction-selected movement routine. VICE checked six forced cases in loads 6, 7, 22 and 30 with callbacks stubbed. Indexed-source bounds and ordinary-play reachability remain open.

Type-$0B state 2 decrements $1AF5,X, tail-calls a direction-selected movement routine, or updates a second countdown and either reverses direction or selects state 4 and computes two positions. VICE checked six forced cases in loads 6, 7, 22 and 30 with callbacks stubbed. Ordinary-play reachability remains open.

Type-$0B state 0 sets $1AD3,X according to $19F6,X, initializes a direction and two positions, selects state 1 and falls through into it. VICE checked four forced setup cases with the position helper stubbed and three direct position-helper cases in loads 6, 7, 22 and 30. Ordinary-play reachability remains open.

Type-$0B state 1 compares a direction-dependent difference, then may call a movement routine, select state 3, or enter a close-range branch that selects state 4 or initializes state 2 and falls through. VICE checked six comparison cases, three close-range cases and three direct position-helper cases in loads 6, 7, 22 and 30 with callbacks stubbed. The indexed values and ordinary-play reachability remain open.

A forced $717C call copied all 2,048 bytes from the entry character source to RAM at $D000–$D7FF. The source bytes matched the captured play snapshot, and an earlier 200-frame play capture recorded no instruction entry into that source range. 84 eight-byte characters before the nearest discovered code entry or update pointer were described from their row patterns; whether each is displayed and other possible code uses remain open.

The captured 48 low and high entity-handler bytes at $7EDF–$7F3E pair into 38 distinct addresses. The listing test runs the instructions from $2027 up to the call at $2036 for every index in this load. VICE checked indices 0, 1 and 47 in loads 2, 24 and 31 before the call. The code does not locally bound the index, and individual target reachability remains open.

The 42 captured bytes at $7F58–$7F81 supply sound pointers, reward and item values, map replacements, sampled-map comparisons and a visual-resource selector. The listing test checks the bytes and exercises the sound-pointer and visual-selector reads for this load; VICE checked those reads in loads 2, 24 and 31. Other fields are tied to their documented resident readers; their ordinary-play reachability remains open.

The captured bytes at $7F43–$7F49 supply initial colour shadows, player frame and position; $7F4D/$7F4E supply view-origin values that later code can change. A listing test checks their initialization paths for this load. VICE checked both paths in loads 2, 24 and 31 with the HUD callback stubbed. Ordinary-play reachability remains open.

2 stable 63-byte ranges match shapes verified in other loads and lie at VIC bank-3 sprite-slot boundaries. VICE read the entry bytes and observed no instruction entry into those ranges during a 200-frame play capture. The listing test compares each range with its source shape and the graphics gallery. Display use in this load and other possible code uses remain open.

30 stable 63-byte aligned ranges form one-bit patterns that recur in other loads. VICE checked their entry bytes and observed no instruction entry into those ranges during a 200-frame play capture. The listing test compares every matching range and the viewer. Display use, actual colours and other possible code uses remain open.

A forced $717C call copied all 2,048 bytes from the entry character source to RAM at $D000–$D7FF. The selected bytes matched the captured play snapshot, and a 200-frame play capture recorded no instruction entry into those selected ranges. 75 eight-byte characters excluding typed code, discovered entry bytes, update pointers and existing annotations were described from their row patterns; whether each is displayed and other possible code uses remain open.

Controlled visual-resource selections copied 307 additional eight-byte character patterns from their captured sources. VICE checked each copy and recorded no instruction entry into the selected bytes during 200 frames of captured play; a listing test repeats the copies. Display use, other possible code uses and ordinary-play reachability remain open.

A forced call to the captured panel setup at $AF7C writes four character cells and their colours after patching its helper at $B0BB. VICE and a listing test check the path with $46=$C0. Following panel behavior and ordinary-play reachability remain open.

The captured panel at $AF7C displays a byte-derived value, checks shifted player balance and meter state, and chooses one of four message paths. Four forced VICE cases and a listing test check these branches in this load. Later message behavior and ordinary-play reachability remain open.

The captured panel at $AF7C has two input loops that select a first or second path, or return to cursor setup. Five forced VICE cases and a listing test check prompt arguments, cursor fields and four branch outcomes in this load with frame, HUD and input callbacks stubbed. Callback effects and ordinary-play reachability remain open.

The panel completion path at $B07C calls resident routines, updates the selected-player index and stage-record field, and enters a message wait. Two forced VICE cases and a listing test check completion fields and a two-frame message wait in this load with callbacks stubbed. Callback effects and ordinary-play reachability remain open.

Seven captured message records are selected by this panel’s controlled paths. VICE matched their bytes and a listing test decodes all fields using the captured character set; spelling and punctuation are retained. Ordinary-play reachability remains open.

A forced call to the price formatter at $AABC and digit writer at $AAA1 converts packed price bytes into four character and colour cells. VICE and a listing test check both calls in this load. Input bounds, other values and ordinary-play reachability remain open.

Shop helpers at $AA64 and $AA77 test sampled input and choose a cursor position. Five forced VICE cases and a listing test checked both helpers in this load, with the sampler stubbed and display initialization stopped. The adjacent layout, selection, timeout and item bytes are read or written by the separately tested shop paths. Physical control mapping, other indexes and ordinary-play reachability remain open.

The shop conditional-item resolver at $AA4F changes item $13 to $14 when the selected player has flag $10; other inputs pass through. Three forced VICE cases and a listing test check it in this load. Other callers and ordinary-play reachability remain open.

The captured shop message bank contains the same 34 records as the decoded first-load bank. VICE matched the complete message bytes in this load; listing tests check all record hashes and decode the first-load fields. Selection of each record in ordinary play and other overlapping uses remain open.

The captured split row-pointer tables contain 81 pairs. All follow a 128-byte stride from $8671; the first 14 correspond to the map rows described here. VICE compared the remaining table bytes to the entry snapshot, and `test_later_row_pointer_tails.js` checks all pairs. Whether gameplay uses the extra entries and the uses of their targets remain open.

The object record at $937F contains initialization target $94AE. Two forced VICE calls and `test_later_object_inits.js` check its indexed entity-field writes and message pointer. The listing records the overlapping character-source use; callback effects and ordinary-play reachability remain open.

The object record at $935F contains message callback $9509, which supplies $9517, then $9543 to $77E0. A forced VICE call and `test_later_object_messages.js` check the pointer sequence with intermediate display calls stubbed. Display effects and ordinary-play reachability remain open.

The object record at $937F contains result callback $9505, which returns A=$F7 with carry 1. A forced VICE call and `test_later_object_results.js` check the return; ordinary-play reachability remains open.

The trigger record at $92A4 contains message callback $92B0, which passes $92CB, then $92FB, then $932E to $77E0 and restores X. A forced VICE call and `test_later_trigger_messages.js` check the pointer sequence and X restoration with the message callback stubbed. Display effects and ordinary-play reachability remain open.

The shop entry at $A750 configures two screen-page bytes, formats two stage prices and branches on the selected player’s balance and stage category. Five forced VICE cases and `test_later_shop_entries.js` check formatting, insufficient and sufficient balance, and message selection with display and gate callbacks stubbed. Some bytes also occur in captured character or graphics sources; ordinary-play contexts remain open.

The shop choice code at $A7E3 branches on incoming negative and zero flags, selects one of two stage prices, can reject insufficient balance, and follows either a stage callback or a message path before passing 4 or 8 to the meter routine and decrementing the stage field. Six forced VICE cases and `test_later_shop_choices.js` check these paths with payment, meter, message and optional callbacks stubbed. Ordinary-play flag inputs, callback effects and the separate entry at $A86A remain open.

The second shop entry at $A876 selects an item pair from explicit stage fields through the conditional-item resolver, or from a patched player-state read plus a table value. Four forced VICE cases and `test_later_shop_pairs.js` check both paths and both selected players using the real resolver. Index bounds, carry edge cases and later drawing remain open.

The shop drawing setup at $A8C4 selects two pointer-table entries, calls the second and first item targets with A=$E4 and $D0, and fills three rows of colour RAM. Two forced VICE cases and `test_later_shop_draw_setup.js` check the target selection and colour writes with both item targets replaced by stubs. The actual drawing effects, index bounds and ordinary-play contexts remain open.

The shop label code at $A913 passes two selected item bytes to the formatter and calls the display routine with Y=$73 and $87, then passes choice-prompt pointer $AB0C to $77E0. Two forced VICE cases and `test_later_shop_labels.js` check call arguments and screen-page selection with the formatting, display and message callbacks stubbed. Their effects and ordinary-play contexts remain open.
