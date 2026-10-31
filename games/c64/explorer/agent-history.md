# Explorer — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 31 October 2026, Silver run (claude-opus-5-5)

**The image.** The TOSEC image is a freezer backup, not the release: one
file that unpacks the whole of memory and `RTI`s into the running game at
`$08F7`. The release's loader survived at `$C400` and jumps to `$0803`;
the frozen stack holds the chain from `$0806`, which confirmed it. The
listing's snapshot is the backup's memory with PC at `$0803`. Triad's
crack of the same release agrees on every byte of the code.

**The emulator.** A snapshot saved as `entry` would not load by that name,
because VICE's own snapshot folder already held one called `entry`; a
copy under another name loaded by its full path. `frames()` refuses while
the emulator runs, so screenshots were taken with sleeps instead. Keys
pressed during the opening fly-over steer it, and the game lands by
itself at its end, which made the first try at U look broken.

**The annotation** went from the entry outwards, then the drawing code,
then the data. The pictures were first described from a renderer written
for the run, which painted cells with the attribute `$28` (keep the colour
already there) white; eight descriptions said white stones or pale trunks
that the game never draws. The checker caught one, and drawing every
picture with the game's own `draw_image` on the kit's 6502 corrected the
rest. Other comments corrected along the way: the carry convention of
the subtract helpers, the compass formula, what `divide_8` divides, the
fragments' numbering (from 1, as the game shows them), where fragment 1
is placed (from the start of the opening pass, not its end), the
destination hash, and the scenery's random numbers (seeded from the
ground's height, so every place looks the same at every visit).

**The sample** was drawn with seed 20261031 after the last edit, then read
before the checker had it, and two drawn comments (fragments numbered
from 0) were corrected in that gap. They are counted as wrong: 8 of 60.

**Live checks for Discoveries.** Doorway trips to CSBBII and RMOYFV landed
where the page's copy of the sums says, one cell from fragments 9 and 2,
and one step found each (the score went to 1 and "Found:" showed the
digit). A fragment counts as seen only when it is within 8 units of the
explorer's own cell, not a neighbouring one: standing one cell south of
fragment 9 left the score at 0. Three new games started with no keys
pressed put fragment 1 at 1,296 south and 144 or 160 east of the landing.
The sonar said 249 for a fragment at a true 201.

**A number with nothing behind it.** The page and `facts.md` said a
doorway is about one cell in 154, nearly all in jungle. Measured with the
game's own `terrain_at` on 150,000 cells it is one in 255, and a third are
on open ground; the terrain shares were measured again on 400,000 cells
at the same time.

**No Maps / levels tab**: the game is one planet worked out from a formula,
with no levels; the walk widget on How it works draws any part of it.
