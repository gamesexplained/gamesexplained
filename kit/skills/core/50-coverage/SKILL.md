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
  An address there has one label but two meanings, and each instruction
  sees one of them. `listing.py` names an operand there after the chip's
  register when the instruction lies outside the range, and after the
  game's symbol when it lies inside, since code there can only run with
  the chips banked out; a jump or a call always gets the code's symbol.
  That rule is wrong for code elsewhere that banks the chips out and
  reads or writes the RAM beneath, so go through every bank switch and
  list those instructions in `game.json` under `io`, one row per stretch,
  `["$B275", "$B2F0", "ram", "banked out from $B273 to $B2F1"]` (`registers`
  for code in the range that banks the chips back in; the last row that
  holds the instruction decides). `listing.py <game dir> --relabel` puts a
  change to `io` into `listing.json` without the snapshot. An instruction
  reached both ways keeps one name; say the other in its comment.
  A game in VIC bank 3 can keep graphics there without banking anything:
  the video chip reads the RAM beneath the I/O while the CPU sees the
  chips. Nothing references those bytes by address, so no symbol points at
  them and the ledger never counts them. Whenever `$DD00` selects bank 3,
  look at the snapshot's RAM at `$D000`-`$DFFF` for sprite and character
  data (one run found 64 sprite shapes there only when its page's gallery
  asked for a police ship's frames). `listing.py` names that RAM whenever
  it holds data and `game.json` has not said what it is (below).
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
  1024 bytes for code, for symbols you create yourself and for a symbol
  the disassembler made that you have renamed inside a typed data block
  (bytes, words, text, pointers), and at 64 bytes for any other data
  symbol: one you renamed in memory left undefined keeps the cap, so that
  a renamed variable does not take in the bytes after it. Block boundaries
  cut a span too. A data span also stops at the fixed edges of the memory
  map, `$0100`, `$0200`, `$0400`, `$0800`, `$1000`, `$4000`, `$8000`,
  `$A000`, `$C000`, `$D000` and `$E000`: a table that runs across one of
  them needs a second symbol there, with a comment saying where the whole
  starts. A routine runs on across them. A data table of a few hundred
  bytes under a 64-byte symbol therefore needs a data type and a name of
  your own, or a named symbol every 64 bytes or less, each with its own
  description,
  or most of it stays out of the count however well you have explained
  the whole.

## Data the ledger cannot see

The ledger counts what code, symbols and `game.json` name. Data that
nothing refers to by address is outside the count altogether, neither
explained nor bare, so the work queue never shows it and a game can reach
100 % without it: sprite shapes found through pointers, a picture's
colours, the words of an inline table after a call, the tail of a table
past its symbol's reach, and anything under a default exclusion.

`listing.py` lists it after every build. It names the RAM a platform
default excludes but a game can still use (on the C64, the RAM under the
I/O area) whenever that RAM holds data and `game.json` has not said what
it is. With the hand-over snapshot, `work/entry.vsf` (`10-orient`), it
also lists every stretch of loaded data, the same bytes at the hand-over
and in play, that the ledger neither tracks nor has been told to leave
out. When the listing is built from the hand-over itself (the start-up
code exists nowhere else), give it the play snapshot as the second image:
`--entry work/<play>.vsf`. Before calling 100 %, go through that list and say what each stretch
is: label and describe it, or list it in `game.json` under
`coverage.extra` (authored data), `coverage.include` (RAM under a default
exclusion) or `coverage.exclude` (not the game's, with the reason). One
game reached 100 % with 1.6 KB of its own tables and its picture's
colours outside the count.

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

### Calls whose target is written at run time

A raster interrupt that runs a different routine in each band of the
screen often does it with one `JSR` whose operand it rewrites from a
display list, and a music driver may dispatch its command bytes through
`JMP (table)` with an operand it computes. The tracer reaches none of the
targets. Find what writes the operand, parse every table it reads (and
every table of such tables), and seed the tracer with each entry, checking
that it lands on code; an entry pointing at data is an unused slot. One
game gained 4.5 KB of code from its display lists and 1 KB from its
music driver's three dispatch tables this way. Such an operand is often
assembled as `$0000`, which sends the tracer into zero page
(`tool-regen2000`).

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
- **One scratch folder per agent**, `work/agent<n>/`, named in its prompt.
  Agents write helper scripts, and they reach for the same obvious names
  (`refs.py`, `state.py`): in a shared folder one agent's helper
  overwrites another's halfway through its work.
- **Ask for the report in a file as well**, `work/reports/agent<n>.md`.
  The final message is all the lead sees, and it can be lost from the
  lead's context before the facts are merged.
- **Export every ten minutes while agents write.** A crash of the shared
  disassembler costs every agent's work since the last export;
  `symbols_import.py` rebuilds the session from that export (the tool
  skill). Restart the emulator alone (`tools.py stop vice`): a bare
  `tools.py stop` takes the disassembler with it.
- **Renaming an auto symbol keeps its reach.** A label set over one the
  tracer minted keeps its type, and with it the 64-byte span of an auto
  symbol, so a long table named that way still leaves its tail uncounted.
  Give the tail a label of its own, or describe it from the table's
  start.
- **One figure per agent.** `coverage.py <game> --live --range $2000 $27FF`
  prints the figure and the work queue for one agent's range alone; the
  whole-image queue is mostly other agents' work.
- Agents read into neighbours' ranges for context; ranges prevent write
  collisions, not two agents naming the same thing. Catch that when
  merging.
- Brief them cold, from `brief.md` beside this file: copy it to the
  game's `work/BRIEF.md` and fill it in. It asks for the feature list,
  `facts.md` so far, the rules above, the exact client command with each
  agent's own log, and the report you want back.
- **A brief carries only what has been checked**: traced to the code or
  seen live. The template has two headings for facts. Under "Established"
  each line names its evidence; anything without evidence goes under
  "Guesses", with what would settle it. An agent treats its brief as
  ground truth, so an unchecked guess there costs every agent that meets
  it the time to disprove it. The report asks each agent what became of
  each guess.
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
