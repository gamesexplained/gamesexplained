# Load 9 — verified technical facts

The resident draw loop at `$6D41–$6D63` ran 200 iterations in the first 200 frames after this forced load returned. Its four indexed reads use `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use the indexed attribute table at `$80CF`; the exact meanings of all its bit combinations remain open. This observation follows a forced transition and does not establish a route by ordinary play.

The entry snapshot has 16 row pointers in split tables at `$85CF` and `$8620`. They point to rows beginning at `$8671` and spaced 67 bytes apart; the address immediately after that storage is `$8AA1`, the character-data pointer recorded at `$7F41`. The downward scroll check uses `$7F4C` as its vertical boundary. This does not establish that every stored cell is encountered during play.

The captured sound pointers select voice lists at $B7BD, $B7C5, $B7CD; their records name 6 distinct event patterns. In the captured selector-1 loop, the resident sequencer selected each pattern and reached its documented zero marker in the listing-based simulator. `test_stage_sound_patterns.js` checks the pointers, pattern boundaries and those visits. This observation does not establish when ordinary play selects the sound.

The captured descriptor names 5 six-byte trigger records at `$92D9` and 5 sixteen-byte stage object records at `$9394`. `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions, stubbing the map updater for the sixteen-byte records. These captured records do not establish that ordinary play activates them.

In the forced play capture, 2 stable 63-byte sprite bitmaps from this load were named by active display-slot entries in VIC bank 3. Their entry and play bytes match; non-stopping checkpoints saw no instruction entry into those bitmap ranges during the following 200 frames. The observation covers those captured states and does not establish all animation or ordinary-play behavior.

The loaded pointer at `$7F3F/$7F40` targets `$9279`, inside the eight-page character-copy source at `$8AA1`. The entry was observed in the 200-frame forced-play probe and monitor collection. The code and graphics uses overlap; `codemap.json` records only observed instruction starts in that source whose bytes still matched the load-entry snapshot.

Sampling the forced play capture every ten frames through frame 200 found 6 additional active sprite pointers in this load. Their bitmap bytes matched the entry snapshot at their first sampled frame, and execution checkpoints recorded no instruction entries in those ranges during the same 200-frame probe. The recorded display settings and first sampled frame are in `display-observations.json`; natural reachability remains open.

The supplied side A file with index $09 supplies two compressed streams. Executing the game’s decoder on those bytes in the 6502 simulator consumed 1268 and 9218 bytes and wrote $EB40–$F9BF and $7EDF–$BD7C, respectively. All written output bytes match the forced VICE load-entry snapshot. The extracted file has 182 further bytes after the two streams; their role is not established. This establishes these stream writes for the supplied image, not natural reachability or ownership of repeated data across loads.

Controlled record-copy, frame-restore and display-routine simulations selected 2 additional bitmap pointers in this load. Slot assignment, position, effect state and one colour were forced. The bitmaps match the load-entry and play captures; no instruction entered their ranges during a 200-frame probe. These examples do not establish natural reachability.

The load’s type-$0D entity vector selects a dispatcher at $B97F. Five captured state-table pairs point to $B99C, $B9A6, $BA27, $BA89, $BAAC; the state index is not locally bounded. Listing tests check all five targets in loads 8, 9 and 27; seven controlled VICE calls check all five in load 8 and one each in the other loads. The state index and ordinary-play reachability remain open.

Type-$0D state 0 at $B99C sets $1AD3,X to $32, selects state 1 and falls through. State 3 at $BA89 counts down and computes a sign-dependent frame, while state 4 at $BAAC can call $4454 using an alternate index before calling $4B0E and $5DB9. Listing tests and eight controlled VICE calls check these paths with external callees stubbed and decimal mode clear; the alternate index range and natural reachability remain open.

The type-$0D event helper at $BAC8 selects state 3 or 4 on set carry from $732A, then removes its own return address and returns past the calling handler. On clear carry it returns normally or tail-calls $5D7A. Listing tests and seven controlled VICE calls check both stack paths in three loads with external callbacks stubbed; natural reachability remains open.

Type-$0D state 1 at $B9A6 counts down, can select state 2, and can allocate and initialize another slot. State 2 at $BA27 uses a signed direction and a callback result to choose between state 0 and frame updates. Listing tests and ten controlled VICE calls check these paths in three loads with the event and external callbacks stubbed and decimal mode clear; natural reachability remains open.

15 three-line message records in this load were identified from instruction sequences that load their addresses in X/Y before reaching $77E0. With selector $77E1 forced to zero, listing tests check the pointer and copy of every recorded line into the message buffers; spaces become glyph zero. Twelve controlled VICE calls check representative records from loads 2, 4, 9, 12, 19, 22, 29, 30 and 31 with the same selector. Glyph $60 is a downward-pointing triangle; its role and ordinary-play reachability remain open.
The item-message selector at $9ACE computes an eight-bit table offset from A with decimal mode clear and passes a selected pointer in X/Y to $77E0. Controlled inputs 0–23 select 24 pointer entries and 21 distinct three-line records, including item names. Listing tests check every selection and copy with selector $77E1 forced to zero; ten controlled VICE calls check representative selections in loads 2, 4, 9, 19, 27 and 30. The input range in play and ordinary-play reachability remain open.

The price selector at $9A3A sends the first two bytes of an eight-byte item row to $7901 as a packed-decimal amount. The game subtracts that amount from the selected player’s gold when funds suffice; otherwise it restores the balance and returns clear carry. Listing tests cover all 24 captured prices at zero, one below the price, the exact price and 9,999 gold (where distinct), and ten controlled VICE calls check representative deductions. Item index 4 selects the Winged Boots message and has a price of 30 in these captured tables; ordinary-play reachability remains open.

The two pointer pairs at offsets 2–5 in each item row supply subroutine-call operands. Three selectors copy these pairs into JSR instructions; listing tests check all 24 captured rows at each selector, and eleven controlled VICE calls check representative patches. Ordinary-play reachability remains open.

The item-row targets at offset 4 select routines at $9F55–$9FBA. Controlled item inputs call helpers for Wing Boots, Helmet, Gauntlet or Revival Medicine, update one of three selected-player fields, or pass fixed A/X values to $536F. Listing tests cover all 24 item paths for both player indices with external routines stubbed; sixteen controlled VICE calls check representative paths. Natural purchase reachability and the external callbacks’ remaining effects remain open.

The item-row targets at offset 2 select drawing routines at $9E49–$9E93. Depending on the target, they return or write a 4-by-3 or 4-by-4 block of consecutive tile bytes using a 40-byte row stride. Listing tests check all 24 item targets in 17 loads with decimal mode clear; eleven controlled VICE calls check representative tile writes. Natural shop contexts remain open.

11 simple eight-row glyphs in the character-copy source are referenced by metatiles in the captured map. Listing tests reconstruct their map references and run the $717C copy; seven controlled VICE reads check representative destination glyphs in loads 2, 20, 27 and 31. These observations do not establish ordinary-play reachability or exclude other possible code uses.

The purchase path at $9A2F selects an item index, charges its packed-decimal price and branches away on insufficient funds. On success it decrements $4753,X, selects an effect target, calls it with the item index plus 1, passes a message pointer to $77E0 and waits while $4D6B is nonzero. Listing tests cover 68 controlled purchase paths across 17 loads and eight VICE calls check representative paths, with effect and message callbacks stubbed. The gate at $9A06 supplies that flag from $9B3F on one path; other entry paths and ordinary-play purchase reachability remain open.

The shop gate at $9A06 can branch to the purchase choice using the sign of $9B3F, or pass one of two message pointers according to $4753,X. Listing tests check 102 controlled gate cases and the extended purchase paths across 17 loads; eight VICE calls check gate cases and eight check purchases. The gate byte’s role, the mode’s possible values and natural reachability remain open.

The shop input choice at $99A3 tests active-low fire, left and right in that order. Its direction handlers decrement or increment the mode byte at $9B3F, can pass the corresponding item index to the message selector, and call another helper. Listing tests check 204 controlled input and mode cases across 17 loads with callbacks stubbed; eleven VICE calls check representative paths. Ordinary-play timing, mode ranges and callback effects remain open.

The shop initializer at $9975 sets the mode byte to 0 and its countdown to $DC. Starting from 0, the traced left and right handlers keep the mode among $FF, $00 and $01 if no other code changes it. Listing tests check initialization and every transition among those three values in 17 loads; ten controlled VICE calls check representative cases with callbacks stubbed. Other possible writes and ordinary-play timing remain open.

The shop wait paths at $997F and $9992 call $3C2A and decrement the countdown. Starting from $DC, controlled paths reach zero after 220 calls; the timeout then either branches on the gate byte or marks $4753,X and passes a message pointer. Listing tests check both wait paths and timeout branches in 17 loads with callbacks stubbed; eight controlled VICE calls check representative paths. Seconds, ordinary-play timing and other exits remain open.

The captured map references 164 additional described glyphs through its tile-quadrant tables. Their source bytes match the copied character RAM in the play capture, and `test_map_glyphs_expanded.js` checks each map reference and runs the $717C copy. Controlled VICE reads of 18 glyphs in loads 2, 9, 16, 20, 27 and 31 agree with the captures. Ordinary-play reachability and other uses remain open.

The type-$0E entity vector selects a dispatcher at $BB15. Six captured state-table pairs point to $BB33, $BB53, $BB80, $BB97, $BBCD, $BBEB. The dispatcher does not bound the state index. VICE and the listing test checked all six patched jumps in loads 9, 11 and 20; The state-index range and ordinary-play reachability remain open.

Type-$0E state 4 at $BBCD counts down and either selects state 0 or calls a sign-selected movement routine. State 5 at $BBEB counts down and can call $4B0E and $5DB9. VICE checked five controlled cases with callbacks stubbed in loads 9, 11 and 20. Natural reachability remains open.

Type-$0E state 1 at $BB53 chooses a movement callback by the sign of $1B28,X and either updates a frame or sets a timer, increments the state, updates the frame and reverses direction. VICE checked four controlled movement cases per load, with external callbacks and the first shared call stubbed, in loads 9, 11 and 20. Natural reachability remains open.

Type-$0E states 2 and 3 at $BB80 and $BB97 update $1AD3,X and select the next state or a shared frame update. Controlled VICE cases checked the decrement-to-zero transition, the state-3 value 8 boundary and both carry results in loads 9, 11 and 20, with callbacks stubbed. Natural reachability remains open.

Type-$0E state 0 at $BB33 uses values returned by $71DB and compares $6F3C against the returned X to choose $FA or 0, then advances state and updates a frame. Its movement helper at $BBBA chooses a callback by the sign of $1B28,X and reverses it on carry. VICE checked six controlled cases per load with callbacks stubbed in loads 9, 11 and 20. Natural reachability remains open.

The type-$0E shared collision check at $BC0E can return normally, tail-call $5D7A, or select state 4 or 5 and discard its own return address so the calling handler returns immediately. VICE exercised six controlled paths per load in loads 9, 11 and 20, with external callbacks stubbed. Natural reachability remains open.

The type-$25 entity dispatcher at $BC87 uses $1AB1,X without a local bounds check. Two captured table pairs select $BC9D, $BD03; VICE checked both in loads 8, 9 and 27. Ordinary-play reachability and index bounds remain open.

Type-$25 state 1 increments $1AC2,X and computes $19C3,X from $19E5,X and twice the old value, unless $1AC2,X equals 2. In that case it decrements $1B28 in the slot named by $1AD3,X, restores the original X through a patched immediate operand and jumps to $4454. VICE checked four forced cases in loads 8, 9 and 27. Ordinary-play reachability remains open.

Type-$25 helper $BD25 calls $792C and $1179, then may call $7227 and $5D7A. Its transition sets $1AC2,X=0, adds 2 to $19E5,X and sets $1AB1,X=1, then discards a return address. VICE checked four forced helper cases in loads 8, 9 and 27 with callbacks stubbed. State 0 also jumps to the transition, where the discarded return address has a different caller. Callback effects and ordinary-play reachability remain open.

Type-$25 state 0 decrements $1B28,X, checks $1A29,X and calls its event helper. A negative countdown jumps directly to the transition, which discards one return address. Other paths update a four-bit phase through $3020 and $35C1, or at countdown $7E build four parameters at $35BD–$35C0 before calling $34EA and $35C1. VICE checked five forced cases and one special parameter case in loads 8, 9 and 27 with callbacks stubbed. Callback effects and ordinary-play reachability remain open.

A forced $717C call copied all 2,048 bytes from the entry character source to RAM at $D000–$D7FF. The selected bytes matched the captured play snapshot, and a 200-frame play capture recorded no instruction entry into those selected ranges. 76 eight-byte characters before the nearest discovered code entry or update pointer were described from their row patterns; whether each is displayed and other possible code uses remain open.

The captured 48 low and high entity-handler bytes at $7EDF–$7F3E pair into 38 distinct addresses. The listing test runs the instructions from $2027 up to the call at $2036 for every index in this load. VICE checked indices 0, 1 and 47 in loads 2, 24 and 31 before the call. The code does not locally bound the index, and individual target reachability remains open.

The 42 captured bytes at $7F58–$7F81 supply sound pointers, reward and item values, map replacements, sampled-map comparisons and a visual-resource selector. The listing test checks the bytes and exercises the sound-pointer and visual-selector reads for this load; VICE checked those reads in loads 2, 24 and 31. Other fields are tied to their documented resident readers; their ordinary-play reachability remains open.

The captured bytes at $7F43–$7F49 supply initial colour shadows, player frame and position; $7F4D/$7F4E supply view-origin values that later code can change. A listing test checks their initialization paths for this load. VICE checked both paths in loads 2, 24 and 31 with the HUD callback stubbed. Ordinary-play reachability remains open.

17 stable 63-byte ranges match shapes verified in other loads and lie at VIC bank-3 sprite-slot boundaries. VICE read the entry bytes and observed no instruction entry into those ranges during a 200-frame play capture. The listing test compares each range with its source shape and the graphics gallery. Display use in this load and other possible code uses remain open.

8 stable 63-byte aligned ranges form one-bit patterns that recur in other loads. VICE checked their entry bytes and observed no instruction entry into those ranges during a 200-frame play capture. The listing test compares every matching range and the viewer. Display use, actual colours and other possible code uses remain open.

A forced $717C call copied all 2,048 bytes from the entry character source to RAM at $D000–$D7FF. The selected bytes matched the captured play snapshot, and a 200-frame play capture recorded no instruction entry into those selected ranges. 1 eight-byte characters excluding typed code, discovered entry bytes, update pointers and existing annotations were described from their row patterns; whether each is displayed and other possible code uses remain open.

Controlled visual-resource selections copied 345 additional eight-byte character patterns from their captured sources. VICE checked each copy and recorded no instruction entry into the selected bytes during 200 frames of captured play; a listing test repeats the copies. Display use, other possible code uses and ordinary-play reachability remain open.

A forced call to the captured panel setup at $9FBB writes four character cells and their colours after patching its helper at $A0FA. VICE and a listing test check the path with $46=$C0. Following panel behavior and ordinary-play reachability remain open.

The captured panel at $9FBB displays a byte-derived value, checks shifted player balance and meter state, and chooses one of four message paths. Four forced VICE cases and a listing test check these branches in this load. Later message behavior and ordinary-play reachability remain open.

The captured panel at $9FBB has two input loops that select a first or second path, or return to cursor setup. Five forced VICE cases and a listing test check prompt arguments, cursor fields and four branch outcomes in this load with frame, HUD and input callbacks stubbed. Callback effects and ordinary-play reachability remain open.

The panel completion path at $A0BB calls resident routines, updates the selected-player index and stage-record field, and enters a message wait. Two forced VICE cases and a listing test check completion fields and a two-frame message wait in this load with callbacks stubbed. Callback effects and ordinary-play reachability remain open.

Seven captured message records are selected by this panel’s controlled paths. VICE matched their bytes and a listing test decodes all fields using the captured character set; spelling and punctuation are retained. Ordinary-play reachability remains open.

A forced call to the price formatter at $9AFB and digit writer at $9AE0 converts packed price bytes into four character and colour cells. VICE and a listing test check both calls in this load. Input bounds, other values and ordinary-play reachability remain open.

Shop helpers at $9AA3 and $9AB6 test sampled input and choose a cursor position. Five forced VICE cases and a listing test checked both helpers in this load, with the sampler stubbed and display initialization stopped. The adjacent layout, selection, timeout and item bytes are read or written by the separately tested shop paths. Physical control mapping, other indexes and ordinary-play reachability remain open.

The shop conditional-item resolver at $9A8E changes item $13 to $14 when the selected player has flag $10; other inputs pass through. Three forced VICE cases and a listing test check it in this load. Other callers and ordinary-play reachability remain open.

The captured shop message bank contains the same 34 records as the decoded first-load bank. VICE matched the complete message bytes in this load; listing tests check all record hashes and decode the first-load fields. Selection of each record in ordinary play and other overlapping uses remain open.

A forced graphics setup call at $95C4 copies ten source blocks into RAM beneath I/O and calls the mirror routine seven times. VICE and a listing test checked all copies with the mirror callback stubbed. The callback’s effects, other source uses and ordinary-play reachability remain open.

The captured split row-pointer tables contain 81 pairs. All follow a 67-byte stride from $8671; the first 16 correspond to the map rows described here. VICE compared the remaining table bytes to the entry snapshot, and `test_later_row_pointer_tails.js` checks all pairs. Whether gameplay uses the extra entries and the uses of their targets remain open.

This load has 2 captured motion-reader entries and encoded streams documented in `later-motion-streams.json`. Forced VICE calls checked each first value and reset; the listing test checks full decoded sequences. Some bytes also serve as copied character data, as noted in the listing. Ordinary-play reachability remains open.

The object record at $93A4 contains message callback $9430, which supplies $9437 to $77E0. A forced VICE call and `test_later_object_messages.js` check the pointer sequence with intermediate display calls stubbed. Display effects and ordinary-play reachability remain open.

The trigger record at $92DF contains message callback $9359, which passes $9366 to $77E0 and restores X. A forced VICE call and `test_later_trigger_messages.js` check the pointer sequence and X restoration with the message callback stubbed. Display effects and ordinary-play reachability remain open.

The load-9 trigger callback at $92F7 writes and decrements a countdown until it reaches zero. If $7227 is not already $18, the zero path replaces the resident player-contact routine entry with `CLC; RTS`, sets the selected player’s meter current and limit to $50, calls the player-flag-$10 setter, and displays message $932E. Three forced VICE cases checked the countdown and guard; a further call used the real flag setter and verified that the patched contact routine returns carry clear. The message callback was stubbed. `test_stage09_trigger.js` checks the paths. Other damage sources and ordinary-play trigger reachability remain open.

The shop entry at $978F configures two screen-page bytes, formats two stage prices and branches on the selected player’s balance and stage category. Five forced VICE cases and `test_later_shop_entries.js` check formatting, insufficient and sufficient balance, and message selection with display and gate callbacks stubbed. Ordinary-play contexts remain open.

The shop choice code at $9822 branches on incoming negative and zero flags, selects one of two stage prices, can reject insufficient balance, and follows either a stage callback or a message path before passing 4 or 8 to the meter routine and decrementing the stage field. Six forced VICE cases and `test_later_shop_choices.js` check these paths with payment, meter, message and optional callbacks stubbed. Ordinary-play flag inputs, callback effects and the separate entry at $98A9 remain open.
