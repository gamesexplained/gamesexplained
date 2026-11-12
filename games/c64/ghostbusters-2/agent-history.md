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
