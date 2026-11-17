# Super Wonder Boy in Monster Land — kit feedback

The run describes all counted bytes and keeps forced tests, ordinary-play reachability, and seven unattributed byte roles distinct. Final validation is recorded below.

## Skill text that changed what I did

- `40-sweep`: "Compare the analysis's bytes with the snapshot's": compared the supplied listing with independently captured title and play states and kept differing rows out of the initial seed.
- `60-verify`: "A negative result is a claim about your search": kept ordinary-play reachability open for forced loads and direct-entry tests instead of treating a bounded capture as proof of absence.

## What was changed in the kit

- `kit/c64/project.py`: retain automatic labels when reconstructing a project, so a direct export does not lose them; `kit/c64/test_project_labels.py` covers the round trip.
- `kit/scripts/test_browser.py`: isolate the missing-browser test from installed macOS applications.
- `kit/c64/test_tool_isolation.py`: resolve the temporary path before comparing it on macOS.

## Candidates

The same captured bytes can be copied as characters and executed as code. Treating a character-copy observation as proof that a range contains only graphics would hide executable entry points. This run found the overlap by watching execution in each forced load; another game's evidence should be checked before changing a general skill.

The shape matcher initially ignored masks with fewer than 16 set bits. Comparing sparse nonzero masks against the verified gallery found 20 more matches; VICE confirmed their bytes and the bounded execution probes. A candidate rule is to compare known shapes before filtering by visual density, but this run alone does not establish a general skill change.

## Maintainer asks

No additional kit changes require a maintainer decision. The pull request requires the routine listing check for an imported analysis on an unproven model.

## Validation and tool behavior

The final full kit run checked 939 tests: 927 passed, 11 skipped for missing optional tools, and one failed because the hidden-RAM test required sprite-slot tails to remain undescribed. The test checks their physical role and the pixel-fragment descriptions. A subsequent stable run passed all 403 game checks. The table-description test was also corrected to parse the stated seven data bytes, rather than treating a destination address as another table value. The three repository checks passed. The 102-game, 1175-page site build and Firefox checks at desktop and 390-pixel widths passed, including the source links. Local browser checks used Firefox; the committed browser checks select Chromium in CI.

An earlier full run encountered three tests reading a listing during regeneration. All three passed against the stable file. Listing regeneration and tests that read listings must run sequentially.

A span audit found that a comment on a sprite slot’s final byte could extend into a following undefined block. Explicit boundaries now constrain those comments to one byte, and `test_sprite_slot_boundaries.py` checks that invariant. The metric already documents span ownership, so this is recorded as an implementation error caught and corrected during this run.

## What cost the most time

Preserving automatic labels in reconstructed disassembler projects would have avoided repeated exports and manual reconciliation of the resident symbol map.

The final source-comment sample drew 80 comments across written and generated strata, with one wrong address detail. The correction was applied to all 29 copies of that sentence. Verbatim draws and verdicts stay in ignored working storage; `facts.md` and `game.json` carry the results.

## 17 November 2026: the maintainer's run to Silver

**What was changed in the kit.** `kit/c64/snapshot.py` read a snapshot's RAM at file offset 209 whatever the file held. vice-mcp v4.0.0, the newest release on 17 November 2026 and the one `tools.py get-vice` downloads, writes a larger CPU module, so its RAM starts at 232. On that build the reader returned RAM shifted by 23 bytes without a word of warning, and `check-emulator` failed `snapshot-ram-offset` and `checkpoints-survive-load` (the second only because it read its pass counter through the same offset: "51 hits in 609 passes"). The reader now walks the modules to C64MEM, as `kit/cpu/cpu6502.js` already did, and keeps 209 only for the module-less files the kit's tests write; `check_emulator.py` reads through it, and its self-test builds a module file with the RAM at 232. With the fix, v4.0.0 passed all 57 checks in five runs on Linux x86_64, recorded in `kit/c64/INSTALL.md` and `site/status.json`. Game scripts that read a `.vsf` at a fixed 209 (one is `games/c64/ghostbusters-2/analyse_unpack.js`) have the same fault on v4.0.0 snapshots.

**Skill text that changed what I did.** `kit/skills/core/75-review` sent the finished pages to a reader who wrote none of them. It found the immunity spot stated on the Maps tab but kept off Discoveries, the Helmet reduced to a number, two spot records beyond their maps' edges that the money counts included, and a three-page message read as one. Settling its "Next, Please." point led to the best bug on the page, the healing counter's price that never rises. `kit/CHECKING.md`'s rule to correct every comment that says the same thing as a sampled wrong one turned 15 sampled findings into 5,060 corrections.

**Candidates.** A maintainer's sample on claude-fable-5-2 found 17 wrong in 80 where two earlier samples on gpt-6-astra, over much the same listing, found one in 60 and one in 80. Fifteen of the 17 were one kind of comment, on bytes an eight-page character copy sweeps up, which a checker reading the comment beside its bytes may pass as plausible. That difference in recall is worth a maintainer's look before gpt-6-astra samples are taken as the measure of a listing.
