# Load 31 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 31's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 31's map has 16 rows of 64 cells, stored 128 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8E71`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 31's sound pointers at `$7F58–$7F5D` select voice lists at `$9217`, `$921D` and `$9223`, whose records name six distinct patterns: `$9229`, `$92E0`, `$9341`, `$93C8`, `$9437` and `$949D`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names one six-byte trigger record at `$91AC` (count at `$7F54`) and one sixteen-byte stage-object record at `$91B2` (count at `$7F57`). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions. The trigger record is six `$FF` bytes, so its callback address is `$FFFF`. The stage-object record, at column 6 of row 10, names the initializer `$91C2` in its bytes 6 and 7, the result callback `$9216`, a lone `RTS`, in bytes 8 and 9, and the alternate update loop `$073F` in bytes 10 and 11; its bytes 12 to 15 are the map cells `$49`–`$4C`.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$91A1`, inside the eight-page character source at `$8E71`, which runs to `$9670` and so also takes in the trigger and stage-object records, the initializer `$91C2`, the sound lists and patterns, and the start of the type-$2D/$2E handler at `$954D`. The entry stores 17 in `$4DCB,X` for the selected player and jumps to `$0200`.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 2,635 input bytes to `$EB40–$FB3F` and 3,726 to `$7EDF–$A31E`. The second stream's end marker is the file's last byte.

Load 31 has five LDX/LDY pairs that load a message record's address with a call or jump to `$77E0` a few bytes later; they name `$9201` ("THE DRAGON!!!"), `$96AF` ("The Ruby starts to glow.."), `$9731` ("The Dragon appears!!"), `$99B0` ("Congratulations!!! By killing the Meka Dragon, you") and `$99E5` ("have saved Wonderland from destruction."). `$77E0` copies each of the record's three zero-terminated lines into the message buffers, turning spaces into glyph zero. Glyph `$60`, a downward-pointing triangle, is the marker that the resident routine at `$6DDE` blinks while it waits for Fire.

The type-$2D and $2E entity vectors select a dispatcher at `$954D`, which jumps through `$1AB1,X` to one of six state targets: `$956B`, `$95A0`, `$9749`, `$976B`, `$987A` and `$98C5`. The type's own code keeps the state between 0 and 5: 0 at `$956D` and then 1 by the increment at `$957B`, 3 at `$95E8`, 2 at `$96A4`, 5 at `$970D`, 4 at `$9719` and 1 at `$9817`, and at `$9767` and `$98A8` it restores the state saved at `$969F` and `$9714`. Load 31 sets up one type-$2E object, at `$91C2`, which its stage record at `$91B2` names, after the alternate loop at `$073F` has called `$447A` to clear the state; no code in the load makes a type-$2D entity.

Type-$2D/$2E state 0 at `$956B` sets `$1AD3,X` to a `$3020` random byte AND `$87`, plus 3 (a direction in bit 7 and a count of 3 to 10), sets the state to 1, stores `$80` in `$1AE4,X` when four further random bytes all have bit 7 set and 0 otherwise, stores 10 in `$1AF5,X` and falls through to state 1.

Type-$2D/$2E state 2 at `$9749` calls `$9820`, moves the entity right by 8 through `$43F0` when `$1B28,X` is negative or left by 8 through `$43A2` otherwise, and when `$1A8F,X` is zero copies `$1B17,X` to the state. Only the contact path at `$969C` selects state 2, after it saves the state it interrupts in `$1B17,X`, so the copy restores that state.

Type-$2D/$2E state 4 at `$987A` counts `$98C3` down, adding `$18` to the frame `$19C3,X` or subtracting it on alternate passes and setting `$19D4,X` to that frame plus 2; when the count is zero it copies `$98C4` to the state, sets the sprite base `$19E5,X` to `$CD`, the parameter `$1A6D,X` back to `$7D`, and `$19F6,X` and `$1A18,X` to `$0F`. The state-4 entry at `$9711` writes both: the interrupted state to `$98C4` at `$9714` and `$14` to `$98C3` at `$971E`.

Type-$2D/$2E state 5 at `$98C5` decrements the timer `$1B28,X`, which the contact path set to 50, and calls `$9820` while it is not negative. When it goes negative, `$98CE` adds `$30` to the middle byte of the selected player's score through `$4B20`, frees the entity's display slots through `$4454`, calls `$331D`, stores `$FE` in the sound state `$2C15` and in `$49`, resets the sprite tables through `$6ACB`, clears the message, updates the status panel twice, calls `$7119` with X=1, and sets display slots 4 and 5 to sprite pointers `$EB` and `$EC`, colours `$0F` and `$08`, X `$74` and Y `$C8`.

The type-$2D/$2E state-5 loop at `$9934` waits for `$D012`=`$80`, moves display slots 4 and 5 left by a step that falls from 8 to 0 and up by a step that rises from 0 to 2, and repeats while their Y is at least `$50`. From X=`$74` and Y=`$C8` it ends after 62 passes with X=`$50`, Y=`$4F` and steps 0 and 2. Each pass takes at least 74 cycles, longer than a 63-cycle raster line, so the loop makes at most one pass a frame.

After the type-$2D/$2E state-5 loop, code at `$9972` passes the records at `$99B0` and `$99E5` to `$77E0` and then calls it with X=Y=0. It then loops, calling `$3C2A` and `$370B`, and while the gold `$4DC7`/`$4DC9` is nonzero subtracts 1 from the selected player's gold through `$78D1` and adds 1 to the middle byte of the score through `$4B20`. The test reads the first player's bytes without an index, while `$78D1` and `$4B20` use the selected player `$4DBD`. When the gold is zero it calls `$370B` twice and `$6DDE`, which waits for Fire, then jumps to the title setup at `$0203`.

The type-$2D/$2E frame helpers at `$9820`, `$983E` and `$985C` choose offsets 8/20, 4/16 and 0/12 by the carry that `$72FC` returns, store that carry in bit 7 of `$98BE`, and set the frames `$19C3,X` to the sprite base `$19E5,X` plus the offset and `$19D4,X` to that plus 2.

Type-$2D/$2E state 3 at `$976B` decrements `$1B06,X`; while it is not negative it calls `$983E` and the contact check `$9647`. Once it is negative it skips allocation when its low two bits are nonzero or when `$962A` is 5, and otherwise calls `$190B` for a free slot.

The type-$2D/$2E state-3 allocated-slot path at `$9794` makes the free slot X a type-$2F entity at the parent's position (8 lower, and `$18` to the right when `$98BE` is not negative) with sprite base `$E5`, takes its direction from `$34EA` applied to the bytes at `$98BF–$98C2`, and counts it in `$962A`; `$9809` then restores X and `$980B` returns to state 1 when `$1B06,X` reaches `$E0`. State 3 allocates once `$1B06,X` has gone negative, on each pass where its low two bits are zero, while `$962A` is not 5 and `$190B` finds a free slot, so one state-3 phase makes at most five type-$2F objects.

Type-$2D/$2E state 1 at `$95A0` has two modes. With `$1AE4,X` zero it walks: it calls `$985C`, counts down `$1AD3,X`, returns to state 0 when the count runs out, and otherwise moves it by 4, right through `$4574` when bit 7 is set or left through `$45BC` when it is clear, reversing that bit when the move routine returns carry set. With `$1AE4,X` nonzero it calls `$983E` and, while `$1AF5,X` is positive, moves up by `$1AF5,X` through `$4342` and counts it down; from `$80` upward it moves down by its low seven bits through `$4368`, counts it up, and clears `$1AE4,X` at `$8B`.

The type-$2D/$2E state-1 transition at `$95E6`, reached when `$1AF5,X` counts down to zero, selects state 3, sets the timer `$1B06,X` to a random 0 to 7, stores half the player's position (`$47`–`$49`) in `$98BF–$98C0` and half the entity's in `$98C1–$98C2` (with `$0C` added to its X when `$98BE` is not negative), and clears `$962A`. State 3 passes those bytes to `$34EA` to aim each object it makes.

The type-$2D/$2E contact entry at `$9647` fills `$762E–$7631` from the entity's display slot and calls `$732A`. When that reports a hit and `$1A6D,X` is still positive, it saves the state in `$1B17,X`, selects state 2 and sets `$1B28,X` from `$72FC`; before that, if the selected player's flags `$4DE2,Y` have low three bits 5, it clears those bits, sets `$1A8F,X` to `$20`, passes the `$96AF` record ("The Ruby starts to glow..") to `$77E0` and halves `$1A6D,X`.

When `$732A` reports no hit, the branch at `$96CB` fills a second contact box and calls `$7227`, and on contact passes A=2 to `$5D7A`. When a hit leaves `$1A6D,X` zero or negative, `$96FA` selects state 4 if the sprite base `$19E5,X` is `$B5`, and otherwise state 5, with `$32` in `$1B28,X` and `$FF` in `$1A8F,X`. The state-4 path passes the `$9731` record ("The Dragon appears!!") to `$77E0` and calls `$9820`.

The load-31 type-$2F vector selects `$9A11`, which moves the entity through `$35C1` by its direction byte `$1B28,X` and increments the count `$1AB1,X`; on the pass that finds the count 0 it returns at once. On later passes it sets the frame to the sprite base plus 0, 2 or 4 while the count is below 5, below 10, or higher, and patches the half of that offset into the `LDY` at `$9A73` as the collision-table index.

The type-$2F path at `$9A41` frees the entity through `$4454` when its Y `$19A1,X` is at least `$CA`, or when its X equals `$140` or `$1F` exactly; while its X high byte `$196E,X` is nonzero it returns without the collision test at `$9A5F`.

The load-31 type-$2F collision path at `$9A5F` builds a contact box from its display coordinates and the three-byte tables at `$9AAB`, `$9AAE`, `$9AB1` and `$9AB4`, indexed by the frame stage, then frees the entity through `$4454` when `$1179` reports contact, or calls `$7227` and on contact passes A=4 to `$5D7A` before freeing it.

The resident routine at `$34DD` passes the pointer at `$7F41` (`$8E71`) to `$717C`, which copies 2,048 bytes from `$8E71–$9670` to RAM at `$D000–$D7FF` as the stage character set.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 39 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply the view origin, which `$33EC–$3408` replaces with the current view's left and top while `$6D17` redraws the screen and then restores.

Load 31's split row-pointer tables hold 81 pairs, all 128 bytes apart from `$8671`, the last at `$AE71`; the map's 16 rows use the first 16. `test_later_row_pointer_tails.js` checks all pairs.

Stage-object record 1 at `$91B2` names `$91C2`, inside the character source, in its bytes 6 and 7, and the resident alternate update loop `$073F`, which the record names in bytes 10 and 11, calls it through the patched JSR at `$0778` with X the free slot that `$190B` found. It makes that slot a type-$2E entity (sprite base `$B5`, parameter `$7D`, screen X `$00D2`, Y `$AD`) and passes message `$9201` ("THE DRAGON!!!") to `$77E0`. `test_later_object_inits.js` checks its field writes and message pointer.

32 of the 39 distinct handler addresses are one-byte RTS entries, at `$952D–$954C`. 40 of the 48 types select one of them.

