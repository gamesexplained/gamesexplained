# Wizard — kit feedback

## Run and result

2 October 2026, one agent, jankfoundry with GPT-6 Astra Extra High (`gpt-6-astra`). Silver, copy `agent-draft`. The canonical resident ledger explains 45,560 of 45,560 tracked bytes. The construction overlay and all forty disk levels have separate source companions; they are not silently counted as part of the resident snapshot.

Host: Linux x86_64, Ubuntu 24.04, no display. Emulator: official vice-mcp v3.13.2 Linux GUI release, using a virtual display. Disassembler: regenerator2000 0.9.20, copied from the contributor's existing crates.io installation into local tools. No system packages or settings changed.

## Skill text that changed what I did

- `60-verify`: "Prove reachability with inputs, not pokes": replayed Simon Says from its loaded start with neutral input, discovering the automatic pearl and its preceding color patch before labelling the saved instruction state a bug.
- `70-minisite`: "A widget that runs a mechanic is a claim too": compared the actual page acceptance function with the original level callback across every color nibble, remembered symbol, treasure index and random low-bit value.
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

Merged with kit 0.0.67 by a maintainer on 3 October 2026. By then the kit had an emulator port override of its own (`KIT_VICE_PORT`, kept in `tools/vice-port`) and its own repair of the quiet-frame phase, so those stand in place of this run's; this run's phase tests pass against that repair. The disassembler bridge is kept and follows the same convention: `KIT_R2000_PORT` and `tools/r2000-port` in place of `tools/mcp-ports.json` (`kit/c64/INSTALL.md`, "Another program on port 3000"). The shell-quoting fix moved with the terminal wrapper into `kit/scripts/launcher.py`.

## What needed care

The protected disk reached the illustrations but stalled in its sector-XOR loop. The documented orientation recipe applies that loader computation to the two patterns read from the supplied image, without changing an engine instruction or the disk. This assistance is part of the reproducible route, not an unmodified boot claim.

GAME and BLDR share an interpreter but carry different bytecode at overlapping addresses. Forty level loads contain twenty active machine-code callbacks, some extending beyond the nominal callback field. Each was followed separately. ROM calls also created automatic symbols inside the sprite RAM, and an early filename-offset interpretation needed correction. The technical records state the corrected findings in place.

The footprint check initially noticed a file written by another active clone; a second complete launch/use/exit cycle found no tool writes outside this clone. The launcher leaves other runs alone. Native macOS settings containment was not established here.

## Verification

158 original-code comparisons pass: 80 score/life cases, 18 movement boundary cases and 60 ordered SID-write cases. Matched emulator runs verify movement, jumping, key pickup, reward/life thresholds and Freeze hit processing; menu, pause/resume and construction load were observed live. Forced states are labelled as such. The four lethal projectile IDs share one hit rule, consistent with the manual. Startup score clearing and the editor’s save interaction were verified in the third curation pass. Burning Bridges has a completed checkpointed route; other puzzle completion routes remain open.

The article and forty-level atlas were built, then given a separate copy rewrite. Browser checks exercised all forty maps, markers, selections, score controls, five sound players and image comparison at desktop and phone sizes, with no console errors or horizontal overflow. The full site builds; binary, knowledge-location and listing checks pass. All twelve new Python regression tests and launcher dispatch checks pass.

## Maintainer asks

- #131: distinguish functional emulator checks from host throughput ([comment](https://github.com/gamesexplained/gamesexplained/issues/131#issuecomment-5955324111)). Added the C64 watchpoint and warp measurements to the existing host-load issue; suggest exact emulated intervals for counts and a separate throughput report.
- #148: extend independent endpoints to per-part tools ([comment](https://github.com/gamesexplained/gamesexplained/issues/148#issuecomment-5955325046)), also relevant to #124. The bridge solves one disassembler per clone. Maintainers can decide how to carry it into per-part launching and source/coverage views for overlapping loaded programs.

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
| 80-retro | 20 | gpt-6-astra | 6 | One agent; kit fixes for independent tool ports, quiet-frame capture, compiled programs and ROM aliases; regression checks and maintainer feedback.; Rebased onto kit 0.0.57; preserved upstream tool cleanup and measurements, moved the lesson into its own file and added verified skill-usage passages.; Recorded sprite-default evidence and the visual curation pass; no new kit change or maintainer ask.; Recorded the second research pass, corrections, source verification and live puzzle initialization. Existing verification and reachability rules covered the failures; no new kit change or maintainer ask.; Recorded third curation evidence, corrected save-guard and terrain-test interpretations, checked source navigation and original controls. Existing verification rules sufficed; no new shared-kit change or maintainer ask.; Recorded movement and protection corrections, checkpointed room completion, RAM-correct sprite capture, mobile/keyboard checks and final source validation; existing kit rules covered the findings. |
| curate | 128 | gpt-6-astra | 4 | Illustrated all 21 behaviors with original sprites; 86 appearance options and 181 frame selections checked in the browser, plus keyboard and mobile layout.; Verified projectile hits, cat contact, shared Freeze timers and Simon Says, including its automatic starting pearl. Added an illustrated puzzle rule explorer, corrected two atlas counts and expanded source comments. 11450 new original-code cases/timelines, live controls and responsive browser checks.; 700 treasure states and 960 actor states; hidden-thief neutral-input demonstrations and Burning Bridges input sequence; loader score clearing, private editor save/reload, carry provenance and bounded dormant-code tests; 42-view source browser.; 25 player/travel scenes, 494 states and 205 live comparisons; 84 Invisibility and 48 elevator cases; completed checkpointed Burning Bridges route to L18T; original-graphics walkthrough, navigation and mobile controls. |
| total | 132 | gpt-6-astra | | 2.2 h of work |
| after the run | 136 | | | curate, play and their retros: 2.3 h, not in the total |

Portable figures:
  minutes to play : 25.5
  min per KB      : 1.2  (51.3 min for 45,560 tracked bytes, 1 agents)
  hours           : 2.2  (and 2.3 h after the run)

The one change that would have saved the most minutes: identify and decode the interpreted program before treating the unexplained tail as ordinary data; its control flow exposes the menus, round progression and editor commands together.


## Curation follow-up, 2 October 2026

The contributor requested graphics and clearer presentation for the behavior section. The page now uses the editor's default sprite tables and original level appearances, with selectable frames, accessible controls and a responsive layout. Browser checks covered 21 behaviors, 86 appearances and 181 frame selections. The saved blank frame in one level is explicitly labelled. This changes no kit rule and raises no new maintainer ask; the appearance evidence is in `facts.md`. Curation is claimed by jankfoundry, with the other sections still awaiting a human pass.


## Research follow-up, 2 October 2026

The second curation pass corrects the unsupported immunity premise, distinguishes cat movement from rat contact, verifies the shared Freeze countdown, and adds a Simon Says rule explorer. The initial manual claim was an analysis error; the kit already requires claims to be traced or observed. The apparently inconsistent Simon Says startup state was resolved by following the real pickup and its earlier patch, under the existing reachability rule. Neither needs another general skill rule or maintainer ask.

Added 11,450 original-code cases/timelines: 7,200 projectile combinations, 150 cat/rat combinations, 4,096 puzzle cases and four paired Freeze timelines. Live queued-hit controls, four isolated callbacks and the automatic starting pickup provide a second check. The rule explorer passed all 64 UI combinations and four responsive widths; all twelve spell selections and both corrected atlas counts were checked. Raw glyph counts had counted lookup-table bytes as treasure; the atlas uses the original index scan, with its scope explained beside the numbers. Coverage remains 100% of the same resident-byte ledger; copy remains agent-draft under the human's curation claim.

No additional kit change was necessary for this follow-up. The source snapshot/listing match was checked before recreating the disassembler project from the canonical symbols. Regenerator's import reinstated predefined ROM aliases alongside RAM labels; comparison of generated records confirmed no unintended source-label changes. A live run-until returns before stopping, so its test harness waits for a paused execution state and verifies the target PC before reading results. That visible harness failure is recorded here rather than adding a new skill rule.


## Treasure and source curation, 2 October 2026

The third pass adds 700 original-code pickup states, four 240-update actor replays and a program-qualified source browser with 42 views. The startup score-clear test now reaches the loader’s actual key check before comparing held/released Commodore states. A private disk save/reload verifies the editor’s elevator reset and its refusal to write a disk carrying PPSS. Normal room initialization followed by neutral input exposes the hidden thieves in Friend or Foe? and Ladder Land; a short leftward Burning Bridges sequence is also replayed without changing collectible state.

The existing reachability and widget-verification passages drove those checks. Isolated callback results alone would have missed the hidden actors operating continuously. The L35T negative test was narrowed to named paths, varying the actual terrain counters and mode bits and checking a consecutive timeline with observed terrain changes. Its historical purpose remains unknown. The source browser keeps overlays separate because equal addresses do not identify equal programs.

No additional shared-kit change or maintainer ask was needed. The branch’s earlier kit changes and feedback remain applicable. The saved-color versus active-color distinction and PPSS branch interpretation were corrected in the technical records and canonical source comments.


## Fourth curation pass

The existing `60-verify` reachability rule prevented publishing the isolated movement route as a completed playthrough. Real arrow collisions invalidated several attempts; the resulting walkthrough names its saved checkpoints and reaches the following room load. The existing widget-verification rule also applies to the 25 player scenes: 205 representative updates match live execution. Tracing the caller of the Invisibility decrement corrected a plausible but wrong 32-movement-pass description to 32 protected fatal reports.

The interpreter harness's wrong dispatch stop and the first wrong death-routine stop were visible test failures, now documented in agent-history.md. The browser's same-fragment navigation preserved a slider value until the test used an actual reload. These are local research/test corrections; no additional kit change or maintainer issue is warranted. Coverage and copy provenance remain unchanged.

The final visual review also caught CPU-visible ROM data used as sprite art in a draft walkthrough. Raw snapshot RAM supplied the correct VIC-visible images; all 46 sprite records were matched to their saved pointers before publishing. The existing bank-awareness guidance already covers the distinction, so the fix stays in the capture and game notes.

## Audit and review follow-up, 3–4 October 2026

The `60-verify` instruction to “Measure the listing before calling it done” drove four frozen source samples. Existing caller-enumeration and live-verification rules led to the callback, score and disk checks; the failures required game-specific fixes, not another general kit rule. The sample results and limits are recorded in `facts.md`.

The first PR follow-up committed extensive private-input validators and duplicated audit reports. Maintainer feedback on #193 requested a concise result: keep sample paragraphs and named checks in `facts.md`, with scripts, ledgers and reports in ignored `work/`. The evidence remains available locally without dominating the review diff. No shared-kit change or new maintainer ask is needed.
