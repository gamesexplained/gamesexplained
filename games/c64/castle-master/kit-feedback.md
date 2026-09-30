# Castle Master — kit feedback

## What changed

Added `kit/c64/import_ghidra.py` and six synthetic importer tests for address spaces, unknown gaps, overlapping bytes, aliases, call boundaries and banked references. The importer seeds the native symbol map; `listing.py` builds the Source listing from the matching snapshot. The original text export stays in `work/`, identified by its hash and provenance in `game.json`. Coverage is measured rather than inferred from code/data classification. The disassembler skill documents this import route, and the changelog marks the lesson for the next kit bump.

Added `tools.py browser` for an already installed Firefox, with a separate profile, XDG state and temporary files under `tools/firefox/`. The browser connector lacked its bundled executable; Firefox 157.0 plus its built-in WebDriver BiDi endpoint supplied the visual checks without a browser download. The minisite skill documents the fallback.

The footprint checker had attributed unchanged desktop files to the tool run because their timestamps lay in the future. It now compares before/after file signatures, with a regression test. Its bounded name-based scan found no external changes during an emulator and disassembler launch/snapshot/exit cycle. This is the scope of the scan, not a claim about every filesystem write. Linux install notes and the platform status record the desktop results.

VICE MCP 3.13.1 passed 56/57 health checks; direct instruction pause failed. The kit pause workaround was used for capture inspection. The matching historical snapshot reached gameplay; a raw-memory restart was insufficient because CPU and peripheral state were missing.

## Validation

The three repository checks and complete site build pass. Browser checks exercise every selector and toggle, inspect nonempty canvases and image loads, capture desktop and 390-pixel layouts, and collect script errors. Source tabs load from the committed listings. Exact import-byte comparisons and figure-format checks are recorded in `reference/import-audit.json`; original binaries remain in `work/`.

## Scope and tier

The complete physical RAM capture at the language menu. The game reuses menu storage during play; the listing records the menu occupant. The contributor requested direct publication of the existing accurate analysis. This publication pass does not replace the original reverse-engineering effort. The native prose-span coverage and unproven-model requirement leave the contribution at Bronze; `TODO.md` lists Silver requirements.

## Maintainer asks

- [#113: define coverage and maintainer checks for imported exhaustive disassemblies](https://github.com/gamesexplained/gamesexplained/issues/113) was resolved by the kit rule merged in PR #123. This branch now records import provenance and builds its listing from the snapshot. Coverage and maintainer-check requirements still apply.

## Timing

| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 10-orient | 4 | gpt-6.1-sol | 1 | Recovered matching snapshot and disk from contributor repository history; reached playable castle view. Switched to publication from the exhaustive listing at contributor request. |
| 50-coverage | 6 | gpt-6.1-sol | 1 |  |
| 70-minisite | 12 | gpt-6.1-sol | 1 |  |
| 80-retro | 4 | gpt-6.1-sol | 1 | Publication from the existing disassembly; one agent alternated between five contributions. No new full reverse-engineering run. |
| total | 24 | gpt-6.1-sol | | 0.4 h of work |

Portable figures:
  minutes to play : 4.3
  min per KB      : 0.1  (5.7 min for 65,280 tracked bytes)
  hours           : 0.4

These clocks record overlapping publication windows while one agent alternated among five independent contributions. They are not additive person-hours and do not include the original analysis.

The single most useful change was direct import of the completed annotated listing, preserving phase boundaries instead of reconstructing the analysis from a raw memory dump.
