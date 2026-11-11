# Kikstart — kit feedback

Silver run by jankfoundry on Linux x86_64, kit 0.0.323. Python 3.12.3,
g++ 13.3.0, plus4emu 1.2.11 at 939e652 with the kit patch, and
regenerator2000 0.9.20. Both PAL models passed 46 checks. The installed
tools and their state stayed under tools/; the footprint check was clean.

## Skill text that changed what I did

- `20-features`: "the same snapshot run once": matched control tests exposed the opposite 3/4 directions from the printed instructions.
- `50-coverage`: "Is the picture loaded or drawn?": the loaded title was kept in coverage even though play replaces its screen memory.
- `50-coverage`: "Data the ledger cannot see": the listing audit brought the complete character banks and terrain look-ahead into the described image.
- `60-verify`: "A wrong comment is usually one belief written down more than once": the surface finding was applied to the unsampled airborne comment as well as the sampled riding comment.
- `70-minisite`: "The comparison that counts the pixels that differ": the split-screen reconstruction was checked numerically, giving zero differences in the 320x200 display window.

## What was changed in the kit

None. The C16 tools, coverage audit, and verification rules already
covered the analysis problems this run met. No platform installation
notes or shared scripts needed changing.

## Candidates

None. The incorrect surface-interval description was caught by the
existing checker process. The relevant general rule is already in
60-verify, under “What a test lets through”.

The requested full audit and fresh sample also followed existing
60-verify rules. Reading callers exposed two conditions omitted even
after the audit; the fresh checker measured them and the lead corrected
their repeated wording. No additional shared rule was needed.

The checker did encounter visible tool failures. Its Python command hit
`bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`; an
escalated request waited 637 seconds without a progress report. Another
combined tool call waited 305 seconds. After interruption, the checker
sent its evidence scripts and verdict batches to the lead, which ran
the scripts through its working execution path and saved the verdicts
verbatim against the frozen sample. This recovered the independent
check without doing parallel analysis or changing sampled comments.
The exact recovery is in agent-history.md. This is a host/tool failure,
rather than an unsupported C16 emulator capability.

## Maintainer asks

None. The visible host-tool failures were recovered locally; this run
has no proposed repository rule change requiring a maintainer decision.

## What cost the most time

A checker launcher that reports a blocked execution request promptly to
the lead would have saved the long silent waits in this run.
