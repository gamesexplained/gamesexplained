# Ghostbusters II — remaining work

The game is at tier `none`: the three gameplay episodes have been captured, but orientation, features, the sweep and their analysis are incomplete.

- Account for the mapped unpacked ranges and transient code; attribute the title, later-story and ending differences from their later snapshots, and record a repeatable timed route from power-on.
- Finish `parts/resident-stash` and `parts/title`, finish the restored `$1000–$1BFF` engine listing, establish any remaining transient ownership and account for the sound driver; the interim coverage total counts shared code in several parts. When listing the copied story engine, mark its I/O contexts so stores to the VIC are not named after hidden-RAM labels. The three stories and ending have separate snapshots and partial listings; audit their complete load ranges and shared engine. Extend the verified museum descent segment into a recording from power-on.
- Trace whether the copied code at `$1AE0` is reached and, if it is, what happens after its first self-overwrite; the first overwrite was observed in a bounded forced run. Establish whether the stored test-text row is ever displayed.
- Finish the feature checklist and collect title, external and later-scene references.
- Classify the airshaft's `$D000–$DFFF` RAM and all other loaded data, check the disassembler's traced blocks, and complete the register and text sweeps.
- Finish and verify the listings, including the runtime purpose of the alternate Broadway lookup separators, account for all open media items, and complete the minisite and its music and graphics players. The Levels tab reconstructs the airshaft for a downward pass and Broadway’s scrolling backdrop; verify both full routes, identify the animated museum detail and the fourth code in each pattern row, and extract the episodes’ remaining parameters.
- Have a proven model check the listing under `kit/CHECKING.md`; the run's model is not listed as proven.

- Finish classifying the stable picture-range tails of all four story loads, and trace the extra story-copy sources at `$9200–$A880` and `$A900–$BF80`. Each load writes its own bytes over earlier scenes; the coverage ranges keep unclassified bytes in the denominator.

- Classify the newly counted gameplay-load bytes and explain the measured differences between each load-time snapshot and its listing snapshot.

- Account for the shorter Censor museum file’s divergent partial output and inspect the Jondi crack introduction’s sound. Its bootstrap reaches a Space prompt but the observed boot did not continue.
