# Publication history

30 September 2026: contributor authorized publication directly from the existing exhaustive disassembly, online research, and a separate PR for each game. Imported annotations without claiming a new reverse-engineering run. Measured the repository’s own prose coverage and retained Bronze pending completion and maintainer review.

1 October 2026: fresh Part-1 command capture, custom font recovery, parked-loader tracing and dictionary/operand annotation checks. Earlier article and imported facts retained privately as leads. The duplicate RASTER_DISPATCH_OFS alias was removed from the map; carry this removal into the rebuilt project before exporting again.

On 1 October 2026 a live load stopped at the Part-1 entry $0400. RAM watchpoints with bank conditions and injected positive controls observed no $D000-$D0FF access during title-to-narrative-to-command loading. Restoring a snapshot without embedded disks initially stalled its loader; reattaching the private disk resolved that. Native consumer tracing corrected the exported source-pointer fields $295D/$295E and $2963/$2964. The hidden page and four newly exposed hand-over ranges remain open.

All 21 Part-1 illustration descriptors were decoded from the fresh snapshot and passed native-blitter output checks, including the final source pointer. The picture browser was restored from those bytes and its pixels compared independently in Firefox. Explicit picture extents exposed additional ledger gaps; record-specific continuation comments cover them without discarding authored data. The text-font tail at $FD30 was identified as cells 166–255. Tracked coverage is 48,455 of 48,711 bytes (99.5%); hidden $D000-$D0FF and two untracked title-stage tails remain open.

Cold-boot watches established the hidden-page copy and eight high-byte-first repair pointers; all pointed bytes changed $D4 to $D3. The final 17-byte boot trailer was observed being decompressed at $0182. The retained title-player tail was decoded separately, with phase-aware operand aliases where its old call targets overlap the installed gameplay loader. Native parser outcomes and the disabled SAVE/LOAD dispatch were checked. The picture browser now starts at the fresh capture’s illustration id 3, replacing imported id 4.

A controlled TAKE/DROP test distinguished relative noun-state index 19 from icon slot 8 and checked count and overlay updates. The shared frame renderer matched the captured bitmap/text raster split with zero differing pixels; its trimmed memory excerpt is embedded in the article. Firefox checked all 21 picture outputs and the frame’s mode-change marker. The retrospective adds producer-phase and bank-watch controls to the kit.

## Review correction, 3 October 2026

Corrected ICON_17's ground from white to light grey. The three ranges
formerly described only as “not reversed” are executable startup/display
code: $069B saves zero page and installs the first display/IRQ phase;
$1580 prints the opening narrative and enters the gameplay display; $A880
is its temporary IRQ. Replaced the misleading excluded-intro names and
comments, including the $0400 entry description. Controlled source checks
separate the routines' direct contracts from hooked callee behavior.

## 4 October 2026 — the game in parts

The kit gained a layout for a game that loads in parts (#202), and this game was one of the cases that asked for it (RFC #124). The analysed image became the part `part-1` as it stood, with no rebuild: its listing still matches its symbol map. The title, Part 2 and Part 3 were given folders that hold their names and nothing else, so the page counts them. The title is counted because Space there starts the Part-1 load. Nothing new was analysed; the review checks in `reference/review-checks.js` read the part's listing and still pass.
