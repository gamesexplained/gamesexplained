# Resident engine — verified technical facts

### A direction reversal and the gold reward

In the captured code, the slot-zero initializers for entity types `$FE` and `$FD` call `$5C0C` as they create the entity. The check uses the input sampled at `$3C4C`: a right press with left pressed in the preceding sample, or a left press with right pressed in the preceding sample, sets the entity's reward byte at `$1AB1` to `$FF`, provided the player's vertical-motion state at `$4DB3` is nonnegative. In the main update path, input is sampled at `$0407` before the record dispatcher at `$0434`. The condition is therefore a reversal across two consecutive input samples at creation; a fixed number of video frames before appearance has not been established.

On contact, the dispatch table at `$754E` selects `$7632` for both types. `$771F` adds a pseudorandom offset of 0–4 to the saved reward byte with the 6510 in decimal mode; with `$FF`, this invalid BCD operand produces `$65`–`$69`, and `$7874` adds that packed-decimal amount to the player's gold. The small offset is chosen at collection, not at creation. The NMOS 6502 simulator ran the captured reversal routine for all 32 combinations of current and previous left/right values and both signs of the vertical-motion state. VICE single-stepped four controlled cases through `$5C0C`: both reversal directions set `$FF`, while a neutral previous input and a negative vertical state did not. VICE also ran the decimal addition at `$7730` for all five offsets and produced `$65`–`$69`. The ranges `$5BE1`–`$5C29`, `$771F`–`$7755`, `$3020`–`$3032` and `$3C4C`–`$3C9D` match `work/play-round1.vsf` and the contributor's title capture. A live, unmodified pickup test remains open.

### Score glyphs and display setup

The resident entry snapshot contains ten eight-byte digit shapes at `$C808–$C857`; rendering those bytes shows zero through nine, and the same bytes are present in the first-load play snapshot. `$39E7` uses eight-byte entries from a table based at `$C800` when it updates the score graphic. `$7122` copies the 80 digit bytes to `$D7B0–$D7FF` after banking I/O out.

The code at `$6ABD` clears the low two bits of CIA2 port A, and the title raster handler writes `$02` to `$D018` at `$3BE8`. With VIC bank 3 selected, that pointer chooses `$C800` as the character base; the title handler also writes `$1B` to `$D011`, selecting character rather than bitmap display. The snapshot comparison differs at 20 addresses in `$C858–$CFFF`, so their ownership and exact use need further checking.

### Character codes

Rendering the 256 eight-byte shapes at `$C800` in the first-load play snapshot gives the following visible characters: `$00` is blank; `$01–$0A` are `0–9`; `$0B–$10` are `(`, `)`, `/`, `:`, `&`, `-`; `$41–$5A` are `A–Z`; `$5B–$5F` are `.`, apostrophe, `!`, comma, `?`; and `$61–$7A` are `a–z`. Other cells contain graphics or shapes whose text meaning is not established. Comparing the resident entry and first-load play snapshots finds differences in glyphs `$9D`, `$9E`, `$A1` and `$A2` only.

Message records selected through the pointer tables at `$5636` and `$564C` contain three zero-terminated fields followed by a control byte. The copy loops at `$7806`, `$781B` and `$7830` replace stored `$20` spaces with glyph `$00` while filling the screen buffers. The record at `$549E` says “Lost the / Wing Boots.”; the record at `$5555` says “WING BOOTS.” The reward handler at `$771F` fills the copied “gold get” message with the calculated amount, while the score handler at `$7756` fills the copied “BONUS POINTS” message with digits derived from its reward input. The source records themselves hold zero glyphs as placeholders.

### Drawing map characters

The playfield raster path at `$1333–$133F` enables multicolour character mode and writes the value at `$6F` to the background-colour register `$D021`. The path at `$136A–$1373` writes `$529C` and `$529D` to the two shared character colours at `$D022` and `$D023`. The map viewer uses the values saved in each part's play snapshot. In every captured part, the 2,048 bytes at the entry snapshot's `$7F41` pointer match the play snapshot's RAM at `$D000–$D7FF`, where `$717C` copies the character data. The second and third load's reconstructed terrain was compared visually with their captured screens; the map viewer omits sprites and runtime changes.

### Wing boots

`$76FD` sets the selected player's flag `$08` and initializes `$4DE0` to `$FF`. At `$0A92`, when that flag is set, the fall-step value `$4DB5` is below 4 and the sampled up input is pressed, the game decrements `$4DE0`. A nonzero result sets the fall step to 1; a zero result clears the flag and selects the “Lost the Wing Boots.” message. Starting at `$FF`, expiration therefore takes 255 qualifying visits to this code. Visits on which up is not pressed or the fall step is at least 4 do not decrement it. The duration in seconds has not been measured.

VICE single-stepping checked five controlled cases: the flag absent, up released, fall step 4, a qualifying visit with the count at 2, and expiration with the count at 1. The expiry case stopped after clearing the flag and before the message call; the message selection is traced in code. The tested `$0A92–$0ABE` bytes match the resident entry snapshot; the `$21E1` flag-clear helper differs only in its self-modified saved-X operand at `$21EE`. These tests do not establish the natural pickup route.
