# Wizard — audit, 3 October 2026

This is an author self-audit of the article, atlas, source annotations and
recorded demonstrations at baseline commit `f2ff4f5`, followed by corrections.
A further pass from `3a43bf9` checks assisted boot, accounting and disk persistence.
The pass from `8d49b98` follows multi-player score attribution and error paths.
It is not the independent maintainer check in `kit/CHECKING.md`; no
`verification` record or tier promotion is being claimed. Coverage remains a
measure of classified bytes, not a percentage of interpretations proven true.

The contributor supplied a review of another game as an example:
[PR 152, review 5398251577](https://github.com/gamesexplained/gamesexplained/pull/152#pullrequestreview-5398251577).
Its useful warning is that a correct observation can become a wrong general
claim when alternate callers, rooms or initialization paths are overlooked.
The checks below use Wizard's own program and data.

## Findings and disposition

| ID | Finding | Disposition |
|---|---|---|
| A01 | The high-score champion-name entry was confused with the construction-title entry; the timeout description consequently applied to the wrong field. | Corrected `facts.md`, F28, nine canonical labels and eleven source comments; exported symbols and rebuilt the listing. GAME `$4541` calls initials `$7078 → $8FA6` (3 columns); GAME `$4602` calls champion name `$706F → $8FB5` (16 columns). Both enable inactivity expiry. BLDR `$41D4` calls construction title `$7066 → $8FC4` (23 columns), disabling expiry. All three bound tables and mode bytes were checked in VICE at the shared-editor entry. |
| A02 | Two unused external research screenshots lived in `reference/`, which the site build publishes. | Moved them to ignored `work/external-reference/` and corrected their provenance paths in `features.md`. The published captures come from the supplied image. |
| A03 | Most regression scripts existed only in ignored session storage, and some older tests compared a private helper rather than the shipped page function. | Added `validation/audit_data.py` and `validation/audit_mechanics.js` with documented private-input requirements. The latter extracts the actual public scoring, SID and Simon functions. Other private fixtures are still explicitly identified below. |
| A04 | The death capture was described as 264 complete PAL video frames although its last frame-advance operation stops at the routine's endpoint. | Changed the technical record to 264 frame-advance samples, ending at `$96A3`. The recording still has 266 states including its initial and fatal-update states. This is a wording correction, not a new capture or a change to playback. |
| A05 | The boot recipe omitted the protection loader's first-attempt rejection guard. Applying the XOR assist on the first `$195C` stop produced a valid table but then triggered the loader's failure path. | Corrected `orientation.md`: when `$FB=1`, resume unchanged to the next hit. A hard-reset run with assistance on attempt 2 reached the menu, GAME entry and Playground. No attempt counter, PC or loader instruction was patched. |
| A06 | The ranking summary could be read as rejecting tied scores, and the feature list did not distinguish a surviving retry from a player change. | Clarified the first-strictly-lower numeric insertion rule: a tie may enter beneath an equal score if a lower slot remains. Name attribution is covered by A07. Original-code ranking cases confirm it. Live death-settlement probes confirm the same player retries while lives remain; completion or final-life loss settles the turn. The page now explains this distinction. |
| A07 | Numeric insertion was documented without the later name-attribution pass. That pass can match a pre-existing tied score. | Original-code and live keyboard/disk tests confirm that a champion tie can replace the champion name, while a last-place tie can replace initials without inserting a score. A six-player prepared result also checks several qualifying players and tied totals. Corrected facts, F28, canonical comments and the article. |
| A08 | `$2A34` was described as timing out to the title. Its back edge skips the counter increment. | Corrected the source annotation. A missing-file live test keeps the counter unchanged over 600 PAL frames; the original-code test observes 10,000 polls. Both verify FIRE exits. The score-save error loop is different and its expiry does work. |
| A09 | Calling `$8B1E`’s result a final disk status could imply that zero proves persistence. | It reads KERNAL transfer status, not the drive’s DOS error channel. An empty-drive observation returned zero with no disk attached. An unavailable-device parameter returned `$80`; the original error/retry path then saved an exact record to a private disk. All claims of successful persistence retain actual file comparisons. |

## Identity and provenance

The supplied G64 and the private working copy both hash to
`040b0615ab6dc3d741ee7bb85b59352a7c4c1a6fca0276672b9ab71ffa398c81`.
No supplied disk file was modified. The canonical snapshot remains the
post-loader GAME entry described in `orientation.md`, including its documented
protection-sector XOR assist.

All 45,560 listed bytes match the canonical snapshot, without overlap or
omitted bytes inside the declared resident extent. They also match a fresh
GAME-entry snapshot reached through the corrected assisted boot on 3 October.
The 9,180 machine-instruction records agree both with the kit's decoder and,
separately, VICE's disassembler in 117 batches. The kit comparison shares the
listing generator's opcode table; the VICE comparison does not. Neither
establishes every comment's meaning or validates the compiled bytecode's
semantic annotations.

GAME's 17,032 bytes and CHRW's 2,048 bytes match their extracted disk files.
SPRW's 8,192 bytes match relocated sprite RAM except `$FFFA/$FFFB`, holding
the observed `$FE43` vector. BLDR's shared runtime `$0826–$27F1` matches GAME.
The separately loaded BLDR script is not included in the resident coverage
total. Fresh `c1541` extraction from the working G64 reproduced all 45 prior
private program/asset/level extracts. SCOR was also extracted separately for
the disposable-disk test.

M.L. differs from its disk file at exactly 135 bytes:

| Addresses | Observed distinction |
|---|---|
| `$7000–$707F` | Protected API table reconstructed by the documented loader computation |
| `$6C07–$6C09`, `$6C13–$6C14` | Loaded filename and file-end metadata |
| `$58FF`, `$99F0` | Disk value `$01`, entry value `$FA`; fresh store watchpoints identify LODR `$1989` and `$1986` respectively as the writers; GAME `$4878` accepts the markers |

The portable data audit asserts this entire difference set instead of silently
treating the disk file and loaded image as identical. The fresh boot establishes
the marker writers as well as the resulting resident bytes.

Fresh VICE observations confirm the play snapshot's `$00/$01=$2F/$37`, IRQ
`$7CBF`, NMI `$7D6F`, `$DD00=$C4`, `$D018=$13`, and stopped PC `$8E62`.
Four 12-frame neutral/right/jump control sequences from that snapshot reproduce
the recorded position and jump-counter outcomes. Those controls verify resumed
play. Separately, the fresh assisted boot reaches Playground through menu input,
with wizard (172,165), six lives in each of the six account slots, one selected
player and the same play banking/display/interrupt setup, stopped before the
first `$707B` movement call. The protection assist remains part of this recipe;
this is not an unassisted-boot claim.

## Checks rerun for this audit

All rows below passed. Counts describe each check separately; overlapping
cases must not be added into an inflated total of independent validations.

| Area | Evidence checked | What it establishes and what it does not |
|---|---|---|
| Saved rooms and artwork | `validation/audit_data.py`: 40 level files, 240 actor slots, 58 sprite shapes, both embedded fonts, 101 inverse glyph pairs, twelve spell names, 21 behavior names and twenty default appearance triples | Saved playfield bytes and selected header fields agree with the supplied files; twenty callback entries start with something other than RTS. This does not establish every callback's meaning or reachability. |
| Treasure indexes and scoring | `validation/audit_mechanics.js`: original index scan for all 40 rooms; 80 scoring/life-threshold cases against the public function | Validates counts, pickup arithmetic and selected thresholds. Completion bonus, account rotation and persistent score insertion are covered separately below. |
| Pickup previews | `node work/verify_treasure_previews.js`: 700 published pickup states compared with original routines | Screen, color, font and actor-type/color changes agree for the prepared pickups. A preview is not a route to that pickup. |
| Simon Says | 4,096 combinations against the actual public acceptance function, including state/glyph/color changes; four isolated VICE callback cases | Covers slot, requested glyph, color nibble and random low bits. The automatic starting pickup has evidence from 2 October, but its full input route was not rerun here. |
| Projectile and cat/rat rules | `node work/research-pass.js`: 7,200 forced projectile dispatch combinations and 150 cat/rat combinations; `python3 work/research-live.py`: five queued-hit cases plus a no-hit control | Verifies the hit consumer and tested contact decisions. It does not prove every physical sprite collision used to prepare those states can occur. |
| Freeze | `node work/verify_freeze.js`: four paired timelines with duration 109/93/77/61 and shared reset | Verifies the tested countdown and original-color restoration. Does not substitute for all room/actor combinations. |
| Movement and travel examples | `python3 work/verify_movement_live.py`: 205 live updates across eleven representative fixtures; `node work/verify_movement_rules.js`: 84 protection-gate, 48 elevator-height, 99 safe-control and 32 fatal-report checks | Original movement matches those controlled states. Terrain/actor preparation is intentional and does not establish unmodified room playthroughs. |
| Invisibility display | `python3 work/probe_invisibility.py`, followed by comparison of all 33 public states with the fresh live sequence | Safe controls retain 32; the next 32 forced fatal reports decrement protection and reproduce color/multicolor states; the following report reaches death routine `$9526`. |
| Actor replays | `node work/check_motion.js`: 960 replay states and playback controls | The four published traces agree with the tested original motion routines. This is not a complete live audit of every named behavior. |
| Sound and input | `validation/audit_mechanics.js`: 60 ordered SID-write comparisons, all 256 key bytes, three text-entry setups | Tests the actual public effect writer, speed-key predicate and corrected entry bounds/modes. Does not validate analog SID sound or natural high-score qualification. Disk persistence is checked separately below. |
| Carry, loader key and dormant fragment | `node work/research-gaps.js`: 384 carry cases, 256 loader-key bytes, and 5,648 L35T cases/updates with 321 terrain transitions | Bounded original-code tests pass. The loader-key cases are forced byte values. L35T's historical purpose remains unknown; the result is not proof that no other path can activate it. |
| Screen reconstruction | Public FRAME data equals `work/frame-trim.json`; `kit/c64/frame.py compare` matches all 104,448 pixels of the stored emulator reference | Revalidates rendering of that captured frame. It is not a new frame capture or a whole-game graphics comparison. |
| Browser and packaging | 42 source views containing 4,449 rows; complete 266-state death playback, controls, sprite bounds and 320/390/768-pixel layouts; required repository checks and full site build | No browser errors in the checked views; deleted external images are absent from the built site. These checks establish presentation and packaging, not the truth of the explanations. |

## Further boot and accounting checks

All checks below passed after correcting the boot recipe and the test setup
issues recorded in `agent-history.md`. Prepared states enter original code;
they are not represented as scores earned or milestones reached in normal play.

| Area | Evidence checked | Scope |
|---|---|---|
| Fresh boot | `work/audit_boot.py`, `audit_boot_continue.py`, `audit_boot_game.py`; saved first-play observations | Hard reset, original WIZ/LODR path, guarded sector XOR, watched marker writes, menu input, 45,560-byte GAME-entry identity and Playground setup. The supplied disk hash is unchanged. |
| Native decoding | `validation/audit_vice_listing.py` | All 9,180 native instructions, including bytes, boundaries and mnemonic, after checking the entire resident image. Separate decoder, same author; no claim of independent semantic review. |
| Accounting matrix | `validation/audit_accounting.js`: 303 cases | Initialization; 150 bonus payouts; 30 account save/restore pairs; 70 player-selection cases including all 64 survivor masks; seven milestone calculations; seven ranking cases including ties; eleven save gates; 27 level choices. Printing is suppressed and save calls are stubbed only for the gate check. Forced Mystery milestones test arithmetic, not reachability. |
| Bonus and account rotation in VICE | `work/audit_accounting_live.py`: four bonus cases and three rotations | 0+24 bonus units=1200; 9950+1=10000 and lives6→7; 9950+24=11150 and lives6→7. A 123450-point account is saved; eliminated players are skipped; wrapping the player list advances the round. |
| Death versus retry | `work/audit_death_turns.py`: two two-player probes | From death settlement `$2DA3`, lives2→1 retries player1 with its score; lives1→0 saves its eliminated account and restores player2. The death animation precedes the entry used by these probes. |
| Completion and progression | `work/audit_progression_live.py`: retained exit checkpoint, two prepared milestones and one prepared Mystery load | Burning Bridges settles 2550+17×50=3400 and requests L18T without new state edits. Bases0/30 give the documented life additions, preserve dead slots, wrap through eight bits and enter the next band/Mystery. Base153 clears round9 to zero and requests file25. |
| Score entry and persistence | `work/audit_scores_live.py`; separate `c1541` extraction | Prepared 1000-point account, original ranking, typed name `AUDITCHECK` and initials `XYZ`, SAVE status0 to a disposable D64, replacement of RAM record by a sentinel, and original LODR reload. All 128 saved/reloaded/extracted bytes match. Disk initialization `$8B62` is needed after the test's disk swap/snapshot restore. Supplied G64 unchanged. |

This first score test exercises one qualifying player; the next pass below
adds several qualifying players and selected error branches. Neither pass is
an uninterrupted multiplayer playthrough. The Burning Bridges test repeats
only the retained route's completion tail. The revised turn explanation and
built source were checked at desktop and phone widths without browser errors or overflow; the
required repository checks and full 19-game build pass.

## Score attribution and error-path follow-up

`validation/audit_score_paths.js` passes thirty cases: eight complete
insertion/attribution scenarios, twelve SAVE retry outcomes, six LOAD retry/wait
scenarios and four checks of the native saver’s status handling. The input
fields and transport results are supplied; the original decision and record
copying code runs. The previous 303 accounting cases also pass after extracting
their common private-input harness.

`work/audit_scores_multi_live.py` uses actual text input for three prepared
end-of-session records. A six-player case starts with scores
`[1050,1000,1000,750,550,0]` against an old table from 1,000 down to 550.
Players 1,2,3,4 receive ranks 1,2,3,9. A separate 1,000-point tie receives the
champion-name prompt; a 550-point tie replaces tenth-place initials with all
numeric scores unchanged. All three reach SAVE status zero, and all 128 bytes
of each record match separate `c1541` extraction. These test the complete
end-of-session ranking/input/save path from prepared accounts, not the gameplay
that earned their scores.

`work/audit_disk_errors_live.py` observes the empty-drive SAVE and then prepares
an unavailable-device parameter after SETLFS, without changing an instruction.
That SAVE returns `$80` and shows the error prompt. FIRE retries through the
original saver, which restores device 8 and writes an exact 128-byte record to
a disposable disk. Restoring the error prompt and providing no FIRE verifies
the score-save wait’s expiry. The empty-drive observation is bounded to the
restored emulator state; it is not a claim that every missing-disk or DOS error
returns zero. Status zero is never used alone as the persistence proof.

`work/audit_level_wait_live.py` initializes a disposable disk containing SCOR
but no level files. The real LOAD returns `$42`. Over 600 PAL frames,
watchpoints count 8,049 reads of the wait-loop entry and none of the skipped increment opcode, with no counter change. FIRE
then reaches the next LOAD with counter 1. The back edge to `$2A84` explains why
waiting does not advance the expiry counter. The controlled original-code matrix separately establishes
the fourth-LOAD retry boundary; that boundary is not claimed as four live
physical failures. The expanded score section and updated source pass desktop
and phone browser checks without errors or horizontal overflow. The data audit,
required repository checks and full 19-game build pass.

Commands naming `work/` use the session's private scripts. The five committed
validation scripts and their prerequisites are described in
[validation/README.md](validation/README.md). Live probes restore the saved
Playground snapshot after finishing.

The death-browser test initially read the play-button state before Chromium
delivered the reduced-motion change event. The private test now waits up to
one second for the preference and stopped state, then checks that playback
remains paused. It passed on rerun; no page implementation changed for this
test synchronization correction.

## Evidence retained, not freshly replayed

The complete no-spell death capture, the automatic starting pearl in Simon
Says, neutral-input hidden-thief demonstrations, the checkpointed Burning
Bridges route, the naturally reached startup score-clear check, and construction
save/reload on a private disk have records from 2 October. Only the Burning
Bridges completion tail was freshly rerun in the accounting follow-up. This pass
does not promote the other earlier observations into fresh live tests. It also does not
claim to have independently checked every sentence of `facts.md`, all bytecode
decodings, or every routine/table label.

## Next checks before claiming broad factual confidence

1. Independently sample the article and technical records as `kit/CHECKING.md`
   specifies: twenty facts, ten named routines/tables, and the orientation
   claims, chosen by the reviewer. Check new claims after any failure, not
   merely the repaired examples. A different reviewer must perform this step;
   the author cannot record a passing independent check on its own work.
2. Trace callers and alternate loaded programs for universal words such as
   “all”, “always”, “only” and “never”. Room enumeration here covers saved data
   and selected routines, not every semantic assertion about all forty rooms.
3. Keep the remaining accounting/I/O scope explicit: an uninterrupted
   multiplayer gameplay session, naturally reached progression beyond the
   checkpointed room, a physically full or write-protected disk, and live
   exhaustion of all retry attempts remain outside these tests. Multi-player
   end-of-session attribution, selected actual transport/file failures and
   their controls are covered above.
4. For any new completion claim, supply a reproducible input route. Other than
   the explicitly checkpointed Burning Bridges route, complete puzzle routes
   remain open. Keep isolated callback results labelled as isolated.

The corrections and passing checks improve the evidence, but this report is
not a certificate that all data and interpretations are correct. The game
remains `silver-claimed`, with `agent-draft` copy and the existing human
curation requirements.

## Semantic and reproducibility follow-up, 4 October 2026

[semantic-audit.md](semantic-audit.md) records the callback/caller audit, six
corrected explanations or comments, and the expanded portable validation.
The repeatable suites replace the private pickup, actor-replay and prepared
movement checks listed above; the recorded historical results remain dated.
The new live runner repeats five pickup scenarios, checks Madhouse's skipped
cell, checks three For Your Ice Only controls and verifies seven native register/boundary cases. Its sixteen cases
restore the original paused emulator state and execute no disk I/O.

A separate source-comment reviewer produced four concrete findings, which the
author checked and corrected, but its planned sixty-comment sample did not
finish before a service usage limit. No sample pass, statistical error rate or
formal independent verification is claimed.
