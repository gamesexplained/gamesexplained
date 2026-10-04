# Compiler, construction and disk audit — 4 October 2026

This pass reviews the shared interpreter, compiled GAME and separately loaded
BLDR, then exercises disk failures through the original game in VICE. It is an
agent audit of the supplied PP&S edition, not a maintainer certification or an
uninterrupted playthrough. The baseline is `db7640a`.

## Frozen source samples

Three reviewers received disjoint ranges and wrote none of the annotations
they reviewed. Each saved its selection before assessing it. The reports
retain the baseline mistakes after repair; the samples were not redrawn.

| Review | Eligible population | Seed | Baseline result | Approximate Wilson 95% interval |
|---|---|---|---|---|
| Interpreter `$0801–$27FF` | 244 line comments | 202610041 | 1/20 incorrect | 0.89–23.61% |
| GAME `$296E–$4A88` | 83 comments of at least 100 characters | 202610042 | 2/20 incorrect | 2.79–30.10% |
| BLDR `$3320–$530C` | 3,830 decoded statements | 202610043 | 0/20 incorrect | 0–16.11% |

The units and selection frames differ. These intervals are not a pooled
whole-listing estimate, nor estimates of the error rate after the repairs.
The statement sample does not measure the accuracy of BLDR's prose descriptions.

The reviews also inventory 220 interpreter entry claims, all 76 high-level
GAME comments, all 43 BLDR region descriptions, and all 232 BLDR DATA records.
Eighteen interpreter entries retain explicit limits on their static review;
their complete semantics have not been dynamically established. Four BLDR
descriptions have a wrong detail despite its clean statement sample.

Full baseline texts, selection predicates, callers, verdicts, private-input
hashes and evidence are retained in these reports and their JSON companions:

- [Interpreter review](validation/interpreter-review-20261004.md)
- [GAME review](validation/game-script-review-20261004.md)
- [BLDR review](validation/editor-script-review-20261004.md)

## Source changes and parent checks

The canonical source changes seventeen line comments and classifies the
eighteen bytes at `$19DE–$19EF` as executable code. This adds eight native
instructions to the listing. The dispatcher patch templates at `$19F0` remain
data. The tracked image remains 45,560 bytes, all described by the ledger;
coverage is not a measure of semantic correctness. A fresh independent VICE
decode matches all 45,560 listed bytes and 9,188 native instructions in 117
batches; [the decoder result](validation/vice-listing-20261004.json) is retained.

Interpreter findings concern ON's wrapped doubled index, MID's early empty
returns, BASIC transfer, the page added to the header's allocation-floor basis,
lower-opcode dispatch, and the optional keyboard-checked fetch. Known GAME/BLDR
ON callers stay below 128; the wrap finding is not an established player bug.

GAME's next-round call restores six glyphs rather than disabling demonstration
playback. Its failed-load abort enables game interrupts before settling the
accounts. The ordinary score display calls the persistent counter updater
twice before its final wait; the no-FIRE wait performs 76 delays. Initializer
and demo-score descriptions now identify the precise record bytes involved.

BLDR's cursor moves four pixels horizontally and one vertically in positioning
mode, or eight on both axes in terrain mode. Its numeric filter rejects minus
signs. The title expires on pass 7,501. Portal placement checks only the upper
right cell of its top row; the upper left and middle can be overwritten.
The source companion and program browser carry these four revised descriptions.

The parent reproduced all three fixed-seed selections from the baseline,
checked the actionable source locations and independently replayed
twenty prepared cases in VICE: seven complete portal placements, eight numeric
filter controls, glyph restoration, the failed-load IRQ setup, a supported Slow
spell boundary, checked-fetch enable/disable, and a supported BASIC NEW transfer.
Portal tests include all-blank success and obstacles in each of the six cells.
These are prepared states, not demonstrations of every legal input route.
The original paused machine state was restored after the run.

The portable interpreter validator passes 22 probe groups containing 66,810
prepared cases, of which 65,536 exhaust signed integer values. GAME adds fifteen
probe groups. BLDR checks input predicates, complete input parsing, DATA loading,
placement/erasure, cursor motion, numeric bounds, status routing and callbacks.
These share the kit CPU and are paired with the separate VICE observations.

## Real disk failures

All writes target freshly formatted disposable D64s. A full fixture has zero
free data blocks; an independent sector-chain walk checks the filler file.
Write protection uses the image's read-only mode and is confirmed by an actual
drive error. Successful records are separately extracted with `c1541` and
compared with all 128 prepared score bytes. Failed cases check that the disk
image is unchanged. The supplied G64 is never the write target and retains its
original SHA-256.

| Initial disk | Original SAVE READST | Game result | External DOS diagnostic | Stored score |
|---|---|---|---|---|
| Writable, no SCOR | `$00` | Returns as success | 00 OK | Exact new record |
| Full, no SCOR | `$80` | DISK ERROR prompt | 67 ILLEGAL TRACK OR SECTOR, 36,01 | No record; image unchanged |
| Full, existing SCOR | `$00` | Returns as success | 00 OK | Exact new record |
| Write-protected, no SCOR | `$80` | DISK ERROR prompt | 26 WRITE PROTECT ON, 18,01 | No record; image unchanged |
| Write-protected, existing SCOR | `$80` | DISK ERROR prompt | 63 FILE EXISTS, 00,00 | Old record preserved; image unchanged |

The full-existing case succeeds because `$8B1E` first scratches SCOR, releasing
its block before saving the replacement. A full disk is therefore insufficient
to predict failure without checking whether the old record exists. On the
protected existing-file case, the scratch cannot remove the old file and the
later SAVE encounters it. DOS 67 is the observed result for this full fixture;
it is not relabelled as DOS 72 or generalized to every full disk.

The DOS column comes from an external status-channel read after the game has
made its decision. The game itself only reads KERNAL transfer status. The
earlier empty-drive zero-status result remains a separate bounded observation.

Held FIRE drives the original retry loops through actual failures:

- Full disk without SCOR: three SAVE calls, READST `$80` each, counter
  0/1/2 before error handling, then 3 on return.
- Write-protected blank disk: the same three-call exhaustion and unchanged image.
- Missing L00T on a blank disk: four LOAD calls, READST `$42` each, then the
  original abort entry `$3E6C` with counter 3.

The missing-level probe stops at the abort entry; its first IRQ-enabling call
is tested separately. A successful fourth LOAD being discarded remains
controlled original-code evidence from `audit_score_paths.js`, not a live
disk-recovery claim.

## Repeatability and limits

[Validation instructions](validation/README.md) cover the three offline source
validators, the twenty-case live replay and the eight-case disk suite. No game
image, snapshot or ROM is committed. The live reports retain only observations
in [compiled-live-results-20261004.json](validation/compiled-live-results-20261004.json)
and [disk-failures-20261004.json](validation/disk-failures-20261004.json).

The remaining work includes an independent maintainer-style factual sample,
uninterrupted multiplayer/progression play, other complete room routes, and
the explicitly limited interpreter semantics. This audit does not change
the game's `silver-claimed` tier or `agent-draft` copy status.
