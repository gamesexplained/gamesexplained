# Load 27 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 27's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 27's map has 15 rows of 82 cells, stored 128 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8DF1`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 27's sound pointers at `$7F58–$7F5D` select voice lists at `$AA6D`, `$AA75` and `$AA7D`, whose records name six distinct patterns: `$AA85`, `$AABB`, `$AB0B`, `$AB3E`, `$AB8E` and `$ABD6`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names twelve six-byte trigger records at `$8FD6` (count at `$7F54`) and three sixteen-byte stage-object records at `$901E` (count at `$7F57`). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions. Eleven trigger records lie on row 13, at columns 81, 74, 71, 68, 65, 57, 54, 51, 48, 14 and 3, and name the resident callback `$72AB`, which puts the record's count back each time it runs; the twelfth, at column 2 of row 7, has a count of 3 and names `$5C2A`, which places a hidden coin with the argument `$10`. Stage-object records 1 and 2 name the shop's item entry `$90A8` in their bytes 10 and 11: record 1 has a zero byte 4, so that its byte 5 selects the items from the selected player's `$4DD5` (the boots), and record 2 names items `$15` and `$16` (8 bombs and tornado magic) in its bytes 4 and 5. Record 3 names the alternate update loop `$073F`, the initializer `$904E` and the result callback `$90A1`.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$8FA1`, inside the eight-page character source at `$8DF1`. The character source runs to `$95F0`, so it also takes in the gate pattern, the trigger and stage-object records, the initializer `$904E` and its message, the result callback `$90A1`, the shop code from `$90A5` and the first part of the shop's message bank.

The update entry at `$8FA1` stores 9 in `$4DCB,X` for the selected player and sets the horizontal-motion gate `$E1`. If both `$4DB6` and `$4DB3` are zero, it takes the next value of the six-byte pattern `$FF`, 0, 0, `$FF`, 0, 0 at `$8FD0`, advancing the index at `$8FCF`, which wraps 6 to 0; otherwise it writes `$FF` and leaves the index unchanged. The two resident speed-update paths at `$0E58` and `$0FF2` return early on a zero gate, so while both bytes are zero they run one call in three. Afterward this entry jumps to `$0200`.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 1,782 input bytes to `$EB40–$FBBF` and 6,215 to `$7EDF–$B10C`. The second stream's end marker is the file's last byte.

The load's type-$0D entity vector selects a dispatcher at `$ADBA`, whose five state-table pairs point to `$ADD7`, `$ADE1`, `$AE62`, `$AEC4` and `$AEE7`. The type's own code stores only 0 to 4 in its state. It is load 8's type-$0D handler, moved.

Type-$0D state 0 at `$ADD7` sets `$1AD3,X` to `$32`, selects state 1 and falls through. State 3 at `$AEC4` counts down and computes a sign-dependent frame. State 4 at `$AEE7` counts down too; when the count goes negative it calls `$4454` on the slot held in `$1B17,X`, the type-$25 shot that state 1 last spawned, when that byte is nonzero, then calls `$4B0E` with A=`$50` and jumps to `$5DB9`.

The type-$0D event helper at `$AF03` calls `$792C` and `$732A`. On set carry from `$732A` it selects state 3 when `$1A6D,X` is positive, or state 4 otherwise, then removes its own return address and returns past the calling handler. On clear carry it returns normally, or tail-calls `$5D7A` with A=3 when `$7227` returns carry set.

Type-$0D state 1 at `$ADE1` counts down, can select state 2, and, when `$1B28,X` is zero and `$3020` returns a negative value, takes a free slot from `$190B` and makes it a type-$25 shot. State 2 at `$AE62` uses a signed direction and a callback result to choose between state 0 and frame updates.

Load 27 has four LDX/LDY pairs that load a message record's address with a call or jump to `$77E0` a few bytes later; they name `$908D`, `$959F`, `$9461` and `$9483`. Another ten pairs load a record's address and jump to `$91A8`, `$9288` or `$9395`, each of which calls `$77E0`. `$77E0` copies each of the record's three zero-terminated lines into the message buffers, turning spaces into glyph zero. Glyph `$60`, a downward-pointing triangle, is the marker that the resident routine at `$6DDE` blinks while it waits for Fire.
The item-message selector at `$93E4` multiplies A by eight and adds 6, and passes the pointer at bytes 6 and 7 of that row of the item table at `$97AB` to `$77E0`. The table's 24 rows name 21 distinct three-line records, the item names among them.

The price selector at `$9350` sends the first two bytes of an eight-byte item row to `$7901` as a packed-decimal amount. `$7901` subtracts it from the selected player's gold when there is enough; otherwise it restores the balance and returns carry clear. Item 4 selects the Winged Boots message and costs 30.

The two pointer pairs at offsets 2–5 of each item row are operands for subroutine calls. Three selectors copy them into JSR instructions: `$9220`/`$9226` and `$9238`/`$923E` from offsets 2 and 3, and `$937E`/`$9384` from offsets 4 and 5.

The offset-4 targets are routines at `$986B`–`$98D0`. They call the helpers for Wing Boots, Helmet, Gauntlet or Revival Medicine, update one of the selected player's fields `$4DD5`, `$4DD9` and `$4DD7`, or pass fixed A/X pairs (0/5, 1/8, 3/3 and 2/5) to `$536F`. The `$4DD7` routine at `$9898` also calls the routine whose address the current stage-object record holds in its bytes 7 and 8, through the JSR it patches at `$98AF`.

The offset-2 targets are drawing routines at `$975F`–`$97A9`. Depending on the target, they return or write a 4-by-3 or 4-by-4 block of consecutive tile bytes using a 40-byte row stride.

The purchase path at `$9345` buys the first item (`$945A`) when the incoming `$9455` is negative and the second (`$945B`) otherwise. It charges the item's packed-decimal price through `$9350` and, with too little gold, goes back to the wait loop at `$9295`. On success it decrements `$4753,X`, takes the item's routine from row offsets 4 and 5, calls it with the item index plus 1, passes message `$9483` to `$77E0` and waits while `$4D6B` is nonzero.

The shop gate at `$931C` reads `$9454` first: when it is nonzero it passes `$9455` to the stage-price choice at `$9138`. Otherwise a nonzero `$9455` goes to the item purchase at `$9345`, and a zero `$9455` passes message `$94BE` to `$77E0` when `$4753,X` is negative or has bit 1 clear, or `$94A7` when bit 1 is set.

The shop input choice at `$92B9` tests active-low Fire, left and right in that order. Its direction handlers decrement or increment the mode byte at `$9455`; when the new mode is nonzero and `$9454` is zero they pass the item now chosen to the message selector `$93E4`, and both call the cursor helper `$93CC`.

The shop initializer at `$928B` sets the mode byte to 0 and its countdown to `$DC`. The left handler stops at `$FF` and the right handler at 1, and no other instruction writes `$9455`, so the mode stays among `$FF`, 0 and 1.

The shop wait paths at `$9295` and `$92A8` call `$3C2A`, which waits until the interrupt counter `$526C` reaches 3, and decrement the countdown, so from `$DC` the shop times out after 220 calls. The timeout at `$92C8` then jumps to `$91BF` when `$9454` is nonzero, or stores `$FF` in `$4753,X` and passes message `$9496`.

The load's type-$03 entity vector selects a dispatcher at `$AC50`, whose three state-table pairs point to `$AC68`, `$AD6D` and `$ADA7`. The type's own code stores only 0 to 2 in its state. It is load 1's type-$03 handler, moved.

Type-$03 state 1 at `$AD6D` chooses a movement callback by a signed field and updates two frames; when the first frame addition wraps to zero, it calls both movement callbacks. State 2 at `$ADA7` calls `$4B20` and `$5DB9` with A=2.

The type-$03 state-0 entry at `$AC68` can return immediately, select state 1 or 2 based on callback carry and a signed field, or continue to the movement path.

The type-$03 state-0 movement tail at `$AD23` reads a signed byte from a 40-byte table at `$AD45`, calls `$4342` for negative values or `$4368` otherwise, and advances the returned Y with an equality wrap at 40.

The type-$03 state-0 frame path at `$AC9F` uses carry returned by `$72FC` and the parity of `$1B28,X` to update `$1AD3,X` and two frame bytes.

The type-$03 horizontal calculation at `$ACF1` subtracts 6 from negative magnitudes but 5 from nonnegative values before deciding whether to call a movement routine. The difference comes from carry left clear by ADC 1 on the negative path.

The type-$25 entity dispatcher at `$B021` jumps through `$1AB1,X` to `$B037` or `$B09D`. The type's own code changes its state only at `$B0D7`, which stores 1. It is load 8's type-$25 handler, moved.

Type-$25 state 1 at `$B09D` increments `$1AC2,X` and computes `$19C3,X` from `$19E5,X` and twice the old value, unless `$1AC2,X` equals 2. In that case it decrements `$1B28` in the slot named by `$1AD3,X`, the type-$0D entity that spawned it, so that the entity can fire again, restores the original X through a patched immediate operand and jumps to `$4454`.

Type-$25 helper `$B0BF` calls `$792C` and `$1179`, then may call `$7227` and `$5D7A` with A=8. Its transition at `$B0C7` sets `$1AC2,X`=0, adds 2 to `$19E5,X` and sets `$1AB1,X`=1, then discards a return address. State 0 also jumps to the transition, where the discarded return address has a different caller.

Type-$25 state 0 at `$B037` decrements `$1B28,X`, which the type-$0D entity set to `$7F`, returns when `$1A29,X` is zero, and otherwise calls its event helper. A negative countdown jumps directly to the transition, which discards one return address. Otherwise it passes the four-bit direction `$1B17,X`, ORed with `$20`, to `$35C1`, first stepping it up or down at random through `$3020` when the countdown is odd. At countdown `$7E` it instead builds four parameters at `$35BD–$35C0` from the player's position and its own, calls `$34EA` and keeps the direction it returns in `$1B17,X` before calling `$35C1`.

The resident routine at `$34DD` passes the pointer at `$7F41` (`$8DF1`) to `$717C`, which copies 2,048 bytes from `$8DF1–$95F0` to RAM at `$D000–$D7FF` as the stage character set.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 38 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply the view origin, which `$33EC–$3408` replaces with the current view's left and top while `$6D17` redraws the screen and then restores.

The price formatter at `$9411` splits an item's two packed price bytes into four digit values at `$944F`–`$9452` and blanks leading zeros. The routine at `$93F6` then writes the four cells, each through the digit writer `$9408` with colour 1 in colour RAM.

Shop helper `$93B9` samples the inputs through `$3C4C` and returns carry set while Fire (`$70`), left (`$73`) or right (`$74`) is held. `$93CC` adds one to the mode `$9455`, takes the cursor position from `$9456` at that index and passes it to `$719E` with Y = `$82`.

The shop conditional-item resolver at `$93A4` changes item `$13` to `$14` when the selected player has flag `$10`; other inputs pass through.

Load 27 holds the same 34 message records as load 1, byte for byte, at `$9461–$975E`.

Load 27's split row-pointer tables hold 81 pairs, all 128 bytes apart from `$8671`, the last at `$AE71`; the map's 15 rows use the first 15. `test_later_row_pointer_tails.js` checks all pairs.

Stage-object record 3 at `$903E` names `$904E`, inside the character source, in its bytes 6 and 7, and the resident alternate update loop `$073F`, which the record names in bytes 10 and 11, calls it through the patched JSR at `$0778` with X the free slot that `$190B` found. It makes that slot a type-$20 entity (sprite base `$E3`, parameter `$78`, screen X `$00D2`, Y `$AD`) and passes message `$908D` ("Snow Cong!") to `$77E0`. `test_later_object_inits.js` checks its field writes and message pointer.

Stage-object record 3 at `$903E` names the result callback `$90A1` in its bytes 8 and 9; it returns A=`$00` with carry set. `test_later_object_results.js` checks the return.

The shop entry at `$90A5` jumps to `$90AB`, which writes the screen page plus one into `$940A` and `$9454`, formats the two stage prices from `$4783,X` and `$4789,X`, and branches on the selected player's balance and on `$4753,X`. `test_later_shop_entries.js` checks these paths. No stage-object record in this load names `$90A5`.

The shop choice code at `$9138` branches on incoming negative and zero flags, selects one of two stage prices, can reject insufficient balance, and follows either a stage callback or a message path before passing 4 or 8 to the meter routine and decrementing the stage field. `test_later_shop_choices.js` checks these paths. The shop timeout enters `$91BF` only when the layout gate `$9454` is nonzero, and only the price entry `$90A5`, which no record in this load names, makes it so. `$91BF` decrements `$4753,X` and passes message `$9560`.

The second shop entry at `$91CB` selects an item pair from explicit stage fields through the conditional-item resolver, or from a patched player-state read plus a table value. `test_later_shop_pairs.js` checks both paths for both players.

The shop drawing setup at `$9219` selects two pointer-table entries, calls the second and first item targets with A=`$E4` and `$D0`, and fills three rows of colour RAM. `test_later_shop_draw_setup.js` checks the target selection and colour writes.

The shop label code at `$9268` passes two selected item bytes to the formatter and calls the display routine with Y=`$73` and `$87`, then passes the choice prompt `$9461` to `$77E0`. `test_later_shop_labels.js` checks the call arguments.

28 of the 38 distinct handler addresses are one-byte RTS entries: `$AC4E–$AC4F`, `$ADB1–$ADB9`, `$AF50–$AF5B`, `$B01E–$B020` and `$B0EC–$B0ED`. 36 of the 48 types select one of them.

Load 27's type-$20 dispatcher at `$AF5C` jumps to `$B011` with A=8 when `$1A8F,X` is positive, which sets the frames `$19C3,X` and `$19D4,X` to `$19E5,X` plus 8 and plus 10 and returns. When `$1A8F,X` is zero or negative it calls `$B009` and jumps through its one-entry table to state 0 at `$AF7F`. No code of type `$20` writes the state `$1AB1,X`, which `$447A` cleared before the record initializer `$904E` made the entity.

The high-memory output also holds three sprite slots whose 63 picture bytes are all zero: `$D6` at `$F580`, `$D8` at `$F600` and `$DA` at `$F680`. They are the blank multicolour layers of frames `$D5`, `$D7` and `$D9`, which the type-$25 shot shows: the type-$0D entity spawns it with frame `$D5`, and its transition and state 1 then show `$D7` and `$D9`.

The byte at `$B0EB`, `$D0`, lies between the type-$25 event helper, whose last instruction is the `JMP $B0C7` at `$B0E8`, and the type-$26 return at `$B0EC`. No instruction in load 27 or the resident part names it or reaches it through an index of up to 64.
