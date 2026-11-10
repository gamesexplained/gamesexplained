# TODO

Tier: bronze, set because the model that did the work, claude-sonnet-5-5, is not a proven model (`python3 kit/scripts/models.py is-proven`). Every other requirement of Silver has been worked to.

- **Audit the listing.** The sample found 26 of 60 comments wrong in a detail (43 %), all corrected. The other 42 comments have not been checked and probably hold errors at a similar rate. Fresh checkers on a proven model should audit all 102 and then a new sample should be drawn (`kit/skills/core/60-verify`).
- A maintainer on a proven model samples the listing, so the tier can move to Silver (`kit/CHECKING.md`).
- Comments are on groups of lines (102 groups for 953 lines). A comment on each line would be finer.
- Maps: the Maps page is a table of every place with its picture and exits. A drawn map of how the places join is not built.
- No Play tab.
- Open questions in `features.md`: whether the crackers changed the program, and which of the publishers is right.
- Eat, help, quit, ring and save, and the dogs' and the dark's deaths, are read from the code and not yet seen in the emulator.
