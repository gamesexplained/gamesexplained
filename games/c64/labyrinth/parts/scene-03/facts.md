# Brick Hallway — established facts

Partial analysis: 1,123/48,587 tracked bytes described (2.3%). The listing uses `work/play.vsf`, a name-only anonymized copy of the naturally reached `work/natural-brick/play.vsf`. Original captures remain private. The earlier forced `entry.vsf` was renamed `entry-forced.vsf`; it is not natural hand-over evidence. Shared resident ownership and loaded-data warnings remain unresolved. This independent image scope is provisional and overlaps other parts.

## OPEN DOOR decision

The action/object pair [37,45] at `$8B94` selects `$9053` through `$8C54`. With negative `$0343`, this handler calls `$0818`, whose resident query `$0998` classifies the player's world column using `$4171` and returns A=cell low nibble, X=translated type, Y=column. Nonnegative map mode selects response `$94BB` instead.

Type 2 uses `$071E+cellNibble` as a replacement cell, calls mutation API `$081B`, requests sound 1 through `$081E` and increments `$0569`. Type 3 chooses response `$92CA`, “It's already opened.” Other types choose `$94BB`, “Nothing happens.” The responses were decoded using original parser `$6782`. The handler contains no depth comparison; this does not prove every position is ordinarily reachable.

In the captured room, arrival column 35 has cell 0 / type 0. Neighboring column 36 has cell 7 / type 2. Replacement `$0725` is 6; cell 6 translates to type 3. The closed-door bound is 24 and flag $FF; the open-door bound is 40 and flag zero. An ordinary traversal through this opened door is confirmed below.

## Mutation and refresh

`$58C8` masks the new cell to its low nibble and writes the column at `$0600+Y`. For scene 3, it records the mutation in scene/column/value arrays `$0400/$0455/$04AA`: reuse a matching record, otherwise a zero slot, otherwise a random slot belonging to another scene. Each array has 84 slots. This is the record-write behavior, not a full disk-save/reload proof.

The scene-3 wrapper at `$09A5` then writes pending request zero at `$09D0`. The live command refreshes the picture while retaining current scene 3 and the player position. This zero request is not evidence of travel to another room. The request's complete resident handling is annotated in the resident listing; other scenes' wrapper special cases remain outside this check.

## Ordinary-input evidence

Restored the natural arrival X=2272/depth 6. Moved right until X reached the neighboring door column, released/coasted to X=2348, then held up for 300 frames to depth 24. Typed OPEN, Space, DOOR, Return. The command fields became [37,45]. Handler `$9053` and mutation `$58C8` each recorded one live hit. Column 36 changed 7→6; `$0569` changed 3→4. After another 120 frames, scene was 3, pending request $FF, X=2348/depth 24 and the screenshot showed an open door. The original emulator state and normal speed were restored. Before/after screenshots are `reference/brick-door-before.png` and `reference/brick-door-after.png`; observations and the opened-state snapshot stay private in work/.

`test_brick_door.js` takes the port from the page and executes the original handler for every cell byte and map-mode byte (65,536 cases). It compares mutations, message choices, sound request and counter wrap. It also executes the real classifier/mutation path for the page's two observed positions, using captured negative map mode, mask 63 and scene 3, and checks the mutation record and zero refresh request. Sound/message presentation is intercepted in those handler cases. The two response texts are checked with the original parser. This handler check does not simulate the traversal; a separate route check and live journey establish the connection below.

## Scope and limits

The unpacked M3/P3/C3 extents are 510/2,816/1,632 bytes; U3 has 4,990 payload bytes ending at $9E7D. The scope includes those resources plus the retained resident image and costumes. The listing still reports untracked retained stretches and a gap at $07FE-$07FF; their ownership/purpose remains open. Other doors, the alternate destination entry, return routes, persistence across complete reloads and the sound's audible identity remain unverified. These comments have no independent sample or audit.

## Walking through the opened door

Restored the naturally opened-door state at X=2348/depth 24 and held up. A stopping checkpoint caught `$4115` at X=2336/depth 40, column 36. The movement checkpoint `$3423` had seven hits; the exit checkpoint had one. Released movement and continued to loader `$5098`, which saw pending request 0, current scene 3 and entry 12. At continuation `$59DC`, the player was X=800/depth 6 while current scene remained 3. After sixty frames without movement input, pending request was $FF and column was 12. `reference/brick-door-destination.png` records the destination. Original emulator state and normal speed were restored. Raw captures/observations are private under `work/through-brick-door/`.

This is a same-room connection. For negative `$0343`, `$4115` selects the first inclusive column threshold at `$074E`; column 36 selects region 11. Selector `$076E+11` is 1, so bits $60 of state `$0500` select one of four route banks. The captured source byte was zero. Every bank's region-11 scene request is zero; banks 0/1 select entry 12 and banks 2/3 entry 44. The meaning and production of that source byte are not established here.

At `$50EA`, zero request with current scene 3 jumps to `$53CE`. That path calls `$543A` to place entries while retaining the scene. The observed entry 12 becomes X=64*12+32=800/depth 6. Entry 44 would place X=2848/depth 6 in the isolated placement routine; its ordinary route remains unverified. A zero request therefore need not mean a new room: this checked route moves between positions in scene 3.

`test_brick_route.js` compares the page's lookup with original `$4115`, the `$50EA` retained-room branch and `$543A` placement for every source byte (256 cases). It seeds current scene 3, map mode $FF, column 36 and continuous placement mode zero, matching the live route; it verifies the page button's source-zero input too. The PRNG is trapped as an error because selector 1 must not call it. This checks route/placement decisions, not rendering or the gameplay producer of `$0500`. New route annotations have no independent sample or audit.

## Door commands at the destination panel

The naturally reached column-12 destination has cell 1 at `$060C`, translating to type 11 through `$073F`. Its artwork is a door-shaped spiral panel. At X=800/depth 6, ordinary OPEN DOOR displayed “Nothing happens.” and ASK DOOR displayed “There's no door here.” The corresponding command fields were [37,45] and [30,45]. Each command recorded one generic dispatcher `$5F43` hit; ASK also recorded one prerequisite `$09E9` hit. Player position, current scene 3, and pending request $FF were retained. Screenshots: `reference/arrival-open.png` and `reference/arrival-ask.png`.

A separate restored-state up trial ran 300 frames and reached depth 24 at X=800, retaining scene 3 and no pending request. Movement checkpoint `$3423` recorded 30 hits, with zero generic-exit `$4115` and loader `$5098` hits. This bounded test does not prove that other actions or routes cannot return. The original emulator state and normal speed were restored after the batches. Raw observations/screenshots are private in work/.

ASK DOOR pair `$8B0C` selects `$8DD1`. The first call is to API `$082A`, whose prerequisite `$09E9` accepts types 2/3 only in negative map mode `$0343`. Failure selects resident message `$0D49`, pulls the helper caller's return address off the stack and tail-calls `$09DD`; the remainder of `$8DD1` is bypassed. Accepted types return normally and the handler selects `$94BB`, “Nothing happens.” OPEN DOOR has its separate type2/type3 logic described above; type11 selects its fallback. The two rejection texts were checked with original parser `$6782`.

`test_brick_panel.js` executes the real ASK caller and prerequisite over all 256 map-mode bytes and 256 translated types (65,536 cases), checking both the response and whether the caller continuation runs. It also executes both original command paths with the real classifier at the page's X=800/depth6 arrival, matching button actions 30/37 and captured cell1/type11. Message drawing is intercepted after the selected text pointer is queued; this tests the control flow and reply choice, not rendering. Other actions at the panel and complete return routes remain unverified. These new comments have no independent sample.

## Opened-door count

The captured initial map strip's64 columns contain12 type2 closed doors and3 type3 open doors. The new-game initializer at $575A in the resident listing sets $0569 to3. The checked first opening changed3→4. A separate ordinary OPEN DOOR trial restored the opened column36 door at X2348/depth24, count4 and cell6. It displayed “It's already opened.”, retained count4/cell6, recorded one $9053 handler hit and zero $58C8 mutation hits. The emulator state, input and normal speed were restored. `reference/guard-repeat-open.png` records the result. The original handler test already covers its repeated-open branch; `test_guard_progress.js` checks the initial map census and initializer alongside scene4's response threshold. Complete cross-room and disk persistence remain open.

## Closing and reopening the neighboring door

CLOSE DOOR pair $8B2E [32,45] selects $8E9E through $8BEE. In negative map mode $0343 it queries $0818, accepts type3 and indexes the original cell nibble into $072E. Captured open cell4 closes to5, and open6 closes to7. It calls mutation API $081B, requests sound2 and decrements $0569. Type2 returns “It's already closed.” at $92E0; other types and nonnegative map mode return “Nothing happens.” at $94BB. $8ECC jumps to the mode5 message queue helper $91C7. There is no depth comparison in this handler; ordinary reachability is established only for the tested approach.

Ordinary CLOSE, CLOSE, OPEN, OPEN commands from `work/brick-door-opened.vsf` retained X2348/depth24, current scene3 and pending request $FF after each refresh. Command fields were[32,45] for CLOSE and[37,45] for OPEN. Starting cell6/count4 became7/3, stayed7/3, returned6/4, then stayed6/4. Cumulative close/open/mutation checkpoint counts were1/0/1,2/0/1,2/1/2,2/2/2. Thus every command dispatched and only the successful close/reopen mutated the map. Repeats displayed “It's already closed.” and “It's already opened.” Original emulator state, inputs and normal speed were restored. Raw records remain private in `work/brick-cycle/`; published captures are `reference/brick-cycle-0-close.png` through `brick-cycle-3-open.png`, all visually checked for the entered name.

`test_brick_close.js` compares the close function from the page with the original handler over every cell/map-mode byte:65,536 cases. It intercepts the cell query, mutation, sound and output queue for that exhaustive decision check and seeds count0 to verify byte decrement wrap. Original parser $6782 expands the already-closed and shared fallback/repeat-open replies. A further20 original calls execute the complete classifier and mutation path for CLOSE,CLOSE,OPEN,OPEN at counts0,1,3,4,255, with actual player coordinates, map mode, mask and current scene. They compare map cell, count, mutation record, refresh request, sound and refusal text with the page's composed open/close cycle. The page starts at the live cell6/count4 state and passes its existing checked OPEN function into the cycle. Artificial count boundaries are code checks, not claims of ordinary reachability.

This cycle's closing undoes its previous opening increment and reopening restores the same count. It does not establish the effects of every other command, complete room-crossing/disk persistence, or the guards' later acknowledgement. These new comments have no independent sample or audit.
