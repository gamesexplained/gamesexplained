## 0.0.27 · 26 September 2026 · The Sentinel and Mercenary, the retrospectives' ask · air with Claude

**Test a port on the machine, not on flat RAM.** Four runs (Master of
Magic, Wizball, The Sentinel, Mercenary) each wrote a 6502 simulator to
check their ports against the game's own code, and each took its own
game's shape for the machine's: every byte RAM, the chips always there,
the game's stack pointer, no interrupt. A routine that reads `$01`, a chip
or a ROM ran on bytes the processor never sees there, and nothing said so.
The kit's simulator, `kit/c64/cpu6502.js`, now banks as the port says and
hands the chips to the test: a music driver's writes arrive in order, a
read-modify-write's two writes included. A read of a chip the test does
not answer stops the run, and so does a call into ROM unless a hook
stands in for the routine. It runs the undocumented opcodes with VICE's
constants, counts cycles, runs the game's interrupt (through the KERNAL's
own path when the game hooks it), and marks the instructions a test
reached. `70-minisite` points at it, and the platform reference now says
how the port reads back.

**Check the checker against the emulator.** The simulator passed Tom
Harte's 2,560,000 single-instruction cases for the NMOS 6502, then ran the
same programs as VICE from the same snapshots: all of RAM, the registers
and 947,467 cycles agreed. The published cases take `$EE` for ANE's
unstable constant, where VICE takes `$EF`; only the comparison with the
emulator the rest of the work uses could settle which a game meets.
`kit/c64/check_cpu6502.js` repeats both checks, and CI runs the
simulator's self-test.
