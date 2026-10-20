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

## Alph and Ralph opening exchange · 19 October 2026

Tried an ordinary next-area route: scene3 column32 door repositioned from X2079/depth40 to entry28/X1824/depth6, then left input reached column26/X1672. Its selector0 route table points to scene4/entry2. Several approaches and command attempts instead reached a blank local view with map mode0 while scene3 remained selected. A store checkpoint caught the mode write at $3F4A; the cause and a successful crossing remain open. These trials do not establish a natural Alph and Ralph arrival.

Switched to the existing forced female-avatar scene4 reference for a bounded encounter check. Early keyboard trials were invalid: the saved wheel/input state toggled wheels on the first letter, so the intended command did not dispatch. Settling after release, selecting the action wheel and clearing its prefix fixed this; recorded the actual command fields. From X99/depth6 beside the left door, CALL ALPH dispatched once and three ASK ALPH commands dispatched three times, advancing the shared conversation index0→1→2→2 and displaying the three published replies. Restored original emulator state and normal speed.

Started a scene4 disassembler through tools.py on an anonymized publication copy. Traced the bounded opening conversation and speaker prerequisites. The CALL ALPH path skips the neighboring Ralph CMP #1; corrected the draft comment to describe its actual zero-flag branch. Exported symbols/listing, added a conversation stepper and conditional area navigation, and compared45 original decisions plus all three original reply parses. Five independent overlapping scopes total53,393/237,523 (22.5%); the percentage changes because scene4 adds48,705 tracked bytes. Shared ownership and new-comment independent checking remain open.

Validation: all19 JavaScript checks plus the opening-scope Python check passed. The new test also checks all256 CALL return-byte branches and parses the CALL response. Binary/document/listing checks passed; the site built648 pages. Browser checks exercised area/topic switches, all three ASK replies, repetition and reset with no console errors. Published HTML/listings passed the entered-name scan; all four new screenshots were visually checked. The preview needed an explicit reload after the build to discard cached content.

## Ralph's shared opening exchange · 20 October 2026

Reopened the scene-four disassembler on its publication snapshot through tools.py, restoring the exported annotations. Reused the normalized wheel-input sequence from Alph's successful trial. Two live trials checked a fresh Ralph conversation and switching to Ralph after Alph's first answer. Both used ordinary input inside the forced reference room, with positive CALL/ASK handler hits and captured command fields. Fresh index0→1→2→2 matched Alph. The switch kept index1 through CALL RALPH and gave reply2 on ASK RALPH. All published screenshots were visually checked; original emulator state and normal speed were restored.

Added a section showing the speaker switch beside the existing Alph exchange, plus a collapsed fresh Ralph comparison. The widget uses the existing checked reply function and a CALL RALPH branch checked across256 returned query bytes at each valid opening index. A further90 cases enter both actual ASK prerequisite/helper paths with the distance API intercepted at an accepted state. Exported symbols/listing; the part describes858/48,705 bytes. New annotations remain unsampled; shared resident ownership remains unresolved.

Validation: all21 Labyrinth checks passed, including the new original-code comparison. Binary, documentation and listing checks passed. The built section was checked in the browser: CALL/ASK steps, completed-state button, reset, fresh Ralph comparison and topic navigation worked, images loaded, and the console showed no errors. Published HTML/listings passed the entered-name scan. The preview server had stopped; it was restarted on loopback and a fresh preview tab recovered the browser's cached connection-error page.

## Opened-door threshold · 20 October 2026

Traced the count gate after the shared opening conversation. The initial Brick Hallway map census found12 closed/type2 and3 open/type3 doors; the opening initializer sets $0569 to3. Reused the already checked scene3 closed-door increment and ran an ordinary repeated OPEN DOOR trial: count4/cell6 stayed unchanged, with one handler and zero mutation hits. A controlled scene4 comparison changed only the count to14/15 in separate restores of the same refusal. ASK ALPH retained refusal at14 and gave thanks at15, with acknowledgement-store hits0/1. Kept these counter tests separate from an uncompleted ordinary fifteen-door route.

Annotated the threshold and thanks record, bounded the new message at its exact terminator so unrelated text remains undescribed, and exported the scene4 map/listing. It describes923/48,705 tracked bytes. Added a threshold comparison under the guards' area and checked1536 original ASK count/index cases through both accepted presence branches, plus the original thanks parse, all64 map cells and the initializer bytes. Later acknowledged dialogue and counter persistence remain open.

Validation: all22 Labyrinth checks passed. Binary, documentation and listing checks passed; the site built648 pages. Browser checks exercised count14/15, the repeated-door comparison and topic navigation, with loaded images and no console errors. The response comparison restores its baseline for each command. All three new screenshots were visually checked, and published HTML/listings passed the entered-name scan.

## Brick Hallway close/reopen cycle · 20 October 2026

Followed the pending CLOSE DOOR question to handler $8E9E, its replacement table and DEC $0569. Reopened scene3's disassembler through tools.py on the publication snapshot, restoring exported annotations. Ordinary CLOSE,CLOSE,OPEN,OPEN from the naturally opened door yielded counts4→3→3→4→4, cells6→7→7→6→6 and positive command hits throughout; only the successful close/reopen produced mutation hits. Visually checked all four captures and restored the original emulator and normal speed.

Added a close/reopen example to the Brick Hallway and linked the guards' count explanation to it. Kept the existing OPEN function as the cycle's dependency, with an independent CLOSE port. Tested65,536 original CLOSE decisions and20 complete classifier/mutation calls across five initial counts, including artificial wrap boundaries and the page's actual count4 sequence. Annotated/exported the new handler, message helper, table and bounded already-closed reply. Scene3 describes1,123/48,587 bytes; five overlapping scopes total53,536/237,523 (22.5%). New comments remain unsampled; complete persistence and other commands remain open.

Validation: all23 Labyrinth checks passed, followed by the binary, documentation and listing checks. The site built648 pages. Browser checks exercised close/reopen, both repeated commands, reset and the links between the Brick Hallway and guards, with the correct area selected, loaded images and no console errors. Published HTML/listings passed the entered-name scan; all four new screenshots were visually checked.

## Phase-one reply after the thanks · 20 October 2026

Continued the existing controlled count15 thanks with three ordinary ASK ALPH commands. Positive ASK/phase-one/detail checkpoint totals were3/3/3, each preserving count15/phase1/acknowledgement15/index2/flag$FF. The first capture displayed Figure it out for yourself; later captures caught an undrawn frame. Reloading the second ask and advancing two frames produced the same visible reply. Preserved those blank captures privately rather than publishing them. Original emulator state, inputs and normal speed were restored.

Annotated the bounded phase-one branch and two exact response records. Original-code comparisons cover65,536 index/flag pairs,1536 complete ASK paths through accepted presence prerequisites and both text parses. A speaker-mode assertion initially assumed6 for both speakers; the actual Ralph helper writes32, and the test now checks6/32. Kept the flag producer and zero-state reachability open. The page starts at the captured state and repeats the selected reply, with reset to the thanks.

The new code/data boundary exposed150 previously counted bytes at $902D-$90C2 inherited from the preceding commented pointer data. Gave the unanalysed phase-two block a separate boundary and kept it undescribed. The two newly described records add114 bytes; the honest partial scene4 ledger is887/48,705 (1.8%), a net36-byte decrease. Five overlapping provisional scopes total53,500/237,523 (22.5%); this is not whole-game progress. No new comment sample is claimed.

Validation: all24 Labyrinth checks passed, including the new phase-one comparison. Binary, documentation and listing checks passed; the site built648 pages. Browser checks exercised the new topic, first/repeated asks and reset, with loaded images, the correct conditional area and no console errors. Published HTML/listings passed the entered-name scan; both new captures were visually checked.

## Guard left-door reply cycle · 20 October 2026

Searched raw U4 operand bytes as well as the typed references; untyped $9292 DEC and $92CC INC exposed the local flag producers. The first ordinary OPEN at depth6 dispatched but was too far. CLOSE there reached its already-closed response; that trial's close checkpoint was mistakenly at$9271 instead of actual$9273, so it supplies no positive close-hit evidence. A corrected trial walked up80 frames/released20 to depth24, then OPEN,ASK,CLOSE,ASK changed the door and flag and displayed the unsure/figure-it-out replies, with handler counts1/2/1 and mutation2. Replayed the successful sequence to capture its approached baseline as well. Restored the original emulator state, inputs and normal speed after each trial.

Annotated only the bounded handlers and flag, leaving neighboring commands and later dialogue bare. Inspection exposed an incomplete JMP at the initial$9304 endpoint; extended code through$9305 and moved the undescribed next-command boundary to$9306 before rebuilding. The exhaustive comparison initially missed the proximity rejection's internal$09DD queue; intercepting that real output route preserves its stack-discard behavior. A second assertion incorrectly expected scene4 to write the persistent arrays; the already annotated resident mutator explicitly bypasses those for scene4, so the test checks unchanged arrays and the actual mutation cache instead. No page claim depended on either draft assumption.

The page's bounded left-door function now agrees with262,144 original calls and the actual four-command sequence, reusing the existing phase-one ASK port. Scene4 describes1,023/48,705 bytes (2.1%); five overlapping scopes total53,636/237,523 (22.6%). Higher phases, destinations and full ordinary room entry remain open; new comments remain unsampled.

Validation: all25 Labyrinth checks passed, including the exhaustive left-door comparison and the four-command sequence. Binary, documentation and listing checks passed; the site built648 pages. Browser checks exercised all four steps, the completed button, reset and topic navigation, with correct open/closed status, unchanged displayed Brick Hallway count15, loaded captures and no console errors. Published HTML/listings passed the entered-name scan; five new captures were visually checked.

## Entering the left guard doorway · 20 October 2026

Followed the checked opened-left-door snapshot with ordinary up input. At depth45 the reaction appeared while phase stayed1 and no generic-exit/loader checkpoint had fired in that initial interval. Saved/restored the pending sequence, then ran without movement: one phase-advance and one loader hit established phase2 and scene5/entry1. The title was The Wall of Hands. Continued the disk loader with existing ordinary-input prompt handling to return$59DC and captured scene5/X84/depth6; after60frames, the hands were visible. No memory state was changed beyond the earlier controlled setup; original emulator state, input and normal speed were restored.

The code comparison caught a one-byte alignment mistake in the draft entry-choice entry: $8DDE is the last operand byte of the preceding JMP; the real LDA $AF starts$8DDF. Moved the code/comment/label boundary there, removed the spurious $AFA5 symbol minted by the bad decode, and reran the exhaustive comparison before publishing. All65,536 entry choices agree, as do all256 phase advances, the nine-call successful countdown and the original reaction parse. Kept alternate outcomes and selector initialization open rather than infer them from a single route.

Added a recorded reaction/title/arrival sequence beside the left-door example. Scene4 has1,138/48,705 described bytes; five overlapping provisional scopes total53,751/237,523 (22.6%). Scene5 arrival imagery does not constitute a started part analysis; its code/mechanics remain untouched. New comments remain unsampled.

Validation: all26 Labyrinth checks passed. Binary, documentation and listing checks passed; the site built648 pages. Browser checks exercised reaction, title, arrival, completed state and reset, with all three images loaded and no console errors. Published HTML/listings passed the entered-name scan; the three new captures were visually checked. The previous preview tab had been navigated to another game, so this check used a fresh Labyrinth tab and left that page intact.

## Page structure and evidence links · 20 October 2026

Compared Doctor Who and the Mines of Terror's overview, gameplay, Controls, About source register and map-pin links. Applied those reading patterns to Labyrinth: Overview, Gameplay, a dedicated Controls page, the existing Maps / levels, Source code and About. The Controls replay reuses the checked opening replay; sameBlock verifies every copy. Added inline links beside the mechanics across the overview and area topics, explicitly naming each source part to avoid overlapping-address ambiguity. External/documentary references use numbered notes into the About source register; detailed methods remain in their disclosures.

Location pins open the checked city workflow or a specific scene capture, with accessible labels distinguishing those destinations from decoded maps. Added stable scene IDs in gallery query links, previous/next controls, restored selection on reload and explanation links back to Gameplay. The gate uses its ordinary-play capture; the Wall of Hands uses the checked local arrival with the controlled setup stated. Other captures retain their forced-scene provenance. Restored the city-workflow anchor used by earlier links. No game logic, symbols or coverage changed; no Doctor Who files or shared site files changed.

Validation: all26 Labyrinth checks passed, including the replay copy check across all pages. Binary, documentation and listing checks passed; the site built649 pages. Browser checks followed a part-specific source link and returned to the same reading area, opened the Wall of Hands pin at its correct capture, exercised gallery previous/next and both endpoints, reloaded its bookmarked selection, followed a numbered source to About, and exercised/reset the Controls replay. The city-workflow link selects the correct conditional area/topic. The new reading presentation was inspected visually and the console had no errors. Published HTML/listings passed the entered-name scan.

## Separate text and graphics page · 20 October 2026

Continued the Doctor Who page structure by moving the opening's font viewer and dictionary/passage viewers from Gameplay into graphics.html, labelled Text & graphics. Put the character viewer first and opened the technical content directly on that page. Gameplay keeps the journey, choices and encounter sections; Overview and the opening link to the new page. Old technical hashes redirect to their matching headings. The two original-code tests now read the moved functions from graphics.html; their implementations and data are unchanged. The dictionary control has a separate explicit label. No game analysis, coverage or shared site code changed.

Validation: all26 Labyrinth checks passed, including the moved dictionary and font comparisons. Binary, documentation and listing checks passed; the site built650 pages. Browser checks exercised glyph next/previous, both numeric endpoints and grid toggles; dictionary word and formatting controls; both passages, completion and restart; an old font bookmark redirect; and navigation back to the shorter Gameplay topic list. No console errors appeared. The glyph viewer was inspected visually and published HTML/listings passed the entered-name scan.

## City workflow on Maps / levels · 20 October 2026

Moved the existing city/cinema workflow from Gameplay to the start of Maps / levels, before the room gallery. The page now has the shared two-section Contents navigation rather than an area dropdown that led away from the map. Overview, Controls and Gameplay link directly to the workflow; the ticket pin selects its ticket-to-lobby connection. Workflow node/edge selections are recorded in a query parameter and restored on reload, with invalid selections falling back to the west sidewalk. Both old Gameplay workflow hashes redirect to Maps / levels. The diagram fits the inspected 736-pixel viewport; narrower content retains sideways scrolling.

The eight nodes, eleven connections and original-code comparison are unchanged; the test reads their new page. Capture provenance and gallery behavior remain unchanged. No game analysis, source annotations or coverage changed. All26 Labyrinth checks passed. Browser checks exercised node, arrow and dropdown selection, selection reload, shared Contents navigation, gallery previous/next and capture reload, the old bookmark redirect and the Gameplay ticket pin. No console errors appeared. The site built650 pages, published HTML/listings passed the entered-name scan, and binary, documentation and listing checks passed. The change remains local because the recorded push authorization limitation is unresolved.

## Compact Gameplay navigation · 20 October 2026

Moved the five journey cards, reading key and scope notes into an optional journey-guide disclosure. The default page reaches its first area without the full card grid above it. Added contextual shortcuts inside the sticky area selector: the city workflow or relevant room capture, Controls and that area's Source page. These shortcuts switch with the selected area; the journey guide marks the active card. Opening the guide preserves the selected area. Original mechanics, copy claims, listings and coverage are unchanged.

Browser checks covered all five shortcut groups, the controlled guard-room capture, guide expansion, active-card marking, selecting a card and changing topics. An initial guide link reset the area to the opening; it now preserves the area selector value. The build caught two shortcut filenames using descriptive aliases instead of the actual scene-01 and scene-02 part IDs; both were corrected. All26 Labyrinth checks passed. The site built650 pages, published HTML/listings passed the entered-name scan, and binary, documentation and listing checks passed. No shared-kit change or new maintainer ask arose.

## Searchable city replies on Text & graphics · 20 October 2026

Moved the 127-reply catalogue from Gameplay into Text & graphics beside the dictionary and passage viewers. Gameplay links to the catalogue; its old replies-from-the-city and lab-opening-topic-12 bookmarks redirect there. The reply records are unchanged; the original-parser test reads their new page. The browser check exposed the counter widget's dependency on the full catalogue. Kept its ten reply strings in a separate block on Gameplay, checked against the catalogue, and extended the original-code counter test to require a displayed reply for each of its7995 transitions. Added case-insensitive text and hexadecimal start-address filtering, a result count, standard previous/select/next controls and a direct Source link for the selected record. Empty searches disable the list and stepping controls and show a recovery message. The catalogue retains its saved-setup and reachability caveats. No game analysis, annotations or coverage changed.

All26 Labyrinth checks passed, including all127 reply texts against the original parser and7562 stored bytes. Browser checks covered mixed-case popcorn filtering, previous/next within results, exact $A148 search, no matches, clearing the search, both full-list endpoints, a source-record link and both legacy bookmark redirects. Gameplay's shorter topic list and the moved viewer were inspected. After correcting the counter dependency, its COMPLAIN/TAKE/return/reset controls worked and no new console errors appeared. Binary, documentation and listing checks passed; the site built650 pages, and published HTML/listings passed the entered-name scan. No shared-kit change or new maintainer ask arose.

## Visual captured-scene index · 20 October 2026

Added an expandable thumbnail index beneath the full-size room viewer on Maps / levels. Its21 links carry stable scene query IDs, visible scene IDs and short capture-method labels. Titles shared by different scenes remain distinct through their IDs, including the two Forest and Hedge Maze entries. Every thumbnail opens the existing detailed viewer, which retains its complete provenance and area-reading links. The dropdown also displays scene IDs, and the index highlights the selected capture after dropdown/step changes or reload. Images reuse the existing published captures with lazy loading; no new game images, analysis or coverage changes were made.

Validated21 unique thumbnail IDs and all referenced local images. The original-code workflow check passed after the Maps page edit. Browser checks exercised the second Hedge Maze link, final-room thumbnail, previous/next endpoint behavior, dropdown selection and index highlighting, the controlled Wall of Hands route and reload, and index collapse/expand. Forced captures retain their limitations; the final room offers no unverified Gameplay link. The index was inspected visually and the Maps page emitted no console errors. The site built650 pages; binary, documentation and listing checks passed, and published HTML/listings passed the entered-name scan.

## Cinema counter on Discoveries · 20 October 2026

Added the applicable Discoveries tab using the checked counter sequence: two complaints recover the missing quarter, and returning the dropped nickel changes the later popcorn offer. Moved the existing counter widget, reply subset and evidence from Gameplay without changing its mechanics. The page makes no secret or bug claim. Added a direct source citation beside the later-offer explanation, links to buying popcorn and the nickel connection on Maps, and entry links from Overview, Gameplay and the text catalogue. Both the old numbered topic hash and its generated heading slug redirect to Discoveries. Updated TODO to distinguish the checked sequence from any future secret/bug claim.

The three affected original-code tests now read the moved blocks from discoveries.html:7995 counter transitions,12 live observed transitions, nine later-offer cases, the reply subset against the127 parser-checked texts, and the linked workflow sequence all pass. Browser checks exercised two complaints, both TAKE steps, the keep/return popcorn outcomes, reset, the old bookmark, the exact nickel workflow edge, and links back to buying popcorn and Discoveries. Gameplay's topic menu excludes the moved section. The new page was inspected visually and emitted no console errors. Binary, documentation and listing checks passed; the site built651 pages, and published HTML/listings passed the entered-name scan. No game analysis, coverage or shared-kit code changed.

## Main update and uncounted-data recheck · 20 October 2026

Merged canonical upstream main through b7bc1102, bringing the kit from0.0.201 to0.0.210 without conflicts. Rebuilt all five started parts from the exact snapshots named by their committed listings, verifying each snapshot hash first. The new listing.py uncounted-data check changed no listing fields and found no uncounted extents in those builds. The opening has its loader hand-over snapshot; the four graphical parts do not have separate entry.vsf images, so their recheck does not establish a complete hand-over/play comparison. The coverage ledger remains53,751/237,523 bytes across five overlapping provisional scopes;17 parts remain untouched, and Bronze and the audit recommendation are unchanged. Recorded kit0.0.210 for this recheck in game.json.

The merge brings the improved Source/coverage accounting, corrected guidance for code overwritten beneath a later part, platform icons, Apple II and C16 support, and their games. No Labyrinth comment, byte, gameplay claim or coverage boundary was changed merely because the tooling changed. The full242-test suite initially had228 passes, eight reported skips and six failures. The corridor test had run successfully but its words “FF skip” matched the runner’s skip detector; clarified its output without changing its assertions. Local fixture servers and process inspection needed sandbox permission. A macOS /var versus /private/var alias mismatch in a bridge fixture passed with TMPDIR=/private/tmp. The page-editor self-test exposed34 problems in Labyrinth's markup: inline SVG map pins inside paragraphs and images inside inline list-item content. Moved the unchanged pin shape into a local CSS-masked SVG asset, and gave thumbnail images figure/figcaption wrappers. The appearance, link destinations and game logic remain unchanged.

Retested all26 Labyrinth tests and the six affected kit tests with canonical temporary paths and local-fixture permissions:32/32 passed. The editor tried24,453 edits across211 pages successfully. Combined with the full run,235 of242 tests passed and seven Spectrum checks explicitly skipped because SkoolKit is absent; no test failures remain. The binary, documentation and370-listing checks passed. The site built58 games/664 pages, and published Labyrinth HTML/listings passed the entered-name scan. Browser checks confirmed kit0.0.210 on About, counter input/reset, map-pin appearance and destination, and thumbnail layout/selection after the editor-compatible markup changes.

## Other guard doorway · 20 October 2026

Returned to code and VICE after the site reorganization. Opened scene-04's committed snapshot/annotations on its own disassembler session. From the controlled count15 thanks snapshot, ordinary right/up input reached X247/depth24 and OPEN DOOR changed right cell1→3. The captured selector stayed1. Ordinary up hit$8EAE at column3/X224/depth42, then the countdown reached$8EC1. The first strict frames() helper raised on the intended early breakpoint; the finally block restored the machine. Continued from the saved open-door state using raw frame results and exact-PC checks. Initial screenshots at message enqueue returns were only partly drawn, so captured again after the game's own waits, at$8ED4 and$8EEF. After300 no-input frames the final loss panel was complete. Restored the original machine/input/normal speed after every trial.

Annotated80 bytes of the alternate initializer and losing sequence and146 bytes of three text records. The first export let the last message labels own153 neighboring bytes past their terminators; added bare boundaries at$9EBA/$9F84 before publication. The corrected increase is226 bytes: scene4 now1,364/48,705, five overlapping scopes53,977/237,523 (22.7%). Updated old entry comments with the bounded right-door result. Other selector setups, initial selector choice, post-loss restart and ordinary arrival to the guards remain open. New comments remain unsampled.

The new recorded stepper compares its setup with the original entry decision; test_guard_right.js runs256 initializations,2295 countdown calls across255 nonzero outcomes, exact output requests and three original text expansions. The existing successful path remains a positive control in test_guard_entry.js. Published the four visually checked captures, with no entered personal name.

Validation: all27 Labyrinth tests passed. The editor passed24,471 edit trials across211 pages. Binary, documentation and370-listing checks passed; the site built58 games/664 pages. Browser checks covered every recorded stage, completion, reset, image loading, topic selection and the new part-specific$8EAE Source link, with no new console errors. The published HTML/listings passed the entered-name scan; all four new public captures were visually inspected. VICE reported PAL, WarpMode0 and Speed100 after restoration.
