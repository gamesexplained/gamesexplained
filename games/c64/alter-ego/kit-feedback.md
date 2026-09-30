# Alter Ego — kit feedback

## What changed

The Castle Master companion PR introduces the shared Ghidra text importer and its tests. It preserves selected occupants, verifies initialized bytes against a supplied dump, retains aliases, and keeps unknown memory as gaps. Its Source references distinguish visible registers/ROMs from underlying RAM. A selected original text export preserves details outside the native schema.

That PR also adds a contained launcher for an installed Firefox and changes the footprint check from absolute timestamps to before/after file signatures. No download was needed for the browser. These shared changes are confined to that PR; this contribution builds independently from its committed native artifacts.

## Validation

The three repository checks and complete site build pass. Browser checks exercise every selector and toggle, inspect nonempty canvases and image loads, capture desktop and 390-pixel layouts, and collect script errors. Source tabs load from the committed listings. Exact initialized-byte round trips and figure-format checks are recorded in `reference/import-audit.json`; original binaries remain in `work/`.

## Scope and tier

The stopped male-edition physical RAM image and the two analysed replacement gameplay spaces. Machine-ROM and crack-introduction overlays are excluded. The complete disk narrative corpus is not embedded in this article. The contributor requested direct publication of the existing accurate analysis. This publication pass does not replace the original reverse-engineering effort. The native prose-span coverage and unproven-model requirement leave the contribution at Bronze; `TODO.md` lists Silver requirements.

## Maintainer asks

- [#113: define coverage and maintainer checks for imported exhaustive disassemblies](https://github.com/gamesexplained/gamesexplained/issues/113). No coverage or model rule was relaxed.

## Timing

| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 70-minisite | 12 | gpt-6.1-sol | 1 |  |
| 80-retro | 4 | gpt-6.1-sol | 1 | Publication from the existing disassembly; one agent alternated between five contributions. No new full reverse-engineering run. |
| total | 18 | gpt-6.1-sol | | 0.3 h of work |

Portable figures:
  minutes to play : n/a
  min per KB      : n/a (needs a coverage step and a symbols.json)
  hours           : 0.3

These clocks record overlapping publication windows while one agent alternated among five independent contributions. They are not additive person-hours and do not include the original analysis.

The single most useful change was direct import of the completed annotated listing, preserving phase boundaries instead of reconstructing the analysis from a raw memory dump.
