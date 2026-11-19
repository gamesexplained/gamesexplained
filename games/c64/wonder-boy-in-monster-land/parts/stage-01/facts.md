# First load — verified technical facts

### Opening messages

Load 1 holds a welcome message at `$92A0` and quest messages at `$9493`, `$94B7`, `$94F0` and `$9520`. Each has three zero-terminated fields followed by `$FF`; the resident message routine at `$77E2` copies the fields to its buffers and waits for Fire on that control byte. The fields include the game's spelling “The countrys fate / despends on you.” The trigger callback `$9293` (record 2, column 9, row 13) shows the welcome; the setup routine `$93BA`, callback of stage record 1, shows the four quest messages in turn at `$9470`–`$9489`.

### Map tiles

The resident loop at `$6D41–$6D63` reads a map byte as an index into four 256-byte tables at `$81CF`, `$82CF`, `$83CF` and `$84CF`. It writes their values into the top-left, top-right, bottom-left and bottom-right positions of a two-by-two character block; the lower row is 40 screen cells after the upper. The movement checks at `$0C57`, `$0EB8` and `$1051` use the map byte as an index into the attribute table at `$80CF`: downward movement tests bits 0–1 and horizontal movement tests bit 1.

The callback of load 1's first map-trigger record (`$9263`, column 3, row 13) is `$AFC7`, which copies six 128-byte sprite-pair blocks from `$ACC7–$AFC6` to slots `$66`, `$68`, `$6A`, `$70`, `$82` and `$84` in VIC bank 3 with I/O banked out, then calls the resident mirror routine `$2086` seven times, from X=`$66` and Y=`$74`.

The first load holds eight sound patterns at `$B03D–$B16F`, selected by records in the three voice lists at `$B017–$B03C`. Each pattern is nonzero event bytes followed by a zero; the resident sequencer interprets them using voice and tick state. `test_sound_patterns.js` checks the boundaries and pointers against the listing.

The title initializer at `$0256–$025E` passes `$B5C4` to `$717C`, which copies eight pages to `$D000–$D7FF` with I/O banked out. The screen template beginning at `$BA84` overlaps the second half of the source. `test_title_copy.js` checks the full eight-page copy against the listing.

The first entity handler's state 0 at `$B188` selects a reaction state on collision (state 1 when `$1A6D,X` is positive, otherwise state 2 with `$1B17,X` set to 8) or updates a timer and frame on the movement path. The frame calculation propagates the carry from its first addition into the second.

The first entity handler's reaction paths at `$B1ED` and `$B224` select movement, animate a frame or finish a countdown.

The second entity handler's state 0 at `$B24B` handles collision, player contact, a signed timer, movement and frame selection.

The second entity handler's reaction and exit paths at `$B315` and `$B34F` update direction, frames and countdowns.

The third entity handler's state 0 at `$B389` handles collision, heading, animation and a signed wave table of 40 entries at `$B466`. Negative and nonnegative horizontal speeds subtract six and five respectively before movement.

The third entity handler's reaction at `$B48E` calls the right-movement path after the left path if its first frame sum wraps to zero.

The first-load payment screen compares the selected player’s two-byte balance with the record’s second amount byte and chooses a prompt or an insufficient-balance message using record field 3.

First-load setup at `$93BA` initializes player and entity fields and, with `$01` set to `$30`, copies sprite graphics into RAM, with two 15-byte patches and six nine-byte tails.

First-load item layout at `$A63F` sets 24 colour cells in two groups, then calls price extraction and drawing for two selected item IDs.

First-load item input uses one 220-frame timeout across release and polling. It tests confirmation before left and right, and left before right.

First-load left and right selection handlers move among the usual `$FF`, 0 and 1 states, optionally requesting the first or second item description when the layout selector is zero.

First-load item confirmation selects messages from the stage-record flags or selects an item record by index sign. On a successful payment result it decrements the record field and calls the selected item effect with ID plus one.

First-load initializer `$92FB`, the effect callback of stage record 3, fills an entity slot with fixed type, frame, attributes and coordinates before passing message pointer `$933C` to the message routine.

First-load price formatter `$A807` splits two packed bytes into four nibble-plus-one display values and replaces leading ones with zero.

The first load contains 34 three-field shop and item message records at `$A857–$AB54`, each followed by its control byte. The records keep the game’s spelling and punctuation.

First-load item effects `$AC61–$ACAA` call four resident player-flag setters or write one of three selected-player attributes, then enter slot disable. The last attribute entry patches and calls a record-supplied callback.

Four first-load item-push entries pass fixed type and quantity pairs to `$536F`: type 0 with 5, 1 with 8, 3 with 3 and 2 with 5.

First-load item drawing entries at `$AB56–$AB9F` write a four-by-three or four-by-four block of consecutive character values with 40-byte row stride.

First-load payment options either select a default message or call a record-supplied one-shot callback, then add 4 or 8 to the player meter and decrement the record field. The second option also checks the player balance before proceeding.

First-load payment display `$A504` formats a packed byte into the last two of four character positions and restores X after the draw call. The adjacent option dispatcher at `$A52E` branches on the selection sign.

The first-load second and third voice lists contain one and ten pattern pointers respectively before their zero-low-byte terminators.

The first-load item-pair initializer either uses record-supplied IDs or derives consecutive IDs from selected-player state and a lookup. Conditional ID `$13` becomes `$14` when player flag `$10` is set.

First-load item-result message handling calls the display routine and waits while the message countdown is nonzero, updating the HUD each frame.

First-load item controls return carry set when any of the three sampled input bytes is zero. The cursor routine indexes its position table with the selection index plus one.

First-load item description code selects the message pointer from the item record, while its price writer converts four display bytes and writes corresponding character and colour cells.

The first-load visual tables contain seven split-byte pointers each for metatile definitions, screen streams, colour lookups and character sources.

First-load motion stream `$924C` produces 44 values and resets to the start, including two 13-value runs. The routine at `$9241` points the resident decoder `$6A3A` at it; it is the motion callback of the sixth entity record (`$B521`), a moving platform of type `$FF` whose bytes 7 and 9, `$41` and `$92`, `$68CB` patches into the JSR at `$68E5`.

The first-load stage header selects three 16-byte records at `$92CB–$92FA`.

The first-load entity stream at `$B4EF` contains six ten-byte records before a zero byte; its initial slot limit (`$7F51`) is five. The handler table at `$7EDF` also holds the first record's address, for entity types `$2D`–`$2F`, but the bytes there are the record.

First-load welcome handling saves and restores X around a message call; a neighboring entry returns carry set and A=9, and another jumps to a second message.

The first load has 24 eight-byte item records at `$ABA1` with packed prices, drawing and effect targets, and description pointers.

