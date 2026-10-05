# Castle Master — kit feedback

## Lesson and correction

An imported analysis seeds a run. The original publishing pass treated inherited descriptions as traced claims and bypassed the required disassembler/snapshot listing route. Review exposed that mistake. This revision boots the recovered disk from a hard reset, reaches WILDERNESS, compares menu and play, loads the symbol map into regenerator 2000 on the disk-boot menu snapshot, exports through `symbols_export.py`, and builds through `listing.py`.

The external text export is private and identified by `game.json.imported`. Its models are unknown. Runtime screen, bitmap, viewport and zero-page backing store are excluded from coverage; the remaining gaps are in `TODO.md`. The interactive article uses the independently checked contracts, and unresolved behavior remains explicit. Loaded artwork is included; only demonstrated runtime outputs and scratch are excluded.

## Follow-up verification

Independent record parsing must follow the consumer, not just a size table: local type-0 allowlists and short type-2 records are different occupants from FCL residuals. Controlled native fixtures also caught a loop-entry qualification in the zero-depth projection shortcut. Both corrections are in `symbols.json`, the canonical listing and `facts.md`; remaining checks are explicit in `TODO.md`.

## Graphics accounting and frame capture

The cold hand-over distinguishes loaded HUD artwork from the generated viewport. Excluding the entire bitmap hid authored data; the replacement declares the bitmap and colour planes and excludes only traced output spans. `coverage.include` overrides exclusions, so a broad include of the screen matrix also restores runtime cells: include only the authored gaps. A no-write frame made beam-phase inference miss a full wrap when start and end raster lines were equal. `frame.py` now unwraps raster samples using elapsed cycles, including multiple wraps between samples. Five regression tests run in CI; a native zero-write frame captures successfully with phase known to a cycle. The coverage skill now explains include precedence and calls for another allocation audit after recovering code.

## Shared tooling

The importer, footprint correction and contained Firefox launcher have moved to [PR #125](https://github.com/gamesexplained/gamesexplained/pull/125), including eight regression tests in CI. The importer writes only symbols and uses the disassembler’s accepted branch-label type. `kit/VERSION` is unchanged; the game’s lesson is under `next` in its lesson file.

## Checks and timing

VICE MCP 3.13.1 passed 55/57 emulator checks on 30 September 2026; `pause-at-instruction` and `unpaced-calls` failed. The documented pause workaround and paced calls are used. The three repository checks and complete site build are run before commits.

`timings.json` retains actual work from the original publishing pass and the correction sessions. Import conversion and article drafting are not claimed as full coverage or verification, and the original outside analysis is not timed here. Imported games are excluded from the site’s runs table by provenance metadata.

## Maintainer asks

The imported-analysis policy in #113 was resolved by #123. The imported models are unknown and the run model is unproven; Silver needs the maintainer check in `kit/CHECKING.md`. Coverage is 52,770/52,770 bytes with no loaded-data audit stretches. The article’s widgets pass browser checks; all 104,448 initialized-display colour-index pixels match. Behavior marked open is not represented as exhaustively verified.

## Recorded step times

| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 10-orient | 11 | gpt-6.1-sol | 2 | Recovered matching snapshot and disk from contributor repository history; reached playable castle view. Switched to publication from the exhaustive listing at contributor request. |
| 50-coverage | 89 | gpt-6.1-sol | 5 | Rebuilt the imported annotations in regenerator 2000 and the canonical listing; corrected coverage scope. Full burn-down remains open. Independent database and SID parsers; 34 native area-loader calls and fourteen projection vertices; one agent; Cold hand-over and HUD footprint audit; exact frame comparison; glyph/instrument fixtures and text layout; one agent; One agent; completed authored-allocation audit and operand aliases, separated demonstrated runtime scratch from tables; 52770/52770 ledger bytes, with semantic open items retained. |
| 60-verify | 12 | gpt-6.1-sol | 2 | Native 652-byte save/restore, disk round trip and 1024-entry colour startup copy; operand/table continuation annotations; one agent. One agent; 17 native SID requests,25 ticks each, exact final-voice roots; sustained audio remains open. |
| 70-minisite | 22 | gpt-6.1-sol | 2 | Interactive article and final copy pass; browser exercised 34 areas/546 objects,14 projections,59 glyphs,8 instruments and save controls; initialized display has zero colour-index pixel differences. |
| 80-retro | 9 | gpt-6.1-sol | 2 | Publication from the existing disassembly; one agent alternated between five contributions. No new full reverse-engineering run. Fixed sparse beam-phase unwrapping; five CI regressions and native zero-write frame pass; documented mixed authored/output plane scope. |
| total | 144 | gpt-6.1-sol | | 2.4 h of work, over 31.8 h |


A correct import-and-verify path, with whole-allocation accounting before article work, would have saved the most time. The clock includes the abandoned first publication pass; its historical notes do not describe completed scope.
