# Summer Games II — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 17 November 2026, one run to Silver

The contributor gave ten disk images. The US Gold two-disk PAL set was
chosen because its directories list every module; the two Epyx sets keep
the modules outside the directory, where `disk.py` cannot read them, and
the US Gold three-disk set stores them unpacked under other letters
(`orientation.md` says how each differs).

The run started on a model the kit does not list as proven. The
contributor switched it to a proven one before the coverage began, and
every step from orient on is recorded under that model.

**Parts.** The game is fourteen loads: the resident loader, the title,
the menu, two ceremonies, eight events and the first game's swimming
events. Each module unpacks through the resident loader and is entered
by the jump at `$0AF3`, so an execution checkpoint there, stepped once,
gave every part an entry snapshot. Swimming was the exception: it copies
`$6000-$7EAE` up to `$E000` before it runs and draws its pictures over
the source, so its listing is built from a snapshot taken during a relay
race instead.

**Coverage.** One agent annotated the parts in turn, small ones first.
A short script (static trace from the entry and the interrupt vectors,
seeded into the disassembler) found most of each part's code before any
reading. Fencing and Cycling took the longest: Fencing because its
bitmap is drawn cell by cell from tables, Cycling because its eleven
raster slots each move a different band of sprites.

**Live tests.** The clocks were the surprise. Rowing counts right on PAL,
but Cycling and Swimming count a tenth every six frames, as an NTSC
machine would want, and Kayaking reads CIA 2's time-of-day clock in its
60 Hz setting, so on a PAL machine all three run slow by a sixth. Each
was measured: 600 frames moved Cycling's and Swimming's clocks 10 s, and
989 frames moved Kayaking's 16.9 s.

**Sample.** Seed 2617 drew 70 comments; a checker that wrote none of
them found 7 wrong. Six were written comments about pictures and
positions: twenty Fencing comments called a bitmap cell "a row", two
Swimming comments misdescribed the pool picture, and two Cycling
comments named the wrong sprites. Each was corrected with the comments
that shared its belief. 10 % is over the mark, so a full audit is
recommended.

**Minisite.** The pages follow the contributor's story-first layout.
The Music tab plays all 35 tunes through each part's own code, held to
the game by `test_music.js` (3,000 frames of SID writes per tune). The
Graphics tab unpacks Triple Jump's, High Jump's and Equestrian's packed
frames with a port of the game's own unpacker, held by
`test_graphics.js`, and found 24 unused High Jump shapes at
`$AB00-$B0FF`. The kayak river on the Maps tab is drawn from its map at
`$8FD8` with each gate from the course tables.

Two things were caught only by looking at the rendered pages: the sprite
sheets' labels came out in the last sprite's colour, and Fencing's pieces
drew black on grey. A pass over every source link on every page checked
each against its listing's labels.

**Reader review.** An agent on the same proven model, which wrote none
of the pages, read the built site at two widths against the notes
(`work/reports/reader-review.md`). It found four errors: the Overview
said the slow clocks time a race slower when they time it shorter; the
river's gate labels sat a screen above the game's own flags, because
`gate_y` is 15 rows above them on the map; two pages disagreed about
Javelin's sound table; and Gameplay left show jumping's fire button open
when `st_ride` settles it. All four were fixed: the labels now find each
gate's flags on the map, and Gameplay has a table of the fence codes read
from `st_ride`. It also found the tune lengths of Javelin and show
jumping's start swapped, which a re-measure confirmed.

Most of its weaker points were taken up: the High Jump calculator draws
the take-off zone and starts on a bar only the middle clears, show
jumping's fast clock joined Discoveries, the gallop got a pace slider,
the sprite sheets wrap to the page, and several Discoveries sections were
split or rewritten. Left, with reasons in `TODO.md`: composite frames,
frames labelled by phase, flags on the anthem buttons, the two unused
tunes, and a few consequences not yet worked out.
