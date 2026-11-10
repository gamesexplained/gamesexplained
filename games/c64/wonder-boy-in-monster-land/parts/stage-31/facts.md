# Load 31 — verified technical facts

The resident draw loop at `$6D41–$6D63` ran 200 iterations in the first 200 frames after this forced load returned. Its four indexed reads use `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use the indexed attribute table at `$80CF`; the exact meanings of all its bit combinations remain open. This observation follows a forced transition and does not establish a route by ordinary play.

The entry snapshot has 16 row pointers in split tables at `$85CF` and `$8620`. They point to rows beginning at `$8671` and spaced 128 bytes apart; the address immediately after that storage is `$8E71`, the character-data pointer recorded at `$7F41`. The downward scroll check uses `$7F4C` as its vertical boundary. This does not establish that every stored cell is encountered during play.

The captured sound pointers select voice lists at $9217, $921D, $9223; their records name 6 distinct event patterns. In the captured selector-1 loop, the resident sequencer selected each pattern and reached its documented zero marker in the listing-based simulator. `test_stage_sound_patterns.js` checks the pointers, pattern boundaries and those visits. This observation does not establish when ordinary play selects the sound.

The captured descriptor names 1 six-byte trigger records at `$91AC` and 1 sixteen-byte stage object records at `$91B2`. `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions, stubbing the map updater for the sixteen-byte records. These captured records do not establish that ordinary play activates them.

The loaded pointer at `$7F3F/$7F40` targets `$91A1`, inside the eight-page character-copy source at `$8E71`. The entry was not observed in the 200-frame forced-play probe and monitor collection. The loaded entry is decoded as code and also lies within the character-copy source. No instruction start in that source was observed in this bounded probe; the code path remains to be reached in ordinary play.

The supplied side B file with index $1F supplies two compressed streams. Executing the game’s decoder on those bytes in the 6502 simulator consumed 2635 and 3726 bytes and wrote $EB40–$FB3F and $7EDF–$A31E, respectively. All written output bytes match the forced VICE load-entry snapshot. This establishes these stream writes for the supplied image, not natural reachability or ownership of repeated data across loads.

5 three-line message records in this load were identified from instruction sequences that load their addresses in X/Y before reaching $77E0. With selector $77E1 forced to zero, listing tests check the pointer and copy of every recorded line into the message buffers; spaces become glyph zero. Twelve controlled VICE calls check representative records from loads 2, 4, 9, 12, 19, 22, 29, 30 and 31 with the same selector. Glyph $60 is a downward-pointing triangle; its role and ordinary-play reachability remain open.
6 simple eight-row glyphs in the character-copy source are referenced by metatiles in the captured map. Listing tests reconstruct their map references and run the $717C copy; seven controlled VICE reads check representative destination glyphs in loads 2, 20, 27 and 31. These observations do not establish ordinary-play reachability or exclude other possible code uses.

The captured map references 54 additional described glyphs through its tile-quadrant tables. Their source bytes match the copied character RAM in the play capture, and `test_map_glyphs_expanded.js` checks each map reference and runs the $717C copy. Controlled VICE reads of 18 glyphs in loads 2, 9, 16, 20, 27 and 31 agree with the captures. Ordinary-play reachability and other uses remain open.

The type-$2D and $2E entity vectors select a dispatcher at $954D. Six captured state-table pairs point to $956B, $95A0, $9749, $976B, $987A, $98C5. The dispatcher does not bound the state index. VICE and the listing test checked all six patched jumps in load 31; the state-index range and ordinary-play reachability remain open.

Type-$2D/$2E state 0 at $956B uses results from $3020 to initialize fields and falls through to state 1. VICE checked four controlled constant results with $3020 stubbed. Ordinary-play reachability remains open.

Type-$2D/$2E state 2 at $9749 calls $9820, chooses a movement callback by a signed field and can copy $1B17,X to the state. VICE checked four controlled cases with callbacks stubbed. The state-index range and ordinary-play reachability remain open.

Type-$2D/$2E state 4 at $987A alternates two frame calculations while $98C3 is nonzero, then copies $98C4 to the state and initializes fields when it is zero. VICE checked three controlled counter values, including frame-addition carry. The bytes’ writers and ordinary-play reachability remain open.

Type-$2D/$2E state 5 at $98C5 decrements a timer and either calls $9820 or prepares two display entries after a series of callbacks. VICE checked three timer cases up to $9934 with callbacks stubbed. Ordinary-play reachability remains open.

The type-$2D/$2E state-5 loop at $9934 waits for $D012=$80, updates two display coordinates and repeats until Y is below $50. With the setup values X=$74, Y=$C8, steps 8 and 0, a controlled VICE run reached $9972 after 62 iterations with X=$50, Y=$4F and steps 0 and 2. The loop does not require the raster to leave $80 between iterations. Other uses and ordinary-play reachability remain open.

After the type-$2D/$2E state-5 raster loop, code at $9972 passes the records at $99B0 and $99E5 to $77E0, then calls $3C2A and $370B in a loop controlled by $4DC7 and $4DC9. When both fields are zero it calls $370B twice and $6DDE, then jumps to $0203. VICE checked three controlled input cases with callbacks stubbed. Ordinary-play reachability remains open.

The type-$2D/$2E frame helpers at $9820, $983E and $985C choose offsets 8/20, 4/16 and 0/12 from carry returned by $72FC, then calculate two frame bytes. VICE checked both carry values for each helper with $72FC stubbed and frame wrap exercised. Ordinary-play reachability remains open.

Type-$2D/$2E state 3 at $976B decrements $1B06,X and can call $983E, skip allocation based on its low bits or $962A, or call $190B. VICE checked five controlled entry cases with callbacks stubbed. Ordinary-play reachability remains open.

The type-$2D/$2E state-3 allocated-slot path at $9794 initializes an entity from returned X and Y and the bytes at $98BE–$98C2, then restores X and checks $1B06,X at $9809. VICE checked both signs and two timer cases with callbacks stubbed. Allocation conditions, callback effects and ordinary-play reachability remain open.

Type-$2D/$2E state 1 at $95A0 can select state 0, move according to a shifted direction byte, or update a signed phase and clear its mode at $8B. VICE checked eight controlled movement cases with callbacks stubbed. Ordinary-play reachability remains open.

The type-$2D/$2E state-1 transition at $95E6 selects state 3, initializes a timer and four working bytes from shifted coordinate fields, and clears $962A. State 3 uses those bytes to initialize allocated slots. VICE checked both signs of $98BE with $3020 stubbed. Other uses and ordinary-play reachability remain open.

The type-$2D/$2E contact entry at $9647 fills $762E–$7631 and calls $732A. A positive $1A6D,X can trigger the $96AF record when $4DE2,Y has low bits 5, then enter state 2. VICE checked five controlled cases with callbacks stubbed. Ordinary-play reachability remains open.

The type-$2D/$2E contact branches at $96CB and $96FA fill a second set of collision fields, or select state 4 or 5 depending on $19E5,X. The state-4 path passes the $9731 record to $77E0 and calls $9820. VICE checked four controlled cases with callbacks stubbed. Ordinary-play reachability remains open.

The load-31 type-$2F vector selects $9A11, which calls $35C1 and uses an incremented state byte to select a frame offset and an index for later code. VICE checked five controlled state values with $35C1 stubbed. Ordinary-play reachability remains open.

The type-$2F path at $9A41 checks $19A1,X against $CA and tests $195D,X for equality with $40 or $1F according to $196E,X. VICE checked five controlled boundary cases. Whether ordinary play reaches values that cross the exact equality checks remains open.

The load-31 type-$2F collision path at $9A5F constructs four fields from display coordinates and four three-byte tables, then calls $1179 and possibly $7227, $5D7A and $4454. VICE checked all three table indices and both collision outcomes with callbacks stubbed. Callback effects and ordinary-play reachability remain open.

A forced $717C call copied all 2,048 bytes from the entry character source to RAM at $D000–$D7FF. The source bytes matched the captured play snapshot, and an earlier 200-frame play capture recorded no instruction entry into that source range. 42 eight-byte characters before the nearest discovered code entry or update pointer were described from their row patterns; whether each is displayed and other possible code uses remain open.

The captured 48 low and high entity-handler bytes at $7EDF–$7F3E pair into 39 distinct addresses. The listing test runs the instructions from $2027 up to the call at $2036 for every index in this load. VICE checked indices 0, 1 and 47 in loads 2, 24 and 31 before the call. The code does not locally bound the index, and individual target reachability remains open.

The 42 captured bytes at $7F58–$7F81 supply sound pointers, reward and item values, map replacements, sampled-map comparisons and a visual-resource selector. The listing test checks the bytes and exercises the sound-pointer and visual-selector reads for this load; VICE checked those reads in loads 2, 24 and 31. Other fields are tied to their documented resident readers; their ordinary-play reachability remains open.

The captured bytes at $7F43–$7F49 supply initial colour shadows, player frame and position; $7F4D/$7F4E supply view-origin values that later code can change. A listing test checks their initialization paths for this load. VICE checked both paths in loads 2, 24 and 31 with the HUD callback stubbed. Ordinary-play reachability remains open.

2 stable 63-byte aligned ranges form one-bit patterns that recur in other loads. VICE checked their entry bytes and observed no instruction entry into those ranges during a 200-frame play capture. The listing test compares every matching range and the viewer. Display use, actual colours and other possible code uses remain open.

36 stable 63-byte aligned ranges form one-bit patterns in this load. VICE checked their entry bytes and observed no instruction entry into those ranges during a 200-frame play capture. The listing test compares every range and the viewer. Display use, actual colours and other possible code uses remain open.

A forced $717C call copied all 2,048 bytes from the entry character source to RAM at $D000–$D7FF. The selected bytes matched the captured play snapshot, and a 200-frame play capture recorded no instruction entry into those selected ranges. 100 eight-byte characters excluding typed code, discovered entry bytes, update pointers and existing annotations were described from their row patterns; whether each is displayed and other possible code uses remain open.

Controlled visual-resource selections copied 111 additional eight-byte character patterns from their captured sources. VICE checked each copy and recorded no instruction entry into the selected bytes during 200 frames of captured play; a listing test repeats the copies. Display use, other possible code uses and ordinary-play reachability remain open.

The captured split row-pointer tables contain 81 pairs. All follow a 128-byte stride from $8671; the first 16 correspond to the map rows described here. VICE compared the remaining table bytes to the entry snapshot, and `test_later_row_pointer_tails.js` checks all pairs. Whether gameplay uses the extra entries and the uses of their targets remain open.
