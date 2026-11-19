# Load 30 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 30's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 30's map has 14 rows of 99 cells, stored 128 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8D71`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 30's sound pointers at `$7F58–$7F5D` select voice lists at `$B16E`, `$B176` and `$B17E`, whose records name six distinct patterns: `$B186`, `$B1BC`, `$B20C`, `$B23F`, `$B28F` and `$B2D7`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names two six-byte trigger records at `$92A4` (count at `$7F54`) and four sixteen-byte stage-object records at `$935F` (count at `$7F57`). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions. Both trigger records lie on row 11 with a count of 1: at column 4 the message callback `$92B0`, and at column 93 the resident routine `$7960`. The stage-object records name, in their bytes 10 and 11, the shop's price entry `$A750` (record 1, with the prices `$28` and `$05` in bytes 8 and 9), the counter panel `$AF7C` (record 2), the alternate update loop `$073F` (record 3, with the initializer `$94AE` and the result callback `$9505`) and the quest step `$939F` (record 4).

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$9299`, inside the eight-page character source at `$8D71`, which runs to `$9570` and so also takes in the trigger and stage-object records, their callbacks and messages and the quest step `$939F`. The entry stores 16 in `$4DCB,X` for the selected player and jumps to `$0200`.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 1,866 input bytes to `$EB40–$F6BF` and 7,518 to `$7EDF–$B5F3`. The second stream's end marker is the file's last byte.

Load 30 has fourteen LDX/LDY pairs that load a message record's address with a call or jump to `$77E0` a few bytes later; they name `$92CB`, `$92FB`, `$932E`, `$944A`, `$9482`, `$94F0`, `$9517`, `$9543`, `$9561`, `$AC4A`, `$AB0C`, `$AB2E`, `$B0C4` and `$B10E`. Another fifteen pairs load a record's address and jump to `$A853`, `$A933`, `$AA40`, `$B020` or `$B0AC`, each of which calls `$77E0`. `$77E0` copies each of the record's three zero-terminated lines into the message buffers, turning spaces into glyph zero. Glyph `$60`, a downward-pointing triangle, is the marker that the resident routine at `$6DDE` blinks while it waits for Fire.
The item-message selector at `$AA8F` multiplies A by eight and adds 6, and passes the pointer at bytes 6 and 7 of that row of the item table at `$AE56` to `$77E0`. The table's 24 rows name 21 distinct three-line records, the item names among them.

The price selector at `$A9FB` sends the first two bytes of an eight-byte item row to `$7901` as a packed-decimal amount. `$7901` subtracts it from the selected player's gold when there is enough; otherwise it restores the balance and returns carry clear. Item 4 selects the Winged Boots message and costs 30.

The two pointer pairs at offsets 2–5 of each item row are operands for subroutine calls. Three selectors copy them into JSR instructions: `$A8CB`/`$A8D1` and `$A8E3`/`$A8E9` from offsets 2 and 3, and `$AA29`/`$AA2F` from offsets 4 and 5.

The offset-4 targets are routines at `$AF16`–`$AF7B`. They call the helpers for Wing Boots, Helmet, Gauntlet or Revival Medicine, update one of the selected player's fields `$4DD5`, `$4DD9` and `$4DD7`, or pass fixed A/X pairs (0/5, 1/8, 3/3 and 2/5) to `$536F`. The `$4DD7` routine at `$AF43` also calls the routine whose address the current stage-object record holds in its bytes 7 and 8, through the JSR it patches at `$AF5A`.

The offset-2 targets are drawing routines at `$AE0A`–`$AE54`. Depending on the target, they return or write a 4-by-3 or 4-by-4 block of consecutive tile bytes using a 40-byte row stride.

The purchase path at `$A9F0` buys the first item (`$AB05`) when the incoming `$AB00` is negative and the second (`$AB06`) otherwise. It charges the item's packed-decimal price through `$A9FB` and, with too little gold, goes back to the wait loop at `$A940`. On success it decrements `$4753,X`, takes the item's routine from row offsets 4 and 5, calls it with the item index plus 1, passes message `$AB2E` to `$77E0` and waits while `$4D6B` is nonzero.

The shop gate at `$A9C7` reads `$AAFF` first: when it is nonzero it passes `$AB00` to the stage-price choice at `$A7E3`. Otherwise a nonzero `$AB00` goes to the item purchase at `$A9F0`, and a zero `$AB00` passes message `$AB69` to `$77E0` when `$4753,X` is negative or has bit 1 clear, or `$AB52` when bit 1 is set.

The shop input choice at `$A964` tests active-low Fire, left and right in that order. Its direction handlers decrement or increment the mode byte at `$AB00`; when the new mode is nonzero and `$AAFF` is zero they pass the item now chosen to the message selector `$AA8F`, and both call the cursor helper `$AA77`.

The shop initializer at `$A936` sets the mode byte to 0 and its countdown to `$DC`. The left handler stops at `$FF` and the right handler at 1, and no other instruction writes `$AB00`, so the mode stays among `$FF`, 0 and 1.

The shop wait paths at `$A940` and `$A953` call `$3C2A`, which waits until the interrupt counter `$526C` reaches 3, and decrement the countdown, so from `$DC` the shop times out after 220 calls. The timeout at `$A973` then jumps to `$A86A` when `$AAFF` is nonzero, or stores `$FF` in `$4753,X` and passes message `$AB41`.

The type-$0B entity dispatcher at `$B359` calls `$B566` and then jumps through `$1AB1,X` to one of seven table targets: `$B37C`, `$B3A4`, `$B440`, `$B47E`, `$B4B9`, `$B4ED` and `$B523`. The type's own code stores only 1 to 6 in the state (1 at `$B3A1` and `$B4DA`, 2 at `$B43D`, 3 at `$B3EF`, 4 at `$B473`, 5 or 6 at `$B593`) and at `$B51F` restores the state the helper saved at `$B589`. The load's one type-$0B object is set up by `$94AE`, which stage record 3 at `$937F` names, and the alternate loop at `$073F` calls `$447A`, which clears the state, before it calls `$94AE`, so the object starts at state 0 and the index stays within the seven entries. It is load 6's type-$0B handler, moved.

The type-$0B preliminary helper at `$B566` rotates a working byte through carry from `$72FC` and copies it to `$1AC2,X`. With `$1A8F,X` zero, carry set from `$732A` selects state 5 for positive `$1A6D,X` or state 6 otherwise, before the dispatcher reads the state. Other paths call `$7227` and may tail-jump to `$5D7A` with A=4. The indexed write at `$B589` that saves the state uses the entity slot in X, 0 to 16, within the seventeen bytes at `$B5C1`.

Type-$0B state 5 decrements `$1B28,X` and either restores the state from an indexed working location or sets the two sprite frames `$19C3,X` and `$19D4,X` and tail-calls a direction-selected movement routine. State 6 decrements `$1AC2,X` and on a negative result calls `$4B20` with A=3 before jumping to `$5DB9` with A=2. On the pass that selects state 6 it decrements the 10 the helper has just stored there; on every later pass the helper has first overwritten `$1AC2,X` with the rotated direction byte.

Type-$0B state 4 decrements `$1AE4,X` and, if it becomes negative, sets the two sprite frames, selects state 1, sets a five-count delay and conditionally jumps according to `$3020`.

Type-$0B state 3 copies an indexed direction byte and handles positive, zero and negative `$1AE4,X` values through `$4342` or `$4368` before jumping to another handler path or tail-calling a direction-selected movement routine. The indexed direction byte at `$B5B0,X` is the one state 1 stores at `$B3EA` just before it selects state 3.

Type-$0B state 2 decrements `$1AF5,X`, tail-calls a direction-selected movement routine, or updates a second countdown and either reverses direction or selects state 4 and sets the two sprite frames.

Type-$0B state 0 sets `$1AD3,X` according to `$19F6,X`, initializes a direction and the two sprite frames, selects state 1 and falls through into it.

Type-$0B state 1 compares a direction-dependent difference, then may call a movement routine, select state 3, or enter a close-range branch that selects state 4 or initializes state 2 and falls through.

The resident routine at `$34DD` passes the pointer at `$7F41` (`$8D71`) to `$717C`, which copies 2,048 bytes from `$8D71–$9570` to RAM at `$D000–$D7FF` as the stage character set.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 38 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply the view origin, which `$33EC–$3408` replaces with the current view's left and top while `$6D17` redraws the screen and then restores.

The panel setup at `$AF7C`, which stage-object record 2 names in its bytes 10 and 11, sets the sound-control state to 7, clears `$4D6A`, patches the character writer at `$B0BB` with the screen page plus one, writes 0 to the four character cells at offsets `$95–$98` and then `$F6` at `$97`, each with colour 1.

The panel at `$AF7C` shows the price byte `$B166,X`, read with X the selected player, so `$02` or `$04` (tens of gold), and checks the player's gold shifted right four bits against it and the meter `$4DCD` against its limit `$4DCF`. It chooses one of four messages: `$B145` when the gold is short and `$B131` when the meter is full, both after decrementing `$4753,X`, or the prompt `$B0C4` or `$B0D9` by bit 1 of `$4753,X`.

The panel at `$AF7C` has two input loops that select a first or second path, or return to cursor setup: in the first, right moves the cursor to the second loop and Fire takes the first path at `$B07C`; in the second, left goes back and Fire takes the second path at `$B060`.

The panel completion path at `$B07C` takes the price `$B166,X` from the selected player's gold through `$7889` and calls `$6097`, sets `$4B0D` to `$8C` and `$4DD4` to 0, calls `$4A90` and `$370B`, increments the selected player's count `$528C,X`, stores `$FF` in the stage-record field `$4753,X` (X from `$7B`), passes message `$B10E` ("Take care.") to `$77E0` and then calls `$3C2A` and `$370B` until the message countdown `$4D6B` is zero.

The panel's paths select seven message records: `$B0C4` ("Next, Please."), `$B0D9` ("Wow, how nice guy!"), `$B0F0` ("Please come again tomorrow."), `$B10E` ("Take care."), `$B121`, `$B131` ("You are O.K.") and `$B145` ("Sorry, but you short of money.").

The price formatter at `$AABC` splits an item's two packed price bytes into four digit values at `$AAFA`–`$AAFD` and blanks leading zeros. The routine at `$AAA1` then writes the four cells, each through the digit writer `$AAB3` with colour 1 in colour RAM.

Shop helper `$AA64` samples the inputs through `$3C4C` and returns carry set while Fire (`$70`), left (`$73`) or right (`$74`) is held. `$AA77` adds one to the mode `$AB00`, takes the cursor position from `$AB01` at that index and passes it to `$719E` with Y = `$82`. The sampler at `$3C4C` reads joystick port 2 active-low into `$73` (left), `$74` (right) and `$70` (fire), and the cursor index, the selection byte plus one, stays 0 to 2 because the selection stays among `$FF`, 0 and 1.

The shop conditional-item resolver at `$AA4F` changes item `$13` to `$14` when the selected player has flag `$10`; other inputs pass through.

Load 30 holds the same 34 message records as load 1, byte for byte, at `$AB0C–$AE09`.

Load 30's split row-pointer tables hold 81 pairs, all 128 bytes apart from `$8671`, the last at `$AE71`; the map's 14 rows use the first 14. `test_later_row_pointer_tails.js` checks all pairs.

Stage-object record 3 at `$937F` names `$94AE`, inside the character source, in its bytes 6 and 7, and the resident alternate update loop `$073F`, which the record names in bytes 10 and 11, calls it through the patched JSR at `$0778` with X the free slot that `$190B` found. It makes that slot a type-$0B entity (sprite base `$B5`, parameter `$7F`, screen X `$00C8`, Y `$AE`) and passes message `$94F0` ("SILVER KNIGHT!") to `$77E0`. `test_later_object_inits.js` checks its field writes and message pointer.

Stage-object record 1 at `$935F` names `$9509` in its bytes 6 and 7; the shop's first-price path calls it once through the JSR it patches at `$A845`, and it passes `$9517`, then `$9543` to `$77E0` ("The red stone has the mysterious power to weaken the Dragon."). The record's bytes 4 and 5 name `$955A`, which the second-price path calls the same way at `$A804`, and which passes message `$9561` ("Yow! Am I having fun yet?"). `test_later_object_messages.js` checks the pointer sequence.

Stage-object record 3 at `$937F` names the result callback `$9505` in its bytes 8 and 9; it returns A=`$F7` with carry set. `test_later_object_results.js` checks the return.

Trigger record 1 at `$92A4` names the callback `$92B0`, which saves X in the operand of the `LDX` at `$92C8`, passes `$92CB`, then `$92FB`, then `$932E` to `$77E0` and restores X. `test_later_trigger_messages.js` checks the pointer sequence and X restoration.

The shop entry at `$A750` jumps to `$A756`, which writes the screen page plus one into `$AAB5` and `$AAFF`, formats the two stage prices from `$4783,X` and `$4789,X`, and branches on the selected player's balance and on `$4753,X`. `test_later_shop_entries.js` checks these paths. Stage-object record 1 names `$A750` in its bytes 10 and 11, with the prices `$28` and `$05` in its bytes 8 and 9.

The shop choice code at `$A7E3` branches on incoming negative and zero flags, selects one of two stage prices, can reject insufficient balance, and follows either a stage callback or a message path before passing 4 or 8 to the meter routine and decrementing the stage field. `test_later_shop_choices.js` checks these paths. The shop timeout enters `$A86A` when the layout gate `$AAFF` is nonzero; it decrements `$4753,X` and passes message `$AC0B`.

The second shop entry at `$A876` selects an item pair from explicit stage fields through the conditional-item resolver, or from a patched player-state read plus a table value. `test_later_shop_pairs.js` checks both paths for both players.

The shop drawing setup at `$A8C4` selects two pointer-table entries, calls the second and first item targets with A=`$E4` and `$D0`, and fills three rows of colour RAM. `test_later_shop_draw_setup.js` checks the target selection and colour writes.

The shop label code at `$A913` passes two selected item bytes to the formatter and calls the display routine with Y=`$73` and `$87`, then passes the choice prompt `$AB0C` to `$77E0`. `test_later_shop_labels.js` checks the call arguments.

31 of the 38 distinct handler addresses are one-byte RTS entries: `$B34F–$B358` and `$B5D4–$B5E8`. 39 of the 48 types select one of them.

