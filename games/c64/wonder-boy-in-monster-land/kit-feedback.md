# Super Wonder Boy in Monster Land — kit feedback

This retrospective records work through the ongoing analysis. The final listing review, remaining checks and maintainer asks are still to be completed.

## Skill text that changed what I did

- `40-sweep`: "Compare the analysis's bytes with the snapshot's": compared the supplied listing with independently captured title and play states and kept differing rows out of the initial seed.
- `60-verify`: "A negative result is a claim about your search": kept ordinary-play reachability open for forced loads and direct-entry tests instead of treating a bounded capture as proof of absence.

## What was changed in the kit

- `kit/c64/project.py`: retain automatic labels when reconstructing a project, so a direct export does not lose them; `kit/c64/test_project_labels.py` covers the round trip.
- `kit/scripts/test_browser.py`: isolate the missing-browser test from installed macOS applications.
- `kit/c64/test_tool_isolation.py`: resolve the temporary path before comparing it on macOS.

## Candidates

The same captured bytes can be copied as characters and executed as code. Treating a character-copy observation as proof that a range contains only graphics would hide executable entry points. This run found the overlap by watching execution in each forced load; another game's evidence should be checked before changing a general skill.

## Maintainer asks

None identified at this stage. Review the remaining run and existing issues before submission.

## Validation and tool behavior

A full kit run checked 934 tests: 920 passed, 11 skipped for missing optional tools and three failed while the resident listing was being regenerated. All three passed against the stable file. Listing regeneration and tests that read the listing must run sequentially. A subsequent stable run passed all 402 game tests. The three repository checks and the 102-game site build also passed. This failure was visible, so it is recorded here without a general skill change.

## What cost the most time

Preserving automatic labels in reconstructed disassembler projects would have avoided repeated exports and manual reconciliation of the resident symbol map.
