# Wizard — semantic and reproducibility audit, 4 October 2026

This pass checks room-callback claims, their two resident callers, published
replays and four source-comment findings. It starts from the unpublished
`a2c3192` corrections, carried onto `main` at `f78d34d`. It is a bounded author
audit, not a certification of every interpretation in the resident listing.
The original disk, private snapshots and extracted programs remain private.

## Corrections

| Claim | Original-code result and change |
|---|---|
| Madhouse rotates arrows across the playable screen. | Its callback visits 839 of the 840 cells at `$C400–$C747`, skipping `$C700`. That cell contains arrow `$6F` in the supplied file. The loop starts at Y=`$47`, decrements to zero, then changes the page before reading offset zero; the last three pages do read offset zero. All 256 glyph values were tested: only `$6E–$71` rotate, in the order `$6E→$71→$70→$6F→$6E`. A live filled-screen probe leaves `$C700` unchanged while rotating the other 839 cells. Article, atlas, facts and both source companions now state the exception. |
| For Your Ice Only erodes a glyph on “later calls”. | The index `<3` branch writes saved collision color `$C36F`, then falls through to the same erosion tail as other indices. Every call with nonzero `$C38F` clears `$CAE0+counter` and decrements it, including indices 0–2. The active collision exemption `$C0A3` is a separate field. Corrected the atlas and source companion. |
| Display setup `$6C77` selects multicolor characters. | `$D016=$C8` has bit 4 clear: standard character mode. `$D01C` controls multicolor sprites separately. Corrected the canonical comment and regenerated its listing. |
| Key-appearance sound `$839A` uses noise. | All three SID control writes are `$15`: triangle, ring modulation and gate; no noise bit. Corrected the canonical comment. |
| Type-1 collision sound `$982F` enables ring modulation. | Voice two receives `$13`: triangle, sync and gate; ring modulation is clear. Corrected the canonical comment. |
| Packed-note adjustment `$841C` always adds four to low nibble `$C`. | `$FC+4` wraps to zero, so BNE bypasses the store and leaves `$FC` unchanged. Other low-`$C` bytes add four; low-`$F` bytes subtract four. All 256 inputs were tested. `$824D` is the decoded resident caller, following INC `$B1`; normal gameplay reachability of the exception remains unproven. Corrected the comment without presenting it as a gameplay exploit. |

The separate reviewer completed the original sixty-comment sample without
redrawing it after the four findings. Against baseline `a2c3192`, **56 comments
are supported, four are incorrect and none are unresolved**: 4/60, or 6.67%,
with an approximate pooled Wilson 95% interval of 2.62–15.93%. All four revised
comments in `50dbcec` are supported by targeted rechecks. This is not a new
random sample of the revised listing or an estimate of its remaining errors.

The [complete per-comment report](validation/semantic-review-20261004.md) and
[structured evidence](validation/semantic-review-20261004.json) preserve the
baseline texts, verdicts, instructions, callers, scope notes and hashes.
Seed `20261004` selects 60 of 358 comments containing at least six words within
resident `$5800–$9FFF`, proportionally across six address bands. The saved
selection reproduces exactly from the baseline. The interval is approximate
because rounded allocation gives slightly unequal inclusion probabilities;
it does not apply to compiled GAME, room overlays or all page claims.

The reviewer wrote none of the sampled baseline annotations. The author
independently checked the four errors, the even-X centering contract at
`$75C2`, the boot-marker source/runtime distinction and all 1,136 bytes of a
saved editor level against its archived snapshot. Historical live evidence
was inspected, not rerun for this sample. This is an agent source review,
not an independent maintainer certification.

## Callers and room scope

Player collection reaches `JSR $C376` at `$8497`; thief collection reaches it
at `$7FA1`. Both first call patch writer `$9477`, then spell-name writer
`$8D4B`. The latter leaves carry clear for all twelve valid spell IDs. The
original index scan supplies the treasure index, not the actor slot.

`audit_room_rules.js` executes each actual caller for all **608 indexed treasure
cells in the saved forty rooms**, observing X and carry at callback entry.
The thief is placed at the corresponding tile and its actual center probe
runs. Only the callback body is skipped in this caller test; separate tests
execute the callbacks. This is prepared collection, not proof that a thief
or wizard can reach every tile. The atlas's **606** choices additionally
exclude Simon's instruction display and its already-collected starting pearl.

The forty initial entries contain twenty RTS entries and these twenty active
callbacks. File numbers below are zero-based. Addresses refer to the selected
loaded room, not interchangeable code across rooms.

| File | Semantics and alternate conditions checked |
|---|---|
| L02T | Clears the two three-cell runs `$C402–$C404` and `$C423–$C425`. |
| L03T | Erases the eight key-glyph rows; index 2 uses the stored destination for a diamond, other indices place a chalice at `$C466`. |
| L04T | All 256 random bytes: values below `$CC` select their low two bits; other values select column 4. A selected column at Y≥205 stops; the test uses the boundary Y=205 and normal starting positions. |
| L06T | Zero-charge display digit takes one 18-cell strip; charged digits use index parity. All sixteen indices and all-enabled/all-disabled actor controls check reactivation. |
| L07T | Existing 4,096-case public-function comparison checks all sixteen indices, four requested symbols, sixteen color nibbles and four random low-bit values. Initialization and the patch preceding acceptance remain separately documented. |
| L08T | Spell-color lookup uses the incremented low two bits. Actor zero becomes a rat only if its type was zero; existing rat/cat controls stay unchanged. |
| L17T | Swaps the two cells for every index, without requiring that they still contain a key and exit. The retained route demonstrates continuation after key pickup; it was not replayed here. |
| L18T | Makes actor zero a falling rock and clears its sprite-multicolor bit. |
| L19T | Index 0–2 writes saved color; the shared glyph-erasure tail also applies to them. |
| L21T | Index modulo four selects a slot and type 2–5. The 384 spell/index/earlier-carry cases check the producer of its incoming carry. |
| L23T | Clears two actor velocity fields; index parity chooses `$55`/`$22`, and index divided by two chooses the glyph row. |
| L26T | Exactly indices 1, 5, 9 and 13 activate arrow slots 0, 1, 2 and 3. Other indexed pickups preserve the actor types. |
| L27T | Restores slots 0–3 colors from saved header values. |
| L28T | Only index 2 moves the key. Forty successive direct callbacks return its column to the initial value; the separate pickup replay tests regeneration. |
| L29T | Replaces two screen cells with pearls and fills eight glyph bytes with `$3C`. |
| L30T | Tests remaining counts 0/1/20, pre-increment counters 0/1/254/255, both special-state paths and all sixteen indices. Erasure requires remaining passes, odd post-increment count, ordinary player state and index 1. Each pass clears three three-cell runs and advances their pointers by 40. Saved color changes do not update the active exemption. |
| L31T | Only indices 0 and 1 set the corresponding actor support flag. |
| L33T | Exhaustive glyph classification and the exact 839 visited addresses, including the skipped-cell control. |
| L38T | First invocation copies both glyphs and self-modifies the tail. Later calls still clear `$C070`, but preserve sentinel glyph data. |
| L39T | Among valid treasure indices, only 14 and 15 replace the twelve-cell strip, using different sources. |

The callback suite runs **1,931 prepared cases** plus the two 608-cell caller
passes. Simon's 4,096 cases remain a separate check, not counted twice.
The 700-state pickup comparison also executes patches and callbacks together
for the published prepared outcomes. Neither suite models every possible
interleaving with IRQs, other actors or arbitrary corrupted room headers.

## Reproducible evidence

Five new offline validators and one live validator are documented in
[validation/README.md](validation/README.md). They do not depend on the
session's private helper scripts or generated fixture JSON. Shared setup reads
the private snapshot, original CHRW and original level files. Page datasets
are used only as expected results; pickup reconstruction uses the actual
function shipped by the atlas.

| Check | Verified scope |
|---|---|
| `audit_pickups.js` | Forty baselines, all 606 selectable pickups and 700 successive states; screen, color, font, actor types/colors/positions, header changes, expansion and death. |
| `audit_actor_motion.js` | Four 240-update traces: all 960 states and sprite images from raw RAM. Saved starting coordinates come from the level files. |
| `audit_movement.js` | All 25 prepared scenes and 494 controller states; 84 protection combinations, 48 elevator-contact combinations, 99 safe passes, 32 protected reports and the subsequent unprotected death. The 264 later death-animation samples are outside this routine-level test. |
| `audit_room_rules.js` | The caller and callback cases detailed above. |
| `audit_native_details.js` | Display setup, both sound setups and all 256 packed-note inputs. Delay/render continuation is suppressed for the isolated key-sound test. |
| `audit_live_rooms.py` | Five prepared pickup scenarios, Madhouse's skipped-cell probe, three For Your Ice Only early/later/exhausted-counter controls, display setup, both sound setups and four note-byte controls: sixteen live cases. The key sound rejoins the final prepared renderer iteration. Original game instructions remain unchanged, IRQs are suppressed, and a scratch call trampoline is used. The original paused emulator snapshot is restored afterward; no game disk I/O is executed. |

The portable suites share the kit's CPU implementation. Live VICE agreement
provides a second execution mechanism for the selected cases, not independent
review of all semantics. The existing supplied-disk identity and canonical
image audit remain prerequisites.

Remaining limits: unsampled source claims; uninterrupted gameplay and
additional full puzzle routes; the physical disk
conditions listed in [audit.md](audit.md); meanings of unsampled bytecode
annotations and dormant historical fragments. This pass does not change tier,
copy provenance or the distinction between classified bytes and proven claims.

## Validation of the validation scripts

All five new offline suites also pass from a temporary minimal checkout, run
with `/tmp` as the current directory and a separate private-input path containing
spaces. The copy contains no original `work/` helper scripts. Deliberately
changing a published pickup death result, actor X coordinate or player color
in disposable page copies makes the respective comparison fail. Removing CHRW
from that disposable input set also fails instead of silently substituting
page data. These checks exercise portability and failure detection; they do
not turn shared-harness comparisons into independent semantic review.
