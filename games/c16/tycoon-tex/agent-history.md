# Tycoon Tex — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 21 October 2026: the Silver run

Aaron asked for a Silver run with every yes at the start: the web
lookup, the TOSEC tape, opening the pull request and filing the asks.
The game was claimed in the project's Discord with `ge-run`.

**Tools.** plus4emu built from git 939e652 with the kit's patch into
`tools/c16/`, and regenerator2000 0.9.20 built with cargo. Both answered
first time; `check-emulator` passed 46 of 46. One slip of my own: a
first boot script called the client's `call` with the wrong arguments,
which the client's `-h` would have shown.

**Orient.** The TOSEC tape is a raw C16 tape with a Novaload turbo
loader. An exec checkpoint on `$1800`, the game's first instruction,
gives the hand-over snapshot after about 92 seconds of machine time
(`orientation.md`). How control first reaches Novaload's stub in the
stack page was not traced: the loader is not the game, and the kit does
not annotate it.

**Features.** Plus/4 World's cover scans carry the inlay's instructions;
Home Computing Weekly 113 and Retro Gamer 113 reviewed it. Plus/4 World
also lists "Source files", a 93 KB zip added on 29 December 2020. I asked
Aaron on a decision card whether to download it as a check on the
finished listing. He had not answered by the end of the run, so it was
neither downloaded nor used, and everything here comes from the game's
own memory.

**Text.** The game's text is screen codes in the usual order, with its
own character set at `$3C00` keeping the letters in their places, and
the high-score table and the phone number are PETSCII. There was no
private alphabet to decode, so `30-text` had nothing to do.

**Sweep and annotation.** The program is `$1000`-`$3FFF`: the skyline's
and the pipe's 256 characters at `$1000`, the code, tables and text
from `$1800` to `$3BFF`, the play field's characters at `$3C00`. The code map from plus4emu covered
the menu, the demo and play. Every routine was read twice before the
first full pass of labels. Plus/4 World's cheats all landed on the
instructions they should, a check on the labels around them. Coverage
reached 100 %.

**Verify.** Live tests in plus4emu for the scenes and the enemy groups
(by poking `$9D` to end levels), the pace and drain at each difficulty,
the extra life, the pressure running out, the high-score shuffle and the
keyboard. A fresh agent checked 60 comments drawn with seed 20261021 and
found 7 wrong in a detail; all seven held up against the code, and five
more comments that repeated the same mistakes were corrected with them.

**The page engine.** `reference/tex.js` runs the game's five raster
interrupts on the kit's 6502. Wrong turns, each caught by comparing with
plus4emu:

- the joystick latch first read `$FD30`, the keyboard's register; the
  trace of running and jumping showed Tex ignoring the stick, and the
  latch now follows the value last written to `$FF08`;
- the pressure count gave 207 tones, not the 208 recorded: its default
  part cell was 6 where a full bar has 7;
- the trace through a fall into a break went apart at frame 124, where
  the pipe's random pieces differed; the trace test copies the live pipe
  rows in at `irq_field`'s entry, and every frame then matched;
- the first search for which breaks can be jumped started too late at
  the higher speeds and said nothing clears from speed 3 upwards; the
  search over every timing from 24 columns out showed the reverse, and
  plus4emu agreed at speeds 1 to 3 (`kit/lessons/2026-10-21-tycoon-tex.md`);
- the levels table said breaks have one middle before level 4 and up to
  two after, read from `build_break`'s `DEX` / `BPL` loop; the engine,
  given both random bits, built three, and the table now says one to two
  and one to three.

The frame rebuilt from memory in its five bands matched plus4emu's
screenshot at every one of its 64,000 pixels; drawn with one set of TED's
registers, 20,797 differ.

**Pages.** The Maps / levels tab shows the three scenes played by the
game's own demo (`demo_mode`). With enemies on, the demo's Tex died 70
times in 5,000 frames, because the bombs that the main loop moves never
come and the arrow and the jet do; with them off he fell five times, so
the tab runs without enemies and says so. A table cell given the class
`pick` took the site's stepper layout and broke the jump table until it
was renamed.

## 21 October 2026: the authors' source

After the run, Aaron answered the card: download Plus/4 World's "Source
files" and use them as a check only. His rule is that the source is a
way to learn where the kit's reverse engineering falls short, never an
input: the listing stays as the analysis made it, nothing from the zip
is committed, and hosting the source, or replacing our results with
it, is his decision for later.

The zip is a copy of the authors' C64 disk. A two-pass assembler for
its dialect (Commodore's CBM Resident Assembler: `.lib` chaining by
file name, `.byte`, `.word`, macros) rebuilt each part, which matched
the disk's objects and, but for three bytes, the game (`facts.md`, "The
authors' source"). The listing agreed with the source on code and data
in 9,177 of its 9,179 bytes, with a label at every address the code
refers to. Where it fell short: the colour table at `$36E3`, which it
calls unused bytes; `delay`'s first instruction at `$1920`, listed as
two data bytes; the BASIC link at `$1001`; and the joystick picture's
name. The comparison, the scripts and what they suggest for the kit are
in a document for Aaron, and the scripts in the project's shared files
(`tycoon-tex-source-check/`), not in this repository. A source-built
`symbols.json` went through `listing.py` with only two addresses
refused, each given two names by the source.

Aaron then asked for what the source shows of how the game was made to
go on the site, without anything about our own process or accuracy: a
section on the Source tab and a line in the page's opening. The build
had no place for a game's own section on that tab, so
`kit/scripts/build.py` now renders `original-source.md` there, as a
section above the listing with the id `original-source` (Aaron asked
for a plain section rather than a box that folds), and the How it works
page links to it twice. Plus/4 World does not say who gave it the zip; Games That
Weren't says Anthony Clarke donated his source files to Mark Hardisty,
and his own comments there (June 2016) describe assembling on a C64 and
sending the code to the C16, which the disk bears out.
