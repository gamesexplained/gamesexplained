# Granny's Garden — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 14 October 2026, the first run (Silver)

The first BBC Micro game through the kit, and the kit's first BBC BASIC
game. The disc is the TOSEC copy on archive.org; the contributor chose
Silver and said yes to every question at the start.

**The kit could not read BASIC.** The BBC tools listed machine code and
ASCII text, and both programs on the disc are BASIC from end to end. The
run wrote `kit/bbc/basic.py`, a lister that takes BASIC II's keywords from
the ROM's own table, and held it to the machine: the server's `output`
now returns every byte sent through the write vector, so BASIC's own
`LIST` could be compared with the lister line for line (every line of
both programs agreed). regenerator2000 has no BASIC type, so a program is
typed as the C64's screencode text, which means nothing on the BBC, and
the export calls it BASIC. Coverage first counted only the program's
labelled lines and cut a line in two where it crossed a fixed edge of the
memory map; `ledger.py` and `coverage.py` now treat a BASIC block as they
treat code.

**CHAIN cannot finish Part 1.** Played as the disc runs it, from PAGE
&1900, Part 1 stopped with `No room` at the pond, and `ON ERROR` does not
catch it. The program's first line is a REM over a relocation test that
a run of the program had already disabled, so the analysis runs each part
where its own relocation puts it, at &0E00 (`LOAD`, then `GOTO3280` or
`GOTO2590`), and the page reports the failure as a bug of this disc.

**The restarts.** Both parts restart without a message after long
wandering. Counting BASIC's REPEAT and GOSUB levels (&24 and &25) at each
wait showed why: the rooms call each other and never return, BASIC II
allows 20 REPEATs and 26 GOSUBs (measured in a bare machine), and both
programs begin `ON ERROR RUN`.

**Driving the game.** Each wait is in the MOS's OSRDCH loop at &E581, and
BASIC's text pointer says which line is waiting; `work/scripts/play.py`
answers a route from that, and the routes for the bugs (the bee in the
wood, the lake's name, the castle left, the giant answered twice) were
all played to their ends. `m.type("\x7f")` does not press DELETE; the key
has to be pressed and released with `m.key("DELETE")`.

**Sound.** The tunes were recorded at the chip and decoded. Two things
the code does not show came out of it, and both were then measured with
short programs in a bare machine: the theme's top part is flushed and
runs ahead, and the kingdom's tune's top part waits for a partner and
never plays. The first decoding counted a note's half-written tone (the
low four bits written, the high six not yet) as a note of its own, and
the first resampling of the page's player averaged whole blocks and
played 5.6 % sharp; both were found by the player's test against jsbeeb's
own chip.

**Mode 7 on the page.** The site drew modes 0-6 only. `BBC.drawTeletext`
follows jsbeeb's teletext rules, and `frame.py test` now compares three
random screens with jsbeeb's at every cell. Its first run flagged
letters in double height whose ink missed the sample points; the rule
for letters was relaxed to the colours seen. One captured screen had been
scrolled by the CRTC, so the capture keeps the whole 1K and the start
address (`BBC.screen7`).

**The sample.** 10 of 60 comments were wrong in a detail (facts.md, "The
listing's error rate"): the rows a picture routine colours, visits taken
to happen once that happen until something is taken, what an IF without
THEN governs, and the sound and restarts before they were measured. Each
was settled against the code and corrected with the comments that said
the same.

**The page's draft.** The first draft of the page was written from notes
and carried claims the code contradicts: that the river is drawn as a
background (it is blocks on the snow's white), that `Yesf` and one
RETURN start the game (a full field turns RETURN into DELETE), that the
programs move themselves to &0E00 (on this disc they do not), and a guess
that the T answer was for teachers. Its line addresses came from a
listing of the program at &1900, not the committed listing at &0E00, so
five links landed on the wrong lines without any check failing, and the
trees' outlines were two columns off. A pass of every claim against the
code and the listing corrected them before the page was published. The
answer box and the dragons were then held to the game in jsbeeb, by
reading BASIC's variables after every key and before every throw.

## After the pull request was opened

**The Secret, the Solution and the Maps.** The contributor asked for the
T-then-Y trees to be headed as a Secret, and for a solution and maps. Both
tabs are drawn from one play-through, recorded in jsbeeb as the 1,000
bytes of screen at every wait for a key (`work/scripts/solution.py`).
`make_solution.py` stops if a question it lists is not on the screen where
its answer was typed, and the test beside the pages holds the answers and
every place and road to the recording.

**The listing withheld.** The contributor asked for the Source tab to say
the annotations are not published, since 4Mation still enforces its
copyright. `game.json`'s `publish_source: false` does it (`build.py`).

**The audit.** The contributor asked for a full audit, to learn what goes
wrong in annotating BBC BASIC. Two fresh checkers took a part each, one
after the other; Part 2's was told the kinds of error Part 1's had found.
16 of 98 and 25 of 91 were wrong in a detail, and every one held when
read against the program. Most were claims about what a line does when
it runs, written from what the line says: a flash code that a later PRINT
overwrites, codes said to go at the start of a row that go at the
cursor's column, an envelope redefined before each of five notes that are
all queued before the first has finished, `*FX15,0` taken to empty only
the keyboard's buffer, fragments matched by INSTR that miss because the
input routine has made the first letter a capital. Part 1's audit had
itself corrected the Witch's sound to a reading of the code; Part 2's
checker recorded it and found that reading wrong too, so the Part 1
comment was corrected again. The first sample's brief had listed its 60
comments under "What is established"; the second sample's brief gives
only the file.

**The second sample.** 4 of 60 wrong, and every one was in a comment the
audit had rewritten: 4 of the 15 rewritten comments the sample drew,
against none of the 45 it had left alone. Two of the four were details
the rewrite added (the raven's poses in order, a colour code before every
letter), one was a detail it added that held in one round of three (the
Witch's notes queued at once), and one was a detail the rewrite kept
(`You are at the` on every journey). A correction is written fast, from
the finding, and is checked by nobody unless something checks it.

