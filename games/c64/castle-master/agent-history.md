# Publication history

30 September 2026: contributor authorized publication directly from the existing exhaustive disassembly, online research, and a separate PR for each game. Imported annotations without claiming a new reverse-engineering run. Measured the repository’s own prose coverage and retained Bronze pending completion and maintainer review.

30 September 2026 review correction: booted Dualis disk from power-on, captured menu/play, replaced the direct-import listing with canonical generation and moved shared tooling to #125. Imported descriptions remain leads. Article held at Bronze form until verification.

## Follow-up verification on 1 October 2026

The original contribution merged while verification continued, so further work starts on `game/c64/castle-master-verification`. Rebuilt the disassembler from canonical symbols and the menu snapshot. Independently walked all 34 areas/546 records, parsed all 193 FCL streams/809 tokens, and called the native area loader for every ID. A first universal object-remainder parser rejected a local type-0 record: tracing `$7C5A` established its allowlist role, while nine-byte type-2 records require separate treatment. Native projection tests exposed the loop's zero-depth shortcut scope; the revised integer model matches fourteen vertices in three batches. Parsed the complete supplied SID phrase/order directory and corrected runtime-workspace naming for authored music. Corrected self-modified operand aliases and described renderer, collision and interpreter continuations. These checks improve the source but do not replace the remaining semantic verification or maintainer tier gate.

Cold boot required letting the Dualis intro finish unpacking before Space; early key holds did not reach its waiting loop. Stopped at $476F before the game initializer and saved entry.vsf, then at $9A44 before menu drawing. This exposed authored HUD/colour data omitted by the earlier blanket bitmap exclusion: the viewport starts empty, but surrounding art and 1000 colour cells are loaded already. Native font/instrument fixtures passed. All 65 code-byte changes have operand owners and direct writers. A parked-CPU frame capture initially failed beam phase inference when there were no intermediate watchpoint hits; unchanged $D018 stores supplied timing samples without changing pixels. The resulting reconstruction matches all 104448 pixels. A preliminary unchanged-border-store loop produced three grey-dot pixels and was replaced; it is not the retained comparison. The graphics scope also showed that coverage.include takes precedence over exclude; include only the authored matrix gaps when restoring RAM under a platform default. A false 52-word cursor-table boundary was corrected from the 43-pair consumer windows: the shared allocation is 54 words and ends $86CE.

### 1 October 2026 — serializer and palette startup

Independent object traversal predicted a 652-byte save payload; controlled native serializer/deserializer calls matched all bytes. Native disk SAVE/LOAD on a private disk copy then returned the identical payload. The initial restored-state comparison exposed IRQ clock updates; masking IRQs for the final copy comparison resolved that difference. Breakpoint cleanup was corrected to use the tool schema’s `checkpoint_num` field. The retained C200 occupant decoded as a 53-byte RAM-to-colour-hardware banking loop; a controlled call reproduced all 1024 low nibbles and reached 473B. Its following zero tail is distinct from sprite artwork. New auto-labels created by recovered code were given physical-shadow bank descriptions.

### 1 October 2026 — allocation audit, interactive article and retrospective

Authored localization, trig, topology, keyboard and music allocation tails were added explicitly; generated renderer/collision/interpreter buffers were excluded only after identifying writers/consumers. Operand aliases retain instruction-byte meanings. The completed ledger has 52,770 tracked/described bytes, zero bare bytes and no loaded-data audit stretches. Several residue/header roles and behavioral boundaries remain open in TODO.md, regardless of that metric.

The article was drafted from checked facts and rewritten under the house style. Firefox exercised all 34 area selectors/546 object records,14 native projection cases,59 glyphs,8 instrument windows and save-position controls. The display matches all 104,448 colour-index pixels after accounting for the emulator and page palettes. Raw RGB comparison initially differed because the palettes differ; the one-to-one colour correspondence matches the shared frame check.

All 17 music request groups completed 25 native ticks with the final voice root matching the independent directory. This finite check does not establish exact sustained audio. The frame phase fix passes five pure regressions and a native frame capture with zero writes; broad include precedence is now documented. Maintainer review remains necessary for Silver.


## 1 October 2026 — annotation review correction

Corrected $37C6/$37C7/$37C9 to the five-way clip-plane intersection dispatcher, selected by $104B. Corrected $2A17 to describe a rewritten absolute JMP operand. The surrounding instructions and original Ghidra comments substantiate both corrections; geometry-constructor and indirect-JMP wording was wrong.

## Review edits, 3 October 2026

Repaired prose separators in the canonical symbol comments and regenerated
Source with listing.py --recomment. That route preserves every captured
byte, block and cross-reference; the ledger remains 52,770/52,770.
Moved the projection-loop quirk to the section opening and kept test
counts in facts. Split feature rows by what was actually observed,
confirmed in controlled calls, or still open; disk and tape saving now
have separate rows. Published the code-difference audit recipe instead of
requiring a private JSON. Browser checks exercised all 34 areas, fourteen
projection cases, 59 glyphs, eight instruments and save controls at phone
width, without script errors or horizontal overflow.
