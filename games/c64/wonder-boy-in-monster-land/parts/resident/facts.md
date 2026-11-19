# Resident engine — verified technical facts

### A direction reversal and the gold reward

The slot-zero initializers for entity types `$FE` (`$5BE1`) and `$FD` (`$5C2A`) end in the check at `$5C0C` as they create the entity: the first falls into it and the second jumps to it at `$5C63`. The check uses the input sampled at `$3C4C`: a right press with left pressed in the preceding sample, or a left press with right pressed in the preceding sample, sets the entity's reward byte at `$1AB1` to `$FF`, provided the player's vertical-motion state at `$4DB3` is nonnegative. In the main update path, input is sampled at `$0407` before the record dispatcher at `$0434`. The condition is therefore a reversal across two consecutive input samples at creation.

On contact, the dispatch table at `$754E` selects `$7632` for both types. `$771F` adds a pseudorandom offset of 0–4 to the saved reward byte with the 6510 in decimal mode; with `$FF`, this invalid BCD operand produces `$65`–`$69`, and `$7874` adds that packed-decimal amount to the player's gold. The small offset is chosen at collection, not at creation.

### Score glyphs and display setup

The resident part holds ten eight-byte digit shapes at `$C808–$C857`, zero through nine as character codes `$01`–`$0A`. `$39E7` uses eight-byte entries from a table based at `$C800` when it updates the score graphic. `$7122` copies the 80 digit bytes to `$D7B0–$D7FF` after banking I/O out.

The code at `$6ABD` clears the low two bits of CIA2 port A, and the title raster handler writes `$02` to `$D018` at `$3BE8`. With VIC bank 3 selected, that pointer chooses `$C800` as the character base; the title handler also writes `$1B` to `$D011`, selecting character rather than bitmap display.

### Character codes

The 256 eight-byte shapes of the character set at `$C800` include the following visible characters: `$00` is blank; `$01–$0A` are `0–9`; `$0B–$10` are `(`, `)`, `/`, `:`, `&`, `-`; `$41–$5A` are `A–Z`; `$5B–$5F` are `.`, apostrophe, `!`, comma, `?`; `$60` is a downward-pointing triangle; and `$61–$7A` are `a–z`. The triangle is the marker that blinks while a message waits for Fire: the wait at `$6DDE` scans screen bytes `$C0C8` down to `$C001` for `$60` and toggles bit 0 of the colour-RAM cell of the first one it finds. Other cells contain graphics or shapes whose text meaning is not established.

Message records selected through the pointer tables at `$5636` and `$564C` contain three zero-terminated fields followed by a control byte. The copy loops at `$7806`, `$781B` and `$7830` replace stored `$20` spaces with glyph `$00` while filling the screen buffers. The record at `$549E` says “Lost the / Wing Boots.”; the record at `$5555` says “WING BOOTS.” The reward handler at `$771F` fills the copied “gold get” message with the calculated amount, while the score handler at `$7756` fills the copied “BONUS POINTS” message with digits derived from its reward input. The source records themselves hold zero glyphs as placeholders.

### Drawing map characters

The playfield raster path at `$1333–$133F` enables multicolour character mode and writes the value at `$6F` to the background-colour register `$D021`. The path at `$136A–$1373` writes `$529C` and `$529D` to the two shared character colours at `$D022` and `$D023`. The routine at `$34DD` loads the 2,048-byte character source pointer each load supplies at `$7F41/$7F42` into `$52/$53` and jumps to `$717C`, which copies it to RAM `$D000–$D7FF` with I/O banked out.

### Wing boots

`$76FD` sets the selected player's flag `$08` and initializes `$4DE0` to `$FF`. At `$0A92`, when that flag is set, the fall-step value `$4DB5` is below 4 and the sampled up input is pressed, the game decrements `$4DE0`. A nonzero result sets the fall step to 1; a zero result clears the flag and selects the “Lost the Wing Boots.” message. Starting at `$FF`, expiration therefore takes 255 qualifying visits to this code. Visits on which up is not pressed or the fall step is at least 4 do not decrement it.

`$76FD` is called by the contact handler at `$76B2`, which the table at `$754E` selects for pickup type `$F1` and which then shows message 5, and by shop purchase routines in the loads (load 1 at `$AC61`).

### Sound sequencing

The sequencer at `$2201` reads its request from `$2C15`. Request 1 enters the `$224F` initializer and uses the three pointers at `$7F58–$7F5D`; requests 2–7 select built-in pointer lists. The initializer subtracts one after the comparison at `$220D`, so request 1 selects the stage pointers and the others select the built-in entries. `$23EF` writes master volume 15 to `$D418`.

In play the sequencer is called at `$125B`, in the CIA 2 timer NMI handler that begins at `$121C` by writing the sprite registers. The title set-up at `$021F` and the transition at `$7AA2` call it after storing `$FF` in `$2C15`, and the transition sound wrapper calls it at `$7BE8`.

Initialization at `$22A0` clears each voice's list offset, pattern offset, note-start flag and control value and sets its note countdown to `$FF`, but leaves its note number (`$223A`, `$2241`, `$2248`), its gate mask and the SID registers as they were, so the first notes of a request can depend on the voice state before it. `test_music.js` regenerates recordings of 31 stage requests and six built-in requests from the listings.

The scroll-copy entries at `$61D8`, `$61DD` and `$629C` copy 39 or 38 bytes through the pointers at `$54/$55` and `$52/$53`. The entries at `$635B–$67E6` use unrolled indexed loads and stores using base addresses in `$D8C8–$DB1E`; the descending routines have alternate entries that skip their first byte. The test `test_scroll_copies.js` runs all 12 entry points from the listing, including overlapping source and destination ranges.

The sequence reader at `$6A3A` uses `$1AB1,X` as an index into the stream at `$54/$55`, `$1AC2,X` as a remaining count and `$1AD3,X` as a cached byte. Values `$00–$7F` and `$C0–$FF` return directly; `$81–$BF` repeat the following byte 1–63 times, and `$80` restarts the stream. A stream that continually resets without yielding a value does not terminate. `test_motion_sequence.js` exercises literal, repeat and reset cases against the listing.

The terrain-sample routine at `$60D7` compares `$61D6` with per-load entries at `$7F75–$7F7D`. Its six-entry match path uses `$71`, `$527C` and the sign of `$4DB3` to manage a movement latch. `$7F76` selects a countdown path that decrements `$4B0D` only from 2 or higher. The two damage paths set `$4DE1` to `$50` and `$3C`, subject to the code’s effect and cooldown checks. A separate comparison of `$61D7` with `$7F7E–$7F80` sets `$61D5`. `test_sampled_tile.js` exercises these branches from the listing with movement and damage callees stubbed.

With decimal mode clear, `$6EA9` calculates the player’s map column, row and offsets from player coordinates, fine scrolling and the view origin. The horizontal path shifts the low nine bits and adds the carry from the last shift to the view’s left tile. The vertical path subtracts `$43`, then subtracts fine scroll without resetting carry; if the first subtraction underflows, the second subtracts one extra. The routine does not clamp the resulting indices. `test_view_grid.js` checks 5,000 input cases against the listing.

The entity update at `$4250` decrements a per-slot lifetime, sets a display flag at `$20`, updates a frame timer and a two-step sprite-frame offset, then uses the sequence at `$4319` for motion and phase decisions. Depending on two more per-slot fields it can call horizontal movement with collision and reverse direction when that call returns carry set. It does not check the sequence index it is given against the table's 24 entries. `test_entity_tick.js` checks its decisions with movement, release and coordinate callees stubbed.

The resident part contains 25 sound-pattern blocks at `$2619–$2933`. Each block is named by at least one two-byte record in the built-in voice lists, has nonzero bytes up to a final zero, and is read by the sequencer’s event path at `$2332`. The path at `$2322–$2329` advances to another pattern on a zero; `$FF` takes a special event path. The meaning of an event depends on voice state and the sequencer tick. `test_sound_patterns.js` checks all 25 boundaries and pointer records against the listing, and `test_music.js` checks the sound-player sequences.

The transition clear at `$7B2A` starts with X=0 after the preceding restore loop and writes zero to `$C000–$C3E7` and `$C400–$C7E7`, then writes `$08` to `$D800–$DBE7` with I/O visible. Each 1,000-byte clear leaves the last 24 bytes of its 1,024-byte page untouched. `test_screen_clear.js` checks the loop from the listing.

The title raster selects VIC bank 3 and character base `$D000` before switching to `$C800`. The raster stage at `$3C0A` writes `$04` to `$D018` at `$3C14`, selecting `$D000`, and the stage at `$3BCF` writes `$02` at `$3BE8`, selecting `$C800`. The title initializer passes load 1's `$B5C4` to `$717C` at `$0256`, which copies 2,048 bytes to RAM `$D000–$D7FF`; the source is counted in the first load, and the RAM copy is excluded from the resident ledger to avoid counting it twice. The code subsequently overwrites the underlying RAM for gameplay; the I/O registers at the same addresses remain a separate CPU-visible meaning.

The CIA 2 timer NMI handler at `$121C` copies the sprite pointers at `$50CF–$50D6` to `$C3F8–$C3FF`: `$10` for sprites 0 and 7 and `$60`–`$65` for sprites 1–6, whose data in VIC bank 3 is RAM `$D800–$D97F` beneath I/O. It then clears `$D01C`. Slots `$60`, `$61` and `$63` and the fixed numeral, lettering and blank rows of slots `$62`, `$64` and `$65` are static bytes; the score renderer writes the changing digit columns. `test_hidden_ram.js` checks the static bytes and the digit writes.

Pointers `$74` (`$DD00`) and `$75` (`$DD40`) are one of the player's sprite pairs: the walk animation at `$0BC6` sets the player frame `$4A` to `$66` plus the facing offset at `$1177` (0 or `$0E`) plus a walk-table value, and `$1481` puts that frame in display slot 2 and the next pointer in slot 3.

`$2086` mirrors the two 24-by-21 source bitmaps in slots X and X+1 into slots Y and Y+1: it reverses individual bits in the first layer and two-bit groups in the second. Load 1's set-up calls it at `$945C` and `$AFFB` with X=`$66` and Y=`$74`, so slots `$66/$67` at `$D980/$D9C0` are mirrored into `$74/$75` at `$DD00/$DD40`, including the bytes at `$DD2E` and `$DD31`.

Load 1's set-up at `$9458–$9469` calls `$2086` for four pairs: source slots $66/$67, $68/$69, $6A/$6B and $70/$71 into destination slots $74/$75, $76/$77, $78/$79 and $7E/$7F. The resident image holds only offsets 46 and 49 of each monochrome destination, eight bytes that differ from what the mirror writes there and that those calls overwrite. `test_player_mirrors.js` checks the generated bytes and those differences against captured hashes. Confirmed duplicate ranges are excluded from the ledger, while the eight differences remain in it as bare bytes.

Every RAM byte at $D800–$DFFF is represented in the ledger configuration as observed data, a confirmed duplicate, a generated score digit or an unresolved byte. The unresolved set includes the eight reflection differences and the 32 byte-63 positions that follow the 63 bytes of each sprite slot. `test_hidden_ram.js` checks that this accounting has no gaps or overlaps. The CPU-visible I/O registers at these addresses are separate.

The instruction at `$044D` jumps directly to the tally entry at `$0699`. The separate instruction at `$0450` jumps through the little-endian pointer at `$7F3F/$7F40`; every load supplies it and no code writes it: load 1 holds `$0200` there and load 2 holds `$9661`.

### Record and alternate score graphics

The code at $3A0A selects a record-score or alternate-player score path. It splits each of three packed score bytes into six glyph indexes, suppresses leading zeroes in the first five positions, and writes seven digit columns into RAM beneath I/O through $39E7. Each column takes eight bytes from the $C800 character set, spaced three bytes apart in the destination; the seventh column is a fixed zero glyph. The record path caches its three score bytes and skips redraw when they match. The alternate path returns when $4DBD is zero. `test_score_display.js` exercises both paths, the cache and the glyph-copy loop from listing bytes.

The first-player path at $38FE uses the same nibble conversion and zero suppression but keeps six individual cached glyph indexes at $4DA6–$4DAB. It redraws a digit column only when its index changes, then always draws a fixed zero at $D899. `test_score_display.js` checks the cache and all seven destinations.

### Position comparison and attack contact

At $72FC, the game compares the entity display slot’s horizontal position and the player’s position after halving each using the low bit of the high byte. Bit 0 of $192A,X adds 6 to the entity value with eight-bit wrap. Carry reports whether the resulting entity value is at least the player value. The routine restores Y after CMP, so N and Z describe restored Y, not the comparison. `test_collision_positions.js` covers 4,096 combinations and an equality case.

At $7430, an attack needs a nonzero contact budget, a visible player Y, a nonzero selected-player action tier, and frame $6E or $7C. Its box is three units high and 5 plus the action tier wide. On overlap, the routine spends one contact and subtracts the tier from $1A6D,X, saturating at zero. Flag $20 doubles that byte-sized damage and decrements $4DDF on the contact; when the counter reaches zero the flag is cleared, but that contact is still doubled. `test_attack_contact.js` exercises both facing directions, misses, ordinary and doubled damage, saturation and flag expiry. The Gauntlet pickup at $7688 calls $76E9, which sets that flag and initializes the counter to 10, then selects the “Wore the Gauntlet.” message. The tenth successful attack contact still deals doubled damage and selects the “Gauntlet is broken.” message; the next contact uses ordinary damage.

After a player attack misses, $7330 can test entity contacts. Unless the original entity’s display-slot byte is zero or $6F selects the direct-damage path, it scans types $27, $29 and $28 in that order, each from entity index 16 down to zero. Their overlap boxes have respective widths and heights 4×8, 6×11 and 10×15, with distinct position offsets; the first hit selects damage 1, 2 or 3, marks the scanned entity and applies the damage to the original entity. The direct path uses twice the selected player’s action tier as an eight-bit damage value. `test_collision_scan.js` checks the boxes, scan priority, miss and direct path with overlap stubbed.

The rectangle routine at $75E3 uses eight-bit arithmetic and does not clear decimal mode itself. In binary mode its two horizontal edge checks are asymmetric: an A box ending exactly where B begins can pass, while an A box beginning at B’s computed right edge fails. The vertical path returns carry set if either of its two height additions carries. `test_rectangle_overlap.js` checks 10,006 binary-mode cases against those exact operations.

### Transition bit reader

The bit reader at $7C6A clears its 16-bit accumulator at $66:A and reads the number of bits in X. With the fetch callback returning carry set, bits from each fetched byte enter least-significant first; A holds the result’s low byte and $66 its high byte. A zero count returns without fetching. `test_unpack_bits.js` checks 68 combinations with the transfer callback stubbed. The ordinary buffered fetch at $7D89 preserves the incoming flags, reads through the address patched at $7D9B and increments its low operand; a wrapped index requests a refill on the next call. If the reservoir at $67 is zero when a bit is read, the shift leaves carry clear, so the fetch at $7C77 branches to the output store at $7C91 with the fetched byte while the accumulator saved at $7C76 remains on the stack. A refill saves Y in the operand at $7D9A, calls $7DAB with $01 incremented, and returns the byte with Y and the incoming flags restored.

The transition header at $7C2C reads an initial output pointer and bit reservoir, then constructs 52 entries across three stack-page arrays: four-bit counts at $0104, and 16-bit bases split between $0138 and $016C. Each group of 16 entries begins with base 1; the next base adds 2 raised to the previous count, with 16-bit wrap. `test_unpack_header.js` checks every entry for uniform and varied synthetic streams using a stubbed byte source.

### Transition streams and post-load patches

The transition at $7AF8 calls $7D1B with mode 0 and a count of 2; the mode tables select $7C2C and the loop calls it twice, so each load arrives as two streams, each with its own output pointer. After a successful transfer, $7B04 calls $2A90, which for selectors 10, 14, 28 and 29 writes a three-byte JSR (to $2A7D or $2A87) into the loaded image. `stream-boundaries.json` records the consumed lengths, writes and discrepancies of the two streams that the game's own $7C2C decodes from each later load's disk file.

To reproduce the audit with the contributor's images and saved captures, extract each disk into ignored work storage with `python3 kit/c64/disk.py extract <side-A.d64> games/c64/wonder-boy-in-monster-land/work/side-a-files` and the corresponding side B command with `side-b-files`, then run `node games/c64/wonder-boy-in-monster-land/audit_disk_streams.js`. The program reads the ignored entry and play snapshots and writes its detailed report under `work/`; it does not require or publish a disk image.

The item decoder at $7C96 uses a prefix to select length and distance paths; prefix count $11 returns from a stream. Its backward copy loop at $7C8C either reads buffered bytes or copies from the computed source pointer, according to carry. `test_unpack_copy.js` checks both modes and a full-page copy.

The player frames set at $0AFF and $0B58 are $72 plus the facing offset at $1177, so pointers $72/$73 (bitmaps at $DC80 and $DCC0) and their mirror $80/$81 (at $E000 and $E040) are a player pair that $1481 puts in display slots 2 and 3. Load 1's seventh mirror call from $AFF7, at $B00D with X=$72 and Y=$80, writes slots $80/$81 and replaces the resident image's $20 at $E000 with $00.

The fire-action entries at $3CD5 and $3CEA set the player frame to $6C or $6E plus the facing offset. The display setup at $1481 assigns that pointer and the next to the two player slots. For offsets 0 and $0E, `test_attack_sprites.js` checks all four resulting pairs against the listing. Their source bitmaps occupy 63 bytes each at $DB00, $DB40, $DB80 and $DBC0; the reflected pairs occupy $DE80, $DEC0, $DF00 and $DF40. Load 1's mirror calls from $AFF7 write the reflected pairs: the fourth mirrors $6C/$6D into $7A/$7B and the fifth $6E/$6F into $7C/$7D.

The post-event tally at $0699 compares the selected player's meter with its limit and calls the middle-byte BCD score routine with $10 when equal. It initializes the score-conversion counter to the meter divided by two, then makes at least one pass that calls the meter-subtraction routine with $02 and the score routine with $41. It initializes a refill counter to the meter plus eight with eight-bit wrap, then calls the meter-addition routine with $01 until the counter reaches zero. A zero initial refill counter therefore takes 256 passes. `test_tally.js` checks ten input combinations with display, timing, meter and score callbacks stubbed.

The callback-result path at $5EAF can initialize an effect using four display-slot indices. It searches downward from slot 31 for Y values of $FF and stores each result without a separate failure check. If all 32 slots are occupied, the first search stores $FF, outside the 0–31 slot range. The later searches then read $4DCD, $4DCB and $4DC9; when none of them is $FF, the four saved indices are $FF, $FD, $FB and $F9. The display code that $1555 reaches at $158E then uses the second saved index, $FD, as a display-slot index and overwrites effect slot 1 at $4D4C and the byte at $4DCC. `test_effect_setup.js` checks callback flag paths and these cases.

The record-interaction path calls the fixed visual-resource loader at $47F9 with the selected stage record's field 4 in X. The following call at $47FC has its target patched from that record's fields 5 and 6. `test_visual_tables.js` checks three selectors and the patched operands with the loader stubbed.

The entity countdown at $1FF2 selects the $A7/$A8 sprite pair when its countdown at $1AA0,X is 6 before that pass's decrement, $A9/$AA for 4 or 5, and $AB/$AC for 2 or 3. The six 63-byte masks begin at $E9C0 and are resident bytes, below the range the loads unpack over from $EB40. `test_countdown_sprites.js` checks the five countdown values, bitmap geometry and the Graphics selector.

The resident routine $44DE either tail-jumps to $4368 or checks one or two tile flags first; when a checked tile blocks, it clamps the entity's world Y to that tile row and returns with carry set, and when neither blocks it tail-jumps to $4368 too.

Resident routine $1179 checks three gate bytes and the player frame at $4A, which must be below $6C or from $74 to $79 (the second range moves the box ten units right), before building a contact box and calling $75E3. If that call returns carry set, it updates $4DAF/$4DB0 and returns carry set; otherwise it returns carry clear.

Resident initialization at $6C04 copies fields from $7F43–$7F49 and sets $1177 to $7F46 minus $66. The contact routine $1179 later tests whether that byte is zero.

Resident display update $1C7C writes a primary pair of slots and conditionally writes a secondary pair. It uses $1A8F,X for blink and palette paths, and patches immediate operands to restore slot indices after palette lookup.

Resident display update $1E7C writes a primary pair from entity position fields and conditionally writes a secondary pair based on bit 0 of $192A,X. Like $1C7C it has blink and palette paths and patches immediate operands to restore slot indices.

Resident routine $7572 scans eight effect slots whose occupancy byte is zero and tests each against a player rectangle through $75E3. On contact it marks the slot, calls $4B0E with 2 and calls $7874 with 5 or $15 according to the sign of $4D51.

Resident $0B41 handles a positive vertical-motion state: it selects a frame, caps the step at 8, calls $0D7F and decrements a countdown, or clears the state when the countdown is zero. A gated input edge initializes the state and calls $0D7F once before re-entering the handler.

The resident divider at $2974 uses the immediate operand at $2975 as a countdown. A nonzero value is decremented while $526C is incremented; zero reloads the operand to 6. Both paths increment $5274.

Resident $69A2 calculates a player attachment target from the displayed slot Y position and a movement byte, patches an immediate operand, and calls the player movement routine before setting support flags and moving the entity.

Resident $0841 checks an input byte, motion state, map value and tile offsets before moving the player and setting a negative vertical state; other paths can reach an item action gated by a latch and count.

Resident $4A90 selects a source pointer by animation stage and copies a four-by-five character block into screen RAM. Stages 0 and 5 write colour 13 and stage 6 writes colour 15 to a separate four-by-three colour region.

Resident $6D17 expands a 20-by-10 map window into 800 character cells, saves visible bounds, and calls alignment helpers for odd origin coordinates.

Resident $0BC6 resets or advances the player animation using two input bytes, an index and a delay; index 4 resets to the first frame. The frame and delay tables overlap at $0C28.

Resident $7874 adds a packed-decimal byte to a selected two-byte balance, propagating carry. $7889 and $78D1 subtract amounts in decimal mode and restore the balance if the high-byte subtraction borrows; $7889 first splits its input nibbles into two packed-decimal bytes.

Resident $7901 subtracts the two packed-decimal bytes at $7D/$7E from the selected balance; if the result borrows, it restores the balance and returns carry clear, otherwise it returns carry set.

Resident $792C builds an entity contact rectangle from a display slot and two type-indexed parameter tables, restoring the entity index through a patched immediate operand.

Resident $41EE decrements an entity countdown and advances an animation. A nonzero animation-table entry moves the entity and returns without testing whether the countdown became zero; the zero-entry and index-7 paths check for removal at zero and an effect flag at $20.

Resident $3EC6 decrements a nonzero effect-slot speed on four specified phases when $4D51 is nonnegative. It selects a movement helper from the slot direction and toggles bit 7 of that direction if the helper returns carry set.

Resident $3F2E and $3F56 move a two-byte effect-slot X position and report their left and right limits with carry. On the left clamp the code writes the low byte of slot 0 even when X selects another slot; the right clamp writes the indexed slot.

When a helper reports a limit, $3EC6 jumps to $3F25, which toggles bit 7 of the slot's direction byte: the initial directions $FF and $01 from $5F80 become $7F and $81, so the slot turns round.

Resident $0DE9 adds the player vertical step to 28 eligible slot bytes, skipping $FF entries. When the support flag is positive it also excludes two slot indexes derived from the contact entity.

Resident $0D0A subtracts the player vertical step from 28 eligible slot bytes, skipping $FF entries and, when the support flag is positive, the two contact-entity slots.

Resident $1107 adds the horizontal step to 28 two-byte positions, while $0F63 subtracts it. A negative support flag excludes two contact-entity slots. On the all-position subtraction path, a high-byte borrow causes an additional subtraction of 8 from the low byte without changing the high byte.

Resident $3F76 disables eight slots when its lifetime is zero; otherwise it decrements the lifetime and selects an alternate path or a frame and vertical-motion update. Its falling path increments speed only when below 8 and clamps to a scroll-dependent floor.

Resident $402F selects an alternate group frame and vertical displacement, or skips them when its phase is negative. Landing clamps the position, clears eight direction bytes and sets phase and frame to $A5. If it has not landed, the code reads its table even for a negative phase.

Resident $6008 initializes a type-$F8 entity, passes the selected player tier plus $11 to a message callback, restores the entity index via a patched operand, and initializes its frame and attributes.

Resident $603F updates an entity of the pickup types $FA and $F5–$EF, decrementing its countdown and copying the base frame before using a seven-byte movement table. Nonzero entries move the entity without checking for expiry; the zero and phase-7 paths remove it at zero or set an effect byte at $20.

Resident $6086, the update for types $F9 and $F8, copies the entity base frame to its primary frame and sets its auxiliary byte to 1 only when it is zero.

Resident $5FE2 initializes a type-$F9 entity from the frame byte at $7F6B, sets its display attributes and countdown, and calls a movement helper with 12.

Resident $6097 initializes a conversion countdown from half the selected player meter, calls meter and score helpers in a loop, then increments the meter until it equals the selected limit. Both loops execute at least once.

Resident $5FB5 initializes a type-$FA entity from values supplied in A and Y, preserving A on the stack and Y in a patched immediate operand across the sprite-link callback.

Resident $447A optionally marks two linked display slots $FF, then clears sixteen bytes of entity state. If the third-slot index is nonzero and the fourth-slot index is zero, the second write targets display slot 0.

Resident $4A43 decrements the status-animation timer and advances or reverses its stage when the timer reaches zero. Forward stage 6 calls the meter helper with 8 and wraps to stage 0; a transition into stage 6 loads a countdown of 3.

Resident $3D69 initializes an entity motion state; $3D7F selects movement or starts its animation, and $3D9F shows frame $A9 and then $A7 from the table at $3DB6 before tail-jumping to the cleanup at $3E5A.

Resident helpers $3E54–$3EC5 test display presence, update signed vertical motion, tick a countdown, select horizontal movement and initialize direction.

Resident $3E15 initializes a second entity-motion mode; $3E2B optionally reverses direction, calls movement and countdown helpers, then selects a frame or invokes cleanup.

Resident $3DB9 either clears an entity, reuses an existing trajectory or initializes one from entity reference bytes and display-slot coordinates.

Resident $34EA calculates a four-bit direction from coordinate differences, subtraction carries and two tables. It normalizes negative byte values modulo 256 and reduces both magnitudes before indexing the eight-by-eight table.

Resident $35C1 selects a horizontal helper from entity type and signed table value, then subtracts a signed vertical table byte from entity positions. It uses Y after the horizontal callback without restoring it.

Resident $369E copies ten record bytes through $E2/$E3 into entity fields, advances Y by ten modulo 256 and clears four display-slot indexes.

Resident $5D2C converts selected trigger column and row bytes into unindexed entity coordinates: X is column times 16 plus $1B and Y is row times 16 plus $59.

Resident $71DB converts entity world coordinates to truncated grid coordinates after subtracting $1B horizontally and $5A vertically. It returns the entity index in A and sets carry when the adjusted horizontal low nibble is at least 7.

Because $5D2C adds $59 to the row and $71DB subtracts $5A, a position made by $5D2C and converted back by $71DB has the same column and the row one less, modulo 256.

Resident $7227 rejects player contact for a nonzero $4DDD or player Y of $FE; otherwise it constructs a rectangle and calls $75E3. On contact it invokes knockback and a comparison, then sets the horizontal direction and facing from that comparison.

Resident $727F selects a knockback speed and duration from the selected player motion profile, sets three motion-state bytes and restores incoming X and Y through patched immediate operands.

Resident $72AB, the trigger callback that trigger records in loads 6, 9, 18, 19, 20, 23, 26 and 27 name, increments a trigger counter and either returns, starts a $10-duration recoil, or first initializes a temporary type-$2B entity from trigger coordinates.

Resident $72E6 decrements a temporary entity countdown, releases it at zero, or selects one of two frames from the countdown parity.

Resident $4574 and $45BC apply rightward and leftward entity movement and may undo it after a boundary or tile check. The leftward zero-column path returns a tile result of 3 without undoing the move; a returned $FF column is rolled back.

Resident $460C packs four bits from four consecutive tile attributes, while $4632 reads each attribute through a row pointer and restores X and Y.

Resident $43A2 and $43F0 move an entity left or right in world coordinates or screen coordinates according to $7A. The screen paths clamp at different bounds or tail-jump to release for type $28 in specific branches.

Resident $4454 releases a primary display pair when its first index is nonzero, clears its links and falls into the $447A reset. A zero second index is still written when the first is nonzero; entity index zero skips setting the animation countdown to 7.

Resident $7130 selects screen-resource pointers and colour values, calls $7008, then copies eight pages to RAM under I/O and restores the processor port.

Resident $70D0 maps 20 rows of 40 screen characters through a colour table into colour RAM and restores X from an immediate operand saved by $7008.

Resident $7011 expands literal metatile bytes and $FF-marked runs into a 20-by-10 metatile screen.

Resident $0364 sets up raster and processor-port state and calls $6CCC before the display initialization at $0383.

Resident $1665 sets an interrupt target and scans bit 7 of $DC01 after configuring CIA port A; it conditionally increments $526C and always increments $5274 before restoring display registers.

Resident $1703 and $17DA write the first and reused hardware-sprite settings from a display slot. The first stages the X position and high-bit mask in RAM; the reuse path writes those directly to VIC registers.

Resident $1753 and $182A schedule further sprite reuse or the end-of-frame interrupt based on the decremented slot count and a sprite Y plus $15 compared with the raster.

Resident $1779 counts seven hardware-sprite Y values from $4A through $5F inclusive.

Resident $0E42 and $0FDC update player facing and horizontal speed for right and left input. They slow an opposite-direction movement before changing direction, and profile 3 skips the speed update on odd $5274 values.

Resident $0FC1 and $115B update player X without viewport scrolling. Their low-byte clamps depend on whether the resulting high byte is zero, so a subtraction that wraps below zero leaves the high byte $FF and skips the left clamp.

$0E83 and $101F cap the step $4DB1 at 8 and, when $7A is zero, jump to $0FC1 and $115B.

Resident $0D7F handles upward player movement and viewport scrolling, including an anchor at $A2 and a top-of-map path that consumes the remaining step.

Resident $0CA0 applies a downward player step after the preceding collision checks, including an anchor at $A2 and a bottom-of-map path that consumes the remaining step.

Resident $0C2C checks one or two tile attributes before applying downward movement, with the second check skipped when $4DB3 is $FF. A blocking attribute clips the step and clears several motion bytes.

Resident $0ED3 handles rightward movement and fine scrolling around an $AA player-X anchor, including a right map-edge path.

Resident $1069 handles leftward movement and fine scrolling around an $AA player-X anchor, including a left map-edge path.

Resident $46D6 selects four tile bytes and writes a two-by-two map area using a record-selected row and column.

Resident $719E initializes two display-slot entries from X and Y, fixed attributes, two VIC sprite multicolours and a sort flag. The continue menu calls it at $0601 and $0610 to place its two selection sprites, and 18 of the 31 loads call or jump to it.

Resident $2086 mirrors two adjacent 63-byte sprite images: one reverses single bits, the other reverses two-bit groups. It leaves each image's 64th byte unchanged and returns with X and Y each two higher, so a run of calls walks through a sprite bank. The resident part never calls it; loads 1, 2, 9, 23 and 26 do.

Resident $6E12 computes view-origin pairs, optionally samples two map rows and derives an eight-bit half player X.

Resident $0988 initializes an entity position from screen or world coordinates according to $7A. It calls $190B for a free slot and then $4454 without testing the carry that $190B returns.

Six resident item setup variants choose type, sprite frame and attribute before shared setup at $49D0; four also call the message routine while preserving X and Y.

Resident $49E3 and $4A12 scan enabled entries and patch their own dispatch jumps; the second selector falls back to the first at index 7. The two enable ranges, $7F5E–$7F65 and $7F64–$7F6A, share $7F64 and $7F65, and the first scan has no exit when all eight of its bytes are zero.

Resident $497D chooses between another selection and the type-$F0 item setup based on bit $10 of the selected player flags.

Resident $7A9A saves and clears three memory pages and stages a 53-byte transfer payload. It saves bytes $00 and $01 with the rest of page zero but neither clears nor restores them.

Resident $4828 writes five 22-cell display rows and three 22-cell colour rows, then stores $FE at $4DAD. The frame wait at $3C2A calls it while $5275 is zero.

Resident $6F86 redraws the meter sprite when a cached value differs, splitting the drawing into 20-unit segments and eight-row masks. It compares the cache with $4DCD,Y for the Y it is given but draws the meter of the selected player, $4DCD indexed by $4DBD, and the two indexes can differ.

Resident $5D7A applies damage only when cooldown is zero; protection halves the amount, decrements its byte-sized charge and clears its flag when the decremented charge is zero.

Resident $08E0 saves two bytes in the operands of $0841, then sets a temporary action mode and colour shadow; $0841 restores them when that mode is 1.

Resident $29FC calls $6B50 then reads several addresses rather than calling them; $2A16 initializes two four-byte arrays.

Resident $5BE1 and $5C2A either initialize slot-zero reward types $FE and $FD or increment the calling trigger count if slot zero is occupied. Both reach the input-edge test that can replace the saved reward byte with $FF.

Resident $5C66 and $5C94 initialize indexed reward types $FE and $FD; the latter records a converted grid row.

Resident $5CCB and $5CFE initialize slot-zero object types $FC and $FB or increment the calling trigger count if slot zero is occupied.

Resident $2D3E draws pairs of characters down the exposed right-scroll column and can draw one extra character when the top tile is odd.

Resident $2E33 draws pairs of characters down the exposed left-scroll column and can draw one extra character when the top tile is odd.

Resident $3622 scans slots and either copies a new ten-byte entity record or reloads a previous one.

Resident $2C16 sorts 32 slot indices by descending Y value, preserving equal-value order before forcing the first 15 pairs to even/odd indices. A nonzero cache flag restores cached cursors without sorting.

Resident tables $2500–$255F and $2560–$25BF contain paired low and high bytes for 96 SID frequency words. The update at $23B7 writes both bytes to a voice’s frequency registers after an indexed lookup. `test_sid_frequency_tables.js` runs all 96 pairs through $23B7.

The status-screen initializer copies the 200-byte template at $4DE4–$4EAB to $C000–$C0C7. `test_hud_screen_template.js` checks every copied byte.

Resident transfer routines at $7E02 and $7E25 receive or send bytes through the pointer at $64/$65. `test_resident_serial_receiver.js` and `test_resident_serial_sender.js` check both.

Resident rising-entity overlap code at $6939 compares halved X coordinates and player Y plus 21 (ADC #$14 with the carry the passed comparison leaves set) before entering attachment at $69A2. `test_rising_entity_overlap.js` checks both widths and the rejection and attachment paths.

The resident character set at $C800 holds 256 eight-byte patterns. `resident-charset-details.json` records the set bits and first and last rows of the 247 that do not start a labelled range in the listing, and `test_resident_charset_extra.js` checks them against the listing bytes.

The resident raster split at $130A waits on the VIC raster, sets scroll and background registers, then chooses self-modified timing operands from tables according to vertical scroll and $5294. At the patched raster line, $1383 clears bits 5 and 6 of $D011 after the patched delay, writes the sprite X-high mask from $4D68 and the X positions of sprites 6 down to 0, and jumps to $1211. `test_resident_split.js` checks both scroll paths and the sprite writes.

The horizontal and vertical collision parameter tables at $79B6 and $7A12 contain 46 offset/size pairs each. The code at $792C indexes them by twice the entity type, adding the offsets to display-slot coordinates and using the sizes for the collision rectangle. `test_resident_collision_tables.js` checks all 46 entries.

Twenty-nine resident VIC sprite slots selected conditionally by player, continue, effect or entity routines have individually recorded bitmap bit and row counts in `resident-sprite-shapes.json`. `test_resident_sprite_shapes.js` checks the counts against the listing.

The alternate matrix cells $C500–$C7E7 are part of the screen cleared by $7B2A. Their cell offsets in a 40-column matrix are recorded in the listing.

The primary matrix cells $C0AE–$C3E7 are part of the screen cleared by $7B2A. Their offsets in a 40-column matrix are recorded in the listing; the status initializer also copies its template through $C0C7.

The status template $4DE4–$4EAB is copied to $C000–$C0C7. Its six bytes at $4E35–$4E3A also restore the meter background at $C051–$C056 in the routine at $37F7.

The platform contact calculation at $2173 uses halved horizontal positions and a patched width; its vertical path compares player Y plus 21 against the entity slot and may shorten the downward step. `test_platform_contact.js` checks the equal, shortened-step and both rejection paths.

The first sprite interrupt setup at $16C0 saves the CPU-port read, banks I/O in, acknowledges the VIC interrupt, initializes sprite coordinates and masks, and sets sprite 7 X from the meter byte. `test_sprite_irq_init.js` checks these writes.

The 18 resident built-in sound pattern lists contain the individual pointer sequences recorded in `resident-sound-pointers.json`; a zero low byte restarts the reader before its final high byte is used. `test_resident_sound_pointers.js` checks each pointer and terminator against the listing.

The resident special-entity dispatcher at $5DB9 saves the incoming context, optionally calls movement, then selects initialization, release or one of two type-indexed handler tables according to world mode and entity reload counter. `test_special_dispatch.js` checks all 38 types ($00–$25) in both selector tables and the mode and release branches.

The world-mode-zero special-entity path at $5E71 releases an unflagged entity; otherwise it scans 17 entity slots and calls release for nonzero coordinate-state entries whose flag bit 0 is clear, adds 8 to the player meter, writes $FE to sound state and calls a stage-selected callback with the original entity index.

The resident routine at $18D8 clears thirteen fields belonging to entity slot zero and does not write their adjacent slot-one bytes. `test_clear_entity_zero.js` checks all thirteen fields and neighbours.

The sound list reader at $22DC reads a little-endian pattern pointer at a voice offset, advances by two, and on a zero low byte restarts at offset zero and writes the patched configuration byte to $2C15. `test_sound_list_reader.js` checks two pointers and the restart.

The six 32-byte arrays at $3415–$34D4 save display-slot flags, X coordinates, sprite pointers, colours and Y/free bytes. The save loop at $331F marks slots 2–31 free after copying; the restore loop at $3386 copies all six arrays back. `test_display_arrays.js` checks all 192 bytes and the slot-release boundary.

The meter buffer at $C400–$C43F overlaps the alternate screen matrix; the meter update at $6F86 and the transition screen clear at $7B2A use the same RAM for different purposes. The reload-record multiplication at $366A uses a patched immediate byte at $3675.

The resident routine at $121C copies 17 sprite position/X-high bytes, eight sprite pointers and eight colour bytes to the VIC and screen pointer locations, then clears the multicolour mask. `test_sprite_register_copy.js` checks these values.

The keyboard scan at $2951 selects CIA1 port-A value $FD and tests port-B bit 7. It writes $5275 as zero or $FF, resets the port-A direction, conditionally updates a self-modified divider and increments $5274. Row 1, bit 7 of the keyboard matrix is the left SHIFT key. `test_keyboard_scan.js` checks both bit values and the divider reload.

The status routine at $7B84 returns $5284. If action tier $4DDB is nonzero, it also makes CIA1 port A an output and reads the byte at $29A3 as data before returning; its jump bypasses the alternate path at $7BA8. `test_game_status.js` checks the zero and nonzero tier paths.

The two players have separate item-type and packed-BCD quantity arrays at $51C3/$51E3 and $5203/$5223. `test_inventory_arrays.js` checks append, matching-item merge and saturation at $99 for both players.

Resident status graphic selector $5326 patches a colour operand and copies eight label cells plus four six-cell ranges.

Resident status selection $530C selects the first or second player’s item arrays, splits the quantity nibbles and forwards the type to $5326.

Resident $0678 contains the add-credits message passed to $77E0 at $063F. Its fields are “Add credits and”, “select again” followed by glyph $5B, and an empty third field, with control byte $FE. The 32-byte signed displacement table at $5662 drives the continue animation: $052F sign-extends each entry and adds it to the starting X at $064A/$064B, storing the sum as the player’s X at $47/$48.

Resident $417D and $4194 copy two and three rows of three replacement cells respectively. Both preserve A and return with X=3 and Y three higher.

Resident serial sender $7E53 shifts a byte most-significant bit first and writes $1F/$2F and $3F to CIA2 direction register $DD02 after two clock waits.

Resident serial receiver $7DC4 combines four port samples and has a runtime-patched return/store opcode at $7DED.

Resident vertical entity movement $68F1 uses a callback displacement and can move an attached player through $0C2C or $0D7F. When $4DB8 is zero, an upward displacement goes to the overlap check at $6939 instead.

Resident entity vertical steps $4342/$4368 select world or screen coordinates by $7A. On screen coordinates, when the downward result reaches $4D69 plus $C2, $4368 clamps $19A1,X to that value and returns with carry set.

Resident transition entry $7A6E waits for raster value $80, clears display and sound registers, restores A and jumps to $7A9A. Message wrapper $7A91 restores X after $77E2.

Resident record map updater $46D6 patches row, column and saved-Y operands and writes four cells. The second row is written at offsets $7F4A and $7F4A plus 1; the 31 loads set $7F4A between 21 and 128, so the INY never wraps.

Resident reward conversion $7771 splits an input shifted left four places into arguments for $4B0E/$4B20, then calls the nibble splitter $36E9 for the display fields.

Resident transfer-failure path $7B58 alternates bit 3 of the border byte and polls bit 4 of the AND of two CIA1 port reads before restoring the saved border and retrying. Bit 4 is Fire on both joystick ports, so the border flashes until Fire is pressed on either.

Resident scroll code saves two 39-byte colour rows in zero-page ranges $82–$A8 and $A9–$CF and restores them to shifted colour RAM ranges.

Resident $03–$22 is the 32-byte display-slot order array; $04 is an alias into it used for odd-position normalization.

Resident $27–$42 aliases the final 28 bytes of the display-slot Y cache. The vertical adjustment loops at $0D0A and $0DE9 index it with X from $1B down to 0.

At the left map boundary, $109D patches the immediate SBC operand at $10A9 with ($108E - 7) modulo 256. The carry from that first subtraction feeds the player X subtraction, but $1082 stores only sums of 8 or more at $108E, so it never borrows and the player moves left by exactly ($108E - 7). Player X is then clamped to $001C when its high byte is zero and its low byte is below $1C, and $4D6A is set to 7.

The stage-record callback at $47FC uses the high operand byte at $47FE, patched from record field 6. On return it reloads X from $7B, calls $46D6 when $4753,X is negative, sets $7A to $FF and selects $479B or $3384 according to $0840.

The contact handler at $76B2 saves X and Y in the immediate operands at $76C1 and $76C3, sets bit $08 in the selected player flags and calls $77E2 with A=5. It restores the saved registers before jumping to $4454.

The 26 bytes at $4013 contain four signed displacement sequences ending in zero: -10 through 0, -6 through 0, -4 through 0 and -2 through 0. The $3FB6 motion routine adds nonzero entries to $4D39 modulo 256 and advances the phase; zero sets the fall-phase bit.

The helper at $2938 writes A to VIC $D021 and $D015; $293F writes A to $D018 and jumps to $7BE1. The entry points $2945 and $294B both call $2951 before tail-jumping to $1779 and $1848 respectively.

The meter writer at $6FD5 stores A to eight addresses spaced three bytes apart, from $C400+X through $C415+X.

For stage selector 1, the immediate operand at $2A91 selects the path that stores ($2A34 OR $10) at $93C3 and copies 72 bytes from $2A35–$2A7C to $CCD0–$CD17. The stage selector is patched at $7A9A.

The indexed display-slot flags at $4CEF feed sprite horizontal expansion: the paths at $1732 and $1809 use bit 0 to update the selected bit of VIC $D01D. The annotated first 24 bytes end at $4D06; indexed accesses can address beyond this range.

The fragment at $50EF is copied to RAM $D900–$D917 by the loop at $6CF5. The fragment at $5107 is copied to RAM $D940–$D957 by the descending loop at $6CE9; the alternate initialization loop clears that destination.

The candidate scan at $09C5 checks 17 entity slots in descending order. It accepts only types $01–$20 with a nonzero first display-slot byte, returning X as the entity slot, Y as that byte and carry set; if none match it returns X=$FF and carry clear.

The top and bottom scroll tile loops patch immediate operands at $3009 and $2F2E to preserve each tile index across their first table lookup. Both write a two-byte pair, advance the output column by two and increment the source pointer with page carry.

The entity fall-state update at $44C7 calls $44DE and stores 1 on carry set. On carry clear it increments the returned Y, undoing that increment only when the result equals 9, then stores it at $1A7E,X. An input of 8 stays 8, while 9 or more is still incremented and 255 wraps to 0.

The visual resource wrapper at $7119 calls $7130, sets CPU port $01 to $30, copies 80 bytes from $C808–$C857 to underlying RAM $D7B0–$D7FF, sets $01 to $35 and returns.

The first and fifth message-panel rows at $4EE4 and $4F3C each contain 22 screen codes and are copied to $C00E and $C0AE respectively. Character interpretation depends on the selected character set.

The message display copies 22-byte rows to $C036–$C04B, $C05E–$C073 and $C086–$C09B. The regular and alternate panel paths use different source buffers.

The regular message-panel colour rows at $4F52 and $4F68 are copied to five colour-RAM rows. The alternate panel uses screen rows at $5050, $5066 and $507C and colour rows at $5092 and $50A8; $5092 also supplies a screen fill byte.

The 22 bytes at $243F are the high-byte companion to the built-in sound voice pointer lows at $2429. The $2294 path copies a selected low and high byte to $2227,Y and $2228,Y.

The 22 message pointer high bytes at $564C pair with lows at $5636; nonzero message numbers are decremented to form the index. The message text buffers at $4EFB, $4F11 and $4F27 each contain 20 character positions followed by a $40 border byte. The regular panel writes its first screen row to $C00E–$C023.

The unscrolled downward movement at $0D56 compares ($49 + $4DB4) modulo 256 against ($4D69 + $C2) modulo 256, using the patched operand at $0D6B. At or above the limit it stores the limit and clears $4DB3, $4DB6 and $4D55; otherwise it stores the proposed Y and leaves $4DB6 as $FF.

The frame wait at $3C2A calls the message-panel copy when $5275 is zero, then polls $526C until it is at least 3 and clears that counter.

The stage-record setup at $47E4 patches the callback high byte from $4765,X, subtracts 2 from $4753,X modulo 256, saves X at $7B and passes $4759,X as X to $7119.

The status HUD copy at $3783 reads 22 bytes from each of ten rows stored 21 bytes apart: five screen rows and five colour rows. Consequently consecutive reads share one source byte; the final colour read reaches the alternate-panel data at $5050.

Seven 20-byte status graphics at $5127–$51B2 are selected through split pointer tables at $51B3/$51BA and copied by $4A90 in five rows of four. `test_resident_status_graphic.js` checks all seven pointers and the 140 copied screen codes.

The display fields based at $4C2F, $4C4F, $4C6F, $4C8F, $4CAF, $4CCF and $4CEF are 32 bytes apart. Existing interior labels identify aliases within those fields. `test_resident_sprite_registers.js` drives all 32 indexes through both sprite emitters for X, flags, pointer and colour.

The helper at $2A7D clamps its returned Y to 4 without changing the entity state byte. $2A87 writes $4F to element zero of $4777 before returning the indexed element in Y. $2B75 copies three record bytes and patches $7AE3 before tail-jumping to $7A9A. With decimal mode clear, $3020 returns and stores ((5*old $526D + 1) modulo 256) XOR $4B0D. The transition sound wrapper at $7BE1 decrements a nonzero immediate counter and calls $2201; zero resets it to 6 and skips the call. `test_resident_small_state_helpers.js` checks all five.

The parallel entity arrays from $1919 through $1B5A are spaced 17 bytes apart. The ten-byte record copier supplies type, base frame, world coordinates, two display attributes, flags and a parameter; it clears the four display-slot indexes. The other fields hold screen coordinates, frames and runtime state. The per-type working fields at $1AB1–$1B38 have handler-specific meanings, with concrete load-25 readers identified in their descriptions.

The coverage count excludes zero-page runtime variables, the entity arrays at $1919–$1B5A, the display arrays at $4C2F–$4D0E and generated buffers at $C000–$C7FF. The listing carries no bytes for the last three ranges. Record initialization, display builders, screen copying, meter generation and transition context storage supply their later values. Their descriptions remain in the listing; exclusion identifies runtime state and generated output rather than authored program data.

The split contact table at $754E/$7560 has 18 entries, selected by the modulo-256 negation of an entity type. `test_contact_dispatch_tables.js` checks all 18 targets through the dispatch at $7536, the register-restoring message handlers and the middle-byte BCD carry. The status-colour suffixes at $4FFE and $5013 are read by the overlapping HUD copy at $3783 and partly updated by the item-status loop at $5326.

Nine IRQ setup paths write fixed target pairs to $5E/$5F: $030C and $3C17 set $3BB2, $0360, $17A5 and $1858 set $13EA, $1661 sets $16B7, $1771 sets $17B0, $3BBF sets $3BCF and $3BF8 sets $3C0A. Six split call-target paths patch JSR operands from indexed fields or tables, at $0778, $2036, $204E, $47FC, $5EAC and $68E5; `test_resident_irq_and_call_patches.js` checks eight of the IRQ targets and the operands of the last four JSRs. Entity fields $1A18,X and $1A6D,X supply a callback low/high pair at $68D9/$68DF, while other paths use those fields for a display colour or contact health. Their meanings therefore depend on the entity path.
