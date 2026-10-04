# Wizard — kit feedback

## Run and result

2 October 2026, one agent, jankfoundry with GPT-6 Astra Extra High (`gpt-6-astra`). Silver, copy `agent-draft`. The canonical resident ledger explains 45,560 of 45,560 tracked bytes. The construction overlay and all forty disk levels have separate source companions; they are not silently counted as part of the resident snapshot.

Host: Linux x86_64, Ubuntu 24.04, no display. Emulator: official vice-mcp v3.13.2 Linux GUI release, using a virtual display. Disassembler: regenerator2000 0.9.20, copied from the contributor's existing crates.io installation into local tools. No system packages or settings changed.

## Skill text that changed what I did

- `60-verify`: "Claims about the whole game": enumerated all forty room callback entries and both collection callers; tested exact loop bounds and alternate conditions, finding the skipped Madhouse arrow and the shared early-index erosion path.
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
| 80-retro | 32 | gpt-6-astra | 12 | One agent; kit fixes for independent tool ports, quiet-frame capture, compiled programs and ROM aliases; regression checks and maintainer feedback.; Rebased onto kit 0.0.57; preserved upstream tool cleanup and measurements, moved the lesson into its own file and added verified skill-usage passages.; Recorded sprite-default evidence and the visual curation pass; no new kit change or maintainer ask.; Recorded the second research pass, corrections, source verification and live puzzle initialization. Existing verification and reachability rules covered the failures; no new kit change or maintainer ask.; Recorded third curation evidence, corrected save-guard and terrain-test interpretations, checked source navigation and original controls. Existing verification rules sufficed; no new shared-kit change or maintainer ask.; Recorded movement and protection corrections, checkpointed room completion, RAM-correct sprite capture, mobile/keyboard checks and final source validation; existing kit rules covered the findings.; Recorded the user’s review finding and checked the clarified terminal-state presentation; no new kit changes.; Replaced the fatal-drop banner with a live original-code death recording; verified full playback, both sprite bounds, controls and responsive layouts.; Corrected the prepared wizard color, regenerated movement and full death states, and checked purple start/end frames in the browser.; Recorded audit findings, portable validation commands and evidence limits; corrected canonical input labels/comments and provenance; checked data, actual page mechanics, live probes, source navigation, death playback and packaging. Remaining independent review and live persistence/boot checks are explicit.; Recorded corrected boot guard, live persistence and accounting evidence, independent decoder scope and remaining review limits. Updated canonical comments and public turn explanation; required checks, 19-game build and desktop/phone page checks pass. No shared-kit change or new maintainer ask.; Recorded tie attribution, ineffective load-error timeout and transfer-status limits; shared portable harness with 303 existing plus thirty focused cases; live input, persistence, retry and wait controls. Updated six canonical comments and article. Data, repository, skill-usage, full build and desktop/phone checks pass; no new kit rule or maintainer ask. |
| curate | 230 | gpt-6-astra | 10 | Illustrated all 21 behaviors with original sprites; 86 appearance options and 181 frame selections checked in the browser, plus keyboard and mobile layout.; Verified projectile hits, cat contact, shared Freeze timers and Simon Says, including its automatic starting pearl. Added an illustrated puzzle rule explorer, corrected two atlas counts and expanded source comments. 11450 new original-code cases/timelines, live controls and responsive browser checks.; 700 treasure states and 960 actor states; hidden-thief neutral-input demonstrations and Burning Bridges input sequence; loader score clearing, private editor save/reload, carry provenance and bounded dormant-code tests; 42-view source browser.; 25 player/travel scenes, 494 states and 205 live comparisons; 84 Invisibility and 48 elevator cases; completed checkpointed Burning Bridges route to L18T; original-graphics walkthrough, navigation and mobile controls.; Review correction: explain the four-pixel fatal fall, label the replay endpoint and omitted death animation, check play/reset and phone presentation; motion data unchanged.; Self-audit: all forty disk level records, resident bytes and assets; actual public mechanic functions; fresh live movement, input and protection probes. Corrected high-score name/title routines, removed unused external images, documented evidence limits and added repeatable validation scripts.; Further self-audit: fresh assisted boot and marker writers; all 45560 resident bytes and 9180 VICE-decoded instructions; 303 accounting cases, live bonus/death/turn/milestone paths and full prepared-score name/save/reload; original spell/actor/default tables. Corrected first-attempt boot guard and clarified ranking ties and turn rules.; Further audit: thirty ranking/attribution and disk-control cases; three live typed-score saves including six players and top/bottom ties; real save error/recovery and expiry; missing-file level wait with 600 PAL-frame watchpoints and FIRE control. Corrected tie-name attribution and false level-timeout claim; documented READST versus persistence. |
| total | 132 | gpt-6-astra | | 2.2 h of work |
| after the run | 250 | | | curate, play and their retros: 4.2 h, not in the total |

Portable figures:
  minutes to play : 25.5
  min per KB      : 1.2  (51.3 min for 45,560 tracked bytes, 1 agents)
  hours           : 2.2  (and 4.2 h after the run)

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

The contributor’s spell-preview review found that a trace ending at a death flag looked like an incomplete fall, and requested the full animation. The comparison continues through the original death script and both animated sprites to the final effect. The existing widget-verification and platform banking guidance apply: the capture restores the omitted VIC display settings in the movement-only fixture, pauses room interrupts to keep the prepared terrain fixed, and reads sprite artwork from raw RAM. The visible capture failures and their corrections are recorded in agent-history.md. Full playback, controls, sprite bounds and phone layouts pass; no additional shared-kit change or maintainer ask is needed.


The purple-wizard review correction fixes an artificial own-color override in the prepared examples. Regeneration confirms the motion and artwork are unchanged; the complete live death capture retains purple throughout. This is a local fixture and presentation correction under the existing verification rule, with no shared-kit change or maintainer ask.

## Self-audit, 3 October 2026

The existing caller-tracing and widget-verification rules exposed the
champion-name/construction-title mix-up and guided checks of the public
functions themselves. The corrected names, bounds and timeout modes were
confirmed in VICE. Unused external screenshots were removed from published
reference storage. Reusable game-specific checks now compare the forty disk
levels, listing and asset bytes with the private inputs, and original
instructions with the actual scoring, sound and Simon functions.

`audit.md` separates shared-table consistency checks, CPU-harness tests, live
forced probes, natural-input controls and earlier captures. Neither 100%
coverage nor the number of passing cases is presented as full semantic
validation. The self-audit cannot satisfy the independently selected check in
`kit/CHECKING.md`. Existing verification rules already cover these failures;
this pass adds no shared-kit rule or maintainer ask. The further pass below completes the live persistence and fresh-boot provenance
checks; the audit and TODO retain their remaining review and route limits.

The death-browser test needed an event-aware wait after changing the browser's
reduced-motion preference; the initial immediate assertion raced the media
event. This visible harness failure is recorded in the agent history, with no
new skill rule.


## Further audit, 3 October 2026

Replaying the documented boot from hard reset caught its missing first-attempt
guard. The corrected recipe reproduces the full resident image and both marker
writers. Game-specific portable checks now cover 303 accounting cases, original
spell/behavior/default tables and every native instruction through VICE's
separate decoder. Live prepared probes cover bonus, player turns, death retries,
band transitions and typed high-score save/reload on a disposable disk; the
retained Burning Bridges exit checkpoint also settles its bonus and reaches the
next file load.

The original verify and reachability rules already require these checks. The
boot defect is fixed in orientation, and the new checks live with the game;
there is no new shared-kit change or maintainer ask. Input-buffer clearing,
incorrect probe entry/stop assumptions and disk initialization after a snapshot
restore produced visible failures, recorded with their fixes in agent-history.
The author's additional checks do not satisfy the separate reviewer requirement
in `kit/CHECKING.md`; the tier and copy provenance are unchanged.


## Attribution and error-path audit, 3 October 2026

The existing verification rules led beyond numeric score insertion into name
attribution, exposing the tie behavior, and beyond the presence of a timeout
comparison into its back edge, exposing a counter that does not advance. Thirty
new original-code cases and live keyboard/disk/control tests cover these paths.
The save-status observation reinforces the existing requirement to check the
actual saved record: READST zero alone did not establish persistence.

The watchpoint ignore-count assumption and restored-drive setup produced visible
probe failures. Their corrections and bounded results are recorded in
agent-history.md. Fixed-frame observation plus a positive FIRE control supplies
the live wait evidence. These are game/tool observations under existing rules;
no shared-kit edit or new maintainer ask is needed. Six canonical comments and
the score section now reflect the tested behavior. The author’s work remains a
self-audit, with the independent-review requirement unchanged.

## Semantic and reproducibility follow-up, 4 October 2026

Applied the updated `60-verify` whole-game and accepted-value rules to room
callbacks, and its fresh-sample rule to a separate reviewer. The reviewer was
interrupted by a service usage limit; four reported findings were verified and
corrected, but no complete independent sample or error rate is claimed.

Five offline validators and a live runner make the selected evidence repeatable
without private session helpers. Setup comes from the contributor's private
original inputs, not the datasets being checked. Existing rules already cover
these failure modes, so no shared-kit edit or maintainer ask is needed.
