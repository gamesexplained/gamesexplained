# Labyrinth — kit feedback

## Skill text that changed what I did

- `tool-vice-mcp`: "Protected originals (`.g64`) need the drive's own processor.": tried the installed full-drive defaults before changing resources; the original loader reached playable text adventure without a config override.
- `10-orient`: "A game whose interrupt handlers chain": captured a frame instead of treating the first IRQ-vector read as the complete display engine.
- `c64-reference`: "RAM the CPU cannot see": rendered the RAM font beneath I/O and checked the $DE12 caller’s banking before describing that routine.
- `tool-regen2000`: "The flow tracer can wander into text.": kept the mixed code/text overlay split into inspected regions rather than typing the whole file as text.

- `70-minisite`: "A widget that runs a mechanic is a claim too.": compared the dialogue explorer with the original parser in the kit’s 6502 simulator before publishing its behavior; the passage stepper also checks every displayed prefix against that parser.

## What was changed in the kit

- `kit/skills/core/70-minisite`: preserve retired page URLs with the builder’s redirects option and check old bookmarks. This also applies to `games/c64/fist-ii-the-legend-continues`, whose mechanics.html was removed when its content was folded into other tabs in commit9eeaba9e.

None. No kit or shared site file changed.

## Candidates

None. Existing instructions covered the banking, mixed text, protected-disk, and misleading wait-loop cases. The continuation’s mistaken wait-loop interpretation was corrected by controlled input and a trace; `10-orient` already requires sampling the program counter and proving that play advances.

## Maintainer asks

None. The contributor reserved opening the pull request; no issues were filed.

## What cost the most time

A faster frame-capture transport would have saved the most time; both complete captures succeeded, and no new correctness rule was needed. During the continuation, following the requested disk side and sending Space resolved a modal disk prompt; this game-specific behavior is recorded in orientation.md and agent-history.md. The split-pointer alias problem was caught by check_listing.py, so it needs no new skill rule. The character test encountered the lib helper’s side-effect-only return; its source and header describe globalThis, and this visible error needs no new rule.

## Environment

macOS arm64; installed VICE MCP release v3.13.2 GUI, 57 of 57 emulator checks; existing regenerator2000 0.9.20; Python 3.9 with Pillow 11.3.0 for the glyph sheet. Tools were started through the kit launcher. No software installation was needed. The actual snapshot, copied disks, extraction output, and disassembler project stay under ignored `work/` folders.

## Word-wheel continuation

The coverage pass kept the quantity formatter’s colon boundary as an open reachability question, following `50-coverage`’s instruction to note inputs the player was never meant to supply. Direct simulator cases corrected the carry-dependent highlight description and single-byte quantity arithmetic before completion. These are covered by the existing boundary-checking and reachability rules; no kit change or maintainer ask is needed. The live probe preserved and restored the emulator state, and all raw state remained in ignored work files.

## Opening response continuation

The listing-backed GO HOME test caught missing bytes in an incompletely typed table before the viewer could ship. Naming and typing both halves made the full mixed destination/message records explicit. The failure was visible and existing table-typing guidance covers it; no shared-kit change is needed.

The dictionary regression also caught regenerated colour-RAM aliases cutting through the hidden-RAM pointer table after the new data typing. The existing tool skill describes this alias behavior; clearing those aliases after typing restored the complete table. This is another visible regression caught by an existing test, not a reason for a new skill rule.

## Ticket continuation

The reference scan exposed that the table-dispatched handlers had not been typed as code. Explicit disassembly from the verified command pointers recovered them. Existing `50-coverage` guidance on following computed dispatch already covers this case; no new rule is needed. The lower recalculated percentage is retained, with the newly exposed code left in scope.

The game’s ticket test now checks the recovered command entries are listed as code as well as executing their bytes, making that regression visible without a new shared rule.

## Popcorn continuation

The verification skill’s instruction to test cheap claims led to executing the shared debit rather than stopping at the local subtraction. The existing passage test supplied the correct instruction-hook pattern for newlines. The failure was caught during the test; no kit rule or maintainer ask is needed.

## Dialogue coverage continuation

The coverage skill’s instruction to take the largest undescribed run led to the bounded text records rather than many small command branches. Its warning about `$A000` cutting a data description required a continuation label, and its rule that a generated comment is a repeated claim led to checking all 54 outputs against the original parser. Existing guidance covers the work; there is no shared-kit edit or maintainer ask.


## Opening-only completion

`50-coverage`’s “Is the picture loaded or drawn?” required a fresh pre-setup snapshot and explicit producer checks for generated memory. Its loaded-data audit prevented the unreferenced retained extents from disappearing from scope. The instruction to follow patched/computed targets recovered the remaining API and raster entries. `60-verify`’s “a negative result is a claim about your search” kept the opaque ranges visible with qualified results rather than inventing a use or excluding them. `70-minisite` kept the complete 127-record reply viewer tied to the original parser.

The tests caught an event-state field-name reversal, readonly constants described as mutable state, and a tenth colour-match entry whose success flag needs the caller’s range check. These corrections follow existing instructions. No shared-kit change or maintainer ask is needed. All new helper and test fixtures hold annotations, selected data or digests; machine images and tool state stay ignored. The listing has no independent accuracy sample, and the purpose of the explicitly opaque bytes remains open.


## Popcorn-change continuation

`60-verify`’s “A negative result is a claim about your search” led to re-reading the phase and quarter bytes instead of accepting their existing no-reference comments; the comments were wrong and have been corrected in place. `70-minisite`’s “A widget that runs a mechanic is a claim too” led to comparing the page’s actual transition function with the original handlers over 7,995 cases and with twelve live observations. The existing rules cover both failures; no shared-kit change or maintainer ask is needed. The later popcorn-offer test isolates the branch and leaves complete transition timing explicit.


## Workflow-diagram continuation

`70-minisite`’s “A widget that runs a mechanic is a claim too” kept the map tied to original direction and purchase decisions. Checking the diagram’s proposed paths corrected the draft’s implied direct trip from the popcorn counter into the theater. Existing guidance covers this; no kit change or maintainer ask is needed.


## Gate continuation

`60-verify` required positive controls for the negative breakpoint result; movement checkpoints fired while the hypothesised generic exit did not. A store watch identified the real deferred transition. `70-minisite` required the diagram to execute a checked mechanic, leading to exhaustive classifier/threshold comparisons and original delay/dispatch tests. Existing guidance covers these findings; no shared-kit change or maintainer ask is needed. The missing natural hand-over remains explicit.


## Introduction sequence continuation

`60-verify`’s distinction between isolated execution and player reachability prevented stored speech from being presented as a fully observed gate conversation. `70-minisite`’s widget-check rule led to original-parser comparisons and exhaustive phase/countdown cases. Existing guidance covers this; no kit change or maintainer ask is needed.


## Fire-latch continuation

The C64 reference supplied port and bit meanings; `60-verify` required reading the producer and checking ordinary input with a positive checkpoint. No kit change or maintainer ask is needed.


## Area presentation

`70-minisite` supports interaction serving the explanation: the growing article now switches between areas rather than presenting every area in a single scroll. Area-local contents preserve detailed topics. This game-specific structure needs no shared-kit change or maintainer ask.

## Reading UI review

The minisite skill's requirement to inspect the built page exposed navigation disappearing above anchored content and screenshots delaying the interactive mechanic. The fixes stay in this game's presentation; no shared-kit edit or maintainer ask is needed.


## Kit 0.0.200 review

`60-verify`: “Both the sample and the audit are done by checkers” led to an independent 60-comment draw rather than treating passing widget tests as comment verification. It found two wrong details the earlier checks had left in place; both were reproduced and corrected. `70-minisite`: “A game with more than one level, map, room, stage or screen gets this tab” moved the reference collection to Maps / levels while retaining the distinction between screenshots and decoded maps. The new listing gap check keeps $07FE-$07FF open. Existing instructions cover these findings; no kit edit or maintainer ask is needed.

## First-corridor continuation · 19 October 2026

`70-minisite`, “Start each case where the game starts it, and feed it what the page feeds it”: compared the actual column-8/variant-0 page defaults and captured map mode with original execution. No shared-kit change was needed. The nonexistent `vice_step` call failed visibly; frame advance completed the observation. Shared classifier scratch bytes seen between player updates are not reliable player-state observations; the exit checkpoint supplied the player values. This is game-specific evidence, not a new general skill rule.

## Natural Brick Hallway arrival · 19 October 2026

`60-verify`, “A live test in one room tests one room”: kept the completed arrival claim to the one ordinary first-opening route, with other entry variants remaining code-tested calculations. The captured placement routine uses shared resident bytes, so compared it across the corridor and naturally loaded room before reusing its result. No shared-kit change or maintainer ask arose.

## Brick Hallway arrival checks · 19 October 2026

`tool-vice-mcp`, “Prove the machine is running before you believe a negative result”: movement and command-service hit counters accompanied the silent exit/loader counters, and OPEN DOOR had a positive dispatch hit. The duplicate snapshot basename was a visible refusal resolved with a uniquely named private copy; no shared-kit change was needed.

## Brick Hallway OPEN DOOR · 19 October 2026

`70-minisite`, “Start each case where the game starts it, and feed it what the page feeds it”: the new test runs the complete classifier/mutation path at the two actual page positions, including scene 3's zero refresh request, alongside the exhaustive isolated handler cases. The prior forced entry capture was renamed before using the natural play image for analysis. Remaining loaded-data warnings are recorded as open ownership work; no shared-kit change or maintainer ask arose.

## Labyrinth page organization · 19 October 2026

`70-minisite`, “The order serves the explanation and the reader’s attention at once”: the mechanics overview leads with the game, then keeps two checked interactive examples; the chronological area material has its own Explore the game tab. Existing custom-tab support handled the split without shared-site changes. The two duplicated mechanic blocks are guarded by sameBlock checks. No maintainer ask arose.

## Brick Hallway doorway destination · 19 October 2026

`60-verify`, “A live test in one room tests one room”: kept the entry-12 journey separate from the code-checked entry-44 branch and did not turn this same-room connection into a claim about every door. The positive exit and movement checkpoints accompanied the loader/arrival observations. No shared-kit change or maintainer ask arose.

## Brick Hallway arrival panel · 19 October 2026

`60-verify`, “A negative result is a claim about your search”: kept the absence of an exit bounded to the recorded trial, and traced the actual command prerequisite instead of concluding that a door-shaped picture must accept door commands. The original-code check enters the real ASK caller so the stack-discard path is exercised. No shared-kit change or maintainer ask arose.

## Alph and Ralph opening exchange · 19 October 2026

`60-verify`, “Prove reachability with inputs, not pokes”: kept the incomplete Brick Hallway crossing separate from the forced reference-room setup, and described ordinary input only within that room. `70-minisite`, “Start each case where the game starts it”: tested the three reachable opening conversation indices across every progress value below the branch threshold; arbitrary indices above2 remain outside the widget because the original lookup uses old Y even after clamping the stored counter. Restored input needed a settling interval and explicit wheel/prefix selection; command fields exposed invalid early trials. These were visible workflow corrections and need no shared-kit change or maintainer ask.

## Ralph's shared opening exchange · 20 October 2026

`60-verify`, “A live test in one room tests one room”: tested both speaker starts and an actual switch rather than inferring Ralph's presentation from the common code. `70-minisite`, “Start each case where the game starts it”: the comparison includes the page's accepted CALL RALPH input and both real ASK prerequisite branches, stating the intercepted distance query. The successful wheel setup was reused without a new guessed delay. Existing guidance covers the work; no shared-kit edit or maintainer ask arose.

## Opened-door threshold · 20 October 2026

`60-verify`, “Poke the variable, watch the screen”: restored the same refusal state and changed only the counter for the14/15 comparison, identifying it as a controlled response check. Its reachability rule kept the complete fifteen-door route open. `70-minisite`'s requirement to test the page's actual inputs led to testing both displayed counter values alongside every byte value and valid opening index. The repeated-open trial supplied the cheap ordinary negative case with positive handler hits. Existing rules cover the work; no shared-kit edit or maintainer ask arose.

## Brick Hallway close/reopen cycle · 20 October 2026

`60-verify`, “A live test in one room tests one room”: used ordinary input for the complete local close/reopen sequence without treating it as persistence across other rooms or disk saves. `70-minisite`, “Start each case where the game starts it”: the cycle test passes the page's actual OPEN function and starts the full classifier/mutation comparison from the displayed cell6/count4 state. Count0/255 stress cases stay explicitly artificial. Existing guidance covers the work; no shared-kit change or maintainer ask arose.

## Post-thanks continuation · 20 October 2026

`60-verify`, “Prove reachability with inputs, not pokes”: the captured nonzero-flag response is live-checked, while the zero-flag response stays a traced alternative with reachability open. `70-minisite`'s instruction to check the actual initial widget state kept the page at index2/flag$FF. A newly split code block exposed an overextended preceding pointer-data description; the150 bytes of higher-phase logic now have a separate undescribed boundary. Existing bounds and verification rules cover this game-specific finding; no shared-kit change or maintainer ask arose.

## Guard left-door reply cycle · 20 October 2026

`60-verify`, “Before reporting that something is missing”: searched the untyped U4 bytes when the decoded reference list showed only a read, exposing both changing handlers. Its “Prove reachability with inputs, not pokes” kept the depth6 refusal separate from the successful ordinary approach within a controlled room. The original proximity helper bypasses the public message API; the checked port intercepts its internal queue after the real stack discard. Existing code-comparison and boundary rules cover these details; no shared-kit edit or maintainer ask arose.

## Left-door continuation · 20 October 2026

`60-verify`, “The machine never stopped”: measured each stopped interval and kept the reaction, pending countdown and loader return distinct rather than calling the first screen a completed transition. `70-minisite`'s code comparison requirement caught the draft entry address one byte inside a preceding JMP; the spurious reference was removed before export. The successful arrival is ordinary input inside the documented controlled setup. Existing verification and bounds rules cover this work; no shared-kit change or maintainer ask arose.

## Page structure and evidence links · 20 October 2026

`70-minisite`, “Every claim shows its evidence”: added primary code citations beside the readable mechanic while keeping detailed checks in disclosures. Its “A game of several parts” rule kept every new address link on its own part's Source page. Doctor Who supplied the overview/gameplay/Controls split, numbered About references and accessible location-pin pattern. Labyrinth's pins distinguish workflow and capture targets because full decoded maps remain open. These are game-specific presentation edits; no shared-kit change or maintainer ask arose.

## Separate text and graphics page · 20 October 2026

`70-minisite`, “The order serves the explanation”: moved the font and dictionary explanation into its own reading page, with the glyph viewer first and the journey left on Gameplay. The page's scope stays the opening's checked text and character data. Existing original-code tests follow the moved widgets. This is presentation work within the game; no shared-kit change or maintainer ask arose.

## City workflow on Maps / levels · 20 October 2026

`70-minisite`, “The How it works page keeps the format”: gave the city workflow a home on Maps / levels and linked the player-facing explanations to it. Its shared section-navigation rule replaces the gallery-only area dropdown with the two sections actually on this page. The original-code test follows the moved data; browser checks cover bookmarks and the capture gallery. These are game-specific presentation changes; no shared-kit change or maintainer ask arose.

## Compact Gameplay navigation · 20 October 2026

`70-minisite`, “load it and look at it”: the first screen was dominated by journey cards, so the guide now expands on request and the active area's companion links stay by the selectors. Browser testing caught a guide link that reset the selected area. The existing build link check caught two incorrect part-page filenames before delivery. Existing checks cover these presentation changes; no shared-kit edit or maintainer ask arose.

## Searchable city replies · 20 October 2026

`70-minisite`, “Stepping through things of one kind”: used the shared previous/select/next pattern for the reply catalogue and kept its original-code test reading the moved data on Text & graphics. Text search makes the127 records usable without scanning the entire menu; browser checks cover empty results and endpoint disabling. This is game-specific presentation work; no shared-kit change or maintainer ask arose.

The browser console exposed a reply-catalogue dependency outside the moved block that the routine-only tests could not see. Gameplay retains only its counter replies, checked against the catalogue; the original-handler sweep also requires a display string for every selected reply. Existing browser-verification guidance caught this failure; no shared-kit edit is needed.

## Visual captured-scene index · 20 October 2026

`70-minisite`, “Draw every one of them as a picture”: made the existing room captures visible in a thumbnail index rather than leaving them hidden in a dropdown. These remain captures with explicit provenance, while complete decoded maps remain open. Stable scene IDs distinguish repeated titles; the existing detailed viewer provides the full caption and checked-route link. This is game-specific presentation work; no shared-kit edit or maintainer ask arose.

## Cinema counter on Discoveries · 20 October 2026

`70-minisite`, “These have a tab of their own”: gave the checked counter consequence a Discoveries page, keeping Gameplay focused on the journey. The page reuses the original checked widget and reply subset, with its tests following their moved blocks. The counter sequence remains a mechanic rather than an asserted bug or secret. Existing page, evidence and browser-check rules cover the work; no shared-kit change or maintainer ask arose.

## Main update to kit0.0.210 · 20 October 2026

`50-coverage`, “listing.json keeps the list”: rebuilt the five started listings from their exact saved snapshots rather than relying on a rebuild of the old listing bytes, so the new uncounted-data accounting could inspect memory. No new extents were reported and no listing fields changed. The graphical parts lack separate loader hand-over snapshots; that comparison remains a limit of the check. Existing upstream changes address the accounting and overwritten-code wording; no additional shared-kit edit or maintainer ask arose.

The broader kit tests caught editor incompatibilities in this game's map-pin and thumbnail HTML. Fixed the authored markup and local CSS without changing the shared editor: masked the same pin SVG from a local asset, and wrapped thumbnails in figures with editable captions. The corridor test's successful output said “FF skip”, which the suite mistook for a skipped test; its output now says the placement is unchanged. Local fixture sockets/process inspection require sandbox permission, and the bridge path fixture needs a canonical temporary path on this macOS host. The existing tests exposed these issues; no shared-kit change or new maintainer ask arose. Seven Spectrum oracle checks still need SkoolKit, which this update did not install.

## Other guard doorway · 20 October 2026

`60-verify`, “A live test in one room tests one room”: kept the loss route limited to the captured selector1 controlled setup. “Something ran between the poke and the read” and the machine's asynchronous text output led to waiting past the queue call before capturing complete messages. Existing span-boundary checks prevented153 unanalysed bytes after the new message terminators being counted as understood. The strict frames helper correctly reported an early checkpoint stop; the probe used the raw result and exact PC. These are game-specific observations covered by existing rules; no shared-kit edit or maintainer ask arose.

## Guard selector initialization · 20 October 2026

`60-verify`, “Poke the variable, watch the screen”: compared the exact initialized bytes after explicitly controlled random-state changes, without calling those preferred-door routes. “A test must contain cases that have to succeed” led to checking the captured seed and both binary selector values alongside all65,536 states. Existing boundaries and byte-domain guidance kept the second bit's unknown role and the initializer tail out of the described span. No shared-kit edit or maintainer ask arose.

## Later guard answer · 20 October 2026

`60-verify`, “Before reporting absence”: the typed reference tool showed only a writer, while a raw operand search found three reads in untyped scene code. `60-verify`, “Force the rare state”: explicitly controlled phase4/index3 rather than presenting the later conversation as an ordinary reached route. The original-code comparison checks both bit outcomes and both speaker flags. Existing guidance covers these observations; no shared-kit edit or maintainer ask arose.

## Guard congratulations · 20 October 2026

`60-verify`, “A test must contain cases that have to succeed”: kept both accepted presence paths and all five reply branches in the original-code comparison, with a premature-command control. The live trial changes the phase explicitly but lets ASK and INSULT produce their own flags. `60-verify`, “A live test in one room tests one room”: Ralph's accepted path is code-checked while live recordings are attributed to Alph. Existing guidance covers this continuation; no shared-kit edit or maintainer ask arose.

## Guard departure reaction · 20 October 2026

`60-verify`, “Force the rare state”: traced the difference between changing phase inside a room and entering with that phase. The latter sets different depth thresholds, so the page names the saved snapshots' retained values. “Carry a control” led to a generic unselected reaction beside both role replies. An early stop at a shared return did not prove countdown initialization; the probe then required the initializer's exact PC before releasing input. Existing rules cover this game-specific finding; no shared-kit edit or maintainer ask arose.

## Later guard loads · 21 October 2026

`60-verify`, “A number handed through a request byte”: followed queued5 into the service that defaults entry1 before publishing a destination claim. The code comparison intercepts the loader explicitly, while three actual loads supply the separate arrival evidence. `10-orient`, “A game of several parts”: guard-local addresses lose that meaning when scene5 replaces the overlay. Existing snapshot-name and ownership guidance covers these observations; no shared-kit edit or maintainer ask arose.

The browser reload check also exposed a game-local navigation fault: generated topic IDs did not exist until their area was selected. Resolving the known area prefix before rebuilding the topic list fixes saved links without changing the shared site. The existing browser verification guidance catches it; no shared-kit edit was needed.

## Wall of Hands conversation · 21 October 2026

`60-verify`, “It was going to happen anyway”: a no-input trial separated the automatic question from typed ASK. The earlier handler count of two was not sufficient to blame a repeated key; the callback calls the same handler. `10-orient`, “A game of several parts”: gave scene5 its own snapshot, listing and honest loaded-data scope. `50-coverage`, “Data the ledger cannot see”: kept the newly reported retained stretches as unresolved scope rather than labelling them padding. Existing guidance covers these observations; no shared-kit edit or maintainer ask arose.

## First manicure · 21 October 2026

`60-verify`, “A number handed through a request byte”: followed inventory slot21 through the actual reader and saved word-wheel dictionary mapping before naming shears. “Force the rare state” kept explicit inventory/damage changes separate from ordinary acquisition. The varied output-mode helper retries low nibbles14/15, so the comparison includes rejected random draws and accepted boundaries. Existing guidance covers this continuation; no shared-kit edit or maintainer ask arose.


## Seven manicure replies · 21 October 2026

`60-verify`, “Prove reachability with inputs, not pokes”: supplied the shears once, then used seven ordinary commands in one session instead of seeding each counter value. This establishes the local sequence after controlled item supply, while ordinary acquisition remains open. The bounded comparison stops before the eighth-count path and tests the selection prefix separately across its byte domain. Existing guidance covers this work; no shared-kit change or maintainer ask arose.


## Eighth manicure · 21 October 2026

`60-verify`, “Poke the variable, watch the screen”: placed the zero-hour control before the actual decrement, then checked both stored state and the completed expiry panel. The normal sequence retained its own untouched clock evidence. The failed loader-return expectation was resolved by a direct post-event capture; existing negative-result and live-verification guidance cover it. No shared-kit change or maintainer ask arose.


## Ninth manicure · 21 October 2026

`60-verify`, “Poke the variable, watch the screen”: followed the movement state through the no-input descent and actual load, instead of publishing an indefinite text-repeat claim from the command branch. The timed-out next command exposed a scene transition rather than a failed input tool. Kept higher counter-byte checks separate from the reached ninth command. Existing verification and multi-part guidance cover this case; no shared-kit edit or maintainer ask arose.


## Stone Corridor first door · 21 October 2026

`10-orient`, “Never assemble an image from”: used the actual local route’s snapshot, with the earlier forced captures kept separate. `20-features`, “Test each control from a moment you have looked at”: restored the arrival before the approach and retained the coasting miss as a separate trial. The private probe’s log failure was visible; restoration now precedes its JSON writer. Existing snapshot-basename and negative-result guidance covers the other failures. No shared-kit change or maintainer ask arose.


## Stone Corridor close and crossing · 21 October 2026

`60-verify`, “A number handed through a request byte”: stopped after the actual exit request stores before naming its destination. Request0/entry30 refreshes scene6 and reaches another coordinate in the same corridor. The stored selector was measured at the stop rather than inferred from the first table bank. Exact bare label boundaries prevent pair/table comments from describing adjacent unknown bytes. Existing guidance covers these checks; no shared-kit edit or maintainer ask arose.


## Stone Corridor archway · 21 October 2026

`60-verify`, “It was going to happen anyway”: the300-frame no-input control distinguishes standing at the arch from walking through it. “A number handed through a request byte” keeps the new entry26 separate from a guessed return route. The existing corridor placement check was reusable after a byte-for-byte comparison, with the negative-mode branch left open. Existing guidance covers the work; no shared-kit edit or maintainer ask arose.


## Stone Corridor ladder · 21 October 2026

`60-verify`, “What a test lets through”: tested the full eight-position accepted interval rather than treating the drawn ladder width as its movement rule. “Prove reachability with inputs” led to two short ordinary left pulses, with misses retained separately. The reference search over annotated code reported no matches for3420; a raw operand search found its still-unannotated producer and consumers. Existing negative-result guidance covers that distinction. No shared-kit edit or maintainer ask arose.


## Reading structure · 21 October 2026

`70-minisite`, “The page opens with the game”: moved the reader’s technical-link legend below the explanations and restored the How it works entry. `kit/style.md`, “Each tab has a purpose”: made Controls a lookup page, kept detailed local mechanics on Gameplay, and separated location coverage from capture provenance. The kit permits custom intermediate tabs and flexible section order; the catalogue’s coverage badges are a Labyrinth presentation choice. Existing guidance covers this review, so no shared-kit change or maintainer ask arose.


## Preserve retired page links · 21 October 2026

Merging reading tabs removed their old URLs, leaving open browser tabs and bookmarks with stale navigation or404 pages. This was a presentation regression introduced by the reorganisation. Added optional game.json redirects to the site builder so retired page paths forward to a published tab without joining its navigation. The forwarding page preserves query strings and fragments. A builder regression test executes that redirect logic and checks that aliases stay out of the tab bar. The minisite skill documents the option and requires checking an old bookmark when renaming or merging a page. Labyrinth declares its three retired paths. No maintainer issue is needed.
