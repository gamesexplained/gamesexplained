# R-Type — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "draw about 20 from it": the 2,076 template comments were sampled as their own stratum; 2 of 20 were wrong, and the pattern behind them (labels claiming a reference nothing makes) led to 43 more being removed across the stages.
- `70-minisite`: "is required, with a button for every tune the game stores, unused": the Music tab plays all 35 tunes, including the ending's two that the game never asks for.

## What was changed in the kit

Nothing. The run's time went into the game; the four traps below are
written up as candidates for the next run that meets them.

## Candidates

- **A weapon reached only through a split lo/hi table was called dead.**
  The blue crystal's launcher (`$42FA`) has no `JSR` or `JMP` naming it:
  `collect` copies its address from `weapon_lo`/`weapon_hi` into the
  operand of a `JSR`. The first pass commented it "never launched", and
  the facts said the reflecting laser was missing from the C64 version.
  It was caught while writing the Gameplay tab, by listing what each
  table entry points at. A line in `50-coverage` would say: before calling
  code unreached, check every split lo/hi table for its address, and
  every self-modified operand.
- **Interleaved pointer tables typed as split ones invent labels.** In the
  music data, tables of 16-bit addresses (low, high, low, high) were typed
  as regenerator2000's Lo/Hi Address, which reads them as two halves, so
  the disassembler made up targets and labels inside the data, and
  template comments then described those labels. Retyping as plain
  addresses removed them. `tool-regen2000` would say which type is which,
  with an example of each layout.
- **Exporting a part whose annotations live in another part's session.**
  Stage 1 was annotated in the game part's session; exporting it without
  `--from` read an empty project and nearly overwrote the symbols. The
  `--from` flag exists but `15-parts` does not mention it.
- **Copied beliefs.** Each stage carries the same music driver; a misread
  of two of its variables was copied into all nine parts. The sample found
  it once, and the fix had to be made nine times. A shared-code note in
  `15-parts` would say: annotate the copy once, compare the bytes, and
  carry comments over by script, so a correction is also made once.

## Maintainer asks

- **Say in `15-parts` when `symbols_export.py --from` is needed.** A part annotated inside another part's disassembler session exports as empty without it; one line in the skill's export step would prevent it.

## What cost the most time

Rendering the eight stage maps: each stage switches character sets in its
own way (a flipped set below a raster line, a second set after a column,
a separate battleship map); a map renderer in the kit that took the set
switches as a table would have saved the most.
