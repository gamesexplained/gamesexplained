# Agent history

How the understanding developed.

- The disk was unpacked with `kit/c64/disk.py`; the one program is BASIC, so the disassembler had nothing to disassemble. The program was detokenised to text and read line by line.
- The game was driven through VICE with PETSCII key bytes, because the typed-line input path ignores `vice_keyboard_type`'s carriage return. A published walkthrough was replayed (225 commands) and the game accepted all of them.
- Snapshots and screenshots were taken at each place and each special screen.
- The symbols and comments were written by script, one comment per group of lines, with the program declared as a BASIC block.
- The sample of 60 comments came back 43 % wrong in a detail. Several of the errors had also been made in the first draft of `facts.md` (which places are dark, what `H8` means, the title tune's note count) and were corrected there too, found by the checker or while rewriting the pages.
- The tempo of the title tune was measured in the emulator: 2,000 passes of an empty loop took 124 ticks of the 50 Hz clock.
