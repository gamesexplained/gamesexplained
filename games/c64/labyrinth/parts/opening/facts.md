# The text adventure — technical facts

Source image: `work/play.vsf`, captured at the initial sidewalk prompt, as described in the game’s `orientation.md`. Unless marked live, statements below come from the snapshot and its exported disassembly. This is a Bronze sweep; most routine purposes remain open and the room overlays have no exported analysis.

## Interrupt and banking

- **Live capture:** the IRQ chain repeatedly changes `$FFFE/$FFFF` within a frame. The initial snapshot vector is `$127C`; `$113A` is another chain entry visible in the captured writes.
- `$113A` pushes A, X, and Y, selects `$25` at the processor port, calls `$1267`, acknowledges VIC/CIA interrupt state, updates counters, and dispatches several services. Their detailed purposes are open. It restores banking from `$61` before returning.
- `$1267` schedules raster `$3D` and installs `$127C`. `$127C` copies six sprite X positions from `$02CC-$02D1`, sets the first six sprite Y values to `$46`, and schedules `$136F` at raster `$50`.
- `$11C1` is RTI, and is the NMI vector target in the saved state.
- `$69E1-$69EE` writes processor-port value `$24`, calls `$DE12` from RAM beneath I/O, and restores `$25`. `$DE12-$DE1D` fills 34 cells at each of `$CCA2` and `$CED2` with `$0A`. Its remaining instructions belong to the message-window drawing path; only the opening loop is described here.

## Alphabet

The rendered RAM glyphs at `$D000-$D7FF` are in `reference/opening-font.png` in the game folder. VIC bank 3 and `$D018=$35` select that font and the `$CC00` screen at the captured frame start.

| Glyph indices | Meaning verified by rendering |
|---|---|
| `$20` | Space |
| `$21-$22` | Exclamation mark and double quote |
| `$23-$26` | Hash, dollar, percent, ampersand |
| `$27-$2A` | Apostrophe, left/right parentheses, asterisk |
| `$2C-$2F` | Comma, hyphen, full stop, slash |
| `$30-$39` | Digits 0–9 |
| `$3A` | Colon |
| `$3E-$3F` | Right-pointing command marker and question mark |
| `$41-$5A` | Uppercase A–Z |
| `$61-$7A` | Lowercase a–z |

Some other slots are blank or graphical. They must not be decoded by assuming the complete ASCII punctuation set. Literal stored text uses ASCII bytes, interspersed with bytes above `$7F`. These high bytes break words as well as sentences; they are not a second proven alphabet. The expansion table is split into high bytes at $D800 and low bytes at $D900. At $68D4-$691C, token $FB emits the selected word, $FC uppercases it, $FD appends a space, and $FE uppercases it and appends a space. Each token is followed by an index. The dictionary string ends at zero. The routine temporarily banks I/O out with port value $24 while reading these RAM tables. Exact text capitalization is obtained by subtracting $20 from the first emitted character when the high flag is set. The flag is then reduced to its space bit, so subsequent letters retain their stored case.

## Scope of the sweeps

`tx` nearly matches the snapshot at `$7900`, while its executable jump targets point farther into the same region. Do not type the entire file as text. The normal screen-code/PETSCII sweeps found few readable sentences; including lowercase ASCII recovered the literal spans below.

The file comparison found a strong `ds` match at `$BC00`, a partial initial-program match at `$0800`, and a near-complete `tx` match at `$7900`. An overlapping loaded region is not an independent twin copy. No second equivalent engine was established by this comparison; packed copies and other loads remain open.

The platform’s all-opcode scan found no undocumented opcodes in the exported code blocks. Fourteen short untyped gaps between code runs remain to be classified; that result does not describe untraced memory. The listing also flags unclassified RAM beneath I/O outside the declared font, dictionary, keyboard tables, and `$DE12-$DEFD` routine. These are open Bronze work items, not exclusions justified by non-use.

## Error rate

The listing comments describe inspected code, rendered data, and dictionary records decoded by a script from their RAM pointers. No independent sample or audit was performed. The error rate is unmeasured; a Silver continuation must run the kit’s verification workflow.

## Hardware register census

Mechanical census of absolute and indexed absolute operands in the traced code blocks of `parts/opening/symbols.json`. Indexed operands name their base, not every address the index can reach. Indirect accesses are outside this census. A missing row does not establish that a register is unused. Routine purposes beyond the descriptions below remain open.

| Operand | Register / RAM candidate | Instruction sites | Attribution |
|---|---|---|---|
| `$D000` | vic_sprite0_x | `$1285` STY | display service; sprite/raster writes visible in the frame capture |
| `$D001` | vic_sprite0_y | `$1345` STY, `$138D` STY | display service; sprite/raster writes visible in the frame capture |
| `$D002` | vic_sprite1_x | `$128B` STY | display service; sprite/raster writes visible in the frame capture |
| `$D003` | vic_sprite1_y | `$1348` STY, `$1390` STY | display service; sprite/raster writes visible in the frame capture |
| `$D004` | vic_sprite2_x | `$1291` STY | display service; sprite/raster writes visible in the frame capture |
| `$D005` | vic_sprite2_y | `$134B` STY, `$1393` STY | display service; sprite/raster writes visible in the frame capture |
| `$D006` | vic_sprite3_x | `$1297` STY | display service; sprite/raster writes visible in the frame capture |
| `$D007` | vic_sprite3_y | `$134E` STY, `$1396` STY | display service; sprite/raster writes visible in the frame capture |
| `$D008` | vic_sprite4_x | `$129D` STY | display service; sprite/raster writes visible in the frame capture |
| `$D009` | vic_sprite4_y | `$133F` STY, `$1387` STY | display service; sprite/raster writes visible in the frame capture |
| `$D00A` | vic_sprite5_x | `$12A3` STY | display service; sprite/raster writes visible in the frame capture |
| `$D00B` | vic_sprite5_y | `$1342` STY, `$138A` STY | display service; sprite/raster writes visible in the frame capture |
| `$D00C` | vic_sprite6_x | `$1317` STY | display service; sprite/raster writes visible in the frame capture |
| `$D00D` | vic_sprite6_y | `$1321` STY | display service; sprite/raster writes visible in the frame capture |
| `$D00E` | vic_sprite7_x | `$131C` STY | display service; sprite/raster writes visible in the frame capture |
| `$D00F` | vic_sprite7_y | `$1326` STY | display service; sprite/raster writes visible in the frame capture |
| `$D010` | vic_sprite_x_msb | `$12AC` STA | display service; sprite/raster writes visible in the frame capture |
| `$D011` | vic_control1 | `$0F23` STA, `$0F66` STA | display service; sprite/raster writes visible in the frame capture |
| `$D012` | vic_raster | `$0F7B` STA, `$1269` STY, `$1358` STY, `$13A0` STY | display service; sprite/raster writes visible in the frame capture |
| `$D015` | vic_sprite_enable | `$093B` STA, `$0957` STA, `$0F9E` STY, `$52BF` STA, `$6252` STX | display service; sprite/raster writes visible in the frame capture |
| `$D016` | vic_control2 | `$1150` STA, `$137C` STY | display service; sprite/raster writes visible in the frame capture |
| `$D017` | vic_sprite_expand_y | `$10EC` STA | display service; sprite/raster writes visible in the frame capture |
| `$D018` | vic_memory | `$0F76` STA, `$1382` STY | display service; sprite/raster writes visible in the frame capture |
| `$D019` | vic_irq_status | `$0F83` STA, `$1148` STA, `$1353` STY, `$139B` STY | display service; sprite/raster writes visible in the frame capture |
| `$D01A` | vic_irq_enable | `$0F86` STA | display service; sprite/raster writes visible in the frame capture |
| `$D01B` | vic_sprite_priority | `$10EF` STA | display service; sprite/raster writes visible in the frame capture |
| `$D01C` | vic_sprite_multicolour | `$10FA` STA | display service; sprite/raster writes visible in the frame capture |
| `$D01D` | vic_sprite_expand_x | `$10E9` STA, `$12B2` STY | display service; sprite/raster writes visible in the frame capture |
| `$D01E` | vic_sprite_collision | `$10F2` STA | display service; sprite/raster writes visible in the frame capture |
| `$D01F` | vic_sprite_bg_collision | `$10F5` STA | display service; sprite/raster writes visible in the frame capture |
| `$D020` | vic_border | `$0F20` STA, `$1055` STA, `$1278` STY, `$61C5` STA | display service; sprite/raster writes visible in the frame capture |
| `$D021` | vic_background0 | `$1058` STA | display service; sprite/raster writes visible in the frame capture |
| `$D022` | vic_background1 | `$1065` STA, `$5A37` STA | display service; sprite/raster writes visible in the frame capture |
| `$D023` | vic_background2 | `$106A` STA, `$5A3D` STA | display service; sprite/raster writes visible in the frame capture |
| `$D025` | vic_sprite_mc0 | `$1060` STA | display service; sprite/raster writes visible in the frame capture |
| `$D026` | vic_sprite_mc1 | `$105B` STA | display service; sprite/raster writes visible in the frame capture |
| `$D027` | vic_sprite0_colour | `$12F4` STY | display service; sprite/raster writes visible in the frame capture |
| `$D028` | vic_sprite1_colour | `$12FA` STY | display service; sprite/raster writes visible in the frame capture |
| `$D029` | vic_sprite2_colour | `$1300` STY | display service; sprite/raster writes visible in the frame capture |
| `$D02A` | vic_sprite3_colour | `$1306` STY | display service; sprite/raster writes visible in the frame capture |
| `$D02B` | vic_sprite4_colour | `$130C` STY | display service; sprite/raster writes visible in the frame capture |
| `$D02C` | vic_sprite5_colour | `$1312` STY | display service; sprite/raster writes visible in the frame capture |
| `$D02D` | vic_sprite6_colour | `$1335` STY | display service; sprite/raster writes visible in the frame capture |
| `$D02E` | vic_sprite7_colour | `$133A` STY | display service; sprite/raster writes visible in the frame capture |
| `$D400` | sid_v1_freq_lo | `$1E6C` STA indexed, `$1EF9` STA indexed | sound hardware access; effect or tune attribution open |
| `$D401` | sid_v1_freq_hi | `$1E72` STA indexed, `$1EFF` STA indexed | sound hardware access; effect or tune attribution open |
| `$D404` | sid_v1_control | `$1F1E` STA indexed | sound hardware access; effect or tune attribution open |
| `$D405` | sid_v1_attack_decay | `$1F09` STA indexed | sound hardware access; effect or tune attribution open |
| `$D406` | sid_v1_sustain_release | `$1F0F` STA indexed | sound hardware access; effect or tune attribution open |
| `$D415` | sid_filter_cutoff_lo | `$1E84` STA | sound hardware access; effect or tune attribution open |
| `$D416` | sid_filter_cutoff_hi | `$1E8A` STA | sound hardware access; effect or tune attribution open |
| `$D417` | sid_filter_resonance | `$1CF7` STA, `$1D12` STA | sound hardware access; effect or tune attribution open |
| `$D418` | sid_filter_mode_volume | `$1D1B` STA | sound hardware access; effect or tune attribution open |
| `$D800` | colour_ram | `$1044` STA indexed, `$6050` LDA indexed, `$617E` LDA indexed, `$6769` STA indexed, `$68E3` LDA indexed, `$8F44` LDA indexed | hidden-RAM dictionary high bytes at $68E3, with I/O banked out |
| `$D8A0` | unnamed / RAM candidate | `$5C3A` STA indexed, `$5C43` STA indexed, `$6AF4` STA indexed | banking and use open |
| `$D8F0` | unnamed / RAM candidate | `$6B01` STA indexed | banking and use open |
| `$D900` | unnamed / RAM candidate | `$1047` STA indexed, `$604A` LDA indexed, `$6178` LDA indexed, `$68DD` LDA indexed, `$8F3E` LDA indexed | hidden-RAM dictionary low bytes at $68DD, with I/O banked out |
| `$D9B8` | unnamed / RAM candidate | `$6B0B` STA indexed | banking and use open |
| `$DA00` | unnamed / RAM candidate | `$104A` STA indexed | banking and use open |
| `$DA80` | unnamed / RAM candidate | `$6B18` STA indexed | banking and use open |
| `$DAD0` | unnamed / RAM candidate | `$6B25` STA indexed | banking and use open |
| `$DB00` | unnamed / RAM candidate | `$104D` STA indexed | banking and use open |
| `$DB43` | unnamed / RAM candidate | `$6058` LDA indexed | banking and use open |
| `$DB70` | unnamed / RAM candidate | `$60CC` STA indexed, `$6105` STA indexed | banking and use open |
| `$DB97` | unnamed / RAM candidate | `$61D5` STA indexed | banking and use open |
| `$DB98` | unnamed / RAM candidate | `$60D4` STA indexed, `$610B` STA indexed, `$61ED` STA indexed, `$6202` STA indexed | banking and use open |
| `$DBC0` | unnamed / RAM candidate | `$60CF` STA indexed, `$6108` STA indexed | banking and use open |
| `$DC00` | cia1_port_a | `$1870` LDA, `$1887` STA, `$19B3` STA | input-port access; keyboard/joystick paths need tracing |
| `$DC01` | cia1_port_b | `$186D` STA, `$188A` LDA, `$19BB` LDA | input-port access; keyboard/joystick paths need tracing |
| `$DC02` | cia1_ddr_a | `$1867` STA, `$187C` STA, `$19B0` STA | input-port access; keyboard/joystick paths need tracing |
| `$DC03` | cia1_ddr_b | `$1862` STA, `$1881` STA, `$19B8` STA | input-port access; keyboard/joystick paths need tracing |
| `$DC0D` | cia1_interrupt | `$0F89` LDA, `$114B` LDA, `$135B` LDY, `$13A3` LDY | IRQ acknowledgement in raster handlers |
| `$DC0E` | cia1_control_a | `$0F96` STA | banking and use open |
| `$DC0F` | cia1_control_b | `$0F99` STA | banking and use open |
| `$DC23` | unnamed / RAM candidate | `$8F4E` LDA indexed | banking and use open |
| `$DC5D` | unnamed / RAM candidate | `$68EB` LDA indexed | self-modified dictionary-read operand in the saved state; not a fixed hardware access |
| `$DCD6` | unnamed / RAM candidate | `$18C6` LDA indexed | hidden-RAM keyboard translation; port $24 selected before $18C6 |
| `$DD00` | cia2_port_a | `$0F8C` LDA, `$0F91` STA, `$1AFC` STA, `$1B1A` BIT, `$1B21` STA, `$1B3C` LDA, `$1B3F` STY, `$1B4D` LDA, `$1B50` STY, `$1B73` STY, `$1B83` STY | banking and use open |
| `$DD0D` | cia2_interrupt | `$1A26` STA, `$1A4A` STA, `$1A66` STA, `$1A84` STA, `$1A90` STA, `$1AB4` STA | banking and use open |
| `$DD56` | unnamed / RAM candidate | `$25FF` LDA indexed | hidden-RAM note-frequency lookup; callers select port $24 |
| `$DDB4` | unnamed / RAM candidate | `$25FB` LDA indexed | hidden-RAM note-frequency lookup; callers select port $24 |

## String sweep

The snapshot was swept as screen codes, PETSCII, and printable ASCII. The opening text is stored as literal ASCII mixed with bytes above $7F; a printable run alone is not a complete sentence. High-byte word substitutions are decoded by $68D4-$691C; additional formatting controls are decoded by $67B5-$6865. No build identifier was established.

| Address | Literal span |
|---|---|
| `$791C` | with several pencils |
| `$7A3E` | an "I GROK SPOCK" button taps you on |
| `$8323` | Oh come on, enter your name. |
| `$9867` | You are standing on the sidewalk on |
| `$9AE5` | You are standing in the lobby of the |
| `$9F16` | There is also a combination video |
| `$A966` |          Welcome to Labyrinth |

## Dictionary example verification

`test_dictionary.js` compares the page’s word-expansion function with the original parser at `$67B5` and expansion routine `$68D4`, using bytes reconstructed from the committed opening listing. Every dictionary index (0–255) is exercised with each token `$FB/$FC/$FD/$FE`: 1,024 cases, all equal. The glyph-write routine `$6891` is intercepted to record emitted bytes, and line finishing `$6866` is intercepted to avoid drawing the window. This checks word selection, first-byte subtraction, and following spaces; it does not verify the full window renderer or formatting controls.

The page offers entries beginning with lowercase letters so its “Capital initial” control describes the byte operation correctly. The original code subtracts `$20` from the first byte regardless of its existing case; the test includes already-capitalized and empty entries too. The widget’s combinations are exploratory, not claims that a particular sentence requests them.

The passage stepper embeds only the zero-terminated records `$9867-$98A6` and `$98A7-$98F0`, taken from the same opening snapshot. Its pieces group consecutive literal letters, retain `$FF` line breaks, expand dictionary references, and stop at `$00`. The committed test confirms every embedded byte against the listing and compares all 19 displayed prefixes with the original parser. The line-break call at `$67C4` is recorded as a newline; glyph output and window line finishing are intercepted as above. Browser typography and layout are outside this comparison.

## Character viewer verification

The character viewer embeds the opening snapshot’s `$D000-$D7FF` font, the same data as the glyph sheet. `test_font.js` checks all 2,048 bytes against the committed listing and compares each of the 256 monochrome glyphs, pixel for pixel, with `C64.drawGlyph` in `site/lib/c64.js`. The display uses high-bit-first rows and an optional grid. This verifies the font excerpt and monochrome shape decoding; it does not assert that every font slot is used during play or reproduce multicolour display modes.

## Word-wheel prefixes

`$5F2C` appends a typed byte to `$6683` and increments the length `$6682`, except when that length equals ten. Bytes at least `$5B` are reduced by `$20`; ordinary lowercase letters therefore compare as uppercase. `$612C` applies the same fold while searching dictionary words. Entries with a negative flag at `$66FB` are skipped. The first character begins searching at wheel base plus one; later characters begin at the selected slot. The exact loop bounds are described in the listing.

On a failed match, `$61C3-$61C8` writes `$02` to the border and decrements the prefix length. The preceding accepted prefix and selected word remain intact. `$61F7` clears the complete prefix and restores its colour cells without changing the selected word. The normal keyboard table’s Delete entry is `$FE`, dispatched to this routine by `$5D6F-$5D73`.

**Live check:** restore the saved opening, select the active action wheel already present there, and press G, Z, O, and Delete (matrix row 0, column 0). Each key was held for 20 frames and released for 20. Observed (prefix, action slot): initial `('',6)`; G `('G',4)`; Z `('G',4)`; O `('GO',5)`; Delete `('',5)`. Slots 6, 4, and 5 resolve to inventory, give, and go. The emulator state from before the probe was preserved and restored. The raw probe stays in ignored `work/wheel-live.json`.

`test_wheel.js` runs the original routines from the committed listing, stopping at the successful redraw entry `$5EB0` so that selection can be checked independently of drawing. It checks the recorded replay, red-border writes on rejection, clear-prefix behavior, and upper/lowercase agreement for 112 prefixes across 23 available entries in the saved action, destination, and inventory wheels. Separate cases exercise append lengths 0, 9, and 10. These are tests of the saved wheel configuration, not a census of every scene’s choices.

**Open quantity boundary:** `$6031` displays inventory counts by adding `$31` to entry values 1–9 and placing that byte between parentheses. Value 8 displays `(9)`; value 9 would display `(:)`, rather than a two-digit quantity. Simulator cases confirm these byte results and omitted suffixes at 0 and 10. Whether an ordinary sequence of play can produce value 9 remains open; this is not an established player-reachable bug.

## GO HOME: destinations and replies

The opening’s `$9114` handler indexes two fourteen-byte tables with location `$8C80`: high bytes at `$AA58`, low bytes at `$AA66`. The common handler `$90C6` stores the low byte in `$10`. When the high byte is zero, it also writes that low byte into `$8C80` and jumps to `$8FD7` for arrival text. Otherwise the pair is a message pointer, printed through `$8CE3`, with the location unchanged. These are mixed destination/message entries, so the tables are typed as bytes, not pure address pointers.

In this snapshot, locations 1–4 (the streets) point to home location 5. Location 5 points to `$9B32`, “You are home!” Locations 6 (ticket counter), 7 (popcorn stand), and 13 (theater lobby) point to `$9938`, “You can't go home from here.” Other entries include a direction-refusal reply at `$9B14`. The page offers the eight named street/home/counter/lobby states; the test covers every stored entry, including the remaining indices.

`test_home.js` checks the embedded table bytes against the listing, runs the original handler for all 14 location indices, and compares the page’s selected destination or reply pointer. A hook at `$8FD7` stops movement before arrival processing; a hook at `$8CE3` records the chosen reply pointer. The test then runs each of the three embedded reply strings through `$67B5`, intercepting glyph writes and line finishing as in the dictionary tests. This checks selection and reply text, not later arrival side effects or player reachability of every index.

## Ticket check and payment

`$6740` is inventory slot 23 at `$6729+$17`; its dictionary index is `$4A`, ticket. As in the other inventory entries, a negative byte marks absence and zero represents one unit. At ticket-counter location 6, `$90F4` rejects GO EAST when that byte is negative, printing `$9F52`, “You can't enter without a ticket.” A nonnegative byte permits the ordinary east table at `$AA20/$AA2E`, whose entry there selects lobby location 13. Other locations bypass this extra check.

The GIVE handler at `$9327` reaches the purchase branch when location is 6 and the selected inventory slot `$666F` is 6, dollar bill. Dollar count `$672F` is stored one below the displayed owned quantity. Values below 4 therefore mean fewer than five dollars and select `$A886`, the insufficient-money response. On success the branch subtracts 4, stores zero in the ticket entry, and selects `$A00D`, the ticket response. Its common completion calls `$087F`, which removes one further unit from the selected dollar slot. The combined debit is five dollars.

`test_ticket.js` compares the page’s eastward decision with the original `$90F4` routine for all 14 location indices and all 256 ticket bytes (3,584 cases). Movement stops at the arrival routine; reply hooks record the pointer. The refusal string is separately compared with the original parser. The purchase test runs the complete `$9327` path, including the real `$087F` debit, with one through nine owned dollars. Message rendering and wheel redraw are intercepted; the money and ticket bytes and selected response pointers are checked. Unavailable dollars are not forced into the selected-item path.

## Popcorn dollar payment

At popcorn-stand location 7, selected dollar slot 6 reaches `$93E1`. A nonzero `$9688` prints `$A1F0` and returns without charging. With zero flag, dollar entry `$672F` below one selects insufficient-money reply `$A886`. Otherwise it subtracts one, sets popcorn entry `$6739` to zero (one box), increments the purchase flag, and selects `$A148`. Common completion `$94A5` calls the actual `$087F` removal routine, charging the second dollar. The branch also writes local description/state bytes; interpreting subsequent coin collection remains open.

`test_popcorn.js` runs the original GIVE routine for 1–9 owned dollars and all 256 purchase-flag values: 2,304 comparisons of remaining money, added popcorn, flag and reply. The actual inventory debit runs; text output and wheel redraw are intercepted. It additionally checks the success-path writes to `$968B-$968D`, `$AAB3`, and `$AAA5/$AA97`, and compares all three page reply strings through the original parser, including stored line breaks. These cases assume an available selected dollar and initially absent popcorn; they do not assert reachability of every artificial flag value.
