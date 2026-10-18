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
