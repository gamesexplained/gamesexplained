# Load 11 — verified technical facts

The resident draw loop at `$6D41–$6D63` ran 200 iterations in the first 200 frames after this forced load returned. Its four indexed reads use `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use the indexed attribute table at `$80CF`; the exact meanings of all its bit combinations remain open. This observation follows a forced transition and does not establish a route by ordinary play.

The entry snapshot has 16 row pointers in split tables at `$85CF` and `$8620`. They point to rows beginning at `$8671` and spaced 122 bytes apart; the address immediately after that storage is `$8E11`, the character-data pointer recorded at `$7F41`. The downward scroll check uses `$7F4C` as its vertical boundary. This does not establish that every stored cell is encountered during play.

The captured sound pointers select voice lists at $9C59, $9C61, $9C69; their records name 6 distinct event patterns. In the captured selector-1 loop, the resident sequencer selected each pattern and reached its documented zero marker in the listing-based simulator. `test_stage_sound_patterns.js` checks the pointers, pattern boundaries and those visits. This observation does not establish when ordinary play selects the sound.

The captured descriptor names 1 six-byte trigger records at `$9638` and 1 sixteen-byte stage object records at `$963E`. `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions, stubbing the map updater for the sixteen-byte records. These captured records do not establish that ordinary play activates them.

In the forced play capture, 2 stable 63-byte sprite bitmaps from this load were named by active display-slot entries in VIC bank 3. Their entry and play bytes match; non-stopping checkpoints saw no instruction entry into those bitmap ranges during the following 200 frames. The observation covers those captured states and does not establish all animation or ordinary-play behavior.

The loaded pointer at `$7F3F/$7F40` targets `$95E9`, inside the eight-page character-copy source at `$8E11`. The entry was observed in the 200-frame forced-play probe and monitor collection. The code and graphics uses overlap; `codemap.json` records only observed instruction starts in that source whose bytes still matched the load-entry snapshot.

The supplied side A file with index $0B supplies two compressed streams. Executing the game’s decoder on those bytes in the 6502 simulator consumed 1679 and 4393 bytes and wrote $EB40–$FABF and $7EDF–$A111, respectively. All written output bytes match the forced VICE load-entry snapshot. The extracted file has 24 further bytes after the two streams; their role is not established. This establishes these stream writes for the supplied image, not natural reachability or ownership of repeated data across loads.

Controlled record-copy, frame-restore and display-routine simulations selected 2 additional bitmap pointers in this load. Slot assignment, position, effect state and one colour were forced. The bitmaps match the load-entry and play captures; no instruction entered their ranges during a 200-frame probe. These examples do not establish natural reachability.

1 three-line message records in this load were identified from instruction sequences that load their addresses in X/Y before reaching $77E0. With selector $77E1 forced to zero, listing tests check the pointer and copy of every recorded line into the message buffers; spaces become glyph zero. Twelve controlled VICE calls check representative records from loads 2, 4, 9, 12, 19, 22, 29, 30 and 31 with the same selector. Glyph $60 is a downward-pointing triangle; its role and ordinary-play reachability remain open.
2 simple eight-row glyphs in the character-copy source are referenced by metatiles in the captured map. Listing tests reconstruct their map references and run the $717C copy; seven controlled VICE reads check representative destination glyphs in loads 2, 20, 27 and 31. These observations do not establish ordinary-play reachability or exclude other possible code uses.

The captured map references 96 additional described glyphs through its tile-quadrant tables. Their source bytes match the copied character RAM in the play capture, and `test_map_glyphs_expanded.js` checks each map reference and runs the $717C copy. Controlled VICE reads of 18 glyphs in loads 2, 9, 16, 20, 27 and 31 agree with the captures. Ordinary-play reachability and other uses remain open.

The type-$0E entity vector selects a dispatcher at $9E47. Six captured state-table pairs point to $9E65, $9E85, $9EB2, $9EC9, $9EFF, $9F1D. The dispatcher does not bound the state index. VICE and the listing test checked all six patched jumps in loads 9, 11 and 20; The state-index range and ordinary-play reachability remain open.

Type-$0E state 4 at $9EFF counts down and either selects state 0 or calls a sign-selected movement routine. State 5 at $9F1D counts down and can call $4B0E and $5DB9. VICE checked five controlled cases with callbacks stubbed in loads 9, 11 and 20. Natural reachability remains open.

Type-$0E state 1 at $9E85 chooses a movement callback by the sign of $1B28,X and either updates a frame or sets a timer, increments the state, updates the frame and reverses direction. VICE checked four controlled movement cases per load, with external callbacks and the first shared call stubbed, in loads 9, 11 and 20. Natural reachability remains open.

Type-$0E states 2 and 3 at $9EB2 and $9EC9 update $1AD3,X and select the next state or a shared frame update. Controlled VICE cases checked the decrement-to-zero transition, the state-3 value 8 boundary and both carry results in loads 9, 11 and 20, with callbacks stubbed. Natural reachability remains open.

Type-$0E state 0 at $9E65 uses values returned by $71DB and compares $6F3C against the returned X to choose $FA or 0, then advances state and updates a frame. Its movement helper at $9EEC chooses a callback by the sign of $1B28,X and reverses it on carry. VICE checked six controlled cases per load with callbacks stubbed in loads 9, 11 and 20. Natural reachability remains open.

The type-$0E shared collision check at $9F40 can return normally, tail-call $5D7A, or select state 4 or 5 and discard its own return address so the calling handler returns immediately. VICE exercised six controlled paths per load in loads 9, 11 and 20, with external callbacks stubbed. Natural reachability remains open.

The load-11 type-$10 dispatcher has two captured targets, $9FC4 and $A042, and calls a position helper before jumping. State 1 decrements $1B28,X and calls $4B20 with A=3 before jumping to $5DB9 with A=1 only when it reaches zero. VICE checked both targets and four countdown cases with callbacks stubbed. The state index and ordinary-play reachability remain open.

Type-$10 state 0 reads signed movement bytes from 74-byte and 34-byte captured tables, selects callbacks by sign and wraps indices after reading at $49 and $21. It can select state 1 and set a 16-count timer when $732A returns carry set and $1A6D,X is zero or negative. VICE checked four forced table-index cases and five event cases with callbacks stubbed. Input-index bounds and ordinary-play reachability remain open.

A forced $717C call copied all 2,048 bytes from the entry character source to RAM at $D000–$D7FF. The selected bytes matched the captured play snapshot, and a 200-frame play capture recorded no instruction entry into those selected ranges. 153 eight-byte characters before the nearest discovered code entry or update pointer were described from their row patterns; whether each is displayed and other possible code uses remain open.

The captured 48 low and high entity-handler bytes at $7EDF–$7F3E pair into 38 distinct addresses. The listing test runs the instructions from $2027 up to the call at $2036 for every index in this load. VICE checked indices 0, 1 and 47 in loads 2, 24 and 31 before the call. The code does not locally bound the index, and individual target reachability remains open.

The 42 captured bytes at $7F58–$7F81 supply sound pointers, reward and item values, map replacements, sampled-map comparisons and a visual-resource selector. The listing test checks the bytes and exercises the sound-pointer and visual-selector reads for this load; VICE checked those reads in loads 2, 24 and 31. Other fields are tied to their documented resident readers; their ordinary-play reachability remains open.

The captured bytes at $7F43–$7F49 supply initial colour shadows, player frame and position; $7F4D/$7F4E supply view-origin values that later code can change. A listing test checks their initialization paths for this load. VICE checked both paths in loads 2, 24 and 31 with the HUD callback stubbed. Ordinary-play reachability remains open.

12 stable 63-byte aligned ranges form one-bit patterns in this load. VICE checked their entry bytes and observed no instruction entry into those ranges during a 200-frame play capture. The listing test compares every range and the viewer. Display use, actual colours and other possible code uses remain open.

A forced $717C call copied all 2,048 bytes from the entry character source to RAM at $D000–$D7FF. The selected bytes matched the captured play snapshot, and a 200-frame play capture recorded no instruction entry into those selected ranges. 2 eight-byte characters excluding typed code, discovered entry bytes, update pointers and existing annotations were described from their row patterns; whether each is displayed and other possible code uses remain open.

Controlled visual-resource selections copied 130 additional eight-byte character patterns from their captured sources. VICE checked each copy and recorded no instruction entry into the selected bytes during 200 frames of captured play; a listing test repeats the copies. Display use, other possible code uses and ordinary-play reachability remain open.

The captured split row-pointer tables contain 81 pairs. All follow a 122-byte stride from $8671; the first 16 correspond to the map rows described here. VICE compared the remaining table bytes to the entry snapshot, and `test_later_row_pointer_tails.js` checks all pairs. Whether gameplay uses the extra entries and the uses of their targets remain open.

Load-11 code at $964E initializes indexed type-$10 entity fields and passes message pointer $968D to $77E0; the captured object record contains $964E. Three forced VICE calls and `test_stage11_kraken_init.js` check the fields and pointer. The message callback and ordinary-play reachability remain open.

Load-11 entries at $95F4 and $9616 pass the encoded streams at $95FF and $9621 to the resident repeating-motion reader. Each yields 38 values before resetting. The first stream overlaps the copied character source at $9601–$9610. Six forced VICE cases and `test_stage11_motion.js` check literal, repeated and reset values; ordinary-play reachability remains open.

The object record at $963E contains result callback $969F, which returns A=$F7 with carry 1. A forced VICE call and `test_later_object_results.js` check the return; ordinary-play reachability remains open.

This load has 30 additional one-byte RTS entries selected by captured entity vectors. A listing test checks every selected vector and byte; forced VICE samples cover loads 2, 3, 9, 23, 28 and 31. Ordinary-play reachability remains open.

Controlled visual-resource reconstruction reads 14 additionally described bytes as compressed input or metatile character codes. The listing simulator records the reads at the token and metatile-copy instructions; `visual-source-observations.json` in the game folder bounds the segments. The descriptions leave unread tails and other uses open.

22 stable 63-byte ranges match shapes verified in other loads and lie at VIC bank-3 sprite-slot boundaries. VICE read the entry bytes and observed no instruction entry into those ranges during a 200-frame play capture. The listing test compares each range with its source shape and the graphics gallery. Display use in this load and other possible code uses remain open.

7 stable 63-byte aligned ranges form one-bit patterns that recur in other loads. VICE checked their entry bytes and observed no instruction entry into those ranges during a 200-frame play capture. The listing test compares every matching range and the viewer. Display use, actual colours and other possible code uses remain open.

The remaining 16 character-copy fragments are identified by source, row offsets and destination. A forced VICE $717C call matched each complete source against $D000–$D7FF; this proves the copy, not display use or absence of another use.

The high-memory output also contains 1 aligned all-zero 63-byte masks. VICE matched their entry/play bytes and saw no instruction entry in a 200-frame capture. They render as transparent masks; actual sprite selection and other CPU uses remain open.
