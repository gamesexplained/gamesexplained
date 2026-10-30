# World Games — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "One kind deserves a special look: a state the code accepts but the programmer never meant anyone to reach": followed a player's report of a crash at 865 kg in weightlifting to the plates routine, proved a competition reaches the weight, saw the processor stop in VICE, and built the section around a weight slider.
- `c64-reference`: "Work odds out from a table read with the chip running, never from the code alone.": took "about seven times in ten" for weightlifting's collapse off the page and read the random table live instead (160 of 256 above the limit).
- `70-minisite`: "A widget that runs a mechanic is a claim too.": put every sum the pages compute in a block that `test_widgets.js` runs against the game's routine in the kit's simulator, 745,891 cases over eight routines.
- `60-verify`: "A test must contain cases that have to succeed.": made the final-heat test fail unless the game both kept and replaced a time, and the music test fail unless a note started.

## What was changed in the kit

- `kit/c64/INSTALL.md`: the disassembler's install command takes
  `--locked`, with the reason beside it. Without it cargo took newer
  dependencies and regenerator2000 0.9.20 failed to compile on 30
  October 2026 (`error[E0308]: mismatched types` in `src/main.rs`);
  with it the build finished. An install fix, so its reason is here.
- `kit/c64/tools.py`: the two hints that print the install command
  carry `--locked` too, to match.
- `kit/lessons/2026-10-30-world-games.md`: two lessons, on computed
  entries into unrolled code and on limits tested for equality.

## Candidates

- **A part's ranges taken from the bytes that changed lose pages.**
  `kit/skills/core/15-parts`, step 4, finds a load's ranges "by watching
  the load ... or by comparing the snapshots either side of it".
  Comparing snapshots finds only the bytes that changed, so a page the
  load writes with the bytes already there is left out, its bytes
  uncounted and unlisted, and the coverage figure still reads 100 %.
  Here caber toss's `$6000`-`$60FF`, the shapes of pose `$34`, went
  missing until a listing showed a pose with no shapes. The skill would
  say: take the ranges from the load's stores, or from the file's load
  address and length, never from a comparison alone.
- **Template comments that give a range of poses read as every pose in
  it.** Comments written by a script for sprite shape blocks said "for
  poses X to Y"; the sample found one block whose range included a pose
  that does not use it (sumo, `$A040`). The skill on templates would
  say: list the members, or say "among poses X to Y".

## What cost the most time

Carrying the music driver's names and comments to its nine copies at
nine addresses took a matcher written for the run; the script asked
for in #552 would have saved the most.

The rest, in order: the twelve parts' annotation itself (356,094
bytes), and working out each scrolling event's bands and colours for the
Maps tab, which no part's facts had recorded.

## Operating system and tools

Ubuntu 24.04.5 in a Claude cloud container, x86_64; VICE x64sc from the
vice-mcp release v3.14.0; regenerator2000 0.9.20 built with `--locked`
behind the container's proxy (`CARGO_HTTP_PROXY`, `CARGO_HTTP_CAINFO`);
Node 22.22.0; the pre-installed Chromium for `shoot.js`.

## Maintainer asks

- #552: this run's case added as a comment: nine copies of one music driver carried across parts.
