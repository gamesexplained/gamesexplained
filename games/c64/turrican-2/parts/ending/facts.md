# Ending — technical facts

The `EX` main load and `SL` auxiliary load supply `$6C00-$FF7F`. The handover listing explains all 37760 tracked bytes, including 5583 code bytes and the bitmap RAM beneath I/O. It retains loaded source bytes even where initialization later replaces them with a generated display.

## Remaining-resource conversion

Five categories are converted to score: each life adds 50000, each continue 10000, each remaining timer unit 100, each diamond 1000 and each power line 5000. Category-specific delays and sounds control the conversion. Lives, diamonds and power lines use decimal subtraction; the timer uses separate decimal digits with borrow. Each addition enters the four-byte BCD score and the display formats seven digits.

A counter panel and three category-selected sprites show the resource being converted. After all categories, local raster callbacks reveal the ending bitmap and advance through three-part motion, eight-slot explosions and a four-band sprite display. The sprites use authored shape tables and timer/program-byte-derived explosion positions.

## Pictures and text generation

The visible bitmap occupies `$C000-$DF3F`, forty by twenty-five eight-by-eight cells, with its authored screen/colour attributes stored lower in the main load. Another thirteen-row, ten-cell-wide bitmap strip is copied into the display. A four-page scene-pattern source is copied repeatedly with source operands advancing four bytes between phases.

The ending has two fonts: 110 eight-byte glyphs at `$906C` and 64 at `$93DC`. Rendered glyph sheets confirmed uppercase/screen-code characters, lowercase characters in the first set and border glyphs for the counter panel. Text commands select a font. Ordinary uppercase bytes are masked to six bits; lowercase bytes subtract $20 before glyph lookup.

Scrolling text is built into a 192-byte, twenty-four-character-wide buffer and shifted horizontally through carry. The renderer interleaves three character columns into each of eight sprite slots. Two eight-row fields begin at slot offsets zero and $27. Nine reusable sprite rows are multiplexed through the raster and cycle their shapes/colours as they scroll.

## Code-keyed text

The encoded source begins at `$F600`. The reader XORs the input with $86, resets Y to zero, adds the byte addressed by a descending key pointer initially $8206, then subtracts $D3. It preserves the caller's input Y through a patched immediate operand. An instruction trace decoded the first three header fields as colour one, shift four and column one (`work/trace_ending_text_header.json`). The Y reset is necessary: the key read is unindexed even when the caller reads a header field with nonzero Y.

The complete two-stage stream occupies `$F600-$FE04`. It uses program bytes `$8206` down through `$7A02` as its key, then stops with the key pointer at $7A01. There are 195 row/control records. $FF is a blank row, $FD ends a stage, $FB/$FC select fonts and $FE ends a text row. A zero glyph is valid and supplies a blank space in the copyright row. Both fonts' actual used indices fit their authored allocations.

The decoded narrative, production credits and greetings include the statement that the game was developed on the Commodore 64 and name the graphics tools Katakis Development System, Koalapainter and Paint-Magic+. After the first completion marker, six blank rows and a second marker flush the display during the music fade.

The final indirect return at `$7C9E` reads the word at `$0A40`. A targeted instruction step reached `$53E4`, the resident title-file loader (`work/trace_ending_return.json`).

## Music and effects

One song has thirteen patterns, thirteen instruments and sixteen arpeggio selectors. All 816 core instructions pair with the title driver; the three-voice loop is unchanged. Its leading register/frequency tables are displaced four bytes from the title's, and the listing uses the actual operand-selected addresses.

A separate local effects driver has seven nonzero pattern selectors and three voices. It serves resource conversion, movement and explosions. The bitmap reveal also installs a fixed three-voice pulse setup directly before the composed ending song starts. The composed song starts at `$7C18`, during text-display setup.

## Open questions

Some image-format bytes after the consumed four-page source, the auxiliary bytes overwritten by the initial screen clear and 379 bytes after the second completion marker have no established separate consumer. They remain described loaded data. The intended visible identities of the three-part object and several effect pictures remain open. No optional playthrough or combined-mechanics replay was recorded.
