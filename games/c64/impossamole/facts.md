# Impossamole — facts

All addresses are hexadecimal C64 addresses. Evidence below names the resident Source listing unless a level part is specified. This is the Dynamix disk, with its unlimited-energy option disabled.

## Memory and parts

The resident game starts at $0810. The processor port is $35, with I/O visible and game RAM under BASIC/KERNAL. The VIC uses bank $C000. The level charset is $F000, status/title allocation $F800, and screen buffers are $E800 and $EC00. The last 32 glyph slots overlap cleared prompt space, a high-score helper at $FF70, and vectors. The IRQ vector points to $0E79, which saves registers and jumps through $B8/$B9. Play handlers $0973, $0A5C, and $0ACA schedule raster lines 176, 255, and 57 respectively. The first visible gameplay handler uses the level charset; the later handler selects the status charset.

Five data overlays accompany the resident engine. Each part owns $7EC0-$7EC1, $8192-$83DF, $8F00-$9AFF, $A000-$BD3F, $CD40-$CDFF, $D400-$E7FF, and $F000-$F7FF. Breakpoints at $04FA/$0508 bracket decompression, and $16AE confirms all five matching IDs. The snapshots contain the same resident engine apart from a loader operand. Some bytes in a load allocation can be identical between levels.

## Actor model

There are eight actor slots: Monty 0, the attack 1, and six other actors 2–7. Parallel arrays start at $86B8 (active), $86C0 (X low), $86C8 (Y low), $86D0 (X high), $86D8 (Y high), $86E0 (shape), $86E8 (colour), $86F0/$86F8 (collision width/height), $8700 (health), $8708 (hold), $8710/$8718 (expansion), $8720 (multicolour), $8728 (flags), $8730 (type), $8738 (animation index), $8740 (delay), $8748 (reload), and $8750 (score class). Motion fields follow from $8760.

The directory at $817C supplies pointers to 26-byte actor templates. $3C32 copies offset 6 to score class and clears X expansion; $4F04 copies that same offset to X expansion. The remaining display, health, animation, and movement fields are copied in the same order. The Graphics viewer labels template identities by number rather than guessing creature names.

$382B advances actors 1–7. Delay $FF freezes animation; a positive delay decrements; zero reloads from $8748 and reads the shape stream at $8EC0 plus index. $FF followed by an index loops; $FF/$FF removes the actor. A reload of n therefore spaces shape updates by n+1 calls. The shape address is $C000+64*shape; 63 bytes draw 21 rows of 24 pixels. Multicolour mode groups each pair of bits into one double-width pixel. $D025/$D026 hold shared sprite colours.

## Movement and terrain

$7F43 selects standing 0, walking 1, jumping 2, falling 3, or climbing 4. Terrain probes translate screen characters through $AF00. Solid classes start at 4; support tests accept 2 and above; ladder classes are 1/2. Classes 5/6 convey Monty left and right, 7 slides, 8 slows (motion on alternate frames, effect 6), 9 damages, and 10 starts a temporary hazard. Class 9 ($3028) counts two calls, then forces the jump state, requests effect 8 and calls $1A6B unless $08BE is 4. Class 9 lines the sea along the whole bottom row of the Bermuda Triangle, and class 7 is used in Iceland and the Bermuda Triangle only. Different probes have different thresholds: these are not one universal solid test. Jump step streams use signed byte deltas and $80 as their end marker.

The steering routine $2341 first calls $3E9F to probe terrain, then chooses direction from relative positions and steering flags. That first call preserves actor coordinates. $37DD removes a contacted actor and damages Monty: it clears X low/high and Y low while preserving Y high.

## Resources and combat

Energy is $7F77; $091F holds a refill amount whose doubled value is used as the full gauge capacity. $08E3 holds reserves. $1A6B ignores damage during a flash or an existing death; otherwise it decrements energy, starts a 14-count flash, and on zero consumes a reserve or starts death. Live CPU-instruction traces cover energy 5→4 and 1→0. A forced entry with energy 0 underflows to 255; ordinary reachability is unproved, so this is a boundary case rather than a player-facing bug.

Strength $7F79 is an index 0–3. $1B11 increments and replaces exactly 4 with 3. Live instruction traces confirm pickup type 4 raises 2 to 3, and the increment preserves 3 at the cap. $1B01 clamps an underflow to zero. Weapon type $7F7C selects the basic attack, shatter bomb, power gun, or laser. $4FE4 advances a divider at $7F7B; every 50 calls it decrements lifetime $7F7A. A live trace starting at lifetime 2 and divider 49 yields lifetime 1 and divider 0. Calls are the measured unit; this is not described as seconds.

Money is $7F78. The pickup path $3673 adds 25 for the accepted money types and replaces carry overflow with 250. A live instruction trace with 240 produces 250. $1A6B refills energy to $091F from a reserve when it reaches zero. $1A32 raises $091F by one and clamps it at 17, the value LUMBAJAK sets. Food restoration is at $3690. Attack templates and strength-indexed tables feed the collision and damage routines rather than giving every weapon one common damage value.

The score uses six least-significant-first character digits at $191F; $1925 is the display copy. $192B adds through decimal carries. CPU simulator cases check +100 and +1600. The high-score table ranks converted values at $5EDF and accepts eight-character names with the joystick alphabet at $5CC1.

## Maps, exits, and progression

Map bytes at $A410 are block IDs, six vertically per column. Spawn records at $A000 are four bytes each: world column high, low, row, template. $FB returns without spawning; $F4, $BF, $8A, $63, and $35 start a guardian ($3B4B). Each block expands to a 4×4 grid of character codes at $B000+16*ID, in row order. This produces 24 map rows below the status line. $5192 draws one block; $51D4 supplies its screen offsets. $AE00 maps character codes to colours and $AF00 maps them to terrain classes. The stored stream occupies 424 block columns. The Maps page shows that full allocation without claiming that every column is reachable.

Exit counts at $806C are 23, 31, 21, 22, and 30. All exits are vertical: $3096 runs when Monty's Y is below 38 (edge 0, the top) or at least 246 (edge 1, the bottom), and puts him in at the opposite edge. Their parallel fields are edge selector $8FC0, source world block $8FDE, destination scroll $901A, right scroll limit $9056, and destination X $9092. $3096 searches them. The source block times four is the world character column. $50E3-$5114 computes the destination map pointer from the scroll value; it is not stored in the exit records. Area transitions can therefore change which part of the map stream is drawn.

First-four completion bits form mask $0F; the final level becomes selectable after those bits are set. All-five mask $1F selects the ending. $835F times the completion sequence, including converting remaining resources to points and setting the completed bit at the 250-count transition. A CPU simulator case confirms count 249 advances to completion and selection transition. Five guardian routes exist; ordinary traversal and defeat of each guardian remain open.

## Shop

Each level's shop is entered through a type 9 actor while the joystick is pulled down ($36DE). The five 12-byte records at $809D hold an entry and a return destination; every entry is scroll 1640 with right limit 1640, so the shop is the stream's last 40 columns. Prices at $8091 are indexed by item type: shatterbomb 1 at 125, power gun 2 at 150, lazer gun 3 at 175, soup can 4 at 250, slimy worms 5 at 75, pinta a day 7 at 200. Names are the 16-character strings at $80DC.

$3213 handles fire in the shop: with money $7F78 at least the price $809A, it stores the price plus one in $8090, calls $1458 (which adds one more), and jumps to $3604, which gives the item at once. Types 1-3 set weapon $7F7C with lifetime 30; type 4 calls $1B11; type 5 queues 5 energy steps (10 with modifier 5); type 7 calls $1A32 twice and queues 4. While $8090 is at least 3, $1446 runs $14B9 once per call: it reads $DC00 AND $0C, and a left or right value that differs from latch $809C is stored there instead of taking a coin; otherwise money drops by one. $8090 drops by one either way, so the payment always lasts as many calls as the price.

The CPU model from the purchase's own start pays 125 of 125 holding still, 93 alternating every four calls, and 0 alternating every call. Live in VICE on 15 November 2026, from a Klondike play snapshot with $8090 poked to 126 (one less than a 125 purchase sets), the same three joystick patterns paid 124, 92 and 0. test_viewers.js holds the page's port to $1446 over 72 purchases with still, alternating and random joystick values. The instructions transcribed by Viva Games say nothing about it, and a web search on 15 November 2026 found no description.

## Text

Menu and message strings use uppercase character bytes. The six hidden names use the separate add-$45 comparison encoding. The game character sets include scenery and status graphics as well as text; the graphics sheets and exact frame reconstruction decode their bit patterns rather than assuming a standard ROM alphabet. Score characters use $30-$39.

## Sound

One stored tune uses three order-list pointers at $704F/$7052: $7137, $7187, and $71D7. $6CC5 with A=0 initialises it, then $6701 runs once per play call. Music is called by the frame interrupt. $6D10 stops playback by storing $FF, the final X from the reset loop, in $66FF, $6700, and $6D9D. A new request 0 differs from loaded $FF and starts initialisation. Code/tables lie within $66FF-$7EBF. Sixteen effect pointers at $60DA address 64-byte records at $9C00-$9FFF. $6107 initialises the SID with volume 15. A request in $6105/$6106 is accepted at $6117 and stepped at $6281. The page runs these audio routines on the shared CPU simulator, feeding their writes into the SID model. Every tune/effect button is tested. Mutable effect memory ends at $65F0; waveform masks at $65F1 must be preserved. The instructions at $636C/$639F OR those masks with the gate bit.

Effect numbers named on the page by the code that requests them: 0 jump ($2E9A), 1 class-7 slide ($3078), 2 attack hit ($46D5, $4883), 3 explosion ($48A6, $4D40), 4 power gun ($3416), 5 lazer gun ($33AC), 6 class-8 ground ($2CEF, $2D6B), 7 harmful contact ($37B4, $37F9), 8 class-9 ground ($3050), 9 super weapon ($0FD6), 10 proximity activation ($44E8), 11 destruction ($37D6, $4473, $4765), 12 pickup ($3604-$3776), 13 path landing ($3E19, $43B0), 14 creature attacks ($4A43-$4E04), 15 guardian activation ($3B75).

The separate voice-three countdown entry is $66BA, preceded by a pitch-table byte at $66B9. $66D3 starts it when the countdown is negative and the extra gate is clear. It writes frequency $1388 and control $81. The countdown byte is $66FD.

## Name modifiers

$5001 compares eight high-score-name bytes against six strings at $5076, adding $45 to each stored byte. The names are LUMBAJAK, space-HEINZ.-space, COMMANDO, ANNFRANK, OOCHOUCH, and JUGGLERS. They select IDs 0–5 at $08BE. Every accepted name resets defaults $091C/$091D/$091E to 9/1/0, then ID 0 sets capacity default 17, ID 1 strength default 3, and ID 3 reserve default 1. Other readers give ID 2 a persistent weapon timer, ID 4 immunity to terrain class 9, and ID 5 doubled food restoration. Live instruction-by-instruction traces through $5001 confirm all six names and the resulting defaults. The names must include all eight characters, including the spaces around HEINZ. Name entry starts as eight full stops, and the joystick alphabet at $5CC1 is full stop, A-Z, space and question mark. The default table names are ROB, BOB, TEL, ANDY, GREG, AND THE, OTHER, LADZ. A name that matches nothing leaves $08BE as it was.

$5001 counts matching letters in $7126 (STA at $500F, INC at $5022). $7126 is also the start of instrument pitch stream 10 ($705E/$7069 index 10), whose first step's pitch offset the driver reads through ($FC),Y at $69D6 and adds to the voice's note. The count left behind is 8 after a cheat name, and otherwise the number of leading letters the name shares with JUGGLERS, the last name compared: JIM..... leaves 1, JUDY.... 2, JUGGLER. 7. Nothing else writes $7126, so the value stays until the next name is checked. On the CPU model with $7126 at 8, only voice 3 differs in the first 20,000 calls, at 53.5–76.4, 84.1–107.1, 214.3–229.6, 359.7–382.7 and 390.4–399.0 seconds (calls / 50.125), by a frequency ratio of 1.587, eight semitones. Live in VICE on 15 November 2026, after a Klondike game ended at 1,649 points and OOCHOUCH was typed with the joystick, $7126 was 8 and the driver at $69D6 raised voice 3's note from 44 to 52. test_viewers.js holds the page's port to $5001 over 214 names and the shifted tune's writes over 2,000 calls.

Known before: a PC cheat list (cyberly.org, read 15 November 2026) gives LUMBAJAK, HEINZ and ANNFRANK for the PC version. No source found describes the music side effect.

## The listing's error rate

The sample used seed 15112026 and drew 100 of 1213 comments. gpt-6-astra checked the sample independently and found five comments with wrong details. The plain rate is 5.0%, with a Wilson 95% interval of 2.2–11.2%. Strata were aliases (0/20 from 477), level data (1/20 from 215), and written comments (4/60 from 521); weighting by population gives 3.7%. This is a lower bound on the true error rate because a checker can miss errors. All five findings held on a second reading and were corrected, along with repeated descriptions: exit fields, terrain probing before steering, the retained Y-high byte, the $66BA entry, and cleared prompt space. The sample measures the listing before those corrections. A full audit is recommended as later work and was outside this run.

The audio integration pass corrected one additional comment: $6D10 stores $FF after resetting the music work area, rather than clearing the tune and playback bytes. This was established from the terminating DEX/BPL loop and its following STX instructions.

The quality pass of 15 November 2026 (claude-opus-5-5) corrected five comments while porting the shop payment, the name check and the shifted tune: $1446 described a message countdown where it takes the payment, $8090 and $809C did not say what their values mean, $5001 did not say where it keeps its count, and $7126 was described as the start of the order lists, though it begins instrument pitch stream 10.

## Explicit limits

Features marked open in features.md have not been verified in ordinary play. No complete playthrough, route replay, or JavaScript game port was undertaken. Data coverage is 100% of the declared six-part ledger; this does not turn every allocation into a known reachable gameplay object.
