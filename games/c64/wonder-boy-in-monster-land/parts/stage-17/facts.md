# Load 17 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 17's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 17's map has 15 rows of 123 cells, stored 123 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8DA6`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 17's sound pointers at `$7F58–$7F5D` select voice lists at `$98A8`, `$98B0` and `$98B8`, whose records name six distinct patterns: `$98C0`, `$98F6`, `$9946`, `$9979`, `$99C9` and `$9A11`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names three six-byte trigger records at `$94C1` (count at `$7F54`) and one sixteen-byte stage-object record at `$94F5` (count at `$7F57`). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions. The trigger records name the message callback `$94D3`, the hidden-coin callback `$5C2A` and the resident callback `$7960`, which clears bit 6 of the selected player's flags `$4DE2` and the status byte `$5284` when that bit is set, and otherwise adds one back to the record's count. The stage-object record (column 8, row 9) holds zero in bytes 2–11, where other loads' records name their callbacks.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$94B6`, inside the eight-page character source at `$8DA6`. The code there stores 5 in `$4DCB,X` for the selected player and jumps to `$0200`.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 633 input bytes to `$EB40–$F2BF` and 4,357 to `$7EDF–$A196`. The decoder stops at the second stream's end marker, 90 bytes before the end of the file.

The load's type-$05 and type-$15 entity vectors select a dispatcher at `$9DEC`, whose six state-table pairs point to `$9E0A`, `$9E98`, `$9F46`, `$9F92`, `$9FD1` and `$9FF4`. The type's own code stores only 0 to 5 in its state. It is load 2's type-$05 handler, moved.

Type-$05 state 4 at `$9FD1` decrements `$1AC2,X`; a negative result copies `$1AE4,X` into the state. Otherwise it calls `$4574` or `$45BC` according to carry from `$72FC` and leaves the state alone only when the callback result masked by 6 equals 2.

The type-$05 frame helper at `$A01E` adds 6 to A when the working byte at `$A074` is negative, clears carry again, adds `$19E5,X` and stores the low byte at `$19C3,X`. Two four-byte offset tables follow it: `$A076` (2, 2, 0, 0), which states 2 and 3 read by `$1AF5,X`, and `$A07A` (4, 4, 2, 2), which state 5 reads by `$1AD3,X`. Each state wraps its index at 4, and the paths into those states clear it first.

Type-$05 state 5 at `$9FF4` decrements `$1AC2,X` and, if it is negative, calls `$4B0E` and jumps to `$5DB9`. Otherwise it uses `$1AD3,X` to read a frame-offset table, calls the frame helper and advances the index, replacing values of 4 or above with 0 after the read. The event helper clears `$1AD3,X` when it selects state 5, so the index stays below 4.

Type-$05 states 2 and 3 at `$9F46` and `$9F92` call an event helper and, if it returns, update a frame using `$1AF5,X` before decrementing `$1AD3,X`. Depending on that result and a movement callback's result, state 2 can toggle bit 7 of `$1B17,X` and select state 3; state 3 can select state 0.

The type-$05 event helper at `$A02E` selects state 4 or 5 on set carry from `$732A`. In those paths it pulls the helper's return address off the stack and returns past the calling handler. On clear carry it can return to the handler or tail-call `$5D7A`.

Type-$05 state 0 at `$9E0A` uses a returned position and `$6F3C` to choose between state 1, state 2 or a return, when its event helper returns normally. The state-2 path patches the immediate operand at `$9F80` from its loaded value `$FF` to `$0A`, and state 2 then uses that operand.

Type-$05 state 1 at `$9E98` updates direction and frame, calls the event helper, then uses `$1AF5,X` and `$1B06,X` to choose a countdown, calls to `$4342` or `$4368`, or an allocation attempt at `$9EE7`. On set carry from `$190B`, it initializes another slot as a type-$22 entity using data from the original; either way it then restores the original index and selects state 0.

Load 17 has one LDX/LDY pair that loads a message record's address before a call to `$77E0`: `$94D6` names `$94E0`. `$77E0` copies each of the record's three zero-terminated lines into the message buffers, turning spaces into glyph zero. Glyph `$60`, a downward-pointing triangle, is the marker that the resident routine at `$6DDE` blinks while it waits for Fire.

The load's type-$03 entity vector selects a dispatcher at `$9C8A`, whose three state-table pairs point to `$9CA2`, `$9DA7` and `$9DE1`. The type's own code stores only 0 to 2 in its state. It is load 1's type-$03 handler, moved.

Type-$03 state 1 at `$9DA7` chooses a movement callback by a signed field and updates two frames; when the first frame addition wraps to zero, it calls both movement callbacks. State 2 at `$9DE1` calls `$4B20` and `$5DB9` with A=2.

The type-$03 state-0 entry at `$9CA2` can return immediately, select state 1 or 2 based on callback carry and a signed field, or continue to the movement path.

The type-$03 state-0 movement tail at `$9D5D` reads a signed byte from a 40-byte table at `$9D7F`, calls `$4342` for negative values or `$4368` otherwise, and advances the returned Y with an equality wrap at 40.

The type-$03 state-0 frame path at `$9CD9` uses carry returned by `$72FC` and the parity of `$1B28,X` to update `$1AD3,X` and two frame bytes.

The type-$03 horizontal calculation at `$9D2B` subtracts 6 from negative magnitudes but 5 from nonnegative values before deciding whether to call a movement routine. The difference comes from carry left clear by ADC 1 on the negative path.

The load's type-$22 entity vector selects a dispatcher at `$A093`, whose three state-table pairs point to `$A0AB`, `$A0DE` and `$A124`. The type's own code stores only 1 and 2 in its state, and the type-$05 allocation at `$9EE7` makes each type-$22 entity after `$447A` has cleared the slot's state, so it starts at 0. It is load 2's type-$22 handler, moved.

Type-$22 state 2 at `$A124` increments a counter and updates a frame while the counter is below 2; otherwise it clears `$1B28` in the slot that `$1AD3,X` names and jumps to `$4454` with the original X.

Type-$22 state 1 at `$A0DE` can call a sign-selected movement routine, then uses carry from `$44DE` to increment a counter or initialize state 2.

Type-$22 state 0 at `$A0AB` enters the alternate-slot cleanup when `$1A29,X` is zero; otherwise it calls the collision helper and chooses a movement callback by a sign byte, and the callback's carry moves it to state 1.

The type-$22 collision helper at `$A148` returns directly or enters state-2 setup after either of two carry checks. State-2 setup returns to the helper's caller, so a state-0 call continues after it.

The load's type-$01 and type-$16 entity vectors select a dispatcher at `$9A89`, whose three state-table pairs point to `$9AA1`, `$9B06` and `$9B3D`. The type's own code stores only 0 to 2 in its state. It is load 2's type-$01 handler, moved.

Type-$01 state 0 at `$9AA1` can select state 1 or 2 based on carry from `$732A` and the sign of `$1A6D,X`. Its other active paths update `$1AD3,X`, `$1AE4,X` and a frame byte and set `$1A7E,X` if clear; when `$1A29,X` is zero it only sets that flag if clear.

Type-$01 state 1 at `$9B06` returns to state 0 when `$1A8F,X` is zero; otherwise it calls `$45BC` or `$4574` according to `$1B28,X` and updates the frame. State 2 at `$9B3D` decrements `$1B17,X`, uses the same frame update when the result is nonzero, and calls `$4B0E` before jumping to `$5DB9` when it is zero.

The load's type-$02 entity vector selects a dispatcher at `$9B4C`, whose three state-table pairs point to `$9B64`, `$9C2E` and `$9C68`. The type's own code stores only 0 to 2 in its state. It is load 1's type-$02 handler, moved.

Type-$02 state 2 at `$9C68` computes a frame based on whether `$1AD3,X` equals `$80`, decrements `$1AE4,X` and can call `$4B0E` and `$5DB9`.

Type-$02 state 1 at `$9C2E` decrements a timer, chooses a movement callback by a signed byte, and either resets to state 0 or updates a frame.

The type-$02 helper at `$9C09` toggles bit 7 of `$1AD3,X`. The frame helper at `$9C12` patches an immediate operand to 0 or 8 and combines it with a timer bit and `$19E5,X`.

The type-$02 state-0 entry at `$9B64` can select state 1 or 2 or continue to the timer path.

The type-$02 state-0 timer path at `$9BA7` can update a frame, select a movement callback, or reset a timer and toggle two direction bits.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 38 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply the view origin, which `$33EC–$3408` replaces with the current view's left and top while `$6D17` redraws the screen and then restores.

Load 17's split row-pointer tables hold 81 pairs, all 123 bytes apart from `$8671`, the last at `$ACE1`; the map's 15 rows use the first 15. `test_later_row_pointer_tails.js` checks all pairs.

Trigger record 1 at `$94C1` (column 23, row 11, count 1) names the message callback `$94D3`, which passes `$94E0` ("THE MAM DESERT.") to `$77E0` and restores X through the operand it patches at `$94DE`. `test_later_trigger_messages.js` checks the pointer and X.

27 of the 38 distinct handler addresses are one-byte RTS entries: `$9DEB`, `$A07E–$A092` and `$A15F–$A163`. 33 of the 48 types select one of them.

