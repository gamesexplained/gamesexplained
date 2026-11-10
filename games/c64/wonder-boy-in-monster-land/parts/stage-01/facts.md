# First load — verified technical facts

### Opening messages

The first-load snapshot contains a welcome message at `$92A0` and quest messages at `$9493`, `$94B7`, `$94F0` and `$9520`. Each has three zero-terminated fields followed by `$FF`; the resident message routine at `$77E2` copies the fields to its buffers and waits for Fire on that control byte. The fields include the game's spelling “The countrys fate / despends on you.” The first-load code supplies these records to the resident message routine; their presence alone does not establish a natural route to every message.

### Map tiles

The resident loop at `$6D41–$6D63` reads a map byte as an index into four 256-byte tables at `$81CF`, `$82CF`, `$83CF` and `$84CF`. It writes their values into the top-left, top-right, bottom-left and bottom-right positions of a two-by-two character block; the lower row is 40 screen cells after the upper. The movement checks at `$0C57`, `$0EB8` and `$1051` use the map byte as an index into the attribute table at `$80CF`: downward movement tests bits 0–1 and horizontal movement tests bit 1. The meanings of every attribute combination remain open.

The title-to-play route calls `$AFC7`, which copies six 128-byte sprite-pair blocks from `$ACC7–$AFC6` to slots in VIC bank 3, then calls the resident mirror routine `$2086` seven times. A VICE execution stop at `$2086` with X=`$66` and Y=`$74` showed a return address from the call at `$AFFB`. The first source pair matches the underlying RAM at `$D980/$D9C0` in the second-load play capture and, after mirroring, produces the pair displayed at the player’s captured position. Those RAM copies and the mirrored output are accounted for through the first-load source, rather than counted again as resident data.

The first load holds eight sound patterns at `$B03D–$B16F`, selected by records in the three voice lists at `$B017–$B03C`. Each captured block has nonzero event bytes followed by a zero; the resident sequencer interprets them using voice and tick state. The sound-pattern test checks the boundaries and pointers against the listing.

The title initializer at `$0256–$025E` passes `$B5C4` to `$717C`, which copies eight pages to `$D000–$D7FF` with I/O banked out. The first 1,216 source bytes exactly match the earlier resident-entry RAM at `$D000–$D4BF`. The screen template beginning at `$BA84` overlaps the second half of the source. `test_title_copy.js` checks the full eight-page copy and the captured first-1,216-byte hash against the listing.

All twelve 63-byte bitmap portions of the six source pairs match the corresponding resident-entry RAM copies. The 64th byte of each slot differs in that earlier snapshot, so only the bitmap portions are excluded as duplicates; their source blocks remain counted in the first load. The copying routine writes all 128 bytes of each pair during title-to-play initialization.

The first captured entity state at $B188 selects reaction states on collision or updates a timer and frame on the movement path. The frame calculation propagates the carry from its first addition into the second. VICE checked six forced paths, including that carry, with collision, overlap and damage callbacks stubbed. Callback effects, index bounds and ordinary-play reachability remain open.

The first captured entity reaction paths at $B1ED and $B224 select movement, animate a frame or finish a countdown. VICE checked five forced cases with movement, score and dispatch callbacks stubbed. Callback effects, index bounds and ordinary-play reachability remain open.

The second captured entity normal state at $B24B handles collision, player contact, a signed timer, movement and frame selection. VICE checked eight forced paths with collision, overlap, damage and movement callbacks stubbed. Callback effects, index bounds and ordinary-play reachability remain open.

The second captured entity reaction and exit paths at $B315 and $B34F update direction, frames and countdowns. VICE checked six forced cases with movement, score and dispatch callbacks stubbed. Callback effects, index bounds and ordinary-play reachability remain open.

The third captured entity normal state at $B389 handles collision, heading, animation and a signed wave table. Negative and nonnegative horizontal speeds subtract six and five respectively before movement. VICE checked ten forced cases, including both threshold directions and wave wrap, with callbacks stubbed. Callback effects, index bounds and ordinary-play reachability remain open.

The third captured entity reaction at $B48E calls the right-movement path after the left path if its first frame sum wraps to zero. VICE checked five forced reaction and exit cases with movement, score and dispatch callbacks stubbed. Callback effects and ordinary-play reachability remain open.

The first-load payment screen compares the selected player’s two-byte balance with the record’s second amount byte and chooses a prompt or an insufficient-balance message using record field 3. Five forced VICE paths and a listing test check selection with rendering and slot deletion stubbed. Ordinary-play reachability and callback effects remain open.

First-load setup at $93BA initializes player and entity fields and copies graphics into RAM beneath I/O, with two 15-byte patches and six nine-byte tails. VICE checked two forced flag values and the resulting copies with sprite-link, mirror and message callbacks stubbed; a listing test repeats the checks. Callback effects and ordinary-play reachability remain open.

First-load item layout at $A63F sets 24 colour cells in two groups, then calls price extraction and drawing for two selected item IDs. VICE checked the colours and call sequence with price callbacks stubbed; a listing test repeats the case. Callback effects and ordinary-play reachability remain open.

First-load item input uses one 220-frame timeout across release and polling. It tests confirmation before left and right, and left before right. VICE checked five forced timeout and control paths with frame, input and display callbacks stubbed; a listing test also checks simultaneous controls. Callback effects and natural reachability remain open.

First-load left and right selection handlers move among the usual $FF, 0 and 1 states, optionally requesting the first or second item description when the layout selector is zero. Eight forced VICE cases and a listing test check the transitions with description and cursor callbacks stubbed. Other input values and natural reachability remain open.

First-load item confirmation selects messages from the stage-record flags or selects an item record by index sign. On a successful payment result it decrements the record field and calls the selected item effect with ID plus one. Seven forced VICE cases and a listing test check the branches with payment and effect callbacks stubbed. The callbacks and natural reachability remain open.

Controlled visual-resource selections copied 171 additional eight-byte character patterns from their captured sources. VICE checked each copy and recorded no instruction entry into the selected bytes during 200 frames of captured play; a listing test repeats the copies. Display use, other possible code uses and ordinary-play reachability remain open.

First-load initializer $92FB fills an entity slot with fixed type, frame, attributes and coordinates before passing message pointer $933C to the message routine. VICE and a listing test checked two forced entity indexes. Index bounds, message callback effects and ordinary-play reachability remain open.

62 conditional sprite slots retain the same 64 captured bytes in entry and play snapshots; VICE matched each slot. Their descriptions identify the 63-byte shape, occupied rows, set-bit count and remaining slot byte. The selection paths remain conditional and other possible uses remain open.

First-load price formatter $A807 splits two packed bytes into four nibble-plus-one display values and replaces leading ones with zero. VICE and a listing test checked five forced values, including non-decimal nibbles. The four 63-byte setup sprite sources were checked through the previously tested setup copies; other uses remain open.

The first load contains 34 three-field shop and item message records at $A857–$AB54, followed individually by control bytes. The decoded records retain the game’s spelling and punctuation; VICE checked their captured bytes and a listing test decodes every field. Ordinary-play selection of each record remains open.

First-load item effects $AC61–$ACAA call four resident player-flag setters or write one of three selected-player attributes, then enter slot disable. The last attribute entry patches and calls a record-supplied callback. Seven forced VICE cases and a listing test check the flags, counters, wrapped subtraction and callback dispatch, stopping before slot disable and stubbing the record callback. Natural reachability remains open.

Four first-load item-push entries pass fixed type and quantity pairs to $536F. VICE and a listing test checked all four argument pairs, stopping before the destination routine. The second 54-byte setup graphics source and its three destinations are covered by the setup-copy test. Natural reachability and other uses remain open.

First-load item drawing entries at $AB56–$AB9F write a four-by-three or four-by-four block of consecutive character values with 40-byte row stride. Five controlled VICE calls and a listing test checked the entry-specific values and destinations. Other arguments and ordinary-play reachability remain open.

First-load payment options either select a default message or call a record-supplied one-shot callback, then add 4 or 8 to the player meter and decrement the record field. The second option also checks the player balance before proceeding. Six forced VICE cases and a listing test check the selection with payment, message and meter callbacks stubbed. Callback effects and natural reachability remain open.

First-load payment display $A504 formats a packed byte into the last two of four character positions and restores X after the draw call. Four forced VICE cases and a listing test checked the values and saved register with drawing stubbed. The adjacent option dispatcher branches on the selection sign; its cases are checked by the payment-option test. Natural reachability remains open.

The first-load second and third voice lists contain one and ten pattern pointers respectively before their zero-low-byte terminators. VICE checked the captured bytes and a listing test checks the pointer sequences. Runtime voice state and natural playback remain separate.

The first-load item-pair initializer either uses record-supplied IDs or derives consecutive IDs from selected-player state and a lookup. Conditional ID $13 becomes $14 when player flag $10 is set. Four forced VICE cases and a listing test checked these choices; drawing and ordinary-play reachability remain separate.

First-load item-result message handling calls the display routine and waits while the message countdown is nonzero, updating the HUD each frame. A controlled VICE case and a listing test checked a two-frame wait with display, frame and HUD callbacks stubbed. Actual callback effects and natural reachability remain open.

First-load item controls return carry set when any of the three sampled input bytes is zero. The cursor routine indexes its position table with the selection index plus one. Eight forced VICE cases and a listing test check the carry and three usual cursor positions with input sampling stubbed and display initialization stopped. Physical input mapping and other indexes remain open.

First-load item description code selects the message pointer from the item record, while its price writer converts four display bytes and writes corresponding character and colour cells. VICE and a listing test checked a forced pointer and a four-digit draw. Bounds, other display values and ordinary-play reachability remain open.

The first-load visual tables contain seven split-byte pointers each for metatile definitions, screen streams, colour lookups and character sources. VICE checked the captured pointer values; listing tests check both values and loader reads. The two setup sprite patches and the drawing-store operand are covered by the setup and record-draw tests. Selector bounds, other data uses and ordinary-play reachability remain open.

First-load motion stream $924C produces 44 values and resets to the start, including two 13-value runs. VICE and a listing test checked 45 successive decoder outputs using a forced entity slot. Other callers and ordinary-play reachability remain open.

The first-load stage header selects three 16-byte records at $92CB–$92FA. VICE and a listing test checked the loader’s twelve parallel fields and final four scratch bytes with map writing stubbed. Subsequent mutations, map effects and ordinary-play reachability remain open.

The first-load entity stream at $B4EF contains six ten-byte records before a zero byte; its captured initial limit is five. Six forced VICE calls and a listing test checked each record’s copy into the entity arrays. The first record also overlaps dispatch targets whose executable role remains unresolved.

First-load welcome handling saves and restores X around a message call; a neighboring entry returns carry set and A=9, and another jumps to a second message. Three VICE calls and a listing test check these entries with message display stubbed or stopped. The six nine-byte setup graphics tails are covered by the setup-copy test. Natural reachability and callback effects remain open.
