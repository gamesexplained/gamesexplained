# Zork I — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 19 October 2026, the first run (Silver)

The contributor asked for Silver, with the game looked up online. The
image is the A Woz A Day copy of release 15 (`orientation.md`), the first
Apple II game taken through the kit.

**Tools.** The kit's Apple2TS server passed check-emulator 42 of 42 at the
start. While the session waited for the contributor's answers, about 45
minutes, the server stopped: the next call found nothing on port 6502.
`python3 kit/scripts/tools.py apple2ts` started it again, and its log,
started afresh, kept nothing of why. Nothing was lost, since the boot had
been saved. A run that pauses for answers should check the server is up
before it carries on.

**Orient.** The boot is DOS 3.3's boot sector, then a second stage at
$2300 that reads tracks 1 and 2 to $0800 with D5 AA BC data fields. Three
snapshots: the hand-over at $0800 (`entry.json`), the Z-machine's first
instruction at $09AB (`zstart.json`) and the prompt at West of House.
The listing is built from `zstart.json`, where the page buffers are still
empty, so the listing holds no pages that the first turn happened to
read.

**Sources.** The INTERLOGIC reference card, the 1980 PDP-11 manual and
the 1983 manual, Wikipedia and 4am's crack notes went into
`features.md`. Two descriptions of the interpreter turned up: Eric
Smith's partial disassembly (a2zip, which builds this exact interpreter
as `iver2`) and Infocom's own early ZIP source. Only their first lines
and the reconstruction's zero-page layout were read, as a guess about
purpose. `40-sweep` ("A documented version on another machine") says to
map such a source onto the image first; it speaks of another machine,
and the run did not think of it for the same one. Mapping would have
placed most of the interpreter at once. Reading the 26 pages by hand took
about half an hour, so little was lost, but the next Infocom game should
map it.

**Annotate.** The interpreter was read routine by routine and annotated
in four files (zero page, the core, input and output, the disk routines),
applied with `kit/apple2/r2000.py --apply`. Code maps recorded over saves,
restores, SCRIPT, MORE, a fight, a death and RESTART found the code
paths the static trace missed. The story's resident part ($2C00-$73FF)
holds no 6502 code and nothing in the interpreter names its addresses,
so the ledger did not count it at first. A scratch Z-machine decoder
(header, abbreviations, objects, properties, dictionary, grammar tables,
Z-code) wrote 597 comments for it from templates, and `coverage.extra`
brought it into the count: 100 % of 27,048 bytes. The rest of the story,
62 KB of routines and strings read from the disk a page at a time, is
in no snapshot whole, and the listing and the coverage figure leave it
out. That is the run's first ask for a maintainer.

**Verify.** Live tests turned up the run's best finding by accident.
Lines of commas meant to fill the parse buffer showed that the story
allows 120 words in a buffer with room for 59, and the 60th word writes
the text buffer's size down to 1: every later line is read as one letter.
The trophy case's routine was read for the score table and turned out to
drop a container's total. The arithmetic handlers were run on chosen
operands in the emulator, which showed the divide's sign bug, and those
17 results became the Discoveries calculator's test.

The sample drew 60 hand-written comments and 20 of the decoder's, seed
20261019, for a fresh agent on the same model that had written none of
them. It found 7 wrong, all hand-written, each a list or a condition
stated too narrowly (`facts.md`, "The listing's error rate"). All were
corrected, with three more comments that said the same.

**Pages.** The Apple II library had no listing loader, so the run added
`Apple2.load` and `Apple2.text` to `site/lib/apple2.js`, with
`kit/apple2/test_text.py`. The parser widget ports the interpreter's line
copy, word split, encoder and dictionary search, and `test_zork.js`
runs the interpreter's own routines beside each port on the listing's
bytes. Three mistakes in the first draft of the copy were caught by
checking it against the code: the shift codes in the encoding paragraph,
the share of buffers in use after eleven moves (56 of 76), and the
greeting counted by global 81, which is `hello sailor`, not `hello` to
nobody (checked live). The fatal error's text was first described with
bit 7 set; the bytes are plain ASCII.

**Last checks.** The grue, an exit that does not lead back, THEN and ALL
were checked live while finishing `features.md`. Writing global 30 by
hand opened the way to the Stone Barrow, and walking in gave the ending
with a score of 0 (`cheats.md`).
