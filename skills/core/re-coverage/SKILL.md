---
name: re-coverage
description: The annotation loop. Measure comprehension with the shared coverage metric, work the burn-down queue of largest undescribed runs, export symbols.json after every session. Includes how to split the work across subagents safely.
---

# Measure comprehension, not disassembly

Disassembly coverage flatters you. Bytes can be decoded, labelled, even
commented nearby, and still understood by nobody. The shared metric
(`kit/scripts/coverage.py`) counts a byte as explained only when the
symbol that owns it carries a prose description. Every game is scored the
same way, so tiers mean the same thing everywhere.

## The loop

1. `python3 kit/scripts/coverage.py games/<platform>/<slug> --live`
   prints the figure and the work queue: the largest contiguous
   undescribed runs, largest first.
2. Take the top of the queue. Read the routine or table. Work out what it
   does in terms of the game (what the player sees, which feature in
   `features.md` it serves). Name it. Write a **line comment on its entry
   address** that describes the whole thing: purpose, inputs, outputs,
   side effects, which tables it reads.
3. Update `features.md` statuses and `facts.md` as facts firm up.
4. Every 30 minutes or so, and at the end of every session:
   `python3 kit/scripts/symbols_export.py games/<platform>/<slug>`.
5. Repeat until the tier you are aiming for is met.

## Rules that keep the number honest

- **A description belongs to a routine, not to every branch target inside
  it.** The disassembler mints an automatic label at each jump target;
  comment the entry, not each label.
- **A blank comment explains nothing.** Only non-blank line comments
  count.
- **Decide "routine" by the bytes, not the symbol type.** A renamed jump
  target that starts a routine is a routine.
- **False symbols exist.** The skip idiom (a two-byte or three-byte opcode
  used to skip the next instruction) makes the disassembler mint a symbol
  for an "address" that is really an operand. Explain it as such rather
  than inventing a meaning for the address.
- **Runtime state is excluded** from the denominator: stack, screen
  memory, I/O. Authored data nothing references by address (a character
  set, a packed string block) is **added** through the `coverage` object
  in `game.json`. Get these two lists right early; they decide what 100 %
  means for this game.
- **Never bulk-disassemble every labelled address** to "recover"
  coverage. Many labels sit on data; disassembling them misclassifies the
  bytes as code. Undo by setting the data type back to undefined.
- **Reading a region may disassemble it as a side effect** in some
  disassemblers. Log an explicit disassemble entry for every new code
  region you explore, or a replay under-restores.

**Reaching 100 % is a correctness pass, not a formality.** Writing a
precise description of every routine forces re-reading code that was
"already understood", and that is where confident wrong claims get
caught: names kept from a first hypothesis, table lengths read past their
end, a mechanic adopted from documentation instead of from the code.

## Splitting the work across subagents

Routines are independent, so the burn-down parallelises. What matters:

- **One shared disassembler.** Concurrent reads are safe; concurrent
  writes are safe only if agents own **disjoint address ranges**. Assign
  them explicitly and say so in each prompt.
- **One log per agent.** Parallel appends to one file interleave. Give
  each agent its own `work/annotations-<n>.jsonl`, merge afterwards.
- Agents read into neighbours' ranges for context; ranges prevent write
  collisions, not two agents naming the same thing. Catch that when
  merging.
- Brief them cold: the feature list, `facts.md` so far, the rules above,
  the exact client command, and "prefer unknown to a guess".
- Force the model explicitly. Spot-check one claim per agent against the
  source before believing the report.

## Outputs

`symbols.json` current; `facts.md` and `features.md` current; the coverage
figure and the remaining queue in `TODO.md`.
