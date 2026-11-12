# Ghostbusters II — agent history

## 12 November 2026

The Jondi/Censor disk reached its intro but a subsequent boot fell into a BASIC ROM loop. A disk labelled SHAPE proved to be a standalone demo. The Censor Design disk reached the game and was used for the analysis; the other images stay in `work/`.

The first captured play snapshot followed several autostarts without a power cycle. To avoid attributing leftovers to the airshaft, the game was booted again after a hard reset, and entry and play snapshots were taken. The earlier and clean play states differed in a few self-modifying operands. Rebuilding the disassembler on the clean snapshot lost four automatic labels, so they were retained explicitly before export; their meanings remain open.

The emulator's first execution-map export stalled at its monitor socket. Restarting VICE and recording a shorter clean-boot interval succeeded. VICE runs on a virtual display with its `fs` sound output directed to `/dev/null`, which keeps the SID clocked without making sound.

The first load trace stopped while the loading animation still ran. A second, with warp enabled, covered the transition through to the retry screen and recorded no call to `$FFD5`. A separate observation found the loading code calling the serial receive entry at `$EE13`.

A breakpoint on the KERNAL internal OPEN entry `$F3D5`, with the filename read through `$B7/$BB–$BC`, found the numbered wildcard requests that the earlier LOAD-only watch could not see. The second-story route first returned to BASIC with the Jondi/Censor disk attached; retrying with the Censor disk reached the story wait and Broadway. That observation does not establish why the first attempt failed.

While inspecting the copied story engine, the disassembler displayed a store to `$D000` at `$13EA` with the label of the hidden-RAM source at `$D000`. The code has `$01=$35` there, so that store reaches the VIC register, not the saved source byte. The stash listing describes the source as data; any future listing of the copied engine needs the I/O context marked explicitly.

The copied loader was run offline with both zero-filled and one-filled memory. Its segment boundaries and output ranges agreed in both cases. The opening story, airshaft, Broadway and Jondi museum outputs matched their captured states throughout those ranges. The title and later story captures differed in some output bytes, which have not been attributed. The Censor museum stream ran out during the fourth segment; the Jondi museum stream completed and matched its captured state. The script and compact results are `analyse_unpack.js` and `unpack-map.json`. This method identifies stable output, not whether every output byte is used, nor the cause of the failed Censor transition.

The title sound-driver ranges `$E256–$E439`, `$E43D–$E5C1` and `$E937–$EAEC` paired instruction for instruction with the airshaft listing. Their comments were carried to the title and the matching bytes typed as code. Export after typing removed automatically inferred spans, so it was forced after checking the change was caused by the new code boundaries.

The title snapshot also matches the airshaft sound initialization instructions at `$E000–$E0C1` and the frequency and offset tables at `$E5C2–$E6AC`. The former was paired instruction by instruction; the latter was compared byte for byte before carrying its existing descriptions.

The opening-story listing was cut to the ranges written by `2.FIRST STORY` and placed over the title. Its earlier listing also carried the title's sound driver and the copied resident engine; their ownership is now retained by those lower parts. The 602-byte comparison with the resident copy was retained as a hash of the previously captured story-state bytes, with its five observed differences recorded in `test_stash.js`. The opening-picture annotations now describe the loaded sources, not the runtime display copies.

The airshaft part was scoped over the opening story to the decompressor's matched output ranges. Its low-memory transition annotations remain named outside those ranges pending evidence of their origin; generated symbols and listing were rebuilt on the captured play snapshot. This removes inherited or unowned bytes from its ledger rather than treating the snapshot as a whole new load.

The first two-frame fire press from the second-story capture ended while screen setup was still running. Inspection showed the setup PC; twenty neutral frames reached serial loading. Bounded waits, with loader counters inspected when the first did not reach `$8009`, then reached the Jondi Broadway entry. Its decoded file matched all 56,695 stable output bytes. The Censor Broadway file leaves the first 298 bytes of the scroll region from the preceding airshaft; the alternate disk writes different bytes there. The Levels and How it works pages name the capture and this limitation.

The airshaft success, retry, quit and failure messages at `$08EC–$0ACB` were typed as four 120-byte data blocks. The Censor Broadway part was scoped over the second story to its matched unpacker output; its map check now takes the inherited `$0900–$0A29` prefix from the airshaft listing. The alternate Broadway snapshot is kept in `work/` and the different data remain open in the media ledger.

The third story, Jondi museum and ending were scoped to their decoded load ranges, over their preceding parts. The story snapshots restore the shared engine to low memory before the numbered load. Its names remain available through the parts chain, but the copied runtime image and transition ownership still need to be represented independently; these scopes do not settle that question.

A separate `story-engine` part now lists the executing `$1000–$1BFF` copy from the handover. The title lies over it; later story parts include the restored range in their transition and exclude the repeated copy from coverage. The three later story snapshots differ from that copy at the same 88 runtime-state, operand and text-buffer positions, recorded in the engine facts. The engine listing still has untyped data and code to classify.

Descriptions from the byte-identical stash source were placed on the executing engine addresses and the already traced code and data ranges were typed there. The engine listing uses explicit I/O contexts: for example the `$13EA` store names the VIC register, while the `$1356` load names the RAM beneath I/O. The unclassified gaps remain in the ledger.

The alternate Broadway entry and play snapshots agree throughout `$0900–$1F7F` and `$2000–$2AFF`. A separate overlay now owns the alternate data, excluding output that matches the Censor handover. The Levels tab can switch between their backdrop captures.

The alternate Broadway lookup views were described using the shared selector code and the alternate entry/play comparison. Eight eight-byte gaps between the views were given separate unannotated labels so coverage does not count them as explained by the adjacent views.

The eight gaps between alternate Broadway lookup views were read directly: each contains its selector byte followed by `newline`. Their contents are now described, but their runtime purpose remains an open question.

Forty-one airshaft sprite slots named by traced pointer tables were typed as bitmap data and added to a Graphics inspector. Their individual shapes were left without semantic comments, so the newly counted bytes remain unexplained until their roles are established. The bytes match in the entry and play snapshots.

The five airshaft character poses were reconstructed from the six pointers in each `$919F` record and the raster handlers' captured two-column, three-row placement. Their 26 nonblank sprite pieces now have specific pose and position descriptions; slot `$0F` is cleared by the initialization routine.

The resident-stash disassembler session exported its owned annotations but omitted 1,561 automatic symbols, four system labels and unrelated blocks outside that part's range. They were restored from the preceding export, the new `$D000–$DFFF` annotations were retained, and dependent listings were relabelled. The resident listing and affected checks then passed. This behavior needs investigation in the retrospective.

Decoding the outcome streams exposed `$EF82=$91`, a stop command omitted from the earlier listing. The embedded sound data had inherited a zero at that position. It was corrected to match the captured bytes, and the existing sound check passed.

Typing the effect records exposed 220 more zero-filled bytes in the embedded sound data. They were restored from the airshaft capture; the existing sound check then matched the rebuilt listing and its recorded VICE samples.

The airshaft ledger now includes 24 previously uncounted stretches of stable unpacker output, 10,878 bytes in total. Their purposes remain open; this corrects the coverage denominator rather than treating their presence as understanding.

The same audit added 19,852 Broadway bytes and 11,675 museum bytes to their ledgers, including play-time copies identified by the listing. They remain unexplained.

Disassembling the Broadway path-handler entries followed a static edge into the backdrop at `$1000–$141B`. The export guard detected lost coverage. A temporary forced export exposed the changed types; the known backdrop range `$0A2A–$1F7F` was restored to byte data before the listing was rebuilt. The handler entry points are retained as code.

Separating the two museum animation tables shortened an automatic symbol’s reach over 30 following bytes. The export guard detected the lost tracked range; `$A346–$A363` was added explicitly as stable loaded data with its use open before rebuilding the listing.

Traced the Broadway sprite 5 position comparisons at `$9A4B` and `$9AEA`. A focused processor-model check confirms the latter match, its vertical threshold and its already-set flag guard; object identities remain open.

Traced a further Broadway comparison between six active entries and the three figures, retaining unknown object identities. Two bytes between movement routines were recovered from the snapshot as `$60` after unconditional jumps; neither has an established alternate entry.

Traced the Broadway active-entry comparison with the second position pair and the sprite 5 comparison with five scene entries, including their state transitions and the carry used in the sprite X calculation.

Traced the airshaft sprite 5 and 7 boundary checks, retaining their actual sign-bit branches and the unresolved flag meanings.

Traced the airshaft screen-pattern scan and recovered the three jump bytes at `$84AC–$84AE` from the snapshot; no alternate entry to those bytes has been established.

Traced the museum coordinate comparison at `$8D0D`, including its state gates, bounds and conditional dispatch.

Traced the museum’s eight-way motion dispatcher and restored the `$60` byte after the jump at `$C90F`; an alternate entry remains unestablished.

Traced the second museum motion position’s grid lookup, including its 31-byte high-X adjustment and position-clearing conditions.

Traced the museum’s paired position comparison and its dependency on the first match flag.

Traced the first response reached when both museum position comparisons match, including the self-modifying byte-copy addresses.

Traced the reverse museum byte-copy path and the gated joystick-fire input in the scene update loop.

Traced the second museum fire path and the address and position adjustments made by the placement routines.

Traced the museum status transition and scene reset, linking a status value to the previously decoded DEAD panel sprites.

Connected the museum rope-state animation to its `$805E` status transition while leaving the cause unassigned.

Traced the scene decisions after the museum column restoration and their status-panel updates.

Traced the first museum scene-position reset and compared its initialized addresses with the second-position reset.

Traced the museum placement overlap and active-position grid lookup, preserving the carry difference from the similar second-motion lookup.

Traced the museum phase dispatcher and its counter-controlled active-position initialization.

Traced the airshaft rope-table selector update and its sign-bit-based amount and direction adjustments.

Traced the airshaft rope-selector input gates back to the cached CIA port A read.

Decoded the two 41-byte airshaft character-position curves and traced their output to the raster sprite registers.

Traced the airshaft rope-position Y adjustment, including its offset bounds and screen-row copies.

Connected the rope Y adjustment enable to the airshaft scroll boundary and its offset direction to the joystick handlers.

Traced the zero case of the airshaft screen-pattern drawing routine, including its paired character and colour writes.

Connected the zero pattern restore to its matching save-and-draw path and noted that it does not save the original colours.
