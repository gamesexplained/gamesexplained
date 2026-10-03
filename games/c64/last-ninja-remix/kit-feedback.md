# Last Ninja Remix — kit feedback

The imported composition combined resident and level bytes with no matching stopped machine. Review required a real boot. This revision boots disk 047 through both intros and the unmodified trainer into Central Park, compares its RAM with the composition, and builds Source only from active play.

The comparison found the composition’s `$0E00` startup code overwritten by sprite buffers. A live store checkpoint and the pointer tables confirmed double-buffered sprite output at `$0C00–$0FFF`, so stale startup code/names/comments were removed. The map is loaded into regenerator2000, exported through `symbols_export.py`, and rendered only through `listing.py` (rebuilt after each annotation session). No composed image or extra state listing is published.

The external export is private and its unknown makers’ models are explicit in `game.json.imported`. Coverage follows game data/runtime scope; the article carries the independently checked sprite browser, with other mechanics added only as verified. Shared tooling is separate in #125. The one-level scope and later-load TODO follow RFC #124.

VICE MCP 3.13.1’s pause and transport workarounds apply. It runs silently on a virtual display with dummy audio at the contributor’s request. Clocks retain only actual publishing and orientation work; outside analysis is not represented as timed here, and import metadata excludes the game from the runs table.

The three checks, complete site build and article/Source browser checks are run before publication. Full coverage, verification and the required maintainer check remain open for Silver.

The imported map omitted some runtime memory. regenerator2000 defaulted those holes to code and minted false references from buffer contents. The shared importer in #125 now fills uncovered ranges as byte data while preserving declared code, with three regression tests. Its reusable sweep notes require checking imported types before trusting generated labels. A changelog lesson can be added when this game folder is present in the kit branch; the documentation checker requires the named game to exist there.

A hand-over capture also exposed capped table spans: validating records alone does not keep an entire pointer table in the ledger. Declare the proven complete directory/resource extents and resolve every newly uncovered range instead of reporting the earlier percentage as complete coverage.

Directory-first inspection exposed two missed data classes: collision chains outside the condition directory, and late animation streams between frame descriptors. A byte-typed undocumented-opcode span also required native execution before changing its type. The source now separates those classes and records finite checks. The residual high-memory tail remains open; no padding exclusion was added to make the percentage round up.

The coverage skill now explicitly checks other pointer directories and constant loads when a short record leaves a gap before the next record of its type. This would have led directly to the late animation streams.

| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 10-orient | 10 | gpt-6.1-sol | 1 | Booted the disk through both intros, trainer and level load; reached Central Park gameplay. Preserved state while switching to virtual display and dummy audio. Traced overwritten startup bytes to live sprite output. |
| 50-coverage | 36 | gpt-6.1-sol | 4 | One agent: validated main/auxiliary sprite and scene records, annotated frame/UI records and indexed aliases, rebuilt Source and checked sprite browser data.; One agent: parsed animation and inline text records; included live decoder and combat boundary tests in this session.; One agent: extended authored-resource ranges from handover, checked complete reversal tables, annotated glyphs and full scene/frame/sprite directories.; One agent; traced control continuation, all transition arrays, condition and collision source boundaries, enemy spawn fields and health-state label. |
| 60-verify | 26 | gpt-6.1-sol | 2 | One agent: live animation step, music/SID observation, and final level-loader handover capture at $10F8.; One agent; all 18 collision compiler outputs, 16 enemy-meter boundaries, 11 late animation entries and four undocumented object-display paths checked. Table annotation also performed during this session. |
| 70-minisite | 14 | gpt-6.1-sol | 2 | Built collision browser from all 18 native-matched areas and enemy-meter slider; browser datasets match all 264 native records, segment/grid controls and ten meter boundaries passed. |
| 80-retro | 6 | gpt-6.1-sol | 2 | Publication from the existing disassembly; one agent alternated between five contributions. No new full reverse-engineering run.; Recorded interleaved-record lesson in coverage skill and changelog; facts/metadata updated; separate article copy rewrite follows the checked widget results. |
| total | 90 | gpt-6.1-sol | | 1.5 h of work, over 28.6 h |

Imported annotations are not a fresh-disassembly benchmark. The clock covers this kit work, including native checks and later table annotations, and omits the original external analysis.

## Undocumented instruction export

The native-checked three-byte LAX absolute,Y at C096 was being exported as one unsupported byte followed by a spurious ROL from its operand bytes. The listing writer now recognizes that explicitly code-typed form while keeping the documented opcode table separate. An integration regression exports LAX followed by RTS and checks both instruction boundaries and the indexed operand. Other undocumented forms retain their existing behavior; this change is limited to the verified form.
