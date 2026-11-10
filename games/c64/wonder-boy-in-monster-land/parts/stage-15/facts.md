# Load 15 — verified technical facts

The resident draw loop at `$6D41–$6D63` ran 200 iterations in the first 200 frames after this forced load returned. Its four indexed reads use `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use the indexed attribute table at `$80CF`; the exact meanings of all its bit combinations remain open. This observation follows a forced transition and does not establish a route by ordinary play.

The entry snapshot has 15 row pointers in split tables at `$85CF` and `$8620`. They point to rows beginning at `$8671` and spaced 123 bytes apart; the address immediately after that storage is `$8DA6`, the character-data pointer recorded at `$7F41`. The downward scroll check uses `$7F4C` as its vertical boundary. This does not establish that every stored cell is encountered during play.

The captured sound pointers select voice lists at $A2B1, $A2B9, $A2C1; their records name 6 distinct event patterns. In the captured selector-1 loop, the resident sequencer selected each pattern and reached its documented zero marker in the listing-based simulator. `test_stage_sound_patterns.js` checks the pointers, pattern boundaries and those visits. This observation does not establish when ordinary play selects the sound.

The captured descriptor names 2 six-byte trigger records at `$94D2` and 1 sixteen-byte stage object records at `$9501`. `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions, stubbing the map updater for the sixteen-byte records. These captured records do not establish that ordinary play activates them.

The loaded pointer at `$7F3F/$7F40` targets `$94B6`, inside the eight-page character-copy source at `$8DA6`. The entry was observed in the 200-frame forced-play probe and monitor collection. The code and graphics uses overlap; `codemap.json` records only observed instruction starts in that source whose bytes still matched the load-entry snapshot.

The supplied side A file with index $0F supplies two compressed streams. Executing the game’s decoder on those bytes in the 6502 simulator consumed 633 and 6089 bytes and wrote $EB40–$F2BF and $7EDF–$AB9F, respectively. All written output bytes match the forced VICE load-entry snapshot. The extracted file has 136 further bytes after the two streams; their role is not established. This establishes these stream writes for the supplied image, not natural reachability or ownership of repeated data across loads.

Controlled record-copy, frame-restore and display-routine simulations selected 2 additional bitmap pointers in this load. Slot assignment, position, effect state and one colour were forced. The bitmaps match the load-entry and play captures; no instruction entered their ranges during a 200-frame probe. These examples do not establish natural reachability.

The load’s type-$05 entity vector selects a dispatcher at $A7F5. Six captured state-table pairs point to $A813, $A8A1, $A94F, $A99B, $A9DA, $A9FD; the state byte is not locally bounded. Listing tests check all six dispatches in loads 2, 4, 6, 15 and 17; ten controlled VICE calls checked all six in load 2 and one each in the other loads. The state index and ordinary-play reachability remain open.

Type-$05 state 4 at $A9DA decrements $1AC2,X; a negative result copies $1AE4,X into the state. Otherwise it calls $4574 or $45BC according to carry from $72FC and leaves the state alone only when the callback result masked by 6 equals 2. Listing tests cover these paths across five loads with callbacks stubbed; nine controlled VICE calls check representative cases with the same stubs. Natural reachability remains open.

The type-$05 frame helper at $AA27 adds 6 to A when the working byte at $AA7D is negative, clears carry again, adds $19E5,X and stores the low byte at $19C3,X. Two four-byte offset tables at $AA7F and $AA83 are indexed by handler fields without local bounds checks. A listing test checks all 256 input values against both signs and six base values in all five loads with decimal mode clear; seven controlled VICE calls check representative cases. Natural reachability remains open.

Type-$05 state 5 at $A9FD decrements $1AC2,X and, if it is negative, calls $4B0E and jumps to $5DB9. Otherwise it uses $1AD3,X to read a frame-offset table, calls the frame helper and advances the index, replacing values of 4 or above with 0 after the read. The incoming table index is not locally bounded. A listing test checks these paths in five loads with $4B0E stubbed and decimal mode clear; eight controlled VICE calls check representative cases with the same stub. Natural reachability remains open.

Type-$05 states 2 and 3 at $A94F and $A99B call an event helper and, if it returns, update a frame using $1AF5,X before decrementing $1AD3,X. Depending on that result and a movement callback’s result, state 2 can toggle bit 7 of $1B17,X and select state 3; state 3 can select state 0. Listing tests and ten controlled VICE calls check these branches with the event and movement helpers stubbed. The incoming table-index range and natural reachability remain open.

The type-$05 event helper at $AA37 selects state 4 or 5 on set carry from $732A. In those paths it pulls the helper’s return address off the stack and returns past the calling handler. On clear carry it can return to the handler or tail-call $5D7A. Listing tests check both stack paths in five loads with external callees stubbed; nine controlled VICE calls check representative paths with the same stubs. Natural reachability remains open.

Type-$05 state 0 at $A813 uses a returned position and $6F3C to choose between state 1, state 2 or a return, when its event helper returns normally. The state-2 path patches an immediate operand at $A989 from its snapshot value $FF to $0A; state 2 subsequently uses that operand. Listing tests and nine controlled VICE calls check the selection and patch with external callbacks stubbed and decimal mode clear; three VICE calls also check state 2 with the snapshot and patched immediate values. Ordinary-play reachability remains open.

Type-$05 state 1 at $A8A1 updates direction and frame, calls the event helper, then uses $1AF5,X and $1B06,X to choose a countdown, calls to $4342 or $4368, or an allocation attempt at $A8F0. On set carry from $190B, it initializes another slot using data from the original; on clear carry it simply restores the original index and selects state 0. Listing tests and eleven controlled VICE calls check representative paths with external calls stubbed and decimal mode clear. Natural reachability remains open.

6 three-line message records in this load were identified from instruction sequences that load their addresses in X/Y before reaching $77E0. With selector $77E1 forced to zero, listing tests check the pointer and copy of every recorded line into the message buffers; spaces become glyph zero. Twelve controlled VICE calls check representative records from loads 2, 4, 9, 12, 19, 22, 29, 30 and 31 with the same selector. Glyph $60 is a downward-pointing triangle; its role and ordinary-play reachability remain open.
The item-message selector at $98B1 computes an eight-bit table offset from A with decimal mode clear and passes a selected pointer in X/Y to $77E0. Controlled inputs 0–23 select 24 pointer entries and 21 distinct three-line records, including item names. Listing tests check every selection and copy with selector $77E1 forced to zero; ten controlled VICE calls check representative selections in loads 2, 4, 9, 19, 27 and 30. The input range in play and ordinary-play reachability remain open.

The price selector at $981D sends the first two bytes of an eight-byte item row to $7901 as a packed-decimal amount. The game subtracts that amount from the selected player’s gold when funds suffice; otherwise it restores the balance and returns clear carry. Listing tests cover all 24 captured prices at zero, one below the price, the exact price and 9,999 gold (where distinct), and ten controlled VICE calls check representative deductions. Item index 4 selects the Winged Boots message and has a price of 30 in these captured tables; ordinary-play reachability remains open.

The two pointer pairs at offsets 2–5 in each item row supply subroutine-call operands. Three selectors copy these pairs into JSR instructions; listing tests check all 24 captured rows at each selector, and eleven controlled VICE calls check representative patches. Ordinary-play reachability remains open.

The item-row targets at offset 4 select routines at $9D38–$9D9D. Controlled item inputs call helpers for Wing Boots, Helmet, Gauntlet or Revival Medicine, update one of three selected-player fields, or pass fixed A/X values to $536F. Listing tests cover all 24 item paths for both player indices with external routines stubbed; sixteen controlled VICE calls check representative paths. Natural purchase reachability and the external callbacks’ remaining effects remain open.

The item-row targets at offset 2 select drawing routines at $9C2C–$9C76. Depending on the target, they return or write a 4-by-3 or 4-by-4 block of consecutive tile bytes using a 40-byte row stride. Listing tests check all 24 item targets in 17 loads with decimal mode clear; eleven controlled VICE calls check representative tile writes. Natural shop contexts remain open.

9 simple eight-row glyphs in the character-copy source are referenced by metatiles in the captured map. Listing tests reconstruct their map references and run the $717C copy; seven controlled VICE reads check representative destination glyphs in loads 2, 20, 27 and 31. These observations do not establish ordinary-play reachability or exclude other possible code uses.

The purchase path at $9812 selects an item index, charges its packed-decimal price and branches away on insufficient funds. On success it decrements $4753,X, selects an effect target, calls it with the item index plus 1, passes a message pointer to $77E0 and waits while $4D6B is nonzero. Listing tests cover 68 controlled purchase paths across 17 loads and eight VICE calls check representative paths, with effect and message callbacks stubbed. The gate at $97E9 supplies that flag from $9922 on one path; other entry paths and ordinary-play purchase reachability remain open.

The shop gate at $97E9 can branch to the purchase choice using the sign of $9922, or pass one of two message pointers according to $4753,X. Listing tests check 102 controlled gate cases and the extended purchase paths across 17 loads; eight VICE calls check gate cases and eight check purchases. The gate byte’s role, the mode’s possible values and natural reachability remain open.

The shop input choice at $9786 tests active-low fire, left and right in that order. Its direction handlers decrement or increment the mode byte at $9922, can pass the corresponding item index to the message selector, and call another helper. Listing tests check 204 controlled input and mode cases across 17 loads with callbacks stubbed; eleven VICE calls check representative paths. Ordinary-play timing, mode ranges and callback effects remain open.

The shop initializer at $9758 sets the mode byte to 0 and its countdown to $DC. Starting from 0, the traced left and right handlers keep the mode among $FF, $00 and $01 if no other code changes it. Listing tests check initialization and every transition among those three values in 17 loads; ten controlled VICE calls check representative cases with callbacks stubbed. Other possible writes and ordinary-play timing remain open.

The shop wait paths at $9762 and $9775 call $3C2A and decrement the countdown. Starting from $DC, controlled paths reach zero after 220 calls; the timeout then either branches on the gate byte or marks $4753,X and passes a message pointer. Listing tests check both wait paths and timeout branches in 17 loads with callbacks stubbed; eight controlled VICE calls check representative paths. Seconds, ordinary-play timing and other exits remain open.

The captured map references 91 additional described glyphs through its tile-quadrant tables. Their source bytes match the copied character RAM in the play capture, and `test_map_glyphs_expanded.js` checks each map reference and runs the $717C copy. Controlled VICE reads of 18 glyphs in loads 2, 9, 16, 20, 27 and 31 agree with the captures. Ordinary-play reachability and other uses remain open.

The load’s type-$03 entity vector selects a dispatcher at $A693. Three captured state-table pairs point to $A6AB, $A7B0, $A7EA; the state index is not locally bounded. Listing tests check all three targets in loads 13, 14, 15, 17, 18, 24, 26 and 27; the state-index range and ordinary-play reachability remain open.

Type-$03 state 1 at $A7B0 chooses a movement callback by a signed field and updates two frames; when the first frame addition wraps to zero, it calls both movement callbacks. State 2 at $A7EA calls $4B20 and $5DB9 with A=2. VICE checked five controlled cases per load with callbacks stubbed in loads 13, 14, 15, 17, 18, 24, 26 and 27. Natural reachability remains open.

The type-$03 state-0 entry at $A6AB can return immediately, select state 1 or 2 based on callback carry and a signed field, or continue to the movement path. VICE checked seven controlled entry cases per load with external callbacks stubbed in loads 13, 14, 15, 17, 18, 24, 26 and 27. Natural reachability remains open.

The type-$03 state-0 movement tail at $A766 reads a signed byte from a 40-byte table at $A788, calls $4342 for negative values or $4368 otherwise, and advances the returned Y with an equality wrap at 40. VICE checked four controlled indices per load with callbacks stubbed in loads 13, 14, 15, 17, 18, 24, 26 and 27. The input-index range and natural reachability remain open.

The type-$03 state-0 frame path at $A6E2 uses carry returned by $72FC and the parity of $1B28,X to update $1AD3,X and two frame bytes. VICE checked six controlled cases per load with the callback stubbed in loads 13, 14, 15, 17, 18, 24, 26 and 27. Natural reachability remains open.

The type-$03 horizontal calculation at $A734 subtracts 6 from negative magnitudes but 5 from nonnegative values before deciding whether to call a movement routine. The difference comes from carry left clear by ADC 1 on the negative path. VICE checked seven controlled inputs per load with movement callbacks stubbed in loads 13, 14, 15, 17, 18, 24, 26 and 27. Whether ordinary play reaches these inputs remains open.

The load’s type-$22 entity vector selects a dispatcher at $AA9C. Three captured state-table pairs point to $AAB4, $AAE7, $AB2D; the state index is not locally bounded. Listing tests check all three targets in loads 2, 4, 6, 14, 15, 17, 24 and 25; the state-index range and ordinary-play reachability remain open.

Type-$22 state 2 at $AB2D increments a counter and updates a frame while the counter is below 2; otherwise it clears a field in a slot selected by $1AD3,X and calls $4454 with the original X. VICE checked four controlled counter values per load with $4454 stubbed in loads 2, 4, 6, 14, 15, 17, 24 and 25. The alternate index range and ordinary-play reachability remain open.

Type-$22 state 1 at $AAE7 can call a sign-selected movement routine, then uses carry from $44DE to increment a counter or initialize state 2. VICE checked five controlled cases per load with callbacks stubbed in loads 2, 4, 6, 14, 15, 17, 24 and 25. Natural reachability remains open.

Type-$22 state 0 at $AAB4 can enter alternate-slot cleanup, or call a helper and choose a movement callback by a sign byte; callback carry controls its transition to state 1. VICE checked five controlled cases per load with callbacks stubbed in loads 2, 4, 6, 14, 15, 17, 24 and 25. Natural reachability remains open.

The type-$22 collision helper at $AB51 can return directly or enter state-2 setup after either of two carry checks. State-2 setup returns to the helper’s caller, so a state-0 call continues after it. VICE checked five controlled cases per load with callbacks stubbed in loads 2, 4, 6, 14, 15, 17, 24 and 25. Natural reachability remains open.

The load’s type-$01 entity vector selects a dispatcher at $A492. Three captured state-table pairs point to $A4AA, $A50F, $A546; the state index is not locally bounded. Listing tests check all three targets in loads 3, 13, 14, 15, 17, 19 and 26; the state-index range and ordinary-play reachability remain open.

Type-$01 state 0 at $A4AA can select state 1 or 2 based on carry from $732A and the sign of $1A6D,X. Its other active paths update $1AD3,X, $1AE4,X and a frame byte and set $1A7E,X if clear; when $1A29,X is zero it only sets that flag if clear. Listing tests exercise these branches across seven loads with external callees stubbed; natural reachability remains open.

Type-$01 state 1 at $A50F returns to state 0 when $1A8F,X is zero; otherwise it calls $45BC or $4574 according to $1B28,X and updates the frame. State 2 at $A546 decrements $1B17,X, uses the same frame update when the result is nonzero, and calls $4B0E before jumping to $5DB9 when it is zero. Listing tests cover both states across seven loads with callbacks stubbed; natural reachability remains open.

The load’s type-$02 entity vector selects a dispatcher at $A555. Three captured state-table pairs point to $A56D, $A637, $A671; the state index is not locally bounded. Listing tests check all three targets in loads 13, 14, 15, 17 and 19; the state-index range and ordinary-play reachability remain open.

Type-$02 state 2 at $A671 computes a frame based on whether $1AD3,X equals $80, decrements $1AE4,X and can call $4B0E and $5DB9. VICE checked four controlled cases per load with callbacks stubbed in loads 13, 14, 15, 17 and 19. Natural reachability remains open.

Type-$02 state 1 at $A637 decrements a timer, chooses a movement callback by a signed byte, and either resets to state 0 or updates a frame. VICE checked five controlled cases per load with callbacks stubbed in loads 13, 14, 15, 17 and 19. Natural reachability remains open.

The type-$02 helper at $A612 toggles bit 7 of $1AD3,X. The frame helper at $A61B patches an immediate operand to 0 or 8 and combines it with a timer bit and $19E5,X. VICE checked three controlled frame cases per load in loads 13, 14, 15, 17 and 19. Natural reachability remains open.

The type-$02 state-0 entry at $A56D can select state 1 or 2 or continue to the timer path. VICE checked seven controlled entry cases per load with callbacks stubbed in loads 13, 14, 15, 17 and 19. Natural reachability remains open.

The type-$02 state-0 timer path at $A5B0 can update a frame, select a movement callback, or reset a timer and toggle two direction bits. VICE checked seven controlled cases per load with callbacks stubbed in loads 13, 14, 15, 17 and 19. Natural reachability remains open.

A forced $717C call copied all 2,048 bytes from the entry character source to RAM at $D000–$D7FF. The selected bytes matched the captured play snapshot, and a 200-frame play capture recorded no instruction entry into those selected ranges. 126 eight-byte characters before the nearest discovered code entry or update pointer were described from their row patterns; whether each is displayed and other possible code uses remain open.

The captured 48 low and high entity-handler bytes at $7EDF–$7F3E pair into 38 distinct addresses. The listing test runs the instructions from $2027 up to the call at $2036 for every index in this load. VICE checked indices 0, 1 and 47 in loads 2, 24 and 31 before the call. The code does not locally bound the index, and individual target reachability remains open.

The 42 captured bytes at $7F58–$7F81 supply sound pointers, reward and item values, map replacements, sampled-map comparisons and a visual-resource selector. The listing test checks the bytes and exercises the sound-pointer and visual-selector reads for this load; VICE checked those reads in loads 2, 24 and 31. Other fields are tied to their documented resident readers; their ordinary-play reachability remains open.

The captured bytes at $7F43–$7F49 supply initial colour shadows, player frame and position; $7F4D/$7F4E supply view-origin values that later code can change. A listing test checks their initialization paths for this load. VICE checked both paths in loads 2, 24 and 31 with the HUD callback stubbed. Ordinary-play reachability remains open.

6 stable 63-byte ranges match shapes verified in other loads and lie at VIC bank-3 sprite-slot boundaries. VICE read the entry bytes and observed no instruction entry into those ranges during a 200-frame play capture. The listing test compares each range with its source shape and the graphics gallery. Display use in this load and other possible code uses remain open.

2 stable 63-byte aligned ranges form one-bit patterns that recur in other loads. VICE checked their entry bytes and observed no instruction entry into those ranges during a 200-frame play capture. The listing test compares every matching range and the viewer. Display use, actual colours and other possible code uses remain open.

A forced $717C call copied all 2,048 bytes from the entry character source to RAM at $D000–$D7FF. The selected bytes matched the captured play snapshot, and a 200-frame play capture recorded no instruction entry into those selected ranges. 21 eight-byte characters excluding typed code, discovered entry bytes, update pointers and existing annotations were described from their row patterns; whether each is displayed and other possible code uses remain open.

Controlled visual-resource selections copied 110 additional eight-byte character patterns from their captured sources. VICE checked each copy and recorded no instruction entry into the selected bytes during 200 frames of captured play; a listing test repeats the copies. Display use, other possible code uses and ordinary-play reachability remain open.

A forced call to the price formatter at $98DE and digit writer at $98C3 converts packed price bytes into four character and colour cells. VICE and a listing test check both calls in this load. Input bounds, other values and ordinary-play reachability remain open.

Shop helpers at $9886 and $9899 test sampled input and choose a cursor position. Five forced VICE cases and a listing test checked both helpers in this load, with the sampler stubbed and display initialization stopped. The adjacent layout, selection, timeout and item bytes are read or written by the separately tested shop paths. Physical control mapping, other indexes and ordinary-play reachability remain open.

The shop conditional-item resolver at $9871 changes item $13 to $14 when the selected player has flag $10; other inputs pass through. Three forced VICE cases and a listing test check it in this load. Other callers and ordinary-play reachability remain open.

The captured shop message bank contains the same 34 records as the decoded first-load bank. VICE matched the complete message bytes in this load; listing tests check all record hashes and decode the first-load fields. Selection of each record in ordinary play and other overlapping uses remain open.

The captured split row-pointer tables contain 81 pairs. All follow a 123-byte stride from $8671; the first 15 correspond to the map rows described here. VICE compared the remaining table bytes to the entry snapshot, and `test_later_row_pointer_tails.js` checks all pairs. Whether gameplay uses the extra entries and the uses of their targets remain open.

The object record at $9501 contains message callback $9511, which supplies $9518 to $77E0. A forced VICE call and `test_later_object_messages.js` check the pointer sequence with intermediate display calls stubbed. Display effects and ordinary-play reachability remain open.

The trigger record at $94D2 contains message callback $94DE, which passes $94EB to $77E0 and restores X. A forced VICE call and `test_later_trigger_messages.js` check the pointer sequence and X restoration with the message callback stubbed. Display effects and ordinary-play reachability remain open.
