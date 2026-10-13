Fixes #ISSUE.

The interpreter now reads the opcode again after the debugger returns. So a PC set at the prompt, or a `writem` to the memory at PC, takes effect at once. If an interrupt is about to be taken, the opcode stays the BRK of the interrupt sequence, as before.

This fixes the interpreter only. inturbo and the JIT still get it wrong when stopped in running code, as the issue describes. Both come back through `asm_debug`, which has a TODO for this, and changing that assembly needs testing on ARM64, which we can't do.

**Test:** "Checking debugger PC change." stops at the RESET entry, points PC at a NOP at `2000`, and steps once. PC must then be `2001`. `./build.sh` passes.
