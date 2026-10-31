# The Fourth Protocol — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 29-30 October 2026: the Silver run (claude-opus-5-5, one agent)

**Start.** The image came from the C64 Preservation Project's G64
collection on archive.org, the Bantam release marked good. VICE v3.14.0
and regenerator2000 0.9.20 went into `tools/`. The disk boots with
`LOAD"*",8,1` and `RUN`, runs its protection check (`XXXCOPY`), shows
the title with its tune and asks for an episode. The manual and the
official hint book (Century Communications, 1986) were read for
`features.md` before any code; the hint book is a contributor's
reference only and stays out of the repository and the pages.

**Parts.** The game is three programs and a shared operating system, so
it became five parts: `resident` (the OS at `$EB00`-`$FFFF` and the
episode loader at `$0800`), `title`, and one for each episode. Each
episode was snapshotted at its hand-over, where the loader jumps to it.
Episode three turned out to keep the OS in memory without using it, so
its part lies over `resident`. That cost labels: where episode three
reuses the OS's RAM for its own line buffer and screen (`$0200`,
`$0400`), `symbols_export.py` keeps the OS's names and drops episode
three's (#638).

**Tracing.** A flow disassembler stalls on all three episodes. The OS
takes inline arguments after the call for ten of its functions, and the
number of bytes depends on the function number in A at the call
(`os_inline_args`), so a tracer had to read the `LDA #` before each
`JSR $EC00`. The episodes add dispatch tables of three kinds:
self-modified `JMP`s (the tune player, episode one's menus), tables of
addresses pushed for an `RTS` (episode three's parser and room events),
and tables read through zero page. A small tracer in `work/s/trace.py`,
seeded per episode with its tables (`ep1trace.py`, `ep2trace.py`,
`ep3trace.py`), found the code; the rest of each file was typed as data
and described.

**Text.** Episode one's memos looked compressed. The four-bit codes are
read low nibble first; the first decoder read the high nibble first and
produced near-English, which is what gave it away. Episode two uses the
same scheme with its own dictionary. Episode three, by another
programmer, stores plain capitals.

**Annotation.** Every part reached 100 % of the ledger. Two kinds of gap
took the most care: comments that repeated another block's (the ledger
counts a repeat as bare), and the stretches after inline arguments. A
decoder wrote the comments of the 249 location records, the event lists
and the presence texts from templates; these were the 1,345 template
comments the sample drew from separately.

**Verify.** Live tests in VICE settled the taxi to BOMB, SVETOFOR on the
telephone (the processor halts on a `$D2` byte), the £200 that wraps to
£4, the notice board's article, the defusing and both explosion
epilogues, CUT BOX and PUSH ALL. A fresh agent checked a sample of 80
comments (seed 20261030): 8 were wrong. The worst belief behind them was
the CIA's time-of-day clock read as binary seconds, where it counts in
BCD and, left in 60 Hz mode on a PAL machine, runs at five sixths of
real time; one wrong comment led to the same reading in many others, and
episode one's day clock was measured live against 1,000 frames. The
other wrong comments were details (a caller missed, a row miscounted, a
variable named that does not exist).

**Pages.** Cencom and episode three's room are drawn from recorded
frames (`kit/c64/frame.py`), 0 pixels different from VICE's own picture;
the room's text window shows the character ROM, so the page carries only
the glyphs it shows as `rom_excerpt`. Every widget has a test beside the
page that runs the game's own routine. The Building 17 test first failed
because the port modelled `random` as setting Z from the number it
returns; running the real `random` showed the game's `BNE` never falls
through, so memo 31 is unreachable, which the emulator confirmed with the
generator seeded to give 0. The listing, the facts and the Discoveries
tab were corrected. The OS's dead functions were first counted as 24;
function `$03` reaches `$FC00` too, through `draw_to_second_bitmap`, so
there are 25.

The Maps tab draws each of episode two's places by printing its two
names into the office frame as `show_location` does; the test runs the
game's printing for all 249 and compares the bitmap. The ID card's photo
was first drawn a cell in from the picture's corner, as icons in framed
windows are; the game's own routine put it at the corner, and the page
follows it. The estate's 52 streets turned out to lie on a grid, so the
page draws them as a map with the Geiger readings.

**Episode tabs and the story-lines (31 October 2026).** The maintainer
asked how episode one plays out and for a tab per episode. The pages
became Episode 1 (`index.html`), Episode 2 (`the-bomb.html`) and
Episode 3 (`sas-assault.html`); the Maps tab went into Episode 2, its
Building 17 plans into Episode 1, and `game.json`'s `redirects` keep the
old addresses. The story-lines section was written from `init_stories`
and the routine each memo, report, sitrep and call runs. `test_story.js`
runs all 99 of those routines over the listing with answers given, and
holds every effect the page shows to them. Checking the draft against
the code corrected it in places: the earliest day Plumb can be answered
is day 30, not 29; the sergeant's first name is Torsen; the exercise
books in Storuman are Holmar's; and memo 8's papers point to three of
the watchable names rather than being the only clue. The Stop button
on the title tune had stopped only the page's timer while the player's
sound went on; `test_music.js` holds Stop to the title's own SPACE.

**Left open.** Which word episode one's five-number password spells (the
one-time pads are not in the program), what `XXXCOPY` checks, and what
the disk's 43 sectors that no file holds contain beyond the boot's second
stage and the episode loader.
