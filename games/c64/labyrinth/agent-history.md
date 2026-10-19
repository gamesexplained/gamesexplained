# Labyrinth — agent history

## 17 October 2026 — Bronze, unorig and gpt-6.1-sol

The contributor chose Bronze, allowed web research, confirmed the unorig noreply identity, and reserved opening the pull request. One agent did the work. The branch began at origin/main 60752da; the existing skate-or-die branch was left alone.

VICE 3.13.2 passed 57/57 checks. The first disassembler smoke-test command named the temporary emulator-test snapshot after the check had removed it; the resulting missing-file error was fixed by using an existing smoke-test snapshot. The actual opening snapshot subsequently loaded and answered correctly. No software was downloaded or installed.

The original G64 loader reached the logo, save-slot selector, and text adventure. Character answers included a player name, M, and BLUE. A snapshot was saved before the first command. GO HOME proved the state was interactive. A frame capture took several minutes through the local transport, so it was allowed to finish before sending further input. It exposed the full vector chain and the font in RAM under I/O. An initial font render at $C000 showed shapes rather than the letters; checking $D018 correctly placed the font at $D000. The incorrect image was replaced in place. The sweep was extended to lowercase ASCII after the first PETSCII/screen-code pass found only fragments.

The disassembler was seeded from the IRQ vector. Two decimal entry arguments were corrected against the byte dump; $1131-$1139 was restored to undefined, and $113A was decoded from the live frame’s vector. The high-memory $DE12 target was checked against its caller before being counted as executable RAM. Its caller explicitly banks I/O out. The mechanical census was corrected to count absolute/indexed memory operands only, excluding a relative branch within that high-memory routine.

A documented normal-command route reached the cinema and the graphical gate image. Fire, Space, and Return led through further black/loading intervals, but the interactive maze was not established. The Bronze contribution retains the reproducible text-opening snapshot and lists the graphical continuation as unanalysed. No loader patch, memory POKE, or alternate game image was used.

The run stopped at the requested Bronze boundary: initial sweeps and a partial listing, with no full coverage loop or independent verification sample. The page copy was written after the facts and then revised for the house style. No kit change or lesson file was needed; the relevant rules already covered the mistakes encountered.

## 17 October 2026 — Bronze continuation

The contributor asked to continue. Web, commit identity, one-agent operation, and leaving the pull request for them remain unchanged. The saved opening reproduced the committed listing byte for byte; tools were rebuilt from symbols.json and VICE passed 57/57 checks.

Tracing corrected the interpretation of $0F10: it waits for ten IRQ-counter increments at $0353, rather than waiting for a disk transfer. The movie-start card was reproduced from a stop at $8D50, dismissed with joystick fire, and the resulting gate state responded to a controlled movement test. Walking up through the arch led to a second title card and the first brick corridor. The earlier failure to establish graphical play was an observation gap. File matches and the costume loader identify av as male avatar artwork and af as its female counterpart; u1/u2 are distinct gate/corridor code overlays. The room unpacker reproduces the live map, picture and character bytes of the first corridor exactly.

The continuation expanded the partial trace and decoded the hidden-RAM word dictionary. A probe started at $08E5 inside the immediate instruction at $08E4; the affected bytes were restored to undefined and traced from the correct $08D4 entry. The split dictionary pointer table initially lost bytes at automatic colour-RAM aliases; removing those aliases restored the complete high/low halves and the listing checker passed. The generated dictionary comments have no independent sample.

Forced scene requests captured the distinct graphical resources through the final confrontation, including both disk sides. Early side-2 attachment interrupted the old-side autosave; following the game's requested side byte and using Space resolved it. The request captures are preserved separately from the normal gate/corridor route. The continuation is delivered at the contributor's requested Bronze tier, with the unexplained captured loads represented by part placeholders and Silver work retained in TODO.md.

The final Bronze page was built and checked in the browser: the scene selector changed the picture and caption, and the Source tab loaded the expanded opening listing. The full-site build succeeded; repository-wide unresolved source-address links are reported by the build and were not changed in this game contribution.

## 17 October 2026 — small dialogue addition

The contributor requested a little more. Added a dictionary-word explorer within Bronze, using the established hidden-RAM word table. Before writing the copy, checked the page’s extracted function against the original parser in the kit’s 6502 simulator for all 256 indices and four substitution tokens. The 1,024 cases match. The browser controls expose lowercase-initial entries; the test also covers the original arithmetic on capitalized words and empty entries. Copy was written after this check and revised against the house style. No new software, binary uploads, or independent accuracy sample was involved.

Browser verification exercised word selection and all four formatting combinations. The displayed token bytes, capitalization, and space marker changed correctly; the console reported no warnings or errors.

## 17 October 2026 — opening-passage stepper

The contributor requested another small addition. Added a stepper for two actual opening text records: the sidewalk description and the rain/store/owl description. The page groups consecutive literal bytes so a step advances a readable piece rather than a single letter. The test checks every embedded byte against the committed listing and compares all 19 display prefixes against the original parser, preserving stored line breaks. The original 1,024 dictionary cases still pass. The copy explains only these stored passages and was revised after the tests. This remains a Bronze contribution.

## 17 October 2026 — character viewer

The contributor requested a further small addition. Added a viewer for the opening font, with previous/next controls, a numeric selector, a pixel grid, and row bytes. The complete glyph sheet remains available beneath the viewer. The font excerpt matches the listing byte for byte and every monochrome glyph matches the shared C64 renderer. The test initially treated port_check.lib’s return as the renderer; its implementation loads the renderer onto globalThis instead, and the test was corrected before reporting a pass. Copy was reviewed after the checks. The page remains Bronze.

The browser check showed that direct numeric entry could leave the picture unchanged until another control was pressed. Added an input-event update alongside the change handler so the preview follows typing immediately. Previous/next and the grid switch were checked visually.

## 17 October 2026 — word-wheel exploration

The contributor requested more exploration, then repeated the request while the prefix work was active. Continued that investigation rather than starting an unrelated task. Confirmed the live disassembler’s 155 comments exactly matched the exported map before editing. Added ten routine descriptions covering key dispatch, prefix matching, command dispatch, wheel drawing, and prefix highlighting. Exported symbols and rebuilt the listing. Opening coverage rose from 14.5% to 15.9% (5,891 / 37,055 tracked bytes); the graphical loads remain unanalysed.

The simulator confirmed that G selects give, Z is dropped while G remains accepted, O selects go, and clear-prefix preserves go. A VICE probe reproduced those states through ordinary matrix input, including Delete, and restored the prior emulator state afterwards. The committed test also exercises uppercase/lowercase prefixes for every available entry in three saved wheels and verifies every state displayed by the page’s recorded replay.

Reading the quantity path caught two description errors before completion: the highlight ADC includes the incoming carry, and the count formatter adds $31 to a single byte, so value nine yields a colon rather than the digits 10. Corrected those comments in the disassembler and added simulator boundary cases for the suffix. Player reachability of the colon case is an open question. No independent accuracy sample was performed.

Copy was written after the code and live checks, then revised for the house style. The page keeps its Bronze tier.

## 17 October 2026 — opening command responses

The contributor asked for another small exploration. Followed the existing action dispatcher into the opening’s movement handlers and found mixed destination/message tables: high-byte zero means a location number, while another high byte makes the pair a reply pointer. Added nine routine/table descriptions, exported the symbols, and rebuilt the listing. The new GO HOME widget checks all fourteen table decisions against the original handler, and its three reply strings against the original parser.

The first committed-listing comparison reported missing table bytes. Typing and naming both halves in the disassembler brought the complete mixed table into the listing, and the test then passed. It was kept as bytes rather than an address table because a zero-high-byte record is a destination number. An intermediate export reported 6,336 / 37,397 tracked bytes (16.9%). The table’s reply decisions are checked separately from arrival processing and are not presented as a complete city simulation.

Copy was written after the tests and reviewed for the house style. Bronze remains the contribution’s tier; no independent listing sample was performed.

The dictionary regression test then found that the new typing operation had regenerated three automatic colour-RAM aliases inside the hidden-RAM pointer table ($D8A0/$D8F0/$D9B8). Removed those aliases after typing and rebuilt the listing, restoring the complete table. All existing examples passed again. Final opening coverage is 6,504 / 37,421 bytes (17.4%). The exported symbol map remains partial and the hidden-RAM and small code gaps reported by listing.py remain open.

## 17 October 2026 — ticket gate and payment

The contributor requested another small addition. Followed the extra GO EAST check at location six to the ticket inventory byte $6740. Its writer in the GIVE path grants one ticket. The price is split across two routines: the purchase subtracts four from the dollar count, then the common GIVE completion removes one more through $087F. The complete path passes simulator tests for one through nine owned dollars; the eastward decision agrees in all 3,584 location/ticket-byte combinations.

The opcode-reference scan initially missed $90FB because the command handlers, reached through a dispatch table, still had undefined/data typing despite some earlier comments and tests using their bytes. Explicitly traced the verified movement and GIVE entry points and the outside entry from that table. A decimal argument initially named $912C, a valid interior instruction, instead of $9114; subsequently seeded $9114 and the complete outside entry $9123, removing the artificial gap before that interior instruction. The new source classifies the recovered handlers as code. Existing dictionary alias handling was repeated after the new typing, then all examples were retested.

Added six descriptions and a ticket-state comparison on the page. Coverage is 6,428 / 37,814 bytes (17.0%). The percentage is below the preceding 17.4% because tracing recovered more code and changed the ledger’s boundaries; the newly exposed undescribed bytes remain in the denominator. The ticket inventory entry is bounded by an explicitly unclassified following byte, so its comment claims only that entry. Copy was written after the tests and revised for the house style. Bronze and the lack of an independent listing sample are unchanged.

The committed ticket test also requires the recovered command entry points to appear as code in the listing, so later data retyping cannot silently undo that recovery.

## Popcorn-payment continuation

Followed the neighboring GIVE branch from the ticket purchase. Established the two-dollar debit and repeat-payment flag, then added a money/flag example. Tested 2,304 starting states and three full reply streams. The first newline hook incorrectly returned from the parser; matching the existing passage test’s non-returning instruction hook corrected the test. Bounded the separate coin-giving entry with an undescribed label. Exported symbols and rebuilt the listing; coverage is 6,558 / 37,814 bytes (17.3%). Bronze remains partial and independently unmeasured.

## Opening to about 25 percent

The contributor requested about 25% coverage. Followed the largest unexplained dialogue runs and separated 54 consecutive records through `$A3D6`. The parser accepts all their bytes under the already traced literal/dictionary format. Generated exact expansions, typed only that bounded range, and retained the editable dictionary operand at `$9FBE` with continuation descriptions across the `$A000` boundary. Cleared regenerated hidden-RAM colour aliases after typing and exported the symbol map and listing. All record expansions and descriptions are checked against the real parser; a setup-input test also checks its changed word. Added a browser for the checked replies and rewrote its copy after the facts were fixed. The ledger measures 9,533 / 37,814 (25.2%); no exclusions changed, code explanation is unchanged, and no independent sample is claimed.


## 17 October 2026 — opening-only completion

The contributor requested 100% of the opening only. The pass recovered resident API targets, the remaining raster chain, text, sound and renderer/loader services, then corrected small-field and operand aliases against their readers. Exhaustive scale and PRNG tests caught arithmetic assumptions; event tests checked both voice and nonvoice parsing. A fresh disk copy allowed an entry checkpoint before TX setup after the old working copy’s save slot diverted replay into graphical play. The emulator state was restored afterward.

The final opening ledger is 48,261/48,261 with no loaded-data audit warnings. It deliberately includes 2,365 opaque retained bytes as provenance/boundary annotations; their purpose remains unknown. Generic runtime field descriptions were narrowed where their access was read-only, and interaction state names were corrected against the actual handlers. These are author checks, not an independent comment sample. The 21 graphical parts were left untouched. Overall tier remains Bronze; the contributor retains PR creation.


## 18 October 2026 — popcorn change

The contributor accepted the small counter puzzle as the next section. Re-read TAKE, GIVE and COMPLAIN, replayed two command orders from the initial saved setup, and preserved/restored the live emulator state. The counter snapshots confirm two initial quarters, a third from the second complaint, sequential quarter/nickel collection, and the first nickel return. The two preceding state-byte comments incorrectly claimed no direct references; they now describe the actual readers/writers. The later popcorn amount was checked with isolated original-code branches; full encounter timing remains open.

Added the transition example, twelve selected live observations and a regression comparison across reachable and boundary cases. Copy was drafted after the code trace, then rewritten after the tests to explain the quarter mismatch, command choices and limits. The opening ledger remains 100%, overall Bronze and independently unmeasured. No graphical part was analysed. The contributor retains PR creation.


## 18 October 2026 — clickable cinema workflow

The contributor accepted the proposed workflow map. Compared its movement links with the actual direction tables and corrected the rough sketch: the popcorn stand is a side trip from lobby thirteen, with a return to the lobby before entering main theater nine. Added eight selectable place/state cards and eleven command connections, with conditions, results, stored text and source links. Blue moves, amber local actions and a gray multi-command sequence distinguish places from puzzle states. The ticket-buy loop leaves the player at the counter. The diagram is explicitly a cinema-route guide rather than the whole opening.

Tests run the original parser/direction/GIVE routines for its displayed cases and reuse the checked counter model for the refund/return link. The final copy pass explains the map’s legend and its timing limits. No listing annotations or graphical parts changed; the tier and independent accuracy status are unchanged.


## 18 October 2026 — gate approach

Continued beyond the text opening using the natural gate snapshot. Positive movement checkpoints and a store watch rejected the first hypothesis that entry used `$4115`: the actual request was deferred through `$02C3` and consumed at `$59BC`. Resolved `$081E` as sound request and `$0839` as counted delay before exporting the corrected comments. Replaced the forced play image with the natural capture and renamed the forced entry capture to avoid claiming a valid hand-over. Added the bounded classifier widget and original-code tests. Gate ownership and loaded-data warnings remain open.


## 18 October 2026 — shared gate/introduction sequence

Traced the remaining waiting-sequence dispatch and seven headered messages. The initial inference that this was simply dialogue before the saved gate was narrowed: phase zero skips the messages in nonzero scenes, and the natural earlier capture is already phase ten. Kept ordinary presentation open. Added a whitespace-normalized speech viewer, checked every message against the parser, and checked 15,360 phase/countdown cases against the original dispatcher. Pose and sound helpers are traced with their input/visual meanings left open.


## 18 October 2026 — fire latch

Followed writes to `$030B` back through `$1993` to port-one sampler `$19AE`, consulted the C64 reference, and verified ordinary fire press/hold/release/re-press with a positive execution checkpoint. Added 8,192 original latch cases. Kept full live early-speech skipping distinct from the verified input producer.


## 18 October 2026 — area reading views

Reorganized the article into conditional text-adventure, entrance-gate and further-scenes views. Added area links, local contents and next/back transitions. Existing section hashes reveal their owning area; browser history restores the area. Without JavaScript all sections remain readable. Moved the corridor evidence image into the gate view.

## 18 October 2026 — reading UI review

The area chooser disappeared above anchored content, leaving readers without a visible route to another area. Replaced it with a persistent compact area/topic bar; the topic jump menu preserves section hashes. Grouped the gate screenshots, folded source/check paragraphs and the corridor evidence behind disclosures, and started the gallery at the naturally reached first corridor. Existing mechanics and claims remain available. Reviewed area switching, topic jumps, browser Back and the narrow layout in the browser. Removed scroll-driven topic selection after it changed the menu during interaction; the control explicitly says “Jump to topic”.


## 19 October 2026 — main kit update

Merged canonical main at `a0e3e561` (kit 0.0.200). Updated the Labyrinth test/helper imports for the shared 6502 CPU move from `kit/c64` to `kit/cpu`. The existing analysis provenance in game.json retains the kit version used for that analysis.

Kit-update validation: all 206 discovered tests completed, with 199 passing and seven Spectrum/SkoolKit checks skipped because that optional tool is absent. The first suite run identified the moved opcode import and a macOS `/var` versus `/private/var` temporary-path alias; the import was fixed and the full suite passed using `TMPDIR=/private/tmp`. The binary, documentation and listing checks pass, and all 56 games build.


## 19 October 2026 — review against kit 0.0.200

Re-read verification, C64 step and minisite requirements. Both ignored snapshot hashes match their listings, and rebuilding through the updated listing script preserves the byte records. The updated audit exposes a two-byte gap after M1 at $07FE-$07FF; its ownership stays open. The 54.6% combined ledger still has provisional shared-resident scope, with 20 graphical parts unanalysed. All 15 Labyrinth tests pass.

Drew 60 of 1,303 line comments with fixed seed 20261019 (59 opening, one gate) for a cold independent checker on gpt-6.1-sol. It marked 58 right and two wrong-detail: the $2984 three-depth sort claim and the $BCCF unconditional ten-byte name copy. Reproduced both against original instructions, corrected both through regenerator2000, and exported symbols/listing. Checked related descriptions; the other menu wrappers already state the bounded copy. Kept raw verdicts and probes ignored in work/reports. A full audit remains recommended, and the ordering counterexample has no established ordinary-player consequence.

Added the port accuracy row for the two popcorn descriptions corrected by the earlier checked widget, and the sample row for this independent check. Updated kit_version to 0.0.200 for this review; the initial analysis used 0.0.158. Moved the existing screenshot collection to Maps / levels, keeping old gallery hashes and the area chooser working. Its scope explicitly leaves decoded maps, connections and puzzles open; no discoveries or full-map completion are claimed. Browser checks exercised the gate buttons, name/word and counter widgets, old gallery routing, and all 21 scene images without console errors. An old preview tab failed to connect; a fresh in-app-browser tab reached the same running server.

Restarting the disassembler regenerated three automatic colour-RAM aliases inside the dictionary’s split pointer table. The dictionary test and listing round-trip check caught the resulting truncated table; removed those aliases through the disassembler using the existing tool guidance, then rebuilt and reran the checks.

## 19 October 2026 · First-corridor movement and exits

Started scene-02 disassembly on the natural corridor play snapshot, traced classifier/movement tail/exit tables/PRNG and exported symbols/listing. Five ordinary input trials gave a positive movement checkpoint and no exit from the initial wall column. A right/up approach reached X=546, depth=32, then requested scene 3/entry 35. The first attempt used nonexistent `vice_step`; it failed visibly and restored state. Repeated using frame advance after clearing the exit checkpoint, recording the request. Shared scratch B0/B2/B3 can reflect another actor between updates; recorded the player classifier at the actual exit. Added a separate corridor reading area and an original-code-tested map/route lookup. New scope makes provisional aggregate coverage 36.6%; it is not a whole-game completion measure. No new independent sample or full audit.

Validation: all 16 Labyrinth test scripts passed. Browser checks exercised wall/opening selection, exit variants, topic navigation, gate-to-corridor navigation and evidence links to source-scene-02; no console errors were observed. Three repository checks and the whole-site build passed. The push remains blocked by the previously observed workflow OAuth-scope restriction; no PR or issue was opened.

## 19 October 2026 · Complete the first corridor connection

Repeated the ordinary first-opening walk and continued through loader $5098 to $59DC in scene 3. Saved the naturally loaded Brick Hallway screen and ignored loader/entry/play snapshots; scene 3 was not injected. A replay from that loader state stopped before and after placement, proving entry 35 becomes X=2272/depth 6 in mode zero. Restored the original emulator after both trials. Compared the retained placement bytes across images, annotated the corridor copy and exported symbols/listing. Added a departure/arrival comparison and extended the route widget with the continuous-mode position calculation, tested over all 256 entry values. The corridor has 1,113/48,021 described bytes; provisional combined image coverage is 36.7%. Other approaches, return routes and general Brick Hallway behavior remain open.

## 19 October 2026 · Anonymize the published player name

At the contributor’s request, replaced the visible speech example with ANON, removed identifying setup screenshots and their links, and removed the entered name from reference prose and the gate message comment. Original captures are retained privately in work/. Built all three listings from name-only anonymized snapshot copies; byte comparison found only cached name fields changed in the gate and corridor records, with no changed opening record bytes. Gate speech/scheduler tests and the opening scope check pass against the publication data.

## 19 October 2026 · Check movement and OPEN DOOR at the arrival

Restored the natural Brick Hallway arrival for idle/up/down trials. Positive movement hits were 12/30/30; generic-exit and loader hits were zero. Depths were 6/24/0, with X and scene unchanged. A separate ordinary keyboard OPEN DOOR trial produced one command dispatch and the visible reply “Nothing happens.” Kept all absence claims bounded to the captured position and trial lengths; return routes and door approaches remain open. Added screenshots and a reading topic to the existing corridor/arrival area. A first snapshot load failed visibly because another private capture had the same basename; a uniquely named private copy resolved it. Original emulator state and normal speed were restored. No new disassembler annotations or coverage scope were added.

## 19 October 2026 · Open the neighboring Brick Hallway door

Followed the OPEN/DOOR pair through $8B94/$8C54 to $9053, then the resident classifier query and map-mutation API. Ordinary right/up movement reached X=2348/depth 24; the command changed cell7→6 and counter3→4, with positive handler/mutation hits and an open-door picture. Stopped before traversing. Started a separate partial scene-03 disassembly and exported symbols/listing from a name-only anonymized natural play image. Renamed the older forced entry capture so it cannot masquerade as natural hand-over evidence. Wrote an original-code comparison over every cell/mode byte and both observed initial positions. Split the Brick Hallway into its own reading area, preserving the existing arrival-check hash, and added a resettable OPEN DOOR example. New provisional scope makes 27.7% across four images; shared resident ownership and loaded-data warnings remain open.

## 19 October 2026 · Separate the overview from the journey

At the contributor's request, replaced the area-switching How it works page with a four-section mechanics overview and moved the complete area articles/widgets to explore.html under Explore the game. The overview reuses the checked wheel replay and door decision, with sameBlock checks guarding both copies. Added a linked journey overview and folded the opening's text-encoding/font investigations into optional details. Preserved generated topic IDs and redirect legacy index hashes to the exploration page; gallery area links now point there directly. Gameplay evidence, listings, tier and coverage are unchanged.

Visual review of the new overview exposed the original player name still visible in the opening screenshot, missed by the earlier text/listing privacy check. Replaced it with a fresh emulator capture from the anonymized publication snapshot and retained the original screenshot privately. The source of the image is now the same name-only anonymized state as the publication data.

## 19 October 2026 · Trace the opened doorway's destination

Ordinary up input through the opened door reached the generic exit and requested zero/entry12. Continued through the resident retained-room path to X800/depth6 in scene3; captured the destination and restored the original emulator. Traced all four banks for region11 and selector1, then tested all 256 source bytes against the original exit, retained-room branch and placement routine. Added a route stepper to Explore the game and updated the overview's traversal limit. One single-byte typing line was refused visibly; corrected it before applying the annotation batch. Exported the partial scene-03 map/listing; it has 972/48,587 described bytes. Independent scope total is 27.8%; ownership overlap remains unresolved.

## 19 October 2026 · Arrival panel and the door prerequisite

Compared the destination cell1/type11 with closed/open door types2/3. Traced ASK DOOR through $8DD1 to $09E9, including the two PLA instructions that bypass its caller continuation on rejection. Ordinary input confirmed There's no door here for ASK, Nothing happens for OPEN and a depth24 stop for 300 up frames, with positive control counters. Added an interactive response comparison and guarded the control flow against all 65,536 type/mode cases plus both real classifier paths at X800/depth6. Exported scene-03 symbols/listing; it has 1,049/48,587 described bytes. Other interactions and return travel remain open.
