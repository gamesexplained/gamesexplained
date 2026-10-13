## What goes wrong

The interpreter reads the next opcode before it stops in the debugger. So if you change PC at the prompt, the opcode from the old address runs, with its operands read from the new one. A change to the memory at PC with `writem` is missed the same way.

## How to see it

At the first stop, the RESET entry (`D9CD: LDA #$40`), put a NOP at `2000`, point PC at it, and step:

```
./beebjit -headless -debug -mode interp -commands "writem 2000 ea;eval pc=0x2000;s;r;q"
```

The step runs `LDA #` with its operand from `2001`, and PC ends up at `2002`. It should run the NOP and stop at `2001`.

inturbo and the JIT get this wrong too, when stopped in running code. inturbo runs the old opcode at the new PC, like the interpreter. The JIT carries on at the old PC. Both come back through `asm_debug`, which has a `# TODO: handle different 6502 PC!`.

## The fix, for the interpreter

Read the opcode again after the debugger returns, unless an interrupt is about to be taken. A pull request with this follows. It leaves inturbo and the JIT alone: they need changes to the x64 and ARM64 assembly, and we have no ARM64 machine to test on.
