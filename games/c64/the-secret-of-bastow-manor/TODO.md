# TODO

Tier: silver. The work was done on claude-sonnet-5-5, which is not a proven model, and a maintainer's check on claude-opus-5-5 (`kit/CHECKING.md`) measured the listing: a sample (seed 8310) found 5 of 60 wrong, an audit of all 102 comments and of `facts.md` followed, and a second sample (seed 5150) found 1 of 60 wrong, within the mark. Gold needs a human's pass over each section.

- Comments are on groups of lines (102 groups for 953 lines). A comment on each line would be finer.
- Maps: the Maps page is a table of every place with its picture and exits. A drawn map of how the places join is not built.
- No Play tab.
- Open questions in `features.md`: whether the crackers changed the program, and which of the publishers is right.
- Eat, help, quit, ring and save, and the dogs' and the dark's deaths, are read from the code and not yet seen in the emulator.
- Two behaviours read from the code and not tried in the emulator, worth a Discoveries entry once seen: `cut apple` empties the pack slot with the number of the apple's slot on the ground (line 25), and a refused `get ladder` or `drop ladder` at the east side still changes whether the ladder is drawn (lines 1416 and 1424).
