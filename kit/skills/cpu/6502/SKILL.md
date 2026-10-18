---
name: 6502
description: The 6502's own forms of what the core skills describe in general terms - a routine that takes its arguments from the bytes after its call, an "on n go to" table that never comes back, the carry around a call, and the undocumented opcodes. For every machine built on the NMOS 6502, the C64 and the BBC Micro among them.
---

# The 6502's idioms

`50-coverage` describes these in general terms, because each processor
has its own form of them. These are the 6502's. The tools that decode
the processor for every machine built on it are in `kit/cpu/`: the
opcode table (`m6502.py`), the undocumented opcodes and the references
search (`opcodes.py`), the register census (`census.py`) and the
simulator (`cpu6502.js`).

## A routine that takes its arguments from after the call

`JSR` pushes the address of its own last byte, so the routine finds its
argument from one byte past what it pulls off the stack:

```
    pla / sta ptr / pla / sta ptr+1     ; the return address: the call's own last byte
    ldy #1 / lda (ptr),y / ...          ; the argument, from one byte on
    ldy #2 / lda (ptr),y / ...
    ... ptr + 3 ... / jmp (ptr)         ; resume after the argument
```

It may resume instead by pushing the argument's last byte and executing
`RTS`, which adds one.

Look for the `PLA` pair near a routine's entry, and for a family of
wrappers built on one or two such routines, each eating its own number
of bytes (`50-coverage`, "Inline parameters").

## An "on n go to" that never comes back

The routine pulls its return address, picks the n-th word of the table
that follows the call, pushes it and executes `RTS`. `RTS` adds one to
what it pulls, so each word is a handler's address **minus one**: the
target of a word is the word + 1. A table's first word that is not code
at word + 1 is where the table ends.

## The carry around a call

`ADC` and `SBC` always take the carry in. An `ADC` or `SBC` straight
after a `JSR` with no `CLC` or `SEC` between adds or subtracts whatever
carry the routine returns, on each of its exits.

## Undocumented opcodes

The NMOS 6502 runs 105 undocumented opcodes besides its 151 documented
ones, and a disassembler that knows only the documented set shows them
as data. `kit/cpu/opcodes.py` decodes all 256 and lists those inside the
code; `kit/cpu/cpu6502.js` runs them. The C64's reference has what games
do with them and the unstable ones' constants (`c64-reference`,
"Undocumented opcodes").
