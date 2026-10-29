# Darkman — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `10-orient`: "Map the disk's files onto memory": comparing each level file with the snapshot at its load address showed the files are stored unpacked and gave every part's ranges before any code was read.
- `10-orient`: "Autostart may leave the emulator in warp mode": the first start of play under warp ended in a game over within seconds; the play snapshot was taken again with warp off.
- `10-orient`: "shows only one of them in a vector read": the recorded frame named all four play interrupts ($1E21, $1EF4, $1D43, $1DBF), where the vector read named one.
- `20-features`: "A hosted session's network policy can refuse every page fetch": every page fetch was refused, so the features came from search summaries, marked second-hand.

## What was changed in the kit

None.

## 24 October 2026, Silver run

- A comment belief repeated across levels (a toggle that moves an index on every other call, said to move the frame too) was in ten comments; `60-verify`, "A wrong comment is usually one belief written down more than once", found them when searched for by their wording.
- `listing.py --recomment` is the way to put corrected comments into a listing built long before from a snapshot; building it again showed 4,023 bytes of uncounted data for level 2 that the earlier build had not listed.

## 29 October 2026, maintainer's check

- `kit/CHECKING.md` and `60-verify`'s `checker.md` ran the audit as written: 34 checkers, one at a time, each with the brief and the facts established so far.
- `60-verify`, "A wrong comment is usually one belief written down more than once": each checker's report named the kinds of error it found, and the next checkers' brief gained the facts behind them (twin drivers that differ, the bitmap panel, the shot type $11). Later chunks found those beliefs in their own ranges without being told which comments held them.
- With no snapshot on the machine, `listing.py --recomment` put each chunk's corrections into the listing. The checker's `fixes.json` went into `symbols.json` with a dozen lines of Python, since `kit/c64/r2000.py --apply` needs the disassembler and its project.

What cost the most time in the check: a brief that states a fact of one level as the engine's misleads the checkers of the others: level 2's colour-copy count was written as shared and was level 4's own. Facts given to a checker name the level they were checked in.

## Candidates

- The disassembler's `r2000_search_disassembly` returned exactly 50
  results for the register census regex, with no sign that it had
  stopped; the census table built from it lacked the sound chip and most
  of the video registers. Caught because the IRQ handler's `$D019` write
  was missing from it. A census made by decoding the code blocks
  (`opcodes.decode` over `r2000_get_blocks`) found 66 registers. `40-sweep`
  would say: when the census comes from a text search, check that the
  number of results is below the tool's cap, or decode the code blocks
  instead.

## Maintainer asks

- **Add a register census script to the C64 kit.** `40-sweep` asks for a hardware register census, and the obvious route, `r2000_search_disassembly`, silently stops at 50 results. On Darkman (13 October 2026, branch `game/c64/darkman`) a census from it missed every sound register; a twenty-line script over the code blocks with `opcodes.decode` found them. A `kit/c64/census.py <game or part dir>` printing register, mnemonic, count and first address would make the step mechanical and the same for every run.

## What cost the most time

A census script in the kit would have saved the most: the census had to be written by hand after the text search came back short.
