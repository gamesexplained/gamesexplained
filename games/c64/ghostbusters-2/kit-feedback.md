# Ghostbusters II — kit feedback

## Skill text that changed what I did

- `60-verify`: "Both the sample and the audit are done by checkers": a fresh checker found a source-array error in the random sample and 26 additional errors in the new state descriptions.
- `50-coverage`: "Runtime state is excluded": traced entry initialization before excluding generated state, while retaining authored sources and the image bytes needed by the graphics inspector.
- `60-verify`: "A control reading zero means the instrument is dead": paired the museum collision trials and the self-copy return test with entry counters.
- `60-verify`: "An `unused` answer in `media.json` is a negative result as well": read the filename dispatcher and named-load paths before resolving the decorative entries and stray disk sectors.

## What was changed in the kit

None. The changes are confined to this analysis and its review images.

## Candidates

Setting a data type in the running disassembler retraced the whole image and recreated automatic labels inside instruction operands and known data records. Those labels fragmented coverage. Comparing each boundary with the decoded instruction or the established data allocation exposed the problem. A future diagnostic could report such interior automatic boundaries; a second affected game is needed before adding a general skill rule.

The first state-table descriptions assigned plausible coordinate and pointer roles without following every consumer. The independent targeted review exposed these errors. The existing checker rules already require this verification, so another rule would duplicate them.

## Maintainer asks

None. The required model review is recorded in TODO.md and the pull request.

## What cost the most time

A diagnostic that distinguishes automatic operand boundaries from real data and routine entries would have saved the most time in this run.

The host was Linux x86_64. VICE release v3.13.1 and the installed regenerator2000 servers were reused; this continuation installed no software.


The uncertainty pass benefited from `60-verify`’s instruction to check every reader and writer before making a claim about the whole game. Two hit flags looked like a simultaneous-beam requirement until the independent checker followed the off toggle and the skipped update branch. The prescribed second reading caught it. The input-recording guidance also exposed a banked-memory mistake in the VICE replay helper: writing the recording below I/O needed the CPU port set to RAM first. The positive-control breakpoint showed zero hits in the failed attempt, so it was discarded as an instrument failure. Both failures were covered by existing guidance; no additional kit rule was needed.


`tool-vice-mcp`’s warning about an undrained monitor connection applied to scoped tracepoints too: closing a one-command connection while trace output was pending wedged this build with broken-pipe errors. The sustained trace used one connection with a reader that drained it to a private file; watchpoints were removed before closing it. The existing warning identified the failure, so no broader tracing rule was added. Headless runs unset display variables only for the kit launcher’s child environment, preserving the contributor’s desktop settings.

`tool-vice-mcp` says to inspect the drive when a loader hangs, and gives the `DRIVECPU0` snapshot layout. That instruction exposed a filename-prefix search in the Jondi drive code and resolved the black-screen boot: the requested `00` prefix is absent from the directory. A later failed request filled memory with `$FF`, so a long wait at a BASIC ROM address alone had hidden the actual cause. The existing drive-inspection instruction covered the problem; another rule would repeat it.

## Silver review continuation

The 60-verify rule “For each wrong comment” prompted a search across every part for the same gate/control wording, finding 21 occurrences. The rule about comments written from templates prompted a separate 20-comment generated supplement. The installed emulator was reused headlessly with dummy audio as requested. No kit change was needed.
