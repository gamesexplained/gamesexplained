# First load — facts

The title checks fire at $26CC. New-game initialization at $8000 stores five lives at $020C. Interrupt setup at $AF0F installs IRQ $AAF0 and NMI $A973. The score renderer at $FC43 writes two characters from the two nibbles of A; it passed all 256 input-byte cases in the kit's simulator.

The six title text rows at $2791–$2832 contain 27 characters each. Their starts and contents were checked against the title's copy loop. The generated comments preserve the exact rows, including spaces.

This part's listing uses `work/entry.vsf`; the play image is `work/play-round1.vsf`. The symbol map and listing are exported from the live disassembler. These are Bronze findings with author review only. The full census and unresolved bank ownership are recorded in the game-level facts.md and orientation.md.
