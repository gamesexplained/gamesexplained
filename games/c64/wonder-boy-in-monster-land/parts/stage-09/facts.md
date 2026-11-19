# Load 9 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 9's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 9's map has 16 rows of 67 cells, stored 67 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8AA1`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 9's sound pointers at `$7F58–$7F5D` select voice lists at `$B7BD`, `$B7C5` and `$B7CD`, whose records name six distinct patterns: `$B7D5`, `$B815`, `$B868`, `$B8A7`, `$B8FA` and `$B929`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names five six-byte trigger records at `$92D9` (count at `$7F54`) and five sixteen-byte stage-object records at `$9394` (count at `$7F57`). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$9279`, inside the eight-page character source at `$8AA1`. The code there stores 4 in `$4DCB,X` for the selected player and jumps to `$0732` when `$6F3C` is 9 and `$6F3D` is `$0E`, otherwise to `$0200`.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 1,268 input bytes to `$EB40–$F9BF` and 9,218 to `$7EDF–$BD7C`. The decoder stops at the second stream's end marker, 182 bytes before the end of the file.

The load's type-$0D entity vector selects a dispatcher at `$B97F`, whose five state-table pairs point to `$B99C`, `$B9A6`, `$BA27`, `$BA89` and `$BAAC`. The type's own code stores only 0 to 4 in its state. It is load 8's type-$0D handler, moved.

Type-$0D state 0 at `$B99C` sets `$1AD3,X` to `$32`, selects state 1 and falls through. State 3 at `$BA89` counts down and computes a sign-dependent frame, while state 4 at `$BAAC` can call `$4454` for the child slot saved in `$1B17,X` before calling `$4B0E` and `$5DB9`.

The type-$0D event helper at `$BAC8` selects state 3 or 4 on set carry from `$732A`, then removes its own return address and returns past the calling handler. On clear carry it returns normally or tail-calls `$5D7A`.

Type-$0D state 1 at `$B9A6` counts down, can select state 2, and can allocate another slot and make it a type-$25 entity at the same position. State 2 at `$BA27` uses a signed direction and a callback result to choose between state 0 and frame updates.

Load 9 has 15 LDX/LDY pairs that load a message record's address with a call or jump to `$77E0` a few bytes later; they name `$932E`, `$9366`, `$93F2`, `$9420`, `$9437`, `$951E`, `$9553`, `$9586`, `$95B5`, `$9C89`, `$9B4B`, `$9B6D`, `$A118`, `$A103` and `$A14D`. Another 13 pairs load a record's address and jump to a shared `JSR $77E0` at `$9972`, `$9A7F` and `$A0EB`. `$77E0` copies each of the record's three zero-terminated lines into the message buffers, turning spaces into glyph zero. Glyph `$60`, a downward-pointing triangle, is the marker that the resident routine at `$6DDE` blinks while it waits for Fire.
The item-message selector at `$9ACE` multiplies A by eight and adds 6, and passes the pointer at bytes 6 and 7 of that row of the item table at `$9E95` to `$77E0`. The table's 24 rows name 21 distinct three-line records, the item names among them.

The price selector at `$9A3A` sends the first two bytes of an eight-byte item row to `$7901` as a packed-decimal amount. `$7901` subtracts it from the selected player's gold when there is enough; otherwise it restores the balance and returns carry clear. Item 4 selects the Winged Boots message and costs 30.

The two pointer pairs at offsets 2–5 of each item row are operands for subroutine calls. Three selectors copy them into JSR instructions: `$990A`/`$9910` and `$9922`/`$9928` from offsets 2 and 3, and `$9A68`/`$9A6E` from offsets 4 and 5.

The offset-4 targets are routines at `$9F55`–`$9FBA`. They call the helpers for Wing Boots, Helmet, Gauntlet or Revival Medicine, update one of the selected player's fields `$4DD5`, `$4DD9` and `$4DD7`, or pass fixed A/X pairs (0/5, 1/8, 3/3 and 2/5) to `$536F`.

The offset-2 targets are drawing routines at `$9E49`–`$9E93`. Depending on the target, they return or write a 4-by-3 or 4-by-4 block of consecutive tile bytes using a 40-byte row stride.

The purchase path at `$9A2F` buys the first item (`$9B44`) when the incoming `$9B3F` is negative and the second (`$9B45`) otherwise. It charges the item's packed-decimal price through `$9A3A` and, with too little gold, goes back to the wait loop at `$997F`. On success it decrements `$4753,X`, takes the item's routine from row offsets 4 and 5, calls it with the item index plus 1, passes message `$9B6D` to `$77E0` and waits while `$4D6B` is nonzero.

The shop gate at `$9A06` reads `$9B3E` first: when it is nonzero it passes `$9B3F` to the stage-price choice at `$9822`. Otherwise a nonzero `$9B3F` goes to the item purchase at `$9A2F`, and a zero `$9B3F` passes message `$9BA8` to `$77E0` when `$4753,X` is negative or has bit 1 clear, or `$9B91` when bit 1 is set.

The shop input choice at `$99A3` tests active-low Fire, left and right in that order. Its direction handlers decrement or increment the mode byte at `$9B3F`; when the new mode is nonzero and `$9B3E` is zero they pass the item now chosen to the message selector `$9ACE`, and both call the cursor helper `$9AB6`.

The shop initializer at `$9975` sets the mode byte to 0 and its countdown to `$DC`. The left handler stops at `$FF` and the right handler at 1, and no other instruction writes `$9B3F`, so the mode stays among `$FF`, 0 and 1.

The shop wait paths at `$997F` and `$9992` call `$3C2A`, which waits until the interrupt counter `$526C` reaches 3, and decrement the countdown, so from `$DC` the shop times out after 220 calls. The timeout at `$99B2` then jumps to `$98A9` when `$9B3E` is nonzero, or stores `$FF` in `$4753,X` and passes message `$9B80`.

The type-$0E entity vector selects a dispatcher at `$BB15`, whose six state-table pairs point to `$BB33`, `$BB53`, `$BB80`, `$BB97`, `$BBCD` and `$BBEB`. The type's own code stores only 0 to 5 in its state.

Type-$0E state 4 at `$BBCD` counts down and either selects state 0 or calls a sign-selected movement routine. State 5 at `$BBEB` counts down and can call `$4B0E` and `$5DB9`.

Type-$0E state 1 at `$BB53` chooses a movement callback by the sign of `$1B28,X` and either updates a frame or sets a timer, increments the state, updates the frame and reverses direction.

Type-$0E states 2 and 3 at `$BB80` and `$BB97` update `$1AD3,X` and select the next state or a shared frame update; state 2 moves on when its count reaches zero, and state 3 counts up to 8.

Type-$0E state 0 at `$BB33` uses values returned by `$71DB` and compares `$6F3C` against the returned X to choose `$FA` or 0, then advances state and updates a frame. Its movement helper at `$BBBA` chooses a callback by the sign of `$1B28,X` and reverses it on carry.

The type-$0E shared collision check at `$BC0E` can return normally, tail-call `$5D7A`, or select state 4 or 5 and discard its own return address so the calling handler returns immediately.

The type-$25 entity dispatcher at `$BC87` jumps through `$1AB1,X` to `$BC9D` or `$BD03`. The type's own code stores only 1 in its state, at `$BD3D`, and a new type-$25 entity starts at state 0.

Type-$25 state 1 at `$BD03` increments `$1AC2,X` and computes `$19C3,X` from `$19E5,X` and twice the old value, unless `$1AC2,X` equals 2. In that case it decrements `$1B28` in the slot named by `$1AD3,X`, restores the original X through a patched immediate operand and jumps to `$4454`.

Type-$25 helper `$BD25` calls `$792C` and `$1179`, then may call `$7227` and `$5D7A`. Its transition at `$BD2D` sets `$1AC2,X`=0, adds 2 to `$19E5,X` and sets `$1AB1,X`=1, then discards a return address. State 0 also jumps to the transition directly when its countdown goes negative; there the address it discards is the return to `$2039` pushed by the resident JSR at `$2036`, so its RTS leaves the entity loop `$1FC3` early, skipping the remaining slots and the record load at `$3622` for that pass.

Type-$25 state 0 at `$BC9D` decrements `$1B28,X`, checks `$1A29,X` and calls its event helper. A negative countdown jumps directly to the transition. Other paths update a four-bit phase through `$3020` and `$35C1`, or at countdown `$7E` build four parameters at `$35BD–$35C0` before calling `$34EA` and `$35C1`.

The resident routine at `$34DD` passes the pointer at `$7F41` (`$8AA1`) to `$717C`, which copies 2,048 bytes from `$8AA1–$92A0` to RAM at `$D000–$D7FF` as the stage character set.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 38 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply view-origin values that the code at `$33F7–$3408` later changes.

Stage-object record 4 at `$93C4` names the counter panel `$9FBB` in its bytes 10 and 11. The panel first patches the page byte of its character writer at `$A0FA` with the screen page plus one, then writes four character cells and their colours.

The counter panel at `$9FBB` displays a byte-derived value, checks the selected player's balance shifted right four bits and the meter state, and chooses one of four message paths.

The panel then waits in two input loops. In the first, Fire takes the first choice at `$A0BB` and right moves the cursor to the second; in the second, Fire takes the second choice at `$A09F` and left returns to the cursor setup at `$A062`.

The completion path at `$A0BB` charges the selected player through `$7889`, converts the meter to score through `$6097`, sets the hourglass countdown `$4B0D` to `$8C` and redraws the hourglass, increments the player's count at `$528C`, stores `$FF` in `$4753,X` and waits on message `$A14D`.

Seven message records serve this panel: `$A103`, `$A118`, `$A12F`, `$A14D`, `$A160`, `$A170` and `$A184`. They keep the game's spelling and punctuation.

The price formatter at `$9AFB` splits an item's two packed price bytes into four digit values at `$9B39`–`$9B3C` and blanks leading zeros. The routine at `$9AE0` then writes the four cells, each through the digit writer `$9AF2` with colour 1 in colour RAM.

Shop helper `$9AA3` samples the inputs through `$3C4C` and returns carry set while Fire (`$70`), left (`$73`) or right (`$74`) is held. `$9AB6` adds one to the mode `$9B3F`, takes the cursor position from `$9B40` at that index and passes it to `$719E` with Y = `$82`.

The shop conditional-item resolver at `$9A8E` changes item `$13` to `$14` when the selected player has flag `$10`; other inputs pass through.

Load 9 holds the same 34 message records as load 1, byte for byte, at `$9B4B–$9E48`.

The graphics setup at `$95C4` is load 2's `$AD0E`, moved: it sets `$01` to `$30`, copies ten source blocks of player sprite rows into RAM beneath I/O (two of them to three places each), calls the mirror routine `$2086` seven times from X = `$66` and Y = `$74`, and sets `$01` back to `$35`.

Load 9's split row-pointer tables hold 81 pairs, all 67 bytes apart from `$8671`, the last at `$9B61`; the map's 16 rows use the first 16. `test_later_row_pointer_tails.js` checks all pairs.

Load 9 holds two motion entries, `$9295` and `$92B7`. Each points `$54/$55` at a 23-byte stream (`$92A0` and `$92C2`) and jumps to the repeating-motion reader `$6A3A`. None of the load's entity records is a moving platform, and no instruction or record in the load names either entry. `later-motion-streams.json` holds the decoded sequences.

Stage-object record 2 at `$93A4` names the message callback `$9430` in its bytes 6 and 7, and `$9430` passes `$9437` to `$77E0`. `test_later_object_messages.js` checks the pointer.

Trigger record 2 at `$92DF` names the message callback `$9359`, which passes `$9366` to `$77E0` and restores X through the operand it patches at `$9364`. `test_later_trigger_messages.js` checks the pointer and X.

Trigger record 1 at `$92D9` (column 43, row 6, count 255) names the callback `$92F7`. It copies the countdown at `$932D`, 1 in the load, to the border colour `$D020` and decrements it until it is zero. Then, unless `$7227` already holds `$18`, it writes `CLC; RTS` over the entry of the resident player-contact routine `$7227`, so that routine always reports no contact, sets the selected player's meter current and limit to `$50`, calls the player-flag-$10 setter `$76E4`, and displays message `$932E`. `test_stage09_trigger.js` checks the paths.

The shop entry at `$978F` jumps to `$9795`, which writes the screen page plus one into `$9AF4` and `$9B3E`, formats the two stage prices from `$4783,X` and `$4789,X`, and branches on the selected player's balance and on `$4753,X`. `test_later_shop_entries.js` checks these paths.

The shop choice code at `$9822` branches on incoming negative and zero flags, selects one of two stage prices, can reject insufficient balance, and follows either a stage callback or a message path before passing 4 or 8 to the meter routine and decrementing the stage field. `test_later_shop_choices.js` checks these paths.

The second shop entry at `$98B5` selects an item pair from explicit stage fields through the conditional-item resolver, or from a patched player-state read plus a table value. `test_later_shop_pairs.js` checks both paths for both players.

The shop drawing setup at `$9903` selects two pointer-table entries, calls the second and first item targets with A=`$E4` and `$D0`, and fills three rows of colour RAM. `test_later_shop_draw_setup.js` checks the target selection and colour writes.

The shop label code at `$9952` passes two selected item bytes to the formatter and calls the display routine with Y=`$73` and `$87`, then passes the choice prompt `$9B4B` to `$77E0`. `test_later_shop_labels.js` checks the call arguments.

29 of the 38 distinct handler addresses are one-byte RTS entries: `$B973–$B97E`, `$BC78–$BC86` and `$BD52`, `$BD53`. 36 of the 48 types select one of them.

The routine at `$94A0` calls `$77E0` and `$77E2`, then copies 72 bytes, nine eight-byte characters, from `$94D6` to `$CCD0–$CD17`, and three three-byte colour tables to `$5023`, `$5038` and `$504D`.

Stage-object record 1 at `$9394` names the callback `$9465` in its bytes 10 and 11. It tests the low three bits of `$4DE2,Y`, changes a matching value from 1 to 2 and shows four messages (`$951E`, `$9553`, `$9586` and `$95B5`) before the block copy; other values call `$77E2` twice.

No instruction in load 9, load 1 or the resident part names the byte at `$BD51` (`$00`), between the type-$25 helper and the RTS entries. What it is for is unknown.
