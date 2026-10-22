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

## 17 October 2026: the Silver run

Aaron Bell (air), a maintainer, took the game on from 64kramsystem's Bronze and asked for Silver,
with the game images from the Internet Archive. The MrL and Dr Bakterius crack became the copy
analysed, and Datasoft's 1987 disk, a different build, was set aside (`facts.md`, "Build").

The four folders of 4 October were rebuilt as the engine and three story parts. The engine, the
code and data that stay from the opening to the end, is listed from a snapshot at the opening;
each part from its own snapshot at its first prompt, over $2F00-$95FF. Routes through all three
parts were played live to reach those snapshots and the ending. The title's folder went: the
opening is engine code.

The three parts are almost all data, so they were described by decoders rather than by hand: the
texts through the dictionary, the scripts through the interpreter's own operand counts, the
pictures through their records. The decoders were checked by running the engine's routines on
the kit's 6502 over the same memory, and the page tests keep those checks.

The maintainer check ran on the run's own proven model, fresh checkers that wrote none of the
listing. The first sample found 4 of 60 comments wrong, over the mark, so every comment was
audited range by range and every claim in the facts files checked, before a second sample.
The audit corrected 211 of 2,019 comments, almost all in a detail (a caller or a way in left
out, a count, an offset, which memory is banked in); the worst read the icon map at $22A4 the
wrong way round. The notes' checker found Gmork's count rising on moves the map refuses, and the
mirror room failing to hand Atreyu Falkor. The second sample found 4 of 60 wrong, still over the
mark, all in details of the same kinds; the check asks for one audit, and the Source tab reports
what the second sample found.

Building the Maps page found two room texts that cross $4000 cut short in the part listings: a
data symbol's span ends at that edge, so the bytes after it were in no listing, and the page's
port and its test, which read the same listing, were wrong together. They and the leftover
filler at the ends of Parts 2 and 3 now have labels. The old `review-checks.js`, which read the
engine out of Part 1's listing, and `import-audit.json` and `decoded-view.png`, which described
the Bronze page, were removed.

## Typed data no label reached (22 October 2026)

#455 made the ledger count typed data, and bytes under a line comment,
that no label reaches, and Part 3's listing then left out 50 bytes
(#471): `$95CE`-`$95FF`, the end of Part 1's filler past the 1,024
bytes `FILLER_91CE` reaches. They are excluded in `part.json` with that
reason rather than given a comment, because a comment written after
the maintainer's last sample would undo it while the game counts a
model that is not proven.

The MrL copy on the Internet Archive has the same MD5 as the one this
run used. Rather than play Parts 1 and 2 again, the snapshot was taken
by making the loader's first load `PART 3` (`orientation.md`). Every one
of the 26,318 bytes the listing held matched it, so it was used as it
was, as `parts/part-3/work/part3-shortcut.vsf`.
