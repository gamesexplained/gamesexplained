# Wizard — agent history

## Self-audit, 3 October 2026

The contributor requested an audit after another game's review found factual
inconsistencies. Used that review only for failure patterns, then checked
Wizard's own inputs, all forty level records, the actual public widget
functions, selected original-code paths and live emulator probes. Full scope,
results and remaining checks are in `audit.md`; the reusable checks are in
`validation/`. This is the author's self-audit, not the independent check in
`kit/CHECKING.md`.

Tracing GAME and BLDR's callers exposed a real earlier mistake: `$8FB5` is
champion-name entry and `$8FC4` is construction-title entry. Both high-score
fields enable the inactivity timeout; the construction title disables it.
Live checks confirmed all three input bounds/modes. Corrected facts, F28 and
the canonical regenerator labels/comments, then exported symbols and rebuilt
the listing. Kept two unused external reference images in ignored research
storage, preventing the site build from publishing them. Qualified the full
death recording's final frame-advance sample, which ends at a routine stop.

The audit scripts compare disk inputs and raw snapshot memory with published
data, and run the actual page's scoring, sound and Simon functions against
original routines. The kit opcode decoder shares tables with the listing
generator, so that check is labelled consistency rather than independent
disassembly validation. M.L.'s 135 disk-to-entry differences are explicitly
enumerated, including two accepted protection markers whose exact writer
instructions still need a fresh-boot observation. Existing private suites and
selected live probes passed again; the report distinguishes forced states,
input-driven controls and earlier captures not replayed in this pass.

The final browser test exposed an asynchronous test-harness race: immediately
after changing reduced-motion preference, it sometimes read the play button
before the media-query event arrived. Added a bounded wait for the changed
preference and stopped playback, plus a stable-frame check. Source navigation
and complete death playback then passed, including the mobile widths. No
product change was needed for this visible test failure.

## Setup and orientation, 2 October 2026

The contributor chose Silver, authorised web research, the pull request and maintainer issues, and approved the official vice-mcp v3.13.2 download. They supplied Wizard for C64 as `wizard.g64` and `wizard.nbz`, and identified the session model as GPT-6 Astra Extra High (`gpt-6-astra`). Commits use the verified GitHub noreply identity for jankfoundry.

Ports 6510 and 3000 already served other sessions. Added clone-local ports in the ignored `tools/mcp-ports.json`, using 6511 and 3001 here. VICE accepts a configurable port; regenerator2000 0.9.20 has a fixed HTTP port but supports stdio. A small loopback HTTP adapter runs its stdio server on a project generated from the same snapshot RAM and schema as `symbols_import.py`. Copied the contributor's existing crates.io installation of regenerator2000 locally; no Rust installation was needed.

`verify-footprint` first reported a file changed by another simultaneous game session; a second complete launch/use/exit passed with no unexpected outside files. The launcher and dispatcher tests passed. The first emulator test stopped after 33 and then 12 passes per host second, incorrectly saying the program never ran. The startup check now tests positive progress, leaving the existing frame checks to measure exact progress. The complete run passed 54 of 57 checks. The three failures were host-throughput thresholds: watch-store and watch-load each counted 39; warp counted 71 passes/s versus 46/s normal. Exact stops, all frame checks, instruction-safe pauses, and snapshot determinism including restart passed. Use controlled emulated-time probes for game claims.

Original manual downloaded to ignored work storage and read before game code. External title and high-score references saved from C64-Wiki. No game binaries downloaded.

The original image passed the illustrated introductions, then repeated the protection loop at $1947–$1961. $19A3 reads 128 bytes from track 3, sector 3 and XORs them into $7000; the loader waits for $7000 to become $4C. True-drive reads had left one half (first byte $44) there; the emulator's direct sector decoder exposed the other half (first byte $08). Their XOR is a table of forty-one JMP instructions followed by engine code, with targets in the loaded machine-code image. To avoid spending the run on protection, stopped at $195C, applied precisely that XOR from the supplied disk, and resumed with the stack and loader flow unchanged. This is an emulator-memory loader assist, not a changed disk. Saved the two inputs and result privately in work/loader-assist.json and the stopped loader snapshot in work/loader-protection-complete.vsf.


## Coverage, overlays and verification

The apparently large data tail was compiled bytecode. Decoding all runtime handlers yielded 4,068 GAME operations, plus 3,830 in the separately loaded BLDR overlay. The editor DATA established monster names and limits. The canonical resident ledger reached 45,560/45,560 bytes; disk overlays are documented separately rather than substituted into that snapshot.

Tracing all forty level files found twenty active treasure callbacks, including routines that extend into unused patch/header space. A twenty-first nontrivial prefix in L35T starts with RTS and is retained as an open dormant fragment. The interpreter literal-dispatch vectors, self-modified operand labels and ROM-call aliases under sprite RAM required separate ownership comments. A filename-offset hypothesis was corrected: LnnT occupies $8AB7–$8ABA without a zero terminator.

A first pickup experiment wrote the foot-support cell rather than the lower-side collectible probe and did not collect anything. Breaking at the collection routine located the correct sampled cell $C693; matched snapshot tests then verified key, reward and life-threshold behavior. Freeze and six-player menu tests passed. Pause screenshots were retaken after allowing recoloring to finish.

Frame capture exposed a phase-inference bug when a frame has no video writes: two equal line numbers can be a whole frame apart. The kit now uses elapsed cycles to unwrap those samples, with five regression cases. The rebuilt Playground frame matches all 104,448 visible pixels. Separate original-code tests passed 158 score, movement and sound comparisons.

The article and forty-map atlas were built before a distinct copy rewrite pass. Browser checks exercised controls, all forty maps and five effect buttons at desktop and mobile sizes. The only first-pass console failures were missing favicons; explicit icons were added to the authored pages.


## Human curation: monster appearance, 2 October 2026

jankfoundry requested graphics for each selected behavior and a tidier presentation. The actor section now pairs each behavior with its editor-default sprite, individually selectable frames, and distinct appearance/color combinations found in the shipped level headers. The default tables were checked against BLDR's READ loops and default-setting command; all drawing bytes come from the canonical listing. A dark display area, a light background for black actors, grouped controls, and a responsive two-column layout make the artwork readable. No behavior simulation was added. The run is marked `silver-claimed` with jankfoundry as steward; other sections remain to be curated for Gold.

Browser checks covered all 21 behavior selections, 86 appearance options and 181 frame selections, including the blank frame in the Double Cross falling-rock sequence. Desktop and 390-pixel mobile layouts were inspected; keyboard navigation, next/previous wrap and direct-file artwork previews passed. The built page had no browser errors.

## Second research and content pass, 2 October 2026

The contributor requested another pass on understanding and page content. Re-reading the supplied manual exposed an error in the earlier analysis: it never advertised different target immunities for the first four projectile spells. It describes the same lethal hit effect for all four. Rechecked the full collision-queue/consumer path, then ran 7,200 original-code combinations and five forced queued hits with a no-hit live control. Corrected the claim in the page, feature table, facts, TODO and source comments. The cat's earlier feature title also overstated its AI: the ground controller follows the wizard; its rat interaction is contact-based. Another 150 original-code cases cover every ordered cat/rat slot pair across the five projectile spell IDs. Four paired Freeze timelines establish the shared countdown reset and simultaneous restoration of separate original colors.

The Simon Says callback comparison now has 4,096 original-code cases checking the actual page function, branch modification, death flag, next symbols and all thirteen color stores, plus four isolated live callbacks. The saved header initially appeared contradictory: remembered pearl, displayed chalice, hidden words. Rather than call that a bug, loaded L07T through the game's loader and stopped on its first update. Neutral input automatically collects the starting pearl in slot 14. Its terrain patch actually addresses color RAM and makes the words cyan before the callback checks them, so that pearl is safe and initializes the displayed and remembered chalice together. Left, right and up reach the same callback before the joystick poll. This proves the initial transition, not a full room-completion route. The map counts also needed correction: raw glyph counting included two hidden lookup tables in Simon Says. Both authored pages now use the original sixteen-slot index; level 08 changes 48 to 16 indexed treasure cells and level 36 changes 18 to 16. Simon Says includes its displayed instruction symbol in those sixteen.

The canonical entry snapshot rebuilt the committed listing unchanged before annotations. Recreated the disassembler project from symbols.json, then added four routine names and eight expanded/corrected comments, including correcting the level-37 setup call to the actual blackout entry. Import also reinstates eighteen predefined KERNAL aliases alongside the existing RAM sprite labels; a record comparison confirmed that only the intended annotated records changed and no displayed sprite labels were replaced. Coverage remains 45,560/45,560 bytes. Callback overlay details remain in the separate level source companion.

Added an interactive Simon Says rule example using the game's glyphs, and documented Freeze duration by difficulty. Copy was rewritten separately after the mechanics were tested. Browser checks cover all 64 requested-symbol/color/pickup combinations, hidden instruction pixels, keyboard activation, all twelve spell descriptions, corrected atlas counts, and widths 320/390/768/1280 without errors or overflow. The example deliberately tests a pickup rule rather than suggesting it is a full level simulation. The first isolated live-call attempt read execution state before the asynchronous run-until had stopped; the harness now waits for the stop and checks the exact program counter. Private scripts, binaries and snapshots remain under work/.


## Third curation pass: treasure machinery and separate programs

Built the all-room pickup explorer by executing the original collection, patch and callback code. Its 606 selectable treasures yield 700 states, including repeated regenerated pickups. Five live forced-state comparisons agree. Four isolated controller replays add 960 states with original sprite animation; their controlled inputs and paused subsystems are stated beside the controls.

Following real room startup then holding neutral revealed thieves repeatedly consuming gold in Friend or Foe? and pearls in Ladder Land. Callback stack return $7FA4 and indices2/1 identify the collector. Their own-color-only black artwork hides them. Burning Bridges also automatically collects its starting gold; its callback swaps key/exit cells, not generic bridge tiles. A leftward input to pearl index9 removes three platform cells and swaps them back with the wizard surviving.

LODR $1117 was reached after the documented protection assist and normal SCOR load. Physical Commodore matrix input changes $DC01 from $FF to $DF and clears exactly eighty bytes. All 256 port bytes agree in isolated tests. Editor CTRL-S overwrites deliberately distinct elevator parameters; a private copy of the game disk returned WRONG DISK. Checking the branch polarity showed that successful PPSS loading protects the original, rather than authorizing it. A fresh private D64 saved and reloaded L99T with all reset fields intact; the original supplied image hash stayed unchanged.

The Immortal Portal’s incoming carry is resolved by its callers: $8D4B clears it for every valid spell, verified in 384 cases. L35T still returns immediately on all sixteen pickups, 1,536 actual terrain-counter/mode cases and a 4,096-call terrain timeline. A first negative test varied the unrelated animation phase; the corrected test varies $C062-$C064 and $C35C-$C35E and observes 321 terrain transitions, preventing a vacuous result. These bounds do not explain the retained fragment’s historical purpose.

Added a source browser for BLDR, a loader excerpt and all forty level callbacks. Links include the program identity so overlapping addresses cannot silently lead to the GAME listing. Browser checks cover all 42 views/4,449 lines, search, section/address links, atlas deep links and phone layouts. Updated five canonical comments through the live disassembler, exported symbols and rebuilt from the canonical snapshot. Full completion routes and human review for Gold remain open.


## Fourth curation pass: movement, spell protection and a room route

Executing `$707B` against small prepared scenes established the thirteen-pixel jump arc, bounded fall alignment, early rope/ladder catches and elevator ride behavior. Corrected older ladder/rope terminology: `$63/$64` are the narrow rope/anchor; `$65/$66/$67` form a ladder. The illustrations contain 25 scenes and 494 states. Eleven complete representative traces, totalling 205 updates, agree with live emulator calls. The elevator IRQ's ADC then SBC inherits carry; 48 slot/height cases confirm the actual contact window. Fourteen canonical labels/comments were updated through regenerator, then exported and rebuilt from entry.vsf.

Tracing the callers of `$30B3` corrected the earlier “32-pass” interpretation of Invisibility. Only protected fatal reports decrement V21; safe movement leaves it alone, and red hazard death bypasses it. An 84-case interpreter matrix covers boundaries, colors, travel and fatal state, plus 99 safe-pass controls. Live tests reproduce all 32 spent units, display/color transitions and the next death. The interpreter harness originally stopped on the increment entry `$0926`; direct jumps enter `$092C`, so all opcode-boundary stops now use that actual dispatch entry. The first live death test targeted the wrong machine routine; the corrected stop is `$9526`.

A movement-only Burning Bridges route reached the key and exit but omitted actual sprite collision. Full emulator attempts exposed arrow deaths and different traversal timing, so those isolated results were used only for planning. The completed route uses the original room load with Intermediate difficulty and compiled progression variables prepared for L17T; arrows, elevator and timers run. A saved key checkpoint leads to both outer-pearl effects and the exit at (40,130). Continuing the successful saved exit reaches the normal loader requesting L18T. The public walkthrough is explicitly checkpointed, and its ten original-graphics illustrations were captured across live attempts. Other attempts died while crossing arrows; no fixed-count universal solution or uninterrupted playthrough is claimed.

The page gained gap/jump comparisons, catches, elevator riding, spell-travel examples and an interactive Invisibility budget. Quick links and folded evidence make the article easier to navigate. A separate copy pass simplified the launch-position explanation and distinguished the checkpoint illustrations from motion playback. Browser checks cover the new choices, keyboard/slider controls, protection exhaustion/reset, route navigation, reduced-motion startup and phone widths. A reduced-motion test initially navigated to the same fragment, which preserved the old slider position; the test now reloads before checking initial state. No new shared-kit rule or maintainer ask was needed: the existing input-reachability and widget-verification rules directly covered the failures.

Visual inspection caught striped walkthrough sprites: CPU-visible reads at $E000–$FFFF had returned KERNAL ROM. Recovered each of the 46 displayed sprite shapes from raw RAM in its corresponding saved snapshot, matching the recorded pointer and ROM-visible bytes to identify it. The published data carries only the corrected game graphics. This was a visible capture bug; the page was rebuilt and the route controls/graphics rechecked.

## Review correction: the fatal-fall replay

jankfoundry noticed that the no-spell drop stops after a tiny movement. The original-code and live trace moves Y101 to Y105 and sets death on its first update; the preview stops before the death animation. Added a visible fatal-fall banner, an accessible end-state description and a direct explanation beside the Feather Fall comparison. Recorded motion stays unchanged. Focused browser checks cover playback, reset, the surviving Feather Fall comparison and phone layout. The review fix stays local pending the contributor’s submission review.


## Review correction: play the complete death animation

jankfoundry preferred the full animation to the fatal-state banner. Continued the existing four-pixel fatal drop through the original compiled death gate, setup and loop, capturing every PAL frame until `$96A3` with `$C066=0`. The 266 replay states include the initial pose, the fatal update, and 264 captured frames. The final wizard reaches Y199; rotating and final-effect shapes, plus the second death sprite, come from VIC-visible RAM. The expanded view keeps both sprites visible, and the banner is removed. Playback uses the captured frame cadence, while the other examples retain their slowed update cadence and matching view.

The first capture exposed two assumptions in the earlier movement-only fixture: its VIC screen/font pointer and shared colors were omitted, and unpaused CIA interrupts repainted original-room fire cells into the prepared map. Restoring the game's display setup and pausing room interrupts produced the intended fixed terrain with live VIC collision latches. Visual inspection checked the emulator and the browser's middle/end frames. Raw-bank reads avoid the earlier ROM-as-artwork failure.

Browser checks played the entire death to its terminal state and exercised pause, restart, replay, keyboard scrubbing, switching examples and reduced motion. All sprite rectangles fit the expanded view; 320/390/768-pixel layouts have no overflow. The existing 21 movement choices, four spell choices, Invisibility controls and room-route navigation also pass without browser errors. The change remains local for the contributor's review.


## Review correction: the wizard starts purple

The contributor spotted a blue initial pose before the purple death frames. The prepared movement setup forced own-color 14, while the original death script restores normal color 4. Corrected the shared preparation and regenerated the movement states and complete live death capture with purple from the start. All 758 states retain their positions, shapes, timing and other fields; only own-color changes in 494 states. Shared multicolor values remain 14 and 1, and Invisibility's intentional color changes remain intact. The initial and final browser frames were visually checked.


## Further self-audit, 3 October 2026

The contributor requested the next audit work. A fresh hard-reset boot exposed a missing prerequisite in the orientation recipe: at the first protection-loop stop, `$FB=1`, a successfully reconstructed table is deliberately rejected by LODR `$1973–$1977`. The earlier successful work began after many retries. Resuming the first stop unchanged and applying the sector XOR on the second stop reaches the title without changing the attempt counter, PC or loader instructions. Store watchpoints identify `$1986` as the writer of `$99F0=$FA` and `$1989` as the writer of `$58FF=$FA`. The fresh GAME entry matches all 45,560 listed bytes; menu input then reaches Playground with the documented display, vectors, position and life slots. Orientation now includes the guard.

Fresh c1541 extraction reproduces all 45 prior private program/asset/level inputs. The data audit additionally reads original spell names, BLDR behavior names and all default shape/animation/color records, comparing the public labels/defaults with them. All 9,180 native instructions agree with VICE's separate decoder in 117 batches after full memory identity checks. This tests native boundaries/bytes/mnemonics, not the truth of every semantic annotation.

The new portable accounting harness executes the original interpreter and bytecode in 303 prepared cases. It respects the scalar type flag rather than treating a stale exponent byte as the type; PRINT operations are suppressed, and saving is stubbed only for save-gate tests. Live bonus and account probes verify selected arithmetic, life thresholds, three-byte storage, dead-player skipping and round wrap. Two death-settlement cases establish that a survivor retries the same room, while final-life loss moves on. Original ranking inserts before the first lower score: equal scores can still enter below another equal score. The article and technical summaries now say so precisely.

Resuming the retained `bridges-solved` exit checkpoint without new state edits settles 2550 plus seventeen bonus units to 3400, retains six lives and requests L18T. Two prepared milestones verify ordinary band bonuses, wrap and Expert-to-Mystery transition. A forced Mystery load confirms that it clears the round before requesting the selected room. Forced high-bit milestone arithmetic is not evidence of normal Mystery milestone reachability.

A prepared 1000-point account passes the original ranking and keyboard prompts. The real SAVE writes initials XYZ and name AUDITCHECK to a disposable D64 with status zero. Replacing the RAM record with sentinel bytes and invoking the original LODR SCOR load reproduces all 128 saved bytes. A separate c1541 extraction agrees. The supplied G64 hash remains unchanged. This is a real persistence test from a prepared score, not an earned-score playthrough.

Visible probe failures were corrected before accepting results: keys queued at `$8FDD` were cleared by the input initializer, so typing waits until `$9003`; AUDITCHECK is ten characters; the original SCOR loader is LODR `$10FC`, whereas `$8A22` reloads graphics. Swapping a disk after snapshot restore required the original `$8B62` I0 command before SCOR LOAD; otherwise stale drive state returned file-not-found despite a valid saved file. The failed `bridges-route-end` attempt was not used as completion evidence; `bridges-solved` is the successful exit checkpoint. These are local fixture corrections, not silent changes to the original code.

Nine canonical comments were updated through regenerator, then symbols and listing regenerated. All block classifications, extents and labels are unchanged. The audit report distinguishes prior evidence, this pass's original-code matrix, live prepared paths and the remaining independent-review/route limits. Existing verification and reachability rules cover the findings; no additional shared-kit rule or maintainer ask is needed. Changes remain local for the contributor's submission review.

Required binary, documentation and listing checks pass, as does the full 19-game build. The revised player-turn section displays at 1280- and 390-pixel widths without overflow or browser errors, and the built listing contains the updated ranking annotation. The saved-score extraction still matches all 128 bytes.


## Additional gaps: score attribution and error paths, 3 October 2026

The contributor asked which gaps could be addressed without independent review. Following the ranking through its second pass found an omission in the numeric-insertion explanation: `$42A5` matches scores by value rather than tracking the inserted record. A tie can take the champion’s name, and a tie at tenth place can replace initials with no numeric insertion. Eight complete insertion/attribution cases cover these, six equal players, mixed-order scores and nonqualifying controls. Live text input confirms a six-player prepared result plus separate top and bottom ties; all three saved 128-byte records match separate disk extraction. The article, F28, facts and canonical comments now describe the second pass.

The new thirty-case `audit_score_paths.js` also covers twelve score-save retry outcomes, six level-load/wait paths and four native-saver status combinations. Both it and the existing 303-case accounting suite use a shared readable `compiled_harness.js`; the original 303 cases pass unchanged. Its I/O and input substitutions are explicit. A full earned-score multiplayer playthrough is still outside this work.

The level-load error handler’s apparent timeout was wrong: `$2A7A` increments once, while the back edge at `$2AAB` returns to `$2A84`. The original-code test observes 10,000 polls with no counter change, then FIRE exits. Live, a real missing-file load returns `$42`; during 600 PAL frames, the wait entry is read 8,049 times and the increment opcode is not read again. The counter stays approximately 0.0001, then FIRE requests another LOAD with counter 1. The controlled matrix also shows a fourth LOAD occurs before the retry-limit check and even a successful fourth status is discarded. No claim of four live physical failures is made.

The score-save error loop differs: it increments during waiting and does expire. An unavailable-device parameter was prepared after the original SETLFS, without patching any instruction. SAVE returns `$80`, displays DISK ERROR, then FIRE retries onto a disposable disk with all 128 bytes matching extraction. A no-FIRE run reaches the actual expiry. Another observation with no disk attached returns zero: the saver reads KERNAL READST and does not inspect the drive’s DOS error channel. Successful transfer status is therefore not used as proof of persistence. Repeated empty-drive probes were not uniformly zero, so the record describes the observed restored state rather than a universal missing-disk rule.

Visible harness issues were resolved rather than counted as evidence. A level LOAD immediately after restoring/detaching a drive returned stale success; initializing an attached SCOR-only disk with the original I0 routine yielded a reproducible missing-file error. A watchpoint ignore-count request did not provide the requested 10,000-hit observation. Switching to nonstopping watchpoints and 600 exact PAL frames produced 8,049 wait-entry reads, not an assumed 10,000 iterations; the test checks progress and records the actual count. FIRE is the positive exit control. Early strict assumptions about empty-drive status and read counts failed and are not retained as universal assertions.

Six semantic source comments changed through regenerator; symbols and listing were regenerated with block classifications, extents and labels unchanged. The audit retains the independent-review requirement, further complete routes, full/write-protected disk cases and live retry-exhaustion limits. The existing verification rules cover these findings, so no shared-kit change or maintainer ask is added. Work remains local for the contributor’s submission review.

The expanded score section and built annotation pass desktop/phone browser checks (1280/390 pixels), with no errors or horizontal overflow. The 45,560-byte data audit, required binary/documentation/listing checks, skill-usage check and complete 19-game build pass. The original disk hash remains unchanged.

## Semantic and reproducibility audit, 4 October 2026

Created `game/c64/wizard-audit-followup` from upstream `f78d34d`, preserving the
unpublished delta from `a4b2aa7` through `a2c3192` and the maintainer's kit
changes. The removed timing file was not restored. Work stays local for review.

The updated verification skill called for a fresh comment sample. A separate
GPT-6 Astra Extra High reviewer began a fixed-seed sixty-comment review in
resident $5800–$9FFF. It reported four concrete findings, then hit its service
usage limit before producing the full sample. The parent inspected the bytes,
added original-code checks and live VICE controls, and corrected all four
comments through regenerator. The interrupted sample has no reported passing
rate or confidence interval.

The room audit enumerated forty entries, both real collection paths for each
of 608 indexed saved treasure cells, and 1,931 prepared callback cases. Madhouse
skips $C700 while rotating the other 839 cells; that saved cell is an arrow,
not padding. VICE confirmed the omitted cell with a filled-screen control.
For Your Ice Only reaches its glyph-erasure tail on early indices as well as
later ones. Updated the article, atlas, facts and source companions.

Moved the useful pickup, actor-motion and movement checks out of private helper
dependencies. The new shared setup reads CHRW and level files directly; it
does not use the page's maps or font to build the expected machine. Tests check
actual shipped functions/data and add header/position comparisons to the
pickup validation. The portable live runner generates its own private fixtures,
compares them with VICE, and restores the prior paused state. Seven native
controls supplement five pickup cases, the Madhouse boundary case and three
For Your Ice Only early/later/exhausted-counter controls.

The existing verification, negative-result and widget rules cover these
corrections. No shared-kit behavior or new maintainer ask is introduced.

The five new offline suites also pass from a minimal copied checkout outside
the working directory, with a separate input path containing spaces. Three
deliberately corrupted public results and a missing-font control are rejected.
Existing data/mechanics/accounting/score-path audits pass; the original disk
hash is unchanged. Required binary, documentation and listing checks pass,
all 24 games build, and the generated site's links resolve. The live audit
leaves VICE paused at $8E62 with zero checkpoints. Source blocks and symbols
are identical to the pre-pass map; exactly four canonical comments changed.

Focused browser checks at 1280 and 390 pixels pass for the visible Madhouse
explanation, both changed atlas entries, the program companion and canonical
source comments. The 266-state fatal-drop replay retains its purple start.
No browser errors, failed requests or horizontal overflow were observed.


## Completed source-comment review, 4 October 2026

Resumed the separate reviewer through all sixty original selections. The saved
selection exactly matches a2c3192 and reproduces with seed 20261004, six address
bands and proportional allocation from 358 eligible resident comments. No
comments were replaced after the four known findings. Final baseline results:
56 supported, four incorrect, zero unresolved; 6.67%, with an approximate
pooled Wilson 95% interval of 2.62–15.93%. All four revised comments in 50dbcec
have supported targeted rechecks. There were no additional confirmed errors.
This sample does not measure the remaining error rate after those edits, nor
the semantics of compiled GAME, room overlays or every page claim.

Saved the full per-comment Markdown and JSON evidence in validation/, including
baseline text, instruction/caller evidence, assumptions and hashes. The parent
reproduced the selection and independently checked all 256 packed-note inputs,
149 even-X centering positions, forty authored even-X starts and an odd-X
control. Private saved editor data matches all 1,136 bytes of its archived RAM
image. Raw LODR bytes differ from the runtime protection routine; two archived
boot snapshots independently decode the documented marker writers, matching
the earlier watchpoint record. These are fresh file/source checks, not a new
live boot or editor-save run. No emulator state was changed.

The reviewer's sandbox retained an older network-namespace restriction, so
read-only checks and report-assembly commands ran through the parent. The
reviewer supplied the evidence and verdicts; the parent cross-checks are
identified separately. Existing verification rules cover the work;
no shared-kit change or new maintainer ask is introduced. Work remains local
through the contributor's updated-page review.

The complete 24-game site build passes. The review artifacts contain sixty
unique completed records, exactly match the source comments, and have an
independently recomputed confidence interval. Browser checks at 1280 and 390
pixels show the review summary, matching source data and all 266 purple-wizard
states without page errors, failed requests or horizontal overflow. Full death
playback, pause/restart, keyboard scrubbing, reduced-motion behavior and sprite
bounds pass; 320-, 390- and 768-pixel layouts also pass.
