# Lode Runner — room 120

This part overlays the resident disk engine's room buffer. The physical zero-based index is 119: **track 10, sector 7**. The Black, Gray and Yellow source sectors are identical.

The original engine's reader was reached by selecting this room and calling its new-game entry. The entry snapshot stops at resident engine $6FE5, after one execution of reader $71F5 and 256 writes to $1000–$10FF. The play snapshot stops at resident engine $611C after the original decode, render and actor extraction, before its first main-loop instruction. This forced selection verifies this load; it is not an ordinary-input walkthrough.

All 255 retained source bytes at $1000–$10FE match raw sector offsets 1–255. The first 224 bytes encode 28 × 16 cells, low nibble first; the remaining 31 bytes are retained outside the decoded grid. Each row and the tail have their own label and byte annotation. The extra final read at $10FF is $0D and has no assigned authored sector-source byte, so it is excluded.

The decoded starting grid has **18 gold cells, 3 guard markers and 3 hidden exit markers**. The native room setup retains 18 gold and 3 guards. Actor markers are extracted during play setup; stored cell data stays unchanged in this part's Source listing. Values 0–9 mean blank, brick, concrete, ladder, bar, trapdoor, hidden exit, gold, guard and runner. Higher values decode to blank.

Coverage is **255 / 255 authored bytes**. Loader route, ownership and the independent comment sample are summarized in the game's facts.md and orientation.md. Snapshots, extraction records and disassembler projects stay in ignored work/ storage.
