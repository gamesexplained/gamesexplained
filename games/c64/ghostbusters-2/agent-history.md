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
