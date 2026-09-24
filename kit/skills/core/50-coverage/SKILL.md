---
name: 50-coverage
description: The annotation loop. Measure comprehension with the shared coverage metric, work the burn-down queue of largest undescribed runs, export symbols.json after every session. Includes how to split the work across subagents safely.
---

# Measure comprehension, not disassembly

Start the clock: `python3 kit/scripts/clock.py start 50-coverage --model <your model id> games/<platform>/<slug>`. The largest run to 19 September 2026: 24 KB to 100 % in about forty minutes of wall clock with nine agents on disjoint ranges. One agent is several times slower per kilobyte. Note the agent count when you stop the clock, and their model in the note if it differs from yours.

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
   side effects, which tables it reads. While it is in front of you, note
   anything it would accept that the player was never meant to do: an
   exact match where a range was meant, a comparison that assumes a sign,
   an eight-bit sum that can wrap, a test whose order leaves a gap. Put
   the note in `facts.md` as an open question; `60-verify` says how to
   settle it and `70-minisite` what to make of it.
3. Update `features.md` statuses and `facts.md` as facts firm up.
4. Every 30 minutes or so, and at the end of every session:
   `python3 kit/scripts/symbols_export.py games/<platform>/<slug>`, then
   `python3 kit/scripts/listing.py games/<platform>/<slug> work/<state>.vsf`
   so the committed listing never drifts from the symbols.
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
- **Resolve every pointer table before excluding a region.** A relocating
  init can leave a block that looks like a stale copy of somewhere else;
  one run excluded 8 KB as "the leftover of the copy at $3E00" and it held
  all 224 shape scripts, which the pointer tables at $9600/$9700 named
  byte for byte. Before a region goes in `exclude`, take every table the
  code indexes as an address (lo/hi pairs, split lo/hi tables) and check
  where its entries land. If any land in the region, it is data.
- **Runtime state is excluded** from the denominator: stack, screen
  memory, I/O. Authored data nothing references by address (a character
  set, a packed string block) is **added** through the `coverage` object
  in `game.json`. Get these two lists right early; they decide what 100 %
  means for this game.
- **A game can live under its I/O.** A game that banks the I/O chips out
  can run code and keep tables in the RAM beneath them, which the platform
  default excludes as I/O. Look for code in a register census of the traced
  code (instructions *located* in the I/O range) and for the bank switch
  around them; then give the range back with `coverage.include` in
  `game.json`. The disassembler will name those addresses after the chips'
  registers, so say in each comment which meaning is live.
- **Is the picture loaded or drawn?** Compare a snapshot taken before the
  game's first instruction (the loader's hand-over) with one in play. A
  screen or bitmap that is already there before the game runs is authored
  data, to be described; one the game builds is output, to be excluded.
- **Never bulk-disassemble every labelled address** to "recover"
  coverage. Many labels sit on data; disassembling them misclassifies the
  bytes as code. Undo by setting the data type back to undefined.
- **Reading a region may disassemble it as a side effect** in some
  disassemblers. Log an explicit disassemble entry for every new code
  region you explore, or a replay under-restores.
- **Know how far a description reaches.** In `kit/scripts/ledger.py` a
  symbol owns the bytes from itself to the next boundary symbol, capped at
  1024 bytes for code and for symbols you create yourself, and at 64 bytes
  for any other data symbol. Renaming a symbol the disassembler made keeps
  its type, and with it the 64-byte cap: create the label afresh, or add
  labels inside, when a renamed table is longer. Block boundaries cut a
  span too, and so do fixed edges at `$0100`, `$0200`, `$0400`, `$0800`,
  `$1000`, `$4000`, `$8000`, `$A000`, `$C000`, `$D000` and `$E000`: a
  routine or table that runs across one of them needs a second symbol
  there, with a comment saying where the whole starts. A data table
  of a few hundred bytes therefore needs a named symbol every 64 bytes or
  less, each with its own description, or most of it stays bare however
  well you have explained the whole.

## Inline parameters: the reason a flow disassembler stalls

When control-flow disassembly reaches a few thousand bytes and stops, and a
scan of every `jsr`/`jmp` target inside the code it did find turns up
nothing new, the rest is not all data. Look for a routine that pulls its
own return address off the stack:

```
    pla / sta ptr / pla / sta ptr+1     ; the return address
    ... read a word through (ptr) ...
    inc ptr / inc ptr                   ; step past it
    jmp (ptr)                           ; resume after the argument
```

A call to that routine is followed by an **argument**, not an instruction,
and the disassembler walks straight into it, decodes it as code and shifts
everything after it. Find every call site of every such routine, type the
argument bytes as data, and restart the disassembly at the resume point.
One pass of this can double the tracked image.

The same shape hides more than one routine: look for a family of wrappers
built on one or two stack-unwinding primitives, and check each for the
number of inline bytes it eats, which need not be the same.

### Inline jump tables that never come back

A variant has no resume point: an "on n go to". The routine pulls its
return address, picks the n-th word of the table that follows the call,
pushes it and executes `RTS`, so each word is a handler's address **minus
one** and control never returns to the call site. A state-machine game
can have a hundred such tables, one per behaviour, and flow tracing stalls
at every one of them.

- Find every call to the routine (and to each entry that loads n from a
  different place first) with a byte scan of the whole image, not just the
  traced code.
- The table's length is not stored. It ends where the next call site
  begins, at a handler that nearly every table ends with, or at the first
  word whose target (word + 1) is not code. When testing a target, accept
  a handler that itself opens with a call to the switch: its own table
  follows at once, so it will not decode as three clean instructions.
- Type each table as words, then disassemble every target. **Never
  disassemble a call site afterwards:** the tracer assumes the call
  returns, walks into the table again and turns it back into code.
- One of the tables may select the behaviour itself (a behaviour number
  indexing a long table of other call sites). Check its length against the
  values the variable takes live; a parse that stopped at the first odd
  entry can be a quarter of the real table.

**Reaching 100 % is a correctness pass, not a formality.** Writing a
precise description of every routine forces re-reading code that was
"already understood", and that is where confident wrong claims get
caught: names kept from a first hypothesis, table lengths read past their
end, a mechanic adopted from documentation instead of from the code.

macOS has no `timeout` command (`kit/INSTALL.md` says so, and this is
where the temptation to reach for it is strongest). A long live probe
needs a guard inside the script or a background run you poll.

## Splitting the work across subagents

Routines are independent, so the burn-down parallelises. What matters:

- **One shared disassembler.** Concurrent reads are safe; concurrent
  writes are safe only if agents own **disjoint address ranges**. Assign
  them explicitly and say so in each prompt.
- **One log per agent.** Parallel appends to one file interleave. Give
  each agent its own `work/annotations-<n>.jsonl`, merge afterwards.
- **One figure per agent.** `coverage.py <game> --live --range $2000 $27FF`
  prints the figure and the work queue for one agent's range alone; the
  whole-image queue is mostly other agents' work.
- Agents read into neighbours' ranges for context; ranges prevent write
  collisions, not two agents naming the same thing. Catch that when
  merging.
- Brief them cold: the feature list, `facts.md` so far, the rules above,
  the exact client command, and "prefer unknown to a guess".
- **A brief carries only what has been checked**: traced to the code or
  seen live. Anything else goes in as a hypothesis, labelled as one. An
  agent treats its brief as ground truth, so an unchecked guess there
  costs every agent that meets it the time to disprove it.
- Force the model explicitly. Spot-check one claim per agent against the
  source before believing the report.

## Declare what the bytes are

The About tab draws the game's footprint in the 64 KB space and counts
code, graphics, level data, sound, text, tables and variables. The build
classifies from the listing (code, text, data), the video bases in
`game.json` (the character set) and symbol-name hints (`str_`, `tune_`,
`sprite`, `maze`, and the like). Anything larger than a few bytes that
those cannot see, declare in `game.json` under `regions`:

```
"regions": [["$80A1", "$8A8A", "graphics", "seventy-five shape bitmaps"],
            ["$EEB8", "$F253", "levels", "the four terrain streams"]]
```

Kinds: `code`, `graphics`, `levels`, `sound`, `text`, `tables`,
`variables`. Declared regions win over every other rule.

## Outputs

`symbols.json` current; `facts.md` and `features.md` current; the coverage
figure and the remaining queue in `TODO.md`.
