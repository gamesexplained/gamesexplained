# Popeye — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "Read every comment it marks wrong or doubtful against the code yourself": I traced all eight findings before counting them, and the checker's note on TRS inside subroutines led to the disassembler fix.
- `50-coverage`: "A description belongs to a routine, not to every branch target inside it": I put one comment on each helper's entry instead of a label at every TR target on pages $11-$13.
- `70-minisite`: "Start each case where the game starts it": the page's recorded frame first failed its test because I had taken the cells mid-drawing; the test now takes them where the game finishes a picture.

## What was changed in the kit

- `kit/cpu/sm5a.py`: a TRS on page $10 is shown as the jump within pages $10-$13 that it is, since the call table runs only inside a subroutine (the checker found every such target wrong in the listing).
- `kit/skills/gnw/gnw-reference/SKILL.md`: "Jumps and calls" says which TRS the listing still cannot resolve; "Mistakes that bite" gains the skip helper read the wrong way round (`kit/lessons/2026-11-09-popeye.md`).
- `kit/skills/gnw/steps/SKILL.md`: the references row adds a recorded cross-reference on the model; the sound and frame rows name the way this run tested both.
- `kit/gnw/lockstep.js` (new): the platform's lockstep, a port beside the game's program on the kit's SM5A, compared on memory and cycles at each checkpoint, with pokes into both for states play seldom reaches; the steps skill's `lockstep` row names it (`kit/lessons/2026-11-09-popeye.md`).
- `site/lib/buzzer.js` (new): a one-pin buzzer played live from the chip's pin edges, half a second at most waiting, for any Game & Watch Play tab: the site had no sound model for this machine.
- `kit/lessons/2026-11-09-popeye.md`: the run's entry.

## Candidates

- **A skip helper named the wrong way round.** Four `TM`/`RTNS`/`RTN` helpers were named "skip if set" and every reading on them was inverted, the main loop included, until a traced pass contradicted a name. It went into `gnw-reference` as a machine fact; a core rule ("run a helper once each way before naming it") would need a second game where it mattered.

## Maintainer asks

- **Decide whether a Game & Watch page may carry the unit's LCD outlines from MAME's SVG.** Popeye's three pages embed the 72 segments' outlines, taken from MAME's `gnw_popeye.svg` (part of the ROM set, traced from the LCD), scaled and rounded, about 86 KB a page; the listing carries the program. Together they are close to the whole ROM set. The NES precedent kept the CHR on the analysis pages and drew made-up pictures for the Play tab. If the outlines should not be published, the pages need drawn stand-ins (`site/lib/gnw.js` takes any SVG with titled shapes).

## What cost the most time

A cross-reference of every cell's readers and writers, recorded on the model, would have saved the most: the kit should ship it as a script for this platform (`kit/gnw/`), as the steps skill now describes.

## Systems

macOS 27.0.1 on an Apple M4 Mac mini, Node 24.18.0, Python 3.9.6, Google Chrome 157 for the reference pictures and page checks.
