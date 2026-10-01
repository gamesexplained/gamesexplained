# Castle Master — kit feedback

## Lesson and correction

An imported analysis seeds a run. The original publishing pass treated inherited descriptions as traced claims and bypassed the required disassembler/snapshot listing route. Review exposed that mistake. This revision boots the recovered disk from a hard reset, reaches WILDERNESS, compares menu and play, loads the symbol map into regenerator2000 on the disk-boot menu snapshot, exports through `symbols_export.py`, and builds through `listing.py`.

The external text export is private and identified by `game.json.imported`. Its models are unknown. Runtime screen, bitmap, viewport and zero-page backing store are excluded from coverage; the remaining gaps are in `TODO.md`. The article is reduced to features and fresh reference screens while its technical claims await verification.

## Shared tooling

The importer, footprint correction and contained Firefox launcher have moved to [PR #125](https://github.com/gamesexplained/gamesexplained/pull/125), including eight regression tests in CI. The importer writes only symbols and uses the disassembler’s accepted branch-label type. `kit/VERSION` is unchanged; the game’s lesson is under `next` in the changelog.

## Checks and timing

VICE MCP 3.13.1 passed 55/57 emulator checks on 30 September 2026; `pause-at-instruction` and `unpaced-calls` failed. The documented pause workaround and paced calls are used. The three repository checks and complete site build are run before commits.

`timings.json` retains actual work from the original publishing pass and the correction sessions. Import conversion and article drafting are not claimed as full coverage or verification, and the original outside analysis is not timed here. Imported games are excluded from the site’s runs table by provenance metadata.

## Maintainer asks

The imported-analysis policy in #113 was resolved by #123. Silver will require a maintainer’s check after coverage and verification are complete.
