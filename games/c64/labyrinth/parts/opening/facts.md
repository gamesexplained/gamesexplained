# The text adventure — technical facts

Source image: `work/play.vsf`, captured at the initial sidewalk prompt, as described in the game’s `orientation.md`. Unless marked live, statements below come from the snapshot and its exported disassembly. This is a Bronze sweep; most routine purposes and the room overlays beyond the opening are analysed separately.

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

The platform’s all-opcode scan found no undocumented opcodes in the exported code blocks. Six short untyped gaps between code runs remain to be classified; that result does not describe untraced memory. The listing also flags unclassified RAM beneath I/O outside the font and `$DE12-$DEFD` routine. These are open Bronze work items, not exclusions justified by non-use.

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
| `$D012` | vic_raster | `$1269` STY, `$1358` STY, `$13A0` STY | display service; sprite/raster writes visible in the frame capture |
| `$D016` | vic_control2 | `$1150` STA, `$137C` STY | display service; sprite/raster writes visible in the frame capture |
| `$D018` | vic_memory | `$1382` STY | display service; sprite/raster writes visible in the frame capture |
| `$D019` | vic_irq_status | `$1148` STA, `$1353` STY, `$139B` STY | display service; sprite/raster writes visible in the frame capture |
| `$D01D` | vic_sprite_expand_x | `$12B2` STY | display service; sprite/raster writes visible in the frame capture |
| `$D020` | vic_border | `$1278` STY | display service; sprite/raster writes visible in the frame capture |
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
| `$D800` | colour_ram | `$68E3` LDA indexed | open |
| `$D8A0` | unnamed / RAM candidate | `$6AF4` STA indexed | open |
| `$D8F0` | unnamed / RAM candidate | `$6B01` STA indexed | open |
| `$D900` | unnamed / RAM candidate | `$68DD` LDA indexed | open |
| `$D9B8` | unnamed / RAM candidate | `$6B0B` STA indexed | open |
| `$DA80` | unnamed / RAM candidate | `$6B18` STA indexed | open |
| `$DAD0` | unnamed / RAM candidate | `$6B25` STA indexed | open |
| `$DB70` | unnamed / RAM candidate | `$6105` STA indexed | open |
| `$DB98` | unnamed / RAM candidate | `$610B` STA indexed | open |
| `$DBC0` | unnamed / RAM candidate | `$6108` STA indexed | open |
| `$DC00` | cia1_port_a | `$1870` LDA, `$1887` STA, `$19B3` STA | input-port access; keyboard/joystick paths need tracing |
| `$DC01` | cia1_port_b | `$186D` STA, `$188A` LDA, `$19BB` LDA | input-port access; keyboard/joystick paths need tracing |
| `$DC02` | cia1_ddr_a | `$1867` STA, `$187C` STA, `$19B0` STA | input-port access; keyboard/joystick paths need tracing |
| `$DC03` | cia1_ddr_b | `$1862` STA, `$1881` STA, `$19B8` STA | input-port access; keyboard/joystick paths need tracing |
| `$DC0D` | cia1_interrupt | `$114B` LDA, `$135B` LDY, `$13A3` LDY | IRQ acknowledgement in raster handlers |
| `$DC5D` | unnamed / RAM candidate | `$68EB` LDA indexed | open |
| `$DCD6` | unnamed / RAM candidate | `$18C6` LDA indexed | open |
| `$DD00` | cia2_port_a | `$1AFC` STA, `$1B1A` BIT, `$1B21` STA, `$1B3C` LDA, `$1B3F` STY, `$1B4D` LDA, `$1B50` STY, `$1B73` STY, `$1B83` STY | open |
| `$DD0D` | cia2_interrupt | `$1A66` STA, `$1A84` STA | open |
| `$DD56` | unnamed / RAM candidate | `$25FF` LDA indexed | open |
| `$DDB4` | unnamed / RAM candidate | `$25FB` LDA indexed | open |

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
