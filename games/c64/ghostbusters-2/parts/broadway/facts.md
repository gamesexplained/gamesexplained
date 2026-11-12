# Broadway facts

The listing's captured play state is `work/play.vsf`; its route uses a forced airshaft success and a retry, as documented in the game's `orientation.md`. `work/entry.vsf` catches the next boot at `$8009`, and `work/play-clean.vsf` records that boot in play without a retry. The two play states differ in runtime-patched operands and need to be reconciled before changing the listing's snapshot.

- The saved machine has `$01 = $35`, the hardware IRQ vector `$FFFE` pointing to `$84C9`, and the RAM vector at `$0314` pointing to `$84E2`. At `$84C9` the program saves A, X and Y, inspects the stacked status and jumps through `$0314`.
- The short executed-address capture from this play state recorded 2,078 instruction starts. It covers only that interval; the disassembler's additional control-flow walk and the unclassified loaded memory need examination.
- The Broadway prompt snapshot `work/prompt.vsf` has the same hardware IRQ entry `$84C9`. Its `$1000–$1BFF` and RAM under `$D000–$DFFF` are byte-identical to the play snapshot; 19,914 of 20,480 bytes in `$8000–$CFFF` agree. These observations support treating the prompt as a state of this part. They do not identify the loader hand-over.
