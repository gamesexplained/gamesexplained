# Labyrinth — next work

Bronze is complete for the playable text opening. Silver requires:

- Export and annotate the captured graphical room images. The gate and first corridor were reached by ordinary inputs; later room captures use the game’s requested-room byte and are documented as forced states.
- Capture the text overlay’s hand-over and compare it with `parts/opening/work/play.vsf`. Preserve any startup-only code or authored data in the listing’s chosen image.
- Identify every later load and replace the broad `labyrinth` continuation placeholder with one part per actual load; compare snapshots before deciding what is resident.
- Explain the remaining opening code and data to 100% coverage. Classify the six small code gaps and RAM under I/O flagged by `listing.py`; do not exclude them merely to clear the warnings.
- Decode the high-byte dialogue substitutions and controls, including their punctuation. Trace the prefix-matching wheel code and inventory representation.
- Assign producers and consumers to the disk-file matches, especially the seven modified bytes of `tx` and the changed initial-image ranges.
- Test the documented disk saving, loading, pause, and restart controls on expendable working copies. Establish the clock rate, failure conditions, maze changes, and later puzzles from code and live tests.
- Trace the sound service and identify every tune; build its player for the Silver page.
- Run coverage and verification, obtain the independent listing-comment sample, and recommend the later audit. No sample or audit belongs to this Bronze contribution.

Possible follow-ups: a working word-wheel demonstration, a map of the city opening, a dialogue decoder, and a browser for the maze’s scene data.
