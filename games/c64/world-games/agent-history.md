# World Games — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 30 October 2026, one run, claude-opus-5-5

**Set-up.** The disassembler's install failed first: `cargo install`
without `--locked` took newer dependencies and regenerator2000 0.9.20
stopped compiling (`error[E0308]: mismatched types`). With `--locked` it
built; `kit/c64/INSTALL.md` now says so. VICE x64sc from the vice-mcp
release v3.14.0 booted both sides' G64s from the C64 Preservation
Project.

**Parts.** The game is a resident shell and eleven programs it loads over
it, so the run made twelve parts, the eleven with `--over shell`. Their
ranges came first from comparing memory before and after each load,
which dropped any page the load wrote with the bytes already there:
caber toss's `$6000`-`$60FF`, the shapes of pose `$34`, went missing
until a listing showed the pose with no shapes, and the page was added
to the part's ranges by hand. Renaming the shell's
symbols left the parts' listings with the old names; `check_listing.py`
said so, and `listing.py --relabel` fixed them.

**Annotation.** Nine copies of one music driver sit at nine addresses.
A matcher written for the run (`work/scripts/sigmatch.py`) carried the
title's names and comments to each copy and flagged every byte that
differed, and each flagged comment was read again against its own part.
Every part reached 100 %. Comments written from templates for sprite
shape blocks said "for poses X to Y", which reads as every pose in the
range; the sample found one that was wrong that way, and the shape
blocks were rewritten to list their poses.

**Verify.** The sample of 80 comments, by a fresh checker, found 8
wrong; all were corrected with every comment that said the same.

**Pages.** Every tune and anthem plays through the game's own drivers
on the page, held write for write to the listing by `test_music.js`.
The widgets' sums are blocks that `test_widgets.js` runs against the
game's routines. The weightlifting windows' directions were drawn the
wrong way round at first, from the low bits of the window byte read
backwards; the page was put right from the script data.

The weightlifting report from C64-Wiki of a crash at 865 kg was first
listed as open, on the reasoning that it took 128 good lifts. Reading
the weight choice again showed the stick stops only at exactly 225 kg,
so one good lift at 225 kg is enough, and the plates routine then
explained the crash: the last plate's offset wraps to +127 and the
column writer is entered on a `$F2`. VICE stopped there. The same
reading found the factors above 225 kg coming from code.

A first draft said weightlifting's collapse picks script 6 about seven
times in ten, from the code alone. The C64 reference says to work odds
from a table read with the chip running; one live table had 160 of 256
values above the limit, and the page now says that instead.

On the Maps tab the bull riding arena was drawn with the colours the
code sets for each band. The reference screenshot shows the top band
orange, where the code sets light blue behind it; a live screenshot
taken for the check shows light blue. Which frames show the other
colours was not looked into.

A credit on the title screen was first read as "Bob Maddwell"; an
enlargement reads MacDOWELL.
