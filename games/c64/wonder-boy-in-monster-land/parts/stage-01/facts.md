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
