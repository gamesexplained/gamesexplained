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

$7F43 selects standing 0, walking 1, jumping 2, falling 3, or climbing 4. Terrain probes translate screen characters through $AF00. Solid classes start at 4; support tests accept 2 and above; ladder classes are 1/2. Classes 5/6 convey Monty, 7 slides, 8 slows, 9 damages, and 10 starts a temporary hazard. Different probes have different thresholds: these are not one universal solid test. Jump step streams use signed byte deltas and $80 as their end marker.

The steering routine $2341 first calls $3E9F to probe terrain, then chooses direction from relative positions and steering flags. That first call preserves actor coordinates. $37DD removes a contacted actor and damages Monty: it clears X low/high and Y low while preserving Y high.

## Resources and combat

Energy is $7F77; $091F holds a refill amount whose doubled value is used as the full gauge capacity. $08E3 holds reserves. $1A6B ignores damage during a flash or an existing death; otherwise it decrements energy, starts a 14-count flash, and on zero consumes a reserve or starts death. Live CPU-instruction traces cover energy 5→4 and 1→0. A forced entry with energy 0 underflows to 255; ordinary reachability is unproved, so this is a boundary case rather than a player-facing bug.

Strength $7F79 is an index 0–3. $1B11 increments and replaces exactly 4 with 3. Live instruction traces confirm pickup type 4 raises 2 to 3, and the increment preserves 3 at the cap. $1B01 clamps an underflow to zero. Weapon type $7F7C selects the basic attack, shatter bomb, power gun, or laser. $4FE4 advances a divider at $7F7B; every 50 calls it decrements lifetime $7F7A. A live trace starting at lifetime 2 and divider 49 yields lifetime 1 and divider 0. Calls are the measured unit; this is not described as seconds.

Money is $7F78. The pickup path $3673 adds 25 for the accepted money types and replaces carry overflow with 250. A live instruction trace with 240 produces 250. Shops use five 12-byte entry/return records at $809D; the shop logic checks the price before subtracting money. Food restoration is at $3690. Attack templates and strength-indexed tables feed the collision and damage routines rather than giving every weapon one common damage value.

The score uses six least-significant-first character digits at $191F; $1925 is the display copy. $192B adds through decimal carries. CPU simulator cases check +100 and +1600. The high-score table ranks converted values at $5EDF and accepts eight-character names with the joystick alphabet at $5CC1.

## Maps, exits, and progression

Map bytes at $A410 are block IDs, six vertically per column. Each block expands to a 4×4 grid of character codes at $B000+16*ID, in row order. This produces 24 map rows below the status line. $5192 draws one block; $51D4 supplies its screen offsets. $AE00 maps character codes to colours and $AF00 maps them to terrain classes. The stored stream occupies 424 block columns. The Maps page shows that full allocation without claiming that every column is reachable.

Exit counts at $806C are 23, 31, 21, 22, and 30. Their parallel fields are edge selector $8FC0, source world block $8FDE, destination scroll $901A, right scroll limit $9056, and destination X $9092. $3096 searches them. $50E3-$5114 computes the destination map pointer from the scroll value; it is not stored in the exit records. Area transitions can therefore change which part of the map stream is drawn.

First-four completion bits form mask $0F; the final level becomes selectable after those bits are set. All-five mask $1F selects the ending. $835F times the completion sequence, including converting remaining resources to points and setting the completed bit at the 250-count transition. A CPU simulator case confirms count 249 advances to completion and selection transition. Five guardian routes exist; ordinary traversal and defeat of each guardian remain open.

## Text

Menu and message strings use uppercase character bytes. The six hidden names use the separate add-$45 comparison encoding. The game character sets include scenery and status graphics as well as text; the graphics sheets and exact frame reconstruction decode their bit patterns rather than assuming a standard ROM alphabet. Score characters use $30-$39.

## Sound

One stored tune uses three order-list pointers at $704F/$7052: $7137, $7187, and $71D7. $6CC5 with A=0 initialises it, then $6701 runs once per play call. Music is called by the frame interrupt. $6D10 stops playback by storing $FF, the final X from the reset loop, in $66FF, $6700, and $6D9D. A new request 0 differs from loaded $FF and starts initialisation. Code/tables lie within $66FF-$7EBF. Sixteen effect pointers at $60DA address 64-byte records at $9C00-$9FFF. $6107 initialises the SID with volume 15. A request in $6105/$6106 is accepted at $6117 and stepped at $6281. The page runs these audio routines on the shared CPU simulator, feeding their writes into the SID model. Every tune/effect button is tested. Mutable effect memory ends at $65F0; waveform masks at $65F1 must be preserved. The instructions at $636C/$639F OR those masks with the gate bit.

The separate voice-three countdown entry is $66BA, preceded by a pitch-table byte at $66B9. $66D3 starts it when the countdown is negative and the extra gate is clear. It writes frequency $1388 and control $81. The countdown byte is $66FD.

## Name modifiers

$5001 compares eight high-score-name bytes against six strings at $5076, adding $45 to each stored byte. The names are LUMBAJAK, space-HEINZ.-space, COMMANDO, ANNFRANK, OOCHOUCH, and JUGGLERS. They select IDs 0–5 at $08BE. Every accepted name resets defaults $091C/$091D/$091E to 9/1/0, then ID 0 sets capacity default 17, ID 1 strength default 3, and ID 3 reserve default 1. Other readers give ID 2 a persistent weapon timer, ID 4 immunity to terrain class 9, and ID 5 doubled food restoration. Live instruction-by-instruction traces through $5001 confirm all six names and the resulting defaults. The names must include all eight characters, including the spaces around HEINZ.

## The listing's error rate

The sample used seed 15112026 and drew 100 of 1213 comments. gpt-6-astra checked the sample independently and found five comments with wrong details. The plain rate is 5.0%, with a Wilson 95% interval of 2.2–11.2%. Strata were aliases (0/20 from 477), level data (1/20 from 215), and written comments (4/60 from 521); weighting by population gives 3.7%. This is a lower bound on the true error rate because a checker can miss errors. All five findings held on a second reading and were corrected, along with repeated descriptions: exit fields, terrain probing before steering, the retained Y-high byte, the $66BA entry, and cleared prompt space. The sample measures the listing before those corrections. A full audit is recommended as later work and was outside this run.

The audio integration pass corrected one additional comment: $6D10 stores $FF after resetting the music work area, rather than clearing the tune and playback bytes. This was established from the terminating DEX/BPL loop and its following STX instructions.

## Explicit limits

Features marked open in features.md have not been verified in ordinary play. No complete playthrough, route replay, or JavaScript game port was undertaken. Data coverage is 100% of the declared six-part ledger; this does not turn every allocation into a known reachable gameplay object.
