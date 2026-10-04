# Publication history

30 September 2026: contributor authorized publication directly from the existing exhaustive disassembly, online research, and a separate PR for each game. Imported annotations without claiming a new reverse-engineering run. Measured the repository’s own prose coverage and retained Bronze pending completion and maintainer review.

30 September 2026: reviewer correction booted disk from hard reset into THE BATHROOM with trainers disabled, compared title/play, rebuilt canonical symbols/listing and held the article at Bronze pending verification. Shared tooling moved to #125.

1 October 2026: resumed coverage, described all room and sprite records, corrected operand-label addresses and misplaced post-row descriptions, and removed duplicate follow-on annotations. Tracked coverage reached 100%; hidden I/O RAM and loader hand-over remain open, so this is not a Silver completion.

The retained `$D000` bootstrap was checked by controlled execution: it relocates a descending-page room-copy loop, rather than being arbitrary residue. Native room-copy checks passed all 60 ids and rope staging passed all 34 positions. Initial comparison against an older saved room image failed because an animated glyph had changed; comparison against each live source immediately before copying passed. Misplaced screen-page prose and color-RAM/template aliases were corrected in the exported listing. Two new trainer/decompression attempts did not reach a healthy title; they are not evidence of absent RAM accesses.

The complete title-music native tick loop agreed with independently decoded stream boundaries. The packed terrain renderer matched screen codes and color nibbles for all 60 rooms. The restored browsers matched independent pixels for all 60 terrain and 34 rope views; their controls worked. One full captured frame matched every emulator pixel.

The copyright checker passed a positive code, each wrong digit and an incomplete entry. RESTORE entered the title through the retained cartridge header. The initial reset test did not run: despite run_after=true, this MCP call needed a separate execution_run. A positive breakpoint at KERNAL reset entry then established that reset clears DDR before reaching the same restart stub; the jump fetched BASIC ROM rather than the RAM title. No claim of a missing reset path rests on the initial zero checkpoint count.

The native cold trajectory established a correction to phase attribution: it entered $3C23 with port $37, without executing $D002 or $0334. Those retained copy routines remain valid in controlled execution. The real decoder at $0100 reads a BA-marked RLE stream; an independent decoder reproduced all 63,511 output bytes. A checkpoint at $0100 and final store checkpoints distinguished packed relocation from final unpacking. The unclocked interval between the copyright check and the following verification session included the first phase-trajectory investigation; no time is reconstructed for it.

All item records and BCD boundaries passed controlled native collection calls. An initial natural-jump expectation that the player would return to the starting bathroom floor was wrong: room geometry changed the state at jump index 33. The replay with an input-only fire pulse still matched every unobstructed table step and rose 20 pixels; the no-input control stayed grounded. A death fixture initially guessed the checkpoint field order and failed; the fixture was corrected from the actual symbol addresses and all six counter cases then passed. Maria checks showed that suppressing its updates does not clear an existing enable bit. Two retained copier clones matched full 8 KB outputs; in-place safety is explicitly not claimed.


## 1 October 2026 — annotation review correction

Corrected 121 inherited comments whose text had been attached to the following row. Matched each moved text to its original Ghidra address, restored missing original descriptions where no newer annotation existed, and retained independently tested replacement claims. The Commodware review exposed the import error; byte data and code boundaries are unchanged.

## Review corrections, 3 October 2026

Corrected $0D6F from skipping byte-1 spaces to rejecting them via the
editor error path; $0BC5 is the actual skipper. Corrected the title's
fire condition: it requires a held key, while Return starts directly.
Described the 612-byte rope directory/trajectory span at $1858 and the
seven mask-table bytes at $2233. The former 100% metadata overstated the
99.0% measured ledger; the corrected descriptions now reproduce 100%.
Reran verification against the published code and a fresh private
headless/dummy-sound gameplay snapshot. Re-export preserved the previous
auto symbols as well as the edited user annotations. Remaining loaded
gaps and mechanics stay open; tier remains Bronze pending a fresh
maintainer check.
