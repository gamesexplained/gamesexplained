# The text adventure — technical facts

Source image: `work/play.vsf`, captured at the initial sidewalk prompt, as described in the game’s `orientation.md`. Unless marked live, statements below come from the snapshot and its exported disassembly. The opening ledger has descriptions for all 48,261 tracked bytes: 25,258 code and 23,003 data. The room overlays have no exported analysis. A description of retained opaque bytes records their provenance and boundaries; it does not establish their purpose.

## Interrupt and banking

- **Live capture:** the IRQ chain repeatedly changes `$FFFE/$FFFF` within a frame. The initial snapshot vector is `$127C`; `$113A` is another chain entry visible in the captured writes.
- `$113A` pushes A, X, and Y, selects `$25` at the processor port, calls `$1267`, acknowledges VIC/CIA interrupt state, updates counters, and dispatches several services. The services cover input, clock/countdowns, movement, sound and display state; their entry descriptions are in the listing. It restores banking from `$61` before returning.
- `$1267` schedules raster `$3D` and installs `$127C`. `$127C` copies six sprite X positions from `$02CC-$02D1`, sets the first six sprite Y values to `$46`, and schedules `$136F` at raster `$50`.
- `$11C1` is RTI, and is the NMI vector target in the saved state.
- `$69E1-$69EE` writes processor-port value `$24`, calls `$DE12` from RAM beneath I/O, and restores `$25`. `$DE12-$DE1D` fills 34 cells at each of `$CCA2` and `$CED2` with `$0A`. The complete routine builds the message-window edges and colour cells; its branch and loop descriptions cover the full $DE12-$DEFD allocation.

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

Some other slots are blank or graphical. They must not be decoded by assuming the complete ASCII punctuation set. Literal stored text uses ASCII bytes, interspersed with bytes above `$7F`. These high bytes break words as well as sentences; they are not a second proven alphabet. The expansion table is split into high bytes at $D800 and low bytes at $D900. The parser at $67CA-$67FB sets a case/space flag for each token and jumps to the word reader at $68D4-$691C: token $FB emits the selected word, $FC uppercases it, $FD appends a space, and $FE uppercases it and appends a space. Each token is followed by an index. The dictionary string ends at zero. The routine temporarily banks I/O out with port value $24 while reading these RAM tables. Exact text capitalization is obtained by subtracting $20 from the first emitted character when the high flag is set. The flag is then reduced to its space bit, so subsequent letters retain their stored case.

## Scope of the sweeps

`tx` nearly matches the snapshot at `$7900`, while its executable jump targets point farther into the same region. Do not type the entire file as text. The normal screen-code/PETSCII sweeps found few readable sentences; including lowercase ASCII recovered the literal spans below.

The file comparison found a strong `ds` match at `$BC00`, a partial initial-program match at `$0800`, and a near-complete `tx` match at `$7900`. An overlapping loaded region is not an independent twin copy. No second equivalent engine was established by this comparison; packed copies and other loads remain open.

The annotation pass follows the 42 resident overlay API jump stubs, command pointers, patched calls and both variants of the raster strip handlers. The remaining code gaps were classified from these entry points. Hidden RAM includes the font, dictionary, keyboard data, 94 note-frequency pairs, the message-window routine and the explicit retained tail. The final listing build reports no unaccounted loaded-data stretches.

Four extents remain opaque: `$747E-$74FF` (130 bytes), `$8367-$8AFF` (1,945 bytes), `$DEFE-$DFFF` (258 bytes), and the TX descriptor trailer `$ACAA-$ACC9` (32 bytes). They are unchanged between hand-over and play. Their complete bytes remain in the ledger with provenance comments. `test_opening_scope.py` checks twelve bounded chunks, their digests, 575 known directory/API targets, and 11,097 decoded instruction operands. No direct operand or checked pointer target lands in those extents. This is a bounded negative result: it does not prove that arbitrary indirect inputs, another overlay or an unrecognised format cannot use them. Their purpose is unknown.

Generated state is excluded only with a producer or allocation boundary: processor/game state, the wheel descriptor copy, command echo, screen, scale multiples and cleared costume buffers. The DS payload ends at `$C4D2`; later scene-node allocations beyond it retain power-on RAM in this opening. `test_resident.js` checks the clearing boundaries and scale generation, and `opening_image.js` reconstructs the excluded wheel workspace with the original descriptor-copy routine for the tests.

## Error rate

The listing comments describe inspected code, rendered data, and dictionary records decoded by a script from their RAM pointers. The independent sample of 19 October 2026 drew 60 of 1,303 line comments across the opening and gate with seed 20261019; 59 drawn comments belong to the opening. Two opening comments had wrong details and were corrected: `$2984` does not consistently sort three depths, and `$BCCF` copies at most ten nonzero name bytes. The original-code counterexample for `$2984` uses depths [100,20,50] and returns slots [2,0,1,3], hence depths [50,100,20]. `$BCCF` was checked with name lengths 0,1,4,9,10 and 28; it leaves the destination tail unchanged. The sample result is two wrong of 60 before those corrections, within the kit’s mark. No full audit was performed; one remains recommended. The ordinary reachability and visual effect of the ordering counterexample remain open.

## Hardware register census

Absolute/indexed operands in the complete typed opening/resident image, with the declared banking overrides applied. Indexed rows name the base, not every reachable address. Indirect accesses are outside this census; a missing row does not establish non-use. This includes resident services for later graphical loads without establishing those loads’ behavior.

| Operand | Meaning at these instruction sites | Instruction sites |
|---|---|---|
| `$D000` | vic_sprite0_x (I/O) | `$1285` STY, `$180B` STY, `$1823` STY |
| `$D001` | vic_sprite0_y (I/O) | `$1345` STY, `$138D` STY, `$143E` STY, `$14E5` STY, `$158C` STY, `$1633` STY, `$16DA` STY, `$17F9` STY |
| `$D002` | vic_sprite1_x (I/O) | `$128B` STY, `$1811` STY, `$1826` STY |
| `$D003` | vic_sprite1_y (I/O) | `$1348` STY, `$1390` STY, `$1441` STY, `$14E8` STY, `$158F` STY, `$1636` STY, `$16DD` STY, `$17FC` STY |
| `$D004` | vic_sprite2_x (I/O) | `$1291` STY |
| `$D005` | vic_sprite2_y (I/O) | `$134B` STY, `$1393` STY, `$1444` STY, `$14EB` STY, `$1592` STY, `$1639` STY, `$16E0` STY |
| `$D006` | vic_sprite3_x (I/O) | `$1297` STY |
| `$D007` | vic_sprite3_y (I/O) | `$134E` STY, `$1396` STY, `$1447` STY, `$14EE` STY, `$1595` STY, `$163C` STY, `$16E3` STY |
| `$D008` | vic_sprite4_x (I/O) | `$129D` STY |
| `$D009` | vic_sprite4_y (I/O) | `$133F` STY, `$1387` STY, `$1438` STY, `$14DF` STY, `$1586` STY, `$162D` STY, `$16D4` STY |
| `$D00A` | vic_sprite5_x (I/O) | `$12A3` STY |
| `$D00B` | vic_sprite5_y (I/O) | `$1342` STY, `$138A` STY, `$143B` STY, `$14E2` STY, `$1589` STY, `$1630` STY, `$16D7` STY |
| `$D00C` | vic_sprite6_x (I/O) | `$1317` STY |
| `$D00D` | vic_sprite6_y (I/O) | `$1321` STY |
| `$D00E` | vic_sprite7_x (I/O) | `$131C` STY |
| `$D00F` | vic_sprite7_y (I/O) | `$1326` STY |
| `$D010` | vic_sprite_x_msb (I/O) | `$12AC` STA, `$181A` STA, `$182B` STY |
| `$D011` | vic_control1 (I/O) | `$0F23` STA, `$0F66` STA, `$17C8` STY |
| `$D012` | vic_raster (I/O) | `$0F7B` STA, `$1269` STY, `$1358` STY, `$13A0` STY, `$1414` STY, `$144C` STY, `$14BB` STY, `$14F3` STY, `$1562` STY, `$159A` STY, `$1609` STY, `$1641` STY, `$16B0` STY, `$16E8` STY, `$1757` STY, `$1780` STY, `$17CD` STY, `$1841` STY |
| `$D015` | vic_sprite_enable (I/O) | `$093B` STA, `$0957` STA, `$0F9E` STY, `$52BF` STA, `$6252` STX |
| `$D016` | vic_control2 (I/O) | `$1150` STA, `$137C` STY, `$17BE` STY |
| `$D017` | vic_sprite_expand_y (I/O) | `$10EC` STA |
| `$D018` | vic_memory (I/O) | `$0F76` STA, `$1382` STY, `$17C3` STY |
| `$D019` | vic_irq_status (I/O) | `$0F83` STA, `$1148` STA, `$1353` STY, `$139B` STY, `$1423` STY, `$146C` STY, `$14CA` STY, `$1513` STY, `$1571` STY, `$15BA` STY, `$1618` STY, `$1661` STY, `$16BF` STY, `$1708` STY, `$1766` STY, `$178F` STY, `$17DC` STY, `$183C` STY |
| `$D01A` | vic_irq_enable (I/O) | `$0F86` STA |
| `$D01B` | vic_sprite_priority (I/O) | `$10EF` STA |
| `$D01C` | vic_sprite_multicolour (I/O) | `$10FA` STA |
| `$D01D` | vic_sprite_expand_x (I/O) | `$10E9` STA, `$12B2` STY, `$1801` STY |
| `$D01E` | vic_sprite_collision (I/O) | `$10F2` STA |
| `$D01F` | vic_sprite_bg_collision (I/O) | `$10F5` STA |
| `$D020` | vic_border (I/O) | `$0F20` STA, `$1055` STA, `$1278` STY, `$61C5` STA |
| `$D021` | vic_background0 (I/O) | `$1058` STA, `$140F` STY, `$177B` STY |
| `$D022` | vic_background1 (I/O) | `$1065` STA, `$5A37` STA |
| `$D023` | vic_background2 (I/O) | `$106A` STA, `$5A3D` STA |
| `$D025` | vic_sprite_mc0 (I/O) | `$1060` STA |
| `$D026` | vic_sprite_mc1 (I/O) | `$105B` STA |
| `$D027` | vic_sprite0_colour (I/O) | `$12F4` STY, `$1831` STY |
| `$D028` | vic_sprite1_colour (I/O) | `$12FA` STY, `$1837` STY |
| `$D029` | vic_sprite2_colour (I/O) | `$1300` STY |
| `$D02A` | vic_sprite3_colour (I/O) | `$1306` STY |
| `$D02B` | vic_sprite4_colour (I/O) | `$130C` STY |
| `$D02C` | vic_sprite5_colour (I/O) | `$1312` STY |
| `$D02D` | vic_sprite6_colour (I/O) | `$1335` STY |
| `$D02E` | vic_sprite7_colour (I/O) | `$133A` STY |
| `$D400` | sid_v1_freq_lo (I/O) | `$1E6C` STA indexed, `$1EF9` STA indexed |
| `$D401` | sid_v1_freq_hi (I/O) | `$1E72` STA indexed, `$1EFF` STA indexed |
| `$D404` | sid_v1_control (I/O) | `$1F1E` STA indexed |
| `$D405` | sid_v1_attack_decay (I/O) | `$1F09` STA indexed |
| `$D406` | sid_v1_sustain_release (I/O) | `$1F0F` STA indexed |
| `$D415` | sid_filter_cutoff_lo (I/O) | `$1E84` STA |
| `$D416` | sid_filter_cutoff_hi (I/O) | `$1E8A` STA |
| `$D417` | sid_filter_resonance (I/O) | `$1CF7` STA, `$1D12` STA |
| `$D418` | sid_filter_mode_volume (I/O) | `$1D1B` STA |
| `$D800` | colour_ram (I/O) | `$1044` STA indexed, `$6769` STA indexed |
| `$D800` | hidden RAM (RAM) | `$6050` LDA indexed, `$617E` LDA indexed, `$68E3` LDA indexed, `$8F44` LDA indexed |
| `$D8A0` | unnamed register or mirror (I/O) | `$5C3A` STA indexed, `$5C43` STA indexed, `$6AF4` STA indexed |
| `$D8F0` | unnamed register or mirror (I/O) | `$6B01` STA indexed |
| `$D900` | unnamed register or mirror (I/O) | `$1047` STA indexed |
| `$D900` | hidden RAM (RAM) | `$604A` LDA indexed, `$6178` LDA indexed, `$68DD` LDA indexed, `$8F3E` LDA indexed |
| `$D9B8` | unnamed register or mirror (I/O) | `$6B0B` STA indexed |
| `$DA00` | unnamed register or mirror (I/O) | `$104A` STA indexed |
| `$DA80` | unnamed register or mirror (I/O) | `$6B18` STA indexed |
| `$DAD0` | unnamed register or mirror (I/O) | `$6B25` STA indexed |
| `$DB00` | unnamed register or mirror (I/O) | `$104D` STA indexed |
| `$DB43` | hidden RAM (RAM) | `$6058` LDA indexed |
| `$DB70` | unnamed register or mirror (I/O) | `$60CC` STA indexed, `$6105` STA indexed |
| `$DB97` | unnamed register or mirror (I/O) | `$61D5` STA indexed |
| `$DB98` | unnamed register or mirror (I/O) | `$60D4` STA indexed, `$610B` STA indexed, `$61ED` STA indexed, `$6202` STA indexed |
| `$DBC0` | unnamed register or mirror (I/O) | `$60CF` STA indexed, `$6108` STA indexed |
| `$DC00` | cia1_port_a (I/O) | `$1870` LDA, `$1887` STA, `$19B3` STA |
| `$DC01` | cia1_port_b (I/O) | `$186D` STA, `$188A` LDA, `$19BB` LDA |
| `$DC02` | cia1_ddr_a (I/O) | `$1867` STA, `$187C` STA, `$19B0` STA |
| `$DC03` | cia1_ddr_b (I/O) | `$1862` STA, `$1881` STA, `$19B8` STA |
| `$DC0D` | cia1_interrupt (I/O) | `$0F89` LDA, `$114B` LDA, `$135B` LDY, `$13A3` LDY, `$1426` LDY, `$146F` LDY, `$14CD` LDY, `$1516` LDY, `$1574` LDY, `$15BD` LDY, `$161B` LDY, `$1664` LDY, `$16C2` LDY, `$170B` LDY, `$1769` LDY, `$1792` LDY, `$17DF` LDY, `$1844` LDY |
| `$DC0E` | cia1_control_a (I/O) | `$0F96` STA |
| `$DC0F` | cia1_control_b (I/O) | `$0F99` STA |
| `$DC23` | hidden RAM (RAM) | `$8F4E` LDA indexed |
| `$DC5D` | hidden RAM (RAM) | `$68EB` LDA indexed |
| `$DCD6` | hidden RAM (RAM) | `$18C6` LDA indexed |
| `$DD00` | cia2_port_a (I/O) | `$0F8C` LDA, `$0F91` STA, `$1AFC` STA, `$1B1A` BIT, `$1B21` STA, `$1B3C` LDA, `$1B3F` STY, `$1B4D` LDA, `$1B50` STY, `$1B73` STY, `$1B83` STY |
| `$DD0D` | cia2_interrupt (I/O) | `$1A26` STA, `$1A4A` STA, `$1A50` STA, `$1A5A` STA, `$1A66` STA, `$1A84` STA, `$1A90` STA, `$1AB4` STA |
| `$DD56` | hidden RAM (RAM) | `$25FF` LDA indexed |
| `$DDB4` | hidden RAM (RAM) | `$25FB` LDA indexed |
| `$DE12` | unnamed register or mirror (I/O) | `$69E7` JSR |

## String sweep

The snapshot was swept as screen codes, PETSCII, and printable ASCII. The opening text is stored as literal ASCII mixed with bytes above $7F; a printable run alone is not a complete sentence. High-byte word substitutions are decoded by $68D4-$691C; additional formatting controls are decoded by $67B5-$6865. The bounded literal credit at `$743D-$747D` reads `Labyrinth, (c) 1986 Lucasfilm Ltd., All Rights Reserved. V 1.0 V`, followed by zero. This identifies the stored build string without proving a different disk edition equivalent.

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

At popcorn-stand location 7, selected dollar slot 6 reaches `$93E1`. A nonzero `$9688` prints `$A1F0` and returns without charging. With zero flag, dollar entry `$672F` below one selects insufficient-money reply `$A886`. Otherwise it subtracts one, sets popcorn entry `$6739` to zero (one box), increments the purchase flag, and selects `$A148`. Common completion `$94A5` calls the actual `$087F` removal routine, charging the second dollar. The branch also sets complaint phase one, counter quarter count two, and the quarter pickup slot; the change sequence below verifies their consumers.

`test_popcorn.js` runs the original GIVE routine for 1–9 owned dollars and all 256 purchase-flag values: 2,304 comparisons of remaining money, added popcorn, flag and reply. The actual inventory debit runs; text output and wheel redraw are intercepted. It additionally checks the success-path writes to `$968B-$968D`, `$AAB3`, and `$AAA5/$AA97`, and compares all three page reply strings through the original parser, including stored line breaks. These cases assume an available selected dollar and initially absent popcorn; they do not assert reachability of every artificial flag value.

## Complete opening text corpus

`$7910-$833F` and `$968E-$A9E7` contain 127 zero-terminated streams, totaling 7,562 bytes. The former 54-record subset is `$9816-$A3D6`. Every stream is shorter than 256 bytes. Parsing token operands separately from text shows that these records use literal printable bytes, `$40` (skipped), `$FB/$FC` (dictionary insertion), `$FD/$FE` (insertion with following space), and `$FF` (line break). `$FC/$FE` subtract `$20` from the dictionary word’s first character. Their line comments contain the full captured-state expansion; the description generator uses this rule for each record rather than inferring a caller or a reachable command. Headered resident messages also use framing controls `$F7-$FA`; `test_records.js` exercises them through the original parser on both colour-dependent finishing paths.

`test_responses.js` checks all 127 expansions against the actual `$67B5` parser and `$68D4` word reader from the listing, with glyph output and line finishing intercepted. It verifies every source byte is present, every boundary and zero terminator, complete coverage of the two 7,562-byte regions, and the expanded text in each generated listing description. The page’s reply browser displays these checked strings. Browser font metrics and window wrapping are outside the comparison.

The `$9FB4-$A00C` offer-refusal message crosses `$A000`; continuation labels describe the same stream on both sides. Its dictionary-index operand at `$9FBE` is `$11` (girl) in the captured state. The setup branch at `$8E60-$8E9D` writes `$10` (boy) there. A test runs `$8E16` with W input supplied through the input hook, then passes the modified reply through the actual parser and confirms the changed word. Setup also patches other text operands; this check does not claim to cover all of them.

The decoded `$A03D` menu asks $1.25 for popcorn. The verified payment path removes two dollar bills and `$A148` describes two quarters in change plus a dropped nickel. Two complaints add the third quarter, as verified below. Three quarters of change from the two-dollar payment produce the advertised $1.25 charge; keeping or returning the separately dropped nickel is another decision.

## Resident records and boundary checks

`$6C02-$6C7B` contains split message pointers for 32 scene/title entries and 29 object/terminal entries, including a mutable custom-dialog pointer. Together with twelve short resident messages and the menu/slot templates, 58 unique headered messages are decoded. `test_records.js` compares their body text and layout/colour headers with the original `$6782` parser. Stored later-scene descriptions establish text, not those puzzles.

The default sound directory has 59 entries; the menu directory has 35. Their streams contain 255 parsed events. Event bits select voice/filter paths, cached values, durations, slides, envelopes, immediate register changes, control bits, chaining and repeats. `test_records.js` executes each event with the original parser, checking length, cached value, duration, slide and envelope fields where present. Loop counters are set to exercise fall-forward; this is not an audible tune comparison. The menu tune has 28 three-voice groups and 49 distinct note/instrument sequences. The 94 frequency pairs lie at `$DD56-$DE11` under I/O. Tune identity and audible playback still need verification for Silver.

`test_costume.js` checks 1,152 unrolled painter suffix/mask cases and all 65,536 depth/input pairs. `$2ACF` sums rounded bit weights; it is not an ordinary multiply. `test_resident.js` checks all 65,536 random seeds against `(37*seed+17) mod 65536`, four screen shifts, initialization boundaries, 512 low-pointer rewind states and cached writes for seven sound slots. `$687D` computes a high-byte borrow but stores only the low-byte subtraction; its comment preserves that behavior.

`test_opening_services.js` checks the twelve later strip-pointer handlers with three Y values each, including sprite pointers, Y preservation, raster/vector scheduling and IRQ acknowledgement. It also checks nine colour names with exact, trailing, lowercase and short inputs. The matcher uppercases dictionary letters but expects the input already normalized. A complete name with trailing characters is accepted. It tests a tenth entry using the mutable result byte; the caller rejects result indices at least nine. Success flag alone therefore does not prove an accepted colour.

The hand-over snapshot is at PC `$8D14`, before TX setup. Its `$7900-$ACC9` payload matches the disk file in all 13,258 bytes. The seven differences in the playable TX image are `$8C80` location, `$8C83` colour-match flag, `$8F4F/$8F50` patched dictionary pointer, `$8F94` result and `$AA91/$AA9F` street-description pointer. There is no TX startup-only difference in that comparison. Other resident startup and runtime mutations remain represented by the selected play image and their producer descriptions.


## Popcorn change and nickel disposition

Purchase writes complaint phase `$968C=1`, counter quarters `$968D=2` and pickup slot `$AAB3=$11` (quarter). The initial quarter inventory is `$FF` (none); inventory entries encode quantity minus one. The route used here keeps the nickel supplied by character setup, so its starting inventory byte is zero (one coin).

| Command/state | Result |
|---|---|
| TAKE quarter, before nickel pickup | `$92F0` adds all `$968D` quarters to `$673A` modulo 256 and clears the counter count. Makes slot twelve (nickel) available, sets the location description to `$A21F` (a nickel on the floor) and replies `$97F2`. |
| TAKE nickel | Adds one to `$6735`, marks `$968A=1` and `$0575=1`, clears the local pickup, sets the location description to `$A23A` and replies `$9798`. |
| COMPLAIN, phase one | Reply `$A614` (chilled-popcorn excuse), phase becomes two. |
| COMPLAIN, phase two | Reply `$A64D` (other quarter), phase becomes three and counter count increases by one. If the count was zero, restores quarter pickup and `$A68C` description. Before nickel pickup, selects the quarter-plus-nickel description from the new count. |
| COMPLAIN, phase at least three | Reply `$A69F`; no further refund. |
| TAKE extra quarter, after nickel pickup | Ordinary single-unit inventory increment, clears the pickup, sets the location description to `$A23A` and replies `$97F2`. `$968D` can remain one: the count alone does not establish an available pickup. |
| GIVE NICKEL, after pickup and before first return | Reply `$81B3`, sets return flag `$9689=1`, stores `$0575=$FF`, and removes one nickel through `$087F`. An attempted earlier or repeated return gets `$A1F0`. |

The normal-input route was initial sidewalk → GO NORTH → GO WEST → GO THEATER → GIVE DOLLAR → GO THEATER → GO NORTH. Both collect-first and complain-first sequences were replayed from the reached counter snapshot, without memory pokes, on 18 October 2026. Both produce three carried quarters after two complaints and collection. The first sequence also picks up and returns the nickel. `change-observations.json` records the selected scalar observations and route; raw screen/memory state remains ignored. The emulator’s previous snapshot and running state were restored afterward.

`test_change.js` imports the page’s actual transition function and compares 7,995 transitions with original `$927C`, `$954A` and `$9327` code, including all 17 states reachable by the example’s actions, every byte value of each exposed state field separately, and 600 deterministic mixed states. It also compares twelve command transitions with the live observations. Synthetic boundary cases do not assert ordinary reachability.

For a popcorn offer at location nine with nonnegative conversation state, `$9485` tests `$0575` for exact equality with one. One removes the whole box and selects `$80A7`; zero or `$FF` retains the box and selects `$80F6`. Nine original-code cases check these three values with three nonnegative conversation states. This establishes the isolated later offer, not its complete movie-transition timing or effects in graphical loads. The existing negative conversation branch rejects the offer rather than taking either amount.

The phase and quarter-count comments name their verified readers, including `$95BB` and `$95E3`. The independent sample and its corrections are recorded under Error rate.


## Cinema workflow diagram

The clickable diagram separates location moves (solid blue), counter actions (dashed amber) and the later offer sequence (gray). Its movement edges are west sidewalk three → counter six (east), counter six → lobby thirteen (east with a ticket), lobby thirteen → counter seven (north), counter seven → lobby thirteen (south), and lobby thirteen → main theater nine (south). Later arrival/conversation effects remain outside this movement selection.

`test_workflow.js` compares the eight displayed text records with the original parser, twenty movement/ticket cases with original direction handlers, eighteen ticket/popcorn purchase cases with the original GIVE routine, and the refund/return connection with the checked counter transition function. The diagram’s loop at the ticket counter buys a ticket without moving. The refund and coin cards represent states at location seven, rather than new rooms. It is a cinema-route guide, not a complete city map or a port of the opening.
