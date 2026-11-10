# Load 8 — verified technical facts

The resident draw loop at `$6D41–$6D63` ran 200 iterations in the first 200 frames after this forced load returned. Its four indexed reads use `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use the indexed attribute table at `$80CF`; the exact meanings of all its bit combinations remain open. This observation follows a forced transition and does not establish a route by ordinary play.

The entry snapshot has 15 row pointers in split tables at `$85CF` and `$8620`. They point to rows beginning at `$8671` and spaced 122 bytes apart; the address immediately after that storage is `$8D97`, the character-data pointer recorded at `$7F41`. The downward scroll check uses `$7F4C` as its vertical boundary. This does not establish that every stored cell is encountered during play.

The captured sound pointers select voice lists at $9515, $951D, $9525; their records name 6 distinct event patterns. In the captured selector-1 loop, the resident sequencer selected each pattern and reached its documented zero marker in the listing-based simulator. `test_stage_sound_patterns.js` checks the pointers, pattern boundaries and those visits. This observation does not establish when ordinary play selects the sound.

The captured descriptor names 8 six-byte trigger records at `$94E5` and 0 sixteen-byte stage object records at `$9515`. `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions, stubbing the map updater for the sixteen-byte records. These captured records do not establish that ordinary play activates them.

The loaded pointer at `$7F3F/$7F40` targets `$9487`, inside the eight-page character-copy source at `$8D97`. The entry was observed in the 200-frame forced-play probe and monitor collection. The code and graphics uses overlap; `codemap.json` records only observed instruction starts in that source whose bytes still matched the load-entry snapshot.

The supplied side A file with index $08 supplies two compressed streams. Executing the game’s decoder on those bytes in the 6502 simulator consumed 862 and 3250 bytes and wrote $EB40–$F5BF and $7EDF–$9AA3, respectively. All written output bytes match the forced VICE load-entry snapshot. The extracted file has 206 further bytes after the two streams; their role is not established. This establishes these stream writes for the supplied image, not natural reachability or ownership of repeated data across loads.

Controlled record-copy, frame-restore and display-routine simulations selected 6 additional bitmap pointers in this load. Slot assignment, position, effect state and one colour were forced. The bitmaps match the load-entry and play captures; no instruction entered their ranges during a 200-frame probe. These examples do not establish natural reachability.

The load’s type-$0C entity vector selects a dispatcher at $9701. Its four captured state-table pairs point to $971B, $973F, $9758, $9776; the state byte is not locally bounded. Listing tests check all four dispatches in each load; seven controlled VICE calls check all four in load 8 and one each in the other loads. The state index and ordinary-play reachability remain open.

Type-$0C states 0, 1 and 2 at $971B, $973F and $9758 call an event helper and, if it returns, increment a counter, count down a field or count it back up. State 0 selects state 1 at counter 10, state 1 selects state 2 when the field is negative, and state 2 returns to state 0 when the field equals its saved target. Listing tests and nine controlled VICE calls check these branches across four loads with callbacks stubbed and decimal mode clear; natural reachability remains open.

Type-$0C state 3 at $9776 uses $1AC2,X as a positive countdown or a negative phase and chooses a callback from the sign of $97DF. The event helper at $97B0 can select state 3 and remove its own return address so that it skips the rest of the calling handler. Listing tests and eleven controlled VICE calls cover the state and both stack paths in four loads with external callbacks stubbed; natural reachability remains open.

The load’s type-$0D entity vector selects a dispatcher at $97E0. Five captured state-table pairs point to $97FD, $9807, $9888, $98EA, $990D; the state index is not locally bounded. Listing tests check all five targets in loads 8, 9 and 27; seven controlled VICE calls check all five in load 8 and one each in the other loads. The state index and ordinary-play reachability remain open.

Type-$0D state 0 at $97FD sets $1AD3,X to $32, selects state 1 and falls through. State 3 at $98EA counts down and computes a sign-dependent frame, while state 4 at $990D can call $4454 using an alternate index before calling $4B0E and $5DB9. Listing tests and eight controlled VICE calls check these paths with external callees stubbed and decimal mode clear; the alternate index range and natural reachability remain open.

The type-$0D event helper at $9929 selects state 3 or 4 on set carry from $732A, then removes its own return address and returns past the calling handler. On clear carry it returns normally or tail-calls $5D7A. Listing tests and seven controlled VICE calls check both stack paths in three loads with external callbacks stubbed; natural reachability remains open.

Type-$0D state 1 at $9807 counts down, can select state 2, and can allocate and initialize another slot. State 2 at $9888 uses a signed direction and a callback result to choose between state 0 and frame updates. Listing tests and ten controlled VICE calls check these paths in three loads with the event and external callbacks stubbed and decimal mode clear; natural reachability remains open.

2 simple eight-row glyphs in the character-copy source are referenced by metatiles in the captured map. Listing tests reconstruct their map references and run the $717C copy; seven controlled VICE reads check representative destination glyphs in loads 2, 20, 27 and 31. These observations do not establish ordinary-play reachability or exclude other possible code uses.

The captured map references 76 additional described glyphs through its tile-quadrant tables. Their source bytes match the copied character RAM in the play capture, and `test_map_glyphs_expanded.js` checks each map reference and runs the $717C copy. Controlled VICE reads of 18 glyphs in loads 2, 9, 16, 20, 27 and 31 agree with the captures. Ordinary-play reachability and other uses remain open.

The type-$25 entity dispatcher at $9986 uses $1AB1,X without a local bounds check. Two captured table pairs select $999C, $9A02; VICE checked both in loads 10, 28 and 29. Ordinary-play reachability and index bounds remain open.

Type-$25 state 1 increments $1AC2,X and computes $19C3,X from $19E5,X and twice the old value, unless $1AC2,X equals 2. In that case it decrements $1B28 in the slot named by $1AD3,X, restores the original X through a patched immediate operand and jumps to $4454. VICE checked four forced cases in loads 8, 9 and 27. Ordinary-play reachability remains open.

Type-$25 helper $9A24 calls $792C and $1179, then may call $7227 and $5D7A. Its transition sets $1AC2,X=0, adds 2 to $19E5,X and sets $1AB1,X=1, then discards a return address. VICE checked four forced helper cases in loads 8, 9 and 27 with callbacks stubbed. State 0 also jumps to the transition, where the discarded return address has a different caller. Callback effects and ordinary-play reachability remain open.

Type-$25 state 0 decrements $1B28,X, checks $1A29,X and calls its event helper. A negative countdown jumps directly to the transition, which discards one return address. Other paths update a four-bit phase through $3020 and $35C1, or at countdown $7E build four parameters at $35BD–$35C0 before calling $34EA and $35C1. VICE checked five forced cases and one special parameter case in loads 8, 9 and 27 with callbacks stubbed. Callback effects and ordinary-play reachability remain open.
