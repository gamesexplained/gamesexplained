# Brick Hallway — established facts

Partial analysis: 822/48,587 tracked bytes described (1.7%). The listing uses `work/play.vsf`, a name-only anonymized copy of the naturally reached `work/natural-brick/play.vsf`. Original captures remain private. The earlier forced `entry.vsf` was renamed `entry-forced.vsf`; it is not natural hand-over evidence. Shared resident ownership and loaded-data warnings remain unresolved. This independent image scope is provisional and overlaps other parts.

## OPEN DOOR decision

The action/object pair [37,45] at `$8B94` selects `$9053` through `$8C54`. With negative `$0343`, this handler calls `$0818`, whose resident query `$0998` classifies the player's world column using `$4171` and returns A=cell low nibble, X=translated type, Y=column. Nonnegative map mode selects response `$94BB` instead.

Type 2 uses `$071E+cellNibble` as a replacement cell, calls mutation API `$081B`, requests sound 1 through `$081E` and increments `$0569`. Type 3 chooses response `$92CA`, “It's already opened.” Other types choose `$94BB`, “Nothing happens.” The responses were decoded using original parser `$6782`. The handler contains no depth comparison; this does not prove every position is ordinarily reachable.

In the captured room, arrival column 35 has cell 0 / type 0. Neighboring column 36 has cell 7 / type 2. Replacement `$0725` is 6; cell 6 translates to type 3. The closed-door bound is 24 and flag $FF; the open-door bound is 40 and flag zero. Complete walking through the opened door remains unverified.

## Mutation and refresh

`$58C8` masks the new cell to its low nibble and writes the column at `$0600+Y`. For scene 3, it records the mutation in scene/column/value arrays `$0400/$0455/$04AA`: reuse a matching record, otherwise a zero slot, otherwise a random slot belonging to another scene. Each array has 84 slots. This is the record-write behavior, not a full disk-save/reload proof.

The scene-3 wrapper at `$09A5` then writes pending request zero at `$09D0`. The live command refreshes the picture while retaining current scene 3 and the player position. This zero request is not evidence of travel to another room. The request's complete resident handling is annotated in the opening image; other scenes' wrapper special cases remain outside this check.

## Ordinary-input evidence

Restored the natural arrival X=2272/depth 6. Moved right until X reached the neighboring door column, released/coasted to X=2348, then held up for 300 frames to depth 24. Typed OPEN, Space, DOOR, Return. The command fields became [37,45]. Handler `$9053` and mutation `$58C8` each recorded one live hit. Column 36 changed 7→6; `$0569` changed 3→4. After another 120 frames, scene was 3, pending request $FF, X=2348/depth 24 and the screenshot showed an open door. The original emulator state and normal speed were restored. Before/after screenshots are `reference/brick-door-before.png` and `reference/brick-door-after.png`; observations and the opened-state snapshot stay private in work/.

`test_brick_door.js` takes the port from the page and executes the original handler for every cell byte and map-mode byte (65,536 cases). It compares mutations, message choices, sound request and counter wrap. It also executes the real classifier/mutation path for the page's two observed positions, using captured negative map mode, mask 63 and scene 3, and checks the mutation record and zero refresh request. Sound/message presentation is intercepted in those handler cases. The two response texts are checked with the original parser. This does not simulate a complete door traversal.

## Scope and limits

The unpacked M3/P3/C3 extents are 510/2,816/1,632 bytes; U3 has 4,990 payload bytes ending at $9E7D. The scope includes those resources plus the retained resident image and costumes. The listing still reports untracked retained stretches and a gap at $07FE-$07FF; their ownership/purpose remains open. Other doors, the destination behind this door, return routes, persistence across complete reloads and the sound's audible identity remain unverified. These comments have no independent sample or audit.
