# Wizard — kit feedback

## Run and result

2 October 2026, one agent, jankfoundry with GPT-6 Astra Extra High (`gpt-6-astra`). Silver, copy `agent-draft`. The canonical resident ledger explains 45,560 of 45,560 tracked bytes. The construction overlay and all forty disk levels have separate source companions; they are not silently counted as part of the resident snapshot.

Host: Linux x86_64, Ubuntu 24.04, no display. Emulator: official vice-mcp v3.13.2 Linux GUI release, using a virtual display. Disassembler: regenerator2000 0.9.20, copied from the contributor's existing crates.io installation into local tools. No system packages or settings changed.

## Skill text that changed what I did

- `50-coverage`: "Know how far a description reaches": typed the authored tables and described ownership at their actual boundaries, including automatic symbols inside sprite RAM, instead of treating one nearby comment as explaining the whole block.
- `50-coverage`: "Is the picture loaded or drawn?": compared entry and play images, retaining the loaded charset and relocated sprites while excluding generated screen/workspace bytes.
- `tool-regen2000`: "A custom alphabet has no data type": typed the custom menu streams as bytes and decoded their formatting commands in comments, rather than accepting the tool's PETSCII rendering.

## Kit changes

- **Independent clones:** the default ports already belonged to other active runs. Added ignored `tools/mcp-ports.json`, used by the C64 launcher, installer and both clients. VICE accepts an explicit loopback port. For a nondefault disassembler port, a loopback bridge speaks to regenerator2000's stdio MCP. Its project-only input requires converting snapshot RAM to an unannotated project; unique names preserve earlier sessions. Seven regression checks cover configuration, conversion, request IDs, notifications, exit handling and shell argument quoting. Linux XDG settings now stay under `tools/r2000-home/`.
- **Startup qualification:** the test program advanced 33 and then 12 passes per host second, failing the old 40–65 range before later checks ran. Startup now checks positive progress and reports slow/fast host throughput; the existing exact-frame tests remain unchanged. The complete run passed 54/57. The three remaining throughput failures are recorded, not suppressed: watch-load/store each reached 39 against a minimum 40, and warp reached 71 passes/s against 100. Exact frame counts, instruction stops, input and snapshot/restart determinism passed.
- **Quiet frames:** `frame.py` inferred whole-frame wraps only when the raster line decreased. A captured frame with no video writes can present the same line a whole frame later. Phase inference now uses elapsed cycles modulo the frame length, retaining the chip's line-zero boundary adjustment. Five regression tests include quiet and multi-frame gaps, a dense wrap, inconsistent samples and empty input. The reconstructed game frame matches all 104,448 visible pixels, with zero differences.
- **Coverage workflow:** `50-coverage` points to `compiled-programs.md` for interpreted programs and level callbacks; see `kit/lessons/2026-10-02-wizard.md` for the lesson.
- **ROM aliases and symbols:** `tool-regen2000` preserves authored data under ROM calls and checks what remains after clearing a label; see the same lesson.
- **Install record and CI:** dated v3.13.2 measurements added to the C64 install notes and Linux status cell, preserving earlier measurements. New frame/transport regressions run in CI. The workflow lessons are in `kit/lessons/2026-10-02-wizard.md`; no manual version bump.

The run began on kit 0.0.54. Before delivery, it was rebased onto 0.0.57, retaining the upstream launcher cleanup and new measurement records and moving this run's lesson to the new per-run file format. The earlier and this run's v3.13.2 qualification results remain separately identified.

## What needed care

The protected disk reached the illustrations but stalled in its sector-XOR loop. The documented orientation recipe applies that loader computation to the two patterns read from the supplied image, without changing an engine instruction or the disk. This assistance is part of the reproducible route, not an unmodified boot claim.

GAME and BLDR share an interpreter but carry different bytecode at overlapping addresses. Forty level loads contain twenty active machine-code callbacks, some extending beyond the nominal callback field. Each was followed separately. ROM calls also created automatic symbols inside the sprite RAM, and an early filename-offset interpretation needed correction. The technical records state the corrected findings in place.

The footprint check initially noticed a file written by another active clone; a second complete launch/use/exit cycle found no tool writes outside this clone. The launcher leaves other runs alone. Native macOS settings containment was not established here.

## Verification

158 original-code comparisons pass: 80 score/life cases, 18 movement boundary cases and 60 ordered SID-write cases. Matched emulator runs verify movement, jumping, key pickup, reward/life thresholds and Freeze hit processing; menu, pause/resume and construction load were observed live. Forced states are labelled as such. Projectile immunity distinctions, startup score clearing, full puzzle routes and the editor's save interaction remain explicit research questions.

The article and forty-level atlas were built, then given a separate copy rewrite. Browser checks exercised all forty maps, markers, selections, score controls, five sound players and image comparison at desktop and phone sizes, with no console errors or horizontal overflow. The full site builds; binary, knowledge-location and listing checks pass. All twelve new Python regression tests and launcher dispatch checks pass.

## Maintainer asks

- [#131: distinguish functional emulator checks from host throughput](https://github.com/gamesexplained/gamesexplained/issues/131#issuecomment-5955324111). Added the C64 watchpoint and warp measurements to the existing host-load issue; suggest exact emulated intervals for counts and a separate throughput report.
- [#148: extend independent endpoints to per-part tools](https://github.com/gamesexplained/gamesexplained/issues/148#issuecomment-5955325046), also relevant to #124. The bridge solves one disassembler per clone. Maintainers can decide how to carry it into per-part launching and source/coverage views for overlapping loaded programs.

Existing open and closed issues were searched before commenting; no duplicate issue was created.

## What took longest

| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 10-orient | 26 | gpt-6-astra | 1 | Isolated tools; protected-sector XOR loader assist; captured entry and live Playground |
| 20-features | 1 | gpt-6-astra | 1 |  |
| 30-text | 6 | gpt-6-astra | 1 |  |
| 40-sweep | 14 | gpt-6-astra | 1 |  |
| 50-coverage | 51 | gpt-6-astra | 1 | Single agent: compiled GAME interpreter and script, shared engine, assets, separate BLDR trace and forty level overlays. Canonical resident ledger 45560 bytes; overlay findings documented separately. |
| 60-verify | 14 | gpt-6-astra | 1 | Deterministic input pairs, key/score/extra-life/Freeze forced states, six-player menu, editor load, pause/resume, 158 original-code comparisons and exact 104448-pixel reconstruction. Fixed sparse-frame phase inference. |
| 70-minisite | 12 | gpt-6-astra | 1 | Interactive article, forty-level atlas, five SID previews, separate copy rewrite, desktop/mobile browser controls and full-site build. |
| 80-retro | 12 | gpt-6-astra | 2 | One agent; kit fixes for independent tool ports, quiet-frame capture, compiled programs and ROM aliases; regression checks and maintainer feedback.; Rebased onto kit 0.0.57; preserved upstream tool cleanup and measurements, moved the lesson into its own file and added verified skill-usage passages. |
| total | 132 | gpt-6-astra | | 2.2 h of work, over 2.3 h |

The one change that would have saved the most minutes: identify and decode the interpreted program before treating the unexplained tail as ordinary data; its control flow exposes the menus, round progression and editor commands together.
