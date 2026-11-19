# Load 20 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 20's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 20's map has 14 rows of 95 cells, stored 115 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8CBB`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 20's sound pointers at `$7F58–$7F5D` select voice lists at `$B8BB`, `$B8C3` and `$B8CB`, whose records name six distinct patterns: `$B8D3`, `$B909`, `$B959`, `$B98C`, `$B9DC` and `$BA24`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names four six-byte trigger records at `$937E` (count at `$7F54`) and six sixteen-byte stage-object records at `$939C` (count at `$7F57`). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions. Trigger record 1 (column 0, row 10) names `$9396`, which writes 0 to `$BF1F`; the other three, at columns 61 to 63 of row 5, name the resident callback `$72AB`. Stage-object records 1 and 2 name the shop's second entry `$954C` in their bytes 10 and 11; record 2 names the items `$13` and `$17` in bytes 4 and 5, while record 1's zeros there make the entry take its items from the selected player's `$4DD5`. Record 3 names the shop entry `$9549`, the stage prices 13 and 5 and the message callbacks `$93FC` and `$9451`; record 4 names the counter panel `$9D75`; record 5 names `$948A`, the result callback `$94E1` and the resident alternate update loop `$073F`; record 6 names `$94E5`, which writes `$FF` to `$BF1F` and raises the slot limit `$4DBA`, so that the entity record there, a moving platform, is taken in.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$936B`, inside the eight-page character source at `$8CBB`. The code there stores 7 in `$4DCB,X` for the selected player and jumps to `$0732` when `$6F3D` is zero, otherwise to `$0200`. The character source runs to `$94BA`, so it also takes in the trigger and stage-object records, the trigger callback `$9396` and the object callbacks from `$93FC` on.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 1,996 input bytes to `$EB40–$FFBF` and 8,743 to `$7EDF–$BF33`. The decoder stops at the second stream's end marker, 183 bytes before the end of the file.

The load's type-$01 and type-$16 entity vectors select a dispatcher at `$BA9C`, whose three state-table pairs point to `$BAB4`, `$BB19` and `$BB50`. The type's own code stores only 0 to 2 in its state. It is load 2's type-$01 handler, moved.

Type-$01 state 1 at `$BB19` returns to state 0 when `$1A8F,X` is zero; otherwise it calls `$45BC` or `$4574` according to `$1B28,X` and updates the frame. State 2 at `$BB50` decrements `$1B17,X`, uses the same frame update when the result is nonzero, and calls `$4B0E` before jumping to `$5DB9` when it is zero.

Type-$01 state 0 at `$BAB4` can select state 1 or 2 based on carry from `$732A` and the sign of `$1A6D,X`. Its other active paths update `$1AD3,X`, `$1AE4,X` and a frame byte and set `$1A7E,X` if clear; when `$1A29,X` is zero it only sets that flag if clear.

Load 20 has twelve LDX/LDY pairs that load an address with a call or jump to `$77E0` a few bytes later. Eleven name message records: `$940A`, `$943A`, `$9458`, `$94CB`, `$9508`, `$9535`, `$9A43`, `$9905`, `$9927`, `$9EBD` and `$9F07`; the twelfth, at `$9501`, passes `$0000`, with which `$77E0` clears the message. Another 15 pairs load a record's address and jump to `$964C`, `$972C`, `$9839`, `$9E19` or `$9EA5`, each of which calls `$77E0`. `$77E0` copies each of the record's three zero-terminated lines into the message buffers, turning spaces into glyph zero. Glyph `$60`, a downward-pointing triangle, is the marker that the resident routine at `$6DDE` blinks while it waits for Fire.
The item-message selector at `$9888` multiplies A by eight and adds 6, and passes the pointer at bytes 6 and 7 of that row of the item table at `$9C4F` to `$77E0`. The table's 24 rows name 21 distinct three-line records, the item names among them.

The price selector at `$97F4` sends the first two bytes of an eight-byte item row to `$7901` as a packed-decimal amount. `$7901` subtracts it from the selected player's gold when there is enough; otherwise it restores the balance and returns carry clear. Item 4 selects the Winged Boots message and costs 30.

The two pointer pairs at offsets 2–5 of each item row are operands for subroutine calls. Three selectors copy them into JSR instructions: `$96C4`/`$96CA` and `$96DC`/`$96E2` from offsets 2 and 3, and `$9822`/`$9828` from offsets 4 and 5.

The offset-4 targets are routines at `$9D0F`–`$9D74`. They call the helpers for Wing Boots, Helmet, Gauntlet or Revival Medicine, update one of the selected player's fields `$4DD5`, `$4DD9` and `$4DD7`, or pass fixed A/X pairs (0/5, 1/8, 3/3 and 2/5) to `$536F`.

The offset-2 targets are drawing routines at `$9C03`–`$9C4D`. Depending on the target, they return or write a 4-by-3 or 4-by-4 block of consecutive tile bytes using a 40-byte row stride.

The visual-resource tables at `$7F82–$7FCE` select metatile definitions, compressed screen data, character colours, character-copy sources and colour values, from which `$7119` builds a 40-by-20-character screen. For load 20's selectors 1–6 the character sources are `$9F67`, `$A47A`, `$A68D`, `$B5DA`, `$AACB` and `$AFBB`; selector 4's eight pages from `$B5DA` also take in the type-$1B handler's code up to `$BDD9`. The Graphics page reconstructs these and other screens in multicolour character mode using the copied glyphs and colour data. `test_visual_resources.js` runs the loader from the listings and checks all six load-20 selections, among others.

The purchase path at `$97E9` buys the first item (`$98FE`) when the incoming `$98F9` is negative and the second (`$98FF`) otherwise. It charges the item's packed-decimal price through `$97F4` and, with too little gold, goes back to the wait loop at `$9739`. On success it decrements `$4753,X`, takes the item's routine from row offsets 4 and 5, calls it with the item index plus 1, passes message `$9927` to `$77E0` and waits while `$4D6B` is nonzero.

The shop gate at `$97C0` reads `$98F8` first: when it is nonzero it passes `$98F9` to the stage-price choice at `$95DC`. Otherwise a nonzero `$98F9` goes to the item purchase at `$97E9`, and a zero `$98F9` passes message `$9962` to `$77E0` when `$4753,X` is negative or has bit 1 clear, or `$994B` when bit 1 is set.

The shop input choice at `$975D` tests active-low Fire, left and right in that order. Its direction handlers decrement or increment the mode byte at `$98F9`; when the new mode is nonzero and `$98F8` is zero they pass the item now chosen to the message selector `$9888`, and both call the cursor helper `$9870`.

The shop initializer at `$972F` sets the mode byte to 0 and its countdown to `$DC`. The left handler stops at `$FF` and the right handler at 1, and no other instruction writes `$98F9`, so the mode stays among `$FF`, 0 and 1.

The shop wait paths at `$9739` and `$974C` call `$3C2A`, which waits until the interrupt counter `$526C` reaches 3, and decrement the countdown, so from `$DC` the shop times out after 220 calls. The timeout at `$976C` then jumps to `$9663` when `$98F8` is nonzero, or stores `$FF` in `$4753,X` and passes message `$993A`.

The type-$0E and type-$18 entity vectors select a dispatcher at `$BB6B`, whose six state-table pairs point to `$BB89`, `$BBA9`, `$BBD6`, `$BBED`, `$BC23` and `$BC41`. The type's own code stores only 0 to 5 in its state. It is load 9's type-$0E handler, moved; load 11 holds it too.

Type-$0E state 4 at `$BC23` counts down and either selects state 0 or calls a sign-selected movement routine. State 5 at `$BC41` counts down and can call `$4B0E` and `$5DB9`.

Type-$0E state 1 at `$BBA9` chooses a movement callback by the sign of `$1B28,X` and either updates a frame or sets a timer, increments the state, updates the frame and reverses direction.

Type-$0E states 2 and 3 at `$BBD6` and `$BBED` update `$1AD3,X` and select the next state or a shared frame update; state 2 moves on when its count reaches zero, and state 3 counts up to 8.

Type-$0E state 0 at `$BB89` uses values returned by `$71DB` and compares `$6F3C` against the returned X to choose `$FA` or 0, then advances state and updates a frame. Its movement helper at `$BC10` chooses a callback by the sign of `$1B28,X` and reverses it on carry.

The type-$0E shared collision check at `$BC64` can return normally, tail-call `$5D7A`, or select state 4 or 5 and discard its own return address so the calling handler returns immediately.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 39 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply the view origin, which `$33EC–$3408` replaces with the current view's left and top while `$6D17` redraws the screen and then restores.

Stage-object record 4 at `$93CC` names the counter panel `$9D75` in its bytes 10 and 11. The panel first patches the page byte of its character writer at `$9EB4` with the screen page plus one, then writes four character cells and their colours.

The counter panel at `$9D75` writes the two digits of the selected player's price byte `$9F5F,X`, compares the player's gold, shifted right four bits, with that price and the meter `$4DCD` with its limit `$4DCF`, and chooses one of four messages: "Sorry, but you short of money." (`$9F3E`) or "You are O.K." (`$9F2A`), each after decrementing the stage field `$4753,X`, or the prompt "Next, Please." (`$9EBD`) or "Wow, how nice guy!" (`$9ED2`) by bit 1 of `$4753,X`.

The panel then waits in two input loops. In the first, Fire takes the first choice at `$9E75` and right moves the cursor to the second; in the second, Fire takes the second choice at `$9E59` and left returns to the cursor setup at `$9E1C`.

The completion path at `$9E75` charges the selected player through `$7889`, converts the meter to score through `$6097`, sets the hourglass countdown `$4B0D` to `$8C` and redraws the hourglass, increments the player's count at `$528C`, stores `$FF` in `$4753,X` and waits on message `$9F07`.

Seven message records serve this panel: `$9EBD`, `$9ED2`, `$9EE9`, `$9F07`, `$9F1A`, `$9F2A` and `$9F3E`. They keep the game's spelling and punctuation.

The price formatter at `$98B5` splits an item's two packed price bytes into four digit values at `$98F3`–`$98F6` and blanks leading zeros. The routine at `$989A` then writes the four cells, each through the digit writer `$98AC` with colour 1 in colour RAM.

Shop helper `$985D` samples the inputs through `$3C4C` and returns carry set while Fire (`$70`), left (`$73`) or right (`$74`) is held. `$9870` adds one to the mode `$98F9`, takes the cursor position from `$98FA` at that index and passes it to `$719E` with Y = `$82`.

The shop conditional-item resolver at `$9848` changes item `$13` to `$14` when the selected player has flag `$10`; other inputs pass through.

Load 20 holds the same 34 message records as load 1, byte for byte, at `$9905–$9C02`.

Load 20's split row-pointer tables hold 81 pairs, all 115 bytes apart from `$8671`, the last at `$AA61`; the map's 14 rows use the first 14. `test_later_row_pointer_tails.js` checks all pairs.

Load-20 entry `$BEC1` passes the encoded stream at `$BECC` to the resident repeating-motion reader `$6A3A`, which yields 58 values before resetting. The entity record at `$BF1F` names the entry in its bytes 7 and 9; it becomes a moving platform when `$94E5` writes `$FF` to its type byte, and `$9396` writes 0 there again. `test_later_motion_streams.js` checks the decoded sequence.

Stage-object record 5 at `$93DC` names `$948A`, inside the character source, in its bytes 6 and 7, and the resident alternate update loop `$073F`, which the record names in bytes 10 and 11, calls it through the patched JSR at `$0778` with X the free slot that `$190B` found. It makes that slot a type-$1B entity (sprite base `$D3`, parameter `$24`, screen X `$00D2`, Y `$78`) and passes message `$94CB` ("Gold Collector.") to `$77E0`. `test_later_object_inits.js` checks its field writes and message pointer.

Stage-object record 3 at `$93BC` names the message callback `$9451` in its bytes 6 and 7, and the shop's first-price path calls it through a patched JSR, once, since it clears the high byte first. `$9451` passes `$9458` ("Earning the Magic Ruby will surely be helpful.") to `$77E0`. `test_later_object_messages.js` checks the pointer.

Stage-object record 5 at `$93DC` names the result callback `$94E1` in its bytes 8 and 9; it returns A=`$0A` with carry clear. `test_later_object_results.js` checks the return.

The shop entry at `$9549` jumps to `$954F`, which writes the screen page plus one into `$98AE` and `$98F8`, formats the two stage prices from `$4783,X` and `$4789,X`, and branches on the selected player's balance and on `$4753,X`. `test_later_shop_entries.js` checks these paths.

The shop choice code at `$95DC` branches on incoming negative and zero flags, selects one of two stage prices, can reject insufficient balance, and follows either a stage callback or a message path before passing 4 or 8 to the meter routine and decrementing the stage field. `test_later_shop_choices.js` checks these paths. The shop timeout enters `$9663`, which decrements `$4753,X` and passes message `$9A04`.

The second shop entry at `$966F` selects an item pair from explicit stage fields through the conditional-item resolver, or from a patched player-state read plus a table value. `test_later_shop_pairs.js` checks both paths for both players.

The shop drawing setup at `$96BD` selects two pointer-table entries, calls the second and first item targets with A=`$E4` and `$D0`, and fills three rows of colour RAM. `test_later_shop_draw_setup.js` checks the target selection and colour writes.

The shop label code at `$970C` passes two selected item bytes to the formatter and calls the display routine with Y=`$73` and `$87`, then passes the choice prompt `$9905` to `$77E0`. `test_later_shop_labels.js` checks the call arguments.

29 of the 39 distinct handler addresses are one-byte RTS entries: `$BB5F–$BB6A`, `$BCCE–$BCD4` and `$BEB7–$BEC0`. 34 of the 48 types select one of them.

The type-$2A vector selects `$BE8D`, which moves the entity up 8 through `$4342` and sets its frame from twice `$1AB1,X`. Once `$19A1,X` is below `$40` it jumps to `$4454`; otherwise it advances `$1AB1,X` from 0 to 3 and back to 0. Type-$1B state 0 makes these entities at `$BD43`.

The type-$1B dispatcher at `$BCD5` jumps through three table pairs to `$BCED`, `$BE49` and `$BE83`; the type's own code stores only 0, 1 and 2 in its state. Its code and table lie in the eight pages that visual selector 4 copies as characters from `$B5DA`.

Type-$1B state 1 at `$BE49` returns to state 0 when `$1A8F,X` is zero; otherwise it selects a movement path by the sign of `$1AC2,X`. A negative path whose addition of 16 to `$19E5,X` produces zero falls through to the other movement call.

When a type-$1B entity has touched and damaged the player and the selected player has at least 5 gold, `$BD35` takes 5 gold through `$78D1` and calls `$190B` and `$447A` without testing the allocator's carry before making the slot a type-$2A entity at the player. When all 17 slots are in use `$190B` returns X=`$FF`, so each store lands `$FF` bytes past its array: `STA $1919,X` writes `$2A` to `$1A18`, a byte of entity slot 0.

The type-$1B motion routine at `$BDFF` reads 40 signed values at `$BE21` by `$1AE4,X`, moves the entity up for negative values and down otherwise, and resets its incremented index on equality with 40. `$4494` clears the index when the slot is set up, so it stays below 40.

Type-$1B state 0 begins at `$BCED` and selects return, state change, contact or allocation paths. Its code lies in the eight pages that visual selector 4 copies as characters from `$B5DA`.

The type-$1B animation at `$BD7B` adjusts phase and frame fields using a callback carry and counter parity. Its movement tail at `$BDCD` uses asymmetric positive and negative thresholds because the negative path subtracts with carry clear.

