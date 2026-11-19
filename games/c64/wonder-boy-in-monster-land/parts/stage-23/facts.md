# Load 23 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 23's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 23's map has 16 rows of 66 cells, stored 105 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8D01`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 23's sound pointers at `$7F58–$7F5D` select voice lists at `$AE4A`, `$AE52` and `$AE5A`, whose records name six distinct patterns: `$AE62`, `$AE98`, `$AEE8`, `$AF1B`, `$AF6B` and `$AFB3`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names two six-byte trigger records at `$94FE` (count at `$7F54`) and three sixteen-byte stage-object records at `$952D` (count at `$7F57`). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions. Trigger record 1 (column 28, row 9) names the resident callback `$72AB`, which puts the record's count back each time it runs; record 2 (column 7, row 11, count 1) names `$950A`. Stage-object record 2 names the shop entry `$955E` in its bytes 10 and 11, the stage prices 8 and 5 in bytes 8 and 9, and the RTS at `$955D` as both its message callbacks, in bytes 4–7. Records 1 and 3 name the shop's second entry `$9561`; their zero byte 4 makes it take the items from the selected player's `$4DD7` (record 1, the shields) or `$4DD9` (record 3, the armour), as byte 5 selects. Record 1's bytes 7 and 8 also hold `$9D8A`, the routine that the shield purchase calls.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$94E9`, inside the eight-page character source at `$8D01`. The code there stores 8 in `$4DCB,X` for the selected player and jumps to `$0732`, which loads the next part, when `$6F3C` is `$40`, otherwise to `$0200`. The character source runs to `$9500`, so it also takes in the first three bytes of trigger record 1.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 1,570 input bytes to `$EB40–$FBBF` and 7,505 to `$7EDF–$B4DE`. The decoder stops at the second stream's end marker, 69 bytes before the end of the file.

The load's type-$01 and type-$16 entity vectors select a dispatcher at `$B076`, whose three state-table pairs point to `$B08E`, `$B0F3` and `$B12A`. The type's own code stores only 0 to 2 in its state. It is load 2's type-$01 handler, moved.

Type-$01 state 1 at `$B0F3` returns to state 0 when `$1A8F,X` is zero; otherwise it calls `$45BC` or `$4574` according to `$1B28,X` and updates the frame. State 2 at `$B12A` decrements `$1B17,X`, uses the same frame update when the result is nonzero, and calls `$4B0E` before jumping to `$5DB9` when it is zero.

Type-$01 state 0 at `$B08E` can select state 1 or 2 based on carry from `$732A` and the sign of `$1A6D,X`. Its other active paths update `$1AD3,X`, `$1AE4,X` and a frame byte and set `$1A7E,X` if clear; when `$1A29,X` is zero it only sets that flag if clear.

Load 23 has four LDX/LDY pairs that load a message record's address with a call or jump to `$77E0` a few bytes later; they name `$9517`, `$9A58`, `$991A` and `$993C`. Another ten pairs load a record's address and jump to `$9661`, `$9741` or `$984E`, each of which calls `$77E0`. `$77E0` copies each of the record's three zero-terminated lines into the message buffers, turning spaces into glyph zero. Glyph `$60`, a downward-pointing triangle, is the marker that the resident routine at `$6DDE` blinks while it waits for Fire.
The item-message selector at `$989D` multiplies A by eight and adds 6, and passes the pointer at bytes 6 and 7 of that row of the item table at `$9C64` to `$77E0`. The table's 24 rows name 21 distinct three-line records, the item names among them.

The price selector at `$9809` sends the first two bytes of an eight-byte item row to `$7901` as a packed-decimal amount. `$7901` subtracts it from the selected player's gold when there is enough; otherwise it restores the balance and returns carry clear. Item 4 selects the Winged Boots message and costs 30.

The two pointer pairs at offsets 2–5 of each item row are operands for subroutine calls. Three selectors copy them into JSR instructions: `$96D9`/`$96DF` and `$96F1`/`$96F7` from offsets 2 and 3, and `$9837`/`$983D` from offsets 4 and 5.

The offset-4 targets are routines at `$9D24`–`$9D89`. They call the helpers for Wing Boots, Helmet, Gauntlet or Revival Medicine, update one of the selected player's fields `$4DD5`, `$4DD9` and `$4DD7`, or pass fixed A/X pairs (0/5, 1/8, 3/3 and 2/5) to `$536F`. The `$4DD7` routine at `$9D51` also calls the routine whose address the current stage-object record holds in its bytes 7 and 8, through the JSR it patches at `$9D68`.

The offset-2 targets are drawing routines at `$9C18`–`$9C62`. Depending on the target, they return or write a 4-by-3 or 4-by-4 block of consecutive tile bytes using a 40-byte row stride.

The purchase path at `$97FE` buys the first item (`$9913`) when the incoming `$990E` is negative and the second (`$9914`) otherwise. It charges the item's packed-decimal price through `$9809` and, with too little gold, goes back to the wait loop at `$974E`. On success it decrements `$4753,X`, takes the item's routine from row offsets 4 and 5, calls it with the item index plus 1, passes message `$993C` to `$77E0` and waits while `$4D6B` is nonzero.

The shop gate at `$97D5` reads `$990D` first: when it is nonzero it passes `$990E` to the stage-price choice at `$95F1`. Otherwise a nonzero `$990E` goes to the item purchase at `$97FE`, and a zero `$990E` passes message `$9977` to `$77E0` when `$4753,X` is negative or has bit 1 clear, or `$9960` when bit 1 is set.

The shop input choice at `$9772` tests active-low Fire, left and right in that order. Its direction handlers decrement or increment the mode byte at `$990E`; when the new mode is nonzero and `$990D` is zero they pass the item now chosen to the message selector `$989D`, and both call the cursor helper `$9885`.

The shop initializer at `$9744` sets the mode byte to 0 and its countdown to `$DC`. The left handler stops at `$FF` and the right handler at 1, and no other instruction writes `$990E`, so the mode stays among `$FF`, 0 and 1.

The shop wait paths at `$974E` and `$9761` call `$3C2A`, which waits until the interrupt counter `$526C` reaches 3, and decrement the countdown, so from `$DC` the shop times out after 220 calls. The timeout at `$9781` then jumps to `$9678` when `$990D` is nonzero, or stores `$FF` in `$4753,X` and passes message `$994F`.

The type-$26 entity dispatcher at `$B3DE` jumps through `$1AB1,X` to `$B3F4` or `$B471`. The type's own code changes its state only at `$B437`, from 0 to 1, and the type-$11 spawn helper makes each type-$26 entity after `$447A` has cleared the slot's state, so it starts at 0.

Type-$26 state 1 at `$B471` calls `$792C` and `$1179` and may call `$7227` and `$5D7A`, then decrements `$1AC2,X`. A nonnegative result subtracts 2 from `$19C3,X`; a negative result decrements `$1B28` in the slot named by `$1AD3,X`, the type-$11 entity that made it, restores the original X through a patched immediate operand and jumps to `$4454`.

Type-$26 state 0 at `$B3F4` calls `$792C` and `$1179` and enters the transition at `$B425` when `$1179` returns carry set; otherwise it calls `$7227`, and on carry set calls `$5D7A` with A=8 and enters the transition. Otherwise a positive `$1AC2,X` is passed to `$4342` and decremented; zero (replaced by `$80`) or a negative value passes its low seven bits to `$44DE`, and carry set from `$44DE` also enters the transition, which sets `$1AC2,X` to 2, the frame to `$AB`, `$1A07,X` to 7 and the state to 1. On the other paths `$1AC2,X` counts up to `$88` after a `$44DE` call, and while `$1AF5,X` is nonzero the entity moves sideways through `$45BC` or `$4574` by the sign of `$1AE4,X`, reversing on carry; `$1AF5,X` counts down once every three passes.

The type-$11 entity vector selects a dispatcher at `$B148`, whose six state-table pairs point to `$B166`, `$B1F9`, `$B29B`, `$B2E7`, `$B326` and `$B349`. The type's own code stores only 0 to 5 in its state. It is load 12's type-$11 handler, moved.

Type-$11 state 4 at `$B326` decrements `$1AC2,X` and copies `$1AE4,X` to the state when the result is negative or when the movement callback, `$4574` or `$45BC` by the carry from `$72FC`, returns a value whose bits 1–2 are not 2.

Type-$11 state 5 at `$B349` decrements `$1AC2,X`. A negative result calls `$4B0E` with A=`$60` and jumps to `$5DB9`; otherwise it reads the four frame offsets 6, 6, 8, 8 at `$B3CD` by `$1AD3,X`, sets `$19C3,X` through `$B371` and advances `$1AD3,X`, wrapping at 4. The event helper clears `$1AD3,X` when it selects state 5.

Type-$11 helper `$B381` copies `$1B17,X` to `$B3C7` and calls `$792C` and `$732A`. Carry set from `$732A` selects state 4 for positive `$1A6D,X` or state 5 otherwise, sets `$1AC2,X` to 10 and discards one return address; the positive path also saves the previous state in `$1AE4,X` and sets the frame, and the other clears `$1AD3,X`. Carry clear calls `$7227` and may tail-jump to `$5D7A` with A=4.

Type-$11 states 2 and 3 at `$B29B` and `$B2E7` call the event helper, set the frame from the four offsets 2, 2, 4, 4 at `$B3C9` by `$1AF5,X`, which wraps at 4 and which state 0 clears before selecting state 2, then decrement `$1AD3,X` and move by 4 through `$4574` or `$45BC`. A negative countdown or a callback result with bits 1–2 other than 2 triggers a transition: state 2 loads the timer from a patchable immediate byte (`$FF` in the load, set to 10 by state 0's far path), toggles bit 7 of `$1B17,X` and selects state 3; state 3 selects state 0.

Type-$11 state 1 at `$B1F9` calls its event helper, counts down `$1AF5,X` and uses `$1B06,X` to choose a movement callback, a spawn call or the return to state 0.

The type-$11 spawn helper at `$B237` calls `$190B` and returns if carry is clear. On carry set it calls `$447A`, copies the position from slot Y into slot X, initializes a type-$26 entity, stores the parent's slot in its `$1AD3` and sets `$1B28,Y`=1 before returning with X restored from Y.

Type-$11 state 0 at `$B166` selects state 1 when the X that `$71DB` returns differs from `$6F3C` by less than 20 and `$1B28,X` is zero, and state 2 otherwise, unless `$1A29,X` is zero. Its state-2 path sets `$1AD3,X`=10 and patches the immediate byte used by a later state-2 transition to 10.

The resident routine at `$34DD` passes the pointer at `$7F41` (`$8D01`) to `$717C`, which copies 2,048 bytes from `$8D01–$9500` to RAM at `$D000–$D7FF` as the stage character set.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 38 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply the view origin, which `$33EC–$3408` replaces with the current view's left and top while `$6D17` redraws the screen and then restores.

The price formatter at `$98CA` splits an item's two packed price bytes into four digit values at `$9908`–`$990B` and blanks leading zeros. The routine at `$98AF` then writes the four cells, each through the digit writer `$98C1` with colour 1 in colour RAM.

Shop helper `$9872` samples the inputs through `$3C4C` and returns carry set while Fire (`$70`), left (`$73`) or right (`$74`) is held. `$9885` adds one to the mode `$990E`, takes the cursor position from `$990F` at that index and passes it to `$719E` with Y = `$82`.

The shop conditional-item resolver at `$985D` changes item `$13` to `$14` when the selected player has flag `$10`; other inputs pass through.

Load 23 holds the same 34 message records as load 1, byte for byte, at `$991A–$9C17`.

Stage-object record 1 holds `$9D8A` in its bytes 7 and 8, and the shield purchase routine `$9D51` calls it through the JSR it patches at `$9D68`. It sets the processor port `$01` to `$30`, so that the RAM beneath I/O shows, copies ten blocks of player sprite rows from `$9E05–$9F54` into the sprite slots `$66–$73` at `$D98F–$DCF5`, the first two blocks three times each, calls `$2086` seven times to mirror the slot pairs `$66/$67` to `$72/$73` into `$74/$75` to `$80/$81`, and sets `$01` back to `$35`.

Load 23's split row-pointer tables hold 81 pairs, all 105 bytes apart from `$8671`, the last at `$A741`; the map's 16 rows use the first 16. `test_later_row_pointer_tails.js` checks all pairs.

Trigger record 2 at `$9504` (column 7, row 11, count 1) names `$950A`, which the dispatcher `$48BF` enters with the record's index, 1, in X. The routine stores X at `$9514`, the opcode of the `LDX #$FF` there rather than its operand, passes `$9517` ("DANGER! KEEP OUT") to `$77E0`, and then runs the changed bytes, which now read `ORA ($FF,X)`. `$77E0` returns with X=0, the length of the record's empty third line, and A=`$20`, its control byte, so the instruction ORs A with the byte that the pointer at `$FF`/`$00` addresses and the routine returns without restoring X. The callback returns to the dispatcher's caller, whose next call, `$4A43`, sets A and X before it reads them, so nothing depends on the slip. `test_stage23_trigger_opcode.js` checks the store and the instruction it makes.

The shop entry at `$955E` jumps to `$9564`, which writes the screen page plus one into `$98C3` and `$990D`, formats the two stage prices from `$4783,X` and `$4789,X`, and branches on the selected player's balance and on `$4753,X`. `test_later_shop_entries.js` checks these paths.

The shop choice code at `$95F1` branches on incoming negative and zero flags, selects one of two stage prices, can reject insufficient balance, and follows either a stage callback or a message path before passing 4 or 8 to the meter routine and decrementing the stage field. `test_later_shop_choices.js` checks these paths. The shop timeout enters `$9678`, which decrements `$4753,X` and passes message `$9A19`.

The second shop entry at `$9684` selects an item pair from explicit stage fields through the conditional-item resolver, or from a patched player-state read plus a table value. `test_later_shop_pairs.js` checks both paths for both players.

The shop drawing setup at `$96D2` selects two pointer-table entries, calls the second and first item targets with A=`$E4` and `$D0`, and fills three rows of colour RAM. `test_later_shop_draw_setup.js` checks the target selection and colour writes.

The shop label code at `$9721` passes two selected item bytes to the formatter and calls the display routine with Y=`$73` and `$87`, then passes the choice prompt `$991A` to `$77E0`. `test_later_shop_labels.js` checks the call arguments.

29 of the 38 distinct handler addresses are one-byte RTS entries: `$B139–$B147`, `$B3D1–$B3DD` and `$B4A1`. 36 of the 48 types select one of them.

The byte at `$955D` is an RTS. Stage-object record 2 at `$953D` holds its address twice, in bytes 4 and 5 and in bytes 6 and 7; the record loader copies them to `$476B`/`$4771` and `$4777`/`$477D`, and the shop's two price paths patch them into the calls at `$9612` and `$9653`, so both message callbacks of that record return at once.
