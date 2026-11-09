# Resident engine — verified technical facts

### A direction reversal and the gold reward

In the captured code, the slot-zero initializers for entity types `$FE` and `$FD` call `$5C0C` as they create the entity. The check uses the input sampled at `$3C4C`: a right press with left pressed in the preceding sample, or a left press with right pressed in the preceding sample, sets the entity's reward byte at `$1AB1` to `$FF`, provided the player's vertical-motion state at `$4DB3` is nonnegative. In the main update path, input is sampled at `$0407` before the record dispatcher at `$0434`. The condition is therefore a reversal across two consecutive input samples at creation; a fixed number of video frames before appearance has not been established.

On contact, the dispatch table at `$754E` selects `$7632` for both types. `$771F` adds a pseudorandom offset of 0–4 to the saved reward byte with the 6510 in decimal mode; with `$FF`, this invalid BCD operand produces `$65`–`$69`, and `$7874` adds that packed-decimal amount to the player's gold. The small offset is chosen at collection, not at creation. The NMOS 6502 simulator ran the captured reversal routine for all 32 combinations of current and previous left/right values and both signs of the vertical-motion state. VICE single-stepped four controlled cases through `$5C0C`: both reversal directions set `$FF`, while a neutral previous input and a negative vertical state did not. VICE also ran the decimal addition at `$7730` for all five offsets and produced `$65`–`$69`. The ranges `$5BE1`–`$5C29`, `$771F`–`$7755`, `$3020`–`$3032` and `$3C4C`–`$3C9D` match `work/play-round1.vsf` and the contributor's title capture. A live, unmodified pickup test remains open.

### Score glyphs and display setup

The resident entry snapshot contains ten eight-byte digit shapes at `$C808–$C857`; rendering those bytes shows zero through nine, and the same bytes are present in the first-load play snapshot. `$39E7` uses eight-byte entries from a table based at `$C800` when it updates the score graphic. `$7122` copies the 80 digit bytes to `$D7B0–$D7FF` after banking I/O out.

The code at `$6ABD` clears the low two bits of CIA2 port A, and the title raster handler writes `$02` to `$D018` at `$3BE8`. With VIC bank 3 selected, that pointer chooses `$C800` as the character base; the title handler also writes `$1B` to `$D011`, selecting character rather than bitmap display. The snapshot comparison differs at 20 addresses in `$C858–$CFFF`, so their ownership and exact use need further checking.
