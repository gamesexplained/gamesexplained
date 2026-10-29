---
name: 50-coverage
description: The annotation loop. Measure comprehension with the shared coverage metric, work the burn-down queue of largest undescribed runs, export symbols.json after every session. Includes how to split the work across subagents safely.
---

# Measure comprehension, not disassembly

Record your model id in `game.json` under `step_models`, as `"50-coverage": ["<your model id>"]`, exactly as your session names it, and add any model that takes the step over from you: `models.py` reads it to decide whether this game needs a maintainer's check (`kit/CHECKING.md`).

Disassembly coverage flatters you. Bytes can be decoded, labelled, even
commented nearby, and still understood by nobody. The shared metric
(`kit/scripts/coverage.py`) counts a byte as explained only when the
symbol that owns it carries a prose description. Every game is scored the
same way, so tiers mean the same thing everywhere.

## The loop

1. `python3 kit/scripts/coverage.py games/<platform>/<slug> --live`
   prints the figure and the work queue: the largest contiguous
   undescribed runs, largest first, each with why it is still bare.
2. Take the top of the queue. Read the routine or table. Work out what it
   does in terms of the game (what the player sees, which feature in
   `features.md` it serves). Name it. Write a **line comment on its entry
   address** that describes the whole thing: purpose, inputs, outputs,
   side effects, which tables it reads. Callers and readers, and any
   "only", "never" or "every", come from the platform's references
   search (`kit/skills/<platform>/steps`, "references"), with how many
   there are; without the search, leave the claim out. They are the
   details a checker most often finds wrong: the routine in front of you
   shows one caller, and it gets written up as the rule. So is a value
   read off the snapshot: an immediate operand or a variable holds what
   the last store left there, so before you call it fixed, or build a
   table, a page or another comment on it, search for writes to that
   address, the operand's byte included.
   While it is in front of you, note
   anything it would accept that the player was never meant to do: an
   exact match where a range was meant, a comparison that assumes a sign,
   an eight-bit sum that can wrap, an add or subtract with carry
   straight after a call with nothing that sets the carry between (the
   carry the routine returns, on each of its exits, is part of the sum;
   the processor's note has its form, `steps`, "cpu"), a test whose
   order leaves a gap. Put
   the note in `facts.md` as an open question; `60-verify` says how to
   settle it and `70-minisite` what to make of it.
3. Update `features.md` statuses and `facts.md` as facts firm up.
4. Every 30 minutes or so, and at the end of every session:
   `python3 kit/scripts/symbols_export.py games/<platform>/<slug>`, then
   `python3 kit/scripts/listing.py games/<platform>/<slug> work/<state>.<snapshot ext>`
   (the platform's snapshot extension, `kit/skills/<platform>/steps`,
   "snapshot") so the committed listing never drifts from the symbols.
   A later session that has neither the snapshot nor the disassembler
   project (a hosted one starts in a fresh container) can still correct a
   comment or rename a label: edit `symbols.json` by hand, then
   `python3 kit/scripts/listing.py games/<platform>/<slug> --recomment`.
   It changes only the listing's comments and names, and refuses anything
   more (a block, a symbol's address or type, a comment added or removed).
   The project still holds the old text, and its next export would put it
   back, so name each hand edit in `TODO.md` for whoever holds the project
   to carry into it.
5. Repeat until the tier you are aiming for is met.

### When the disassembler does not follow control flow

Where the disassembler walks the code and mints a symbol at every branch
target, the coverage queue is populated for you. Where the annotation
surface is instead a **control file** - typed blocks the disassembler obeys
rather than derives - nothing separates the code from the data for you, and
it has to be done before the loop above can start. A wrong split does not
show afterwards: code typed as data has no cross-references, reads as a
table and is described as one, and coverage still reaches 100 %. The first
such game was published for review with 5.9 KB of its code typed as data.

Two sources, used together:

- **The emulator's executed-address map**: every address the CPU executed
  while you drove the game through the states you could reach (each menu,
  each control, losing, giving up). It finds the code that runs, including
  what only a computed jump reaches.
- **A recursive trace**: decode from every address the map gives, and from
  the entries the map cannot contain (code that ran before the snapshot was
  taken, a handler whose address is only stored in data, an operand another
  instruction writes), follow every branch and call target, repeat. It adds
  the code a static walk can reach that the recorded play never ran.

Everything neither found is data, unless a reference says a routine reads it
as a table.

**Iterate, because a wrong type hides what it calls.** A walk decodes only
what it is given, so a stretch filed as data also hides the routines *it*
calls, and the map sweep on its own will report that stretch as data too.
Repeat the sweep until a pass adds nothing, then believe the total. A single
pass under-reports, and the difference is not a rounding error: see the entry
in `kit/lessons/` for the run that measured both.

**Let a script hold the typing against the map**, and run it again after
every merge of the annotation agents' work. The platform's tool skills say
which commands produce the map, how to turn it into the control file's
format, how to check the result against it, and how to read it back
(`kit/skills/<platform>/`).

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
- **The bytes just before a routine can be its unused start.** When they
  decode as instructions that run straight into the routine, and every
  caller enters past them, type them as code and say so: they are the
  routine's own first instructions, which no caller runs. Left untyped,
  the listing shows them as stray bytes, if at all (`listing.py` names
  them at build time; `games/c64/uridium`, `$16B4`).
- **Resolve every pointer table before excluding a region.** A relocating
  init can leave a block that looks like a stale copy of somewhere else;
  one run excluded 8 KB as "the leftover of the copy at $3E00" and it held
  all 224 shape scripts, which the pointer tables at $9600/$9700 named
  byte for byte. Before a region goes in `exclude`, take every table the
  code indexes as an address (lo/hi pairs, split lo/hi tables) and check
  where its entries land. If any land in the region, it is data.
- **An unpacked load can run on past its own data.** An unpacker that
  stops at the end of its read window, or on a count, goes on decoding
  whatever follows its stream (the next file's packed bytes, a sector's
  filler) with this load's table, and writes the result after the real
  data, where it looks like more of the same. Find where the stream ends:
  trace the unpacker and count what it takes, or compare the same file
  loaded from two disks or sides, which agree on the data and can differ
  after it. Exclude the rest, with that reason, once nothing reads it.
- **A comment a program writes is one claim made for every record.**
  Level data of a known format is quickest described by a script that
  writes each record's comment from templates. Before it writes, test
  each sentence a template produces against the code on every path that
  reads the field: a flag can change which routine reads it, when that
  runs, or whether anything does, and a sentence written from the
  commonest case is wrong for every other. Make the template choose its
  sentence from the record's own bytes (`60-verify` says how such
  comments are sampled).
- **A pace in a comment is a measurement.** "Once a frame" or "every
  20 frames" is what `60-verify`'s "Time it" counts with checkpoints;
  until it has been counted, say what the loop waits on (a raster line,
  a delay routine, a flag its interrupt sets), because a delay routine
  reads as one frame and seldom is one.
- **Runtime state is excluded** from the denominator: stack, screen
  memory, I/O. Authored data nothing references by address (a character
  set, a packed string block) is **added** through the `coverage` object
  in `game.json`. Get these two lists right early; they decide what 100 %
  means for this game.
- **A game can live under its I/O.** On a machine with RAM beneath its
  chips (the platform's `hidden` range in `symbols_export.py`'s
  `PLATFORM_DEFAULTS`), a game can bank the chips out and run code or
  keep tables there, which the platform default excludes as I/O, or keep
  graphics there for the video chip alone. The platform reference says
  how to find it, how to give it back to the count, and how to tell
  `listing.py` which meaning each instruction sees (on the C64,
  `c64-reference`, "Code and tables under the I/O area").
- **Is the picture loaded or drawn?** Compare a snapshot taken before the
  game's first instruction (the loader's hand-over) with one in play. A
  screen or bitmap that is already there before the game runs is authored
  data, to be described; one the game builds is output, to be excluded.
  A plane can contain both. Declare its complete authored extent, then
  exclude only the generated cells or rows. `coverage.include` overrides
  custom exclusions as well as platform defaults: a broad include of the
  whole plane gives the output back. Include only its authored gaps when
  the plane sits under a platform exclusion. Re-run the loaded-data audit
  after changing the scope or recovering code: new operand references can
  split an already described allocation into undescribed aliases.
- **Never bulk-disassemble every labelled address** to "recover"
  coverage. Many labels sit on data; disassembling them misclassifies the
  bytes as code. Undo by setting the data type back to undefined.
- **A gap can hold a different record type.** A frame directory can point
  to a short sprite descriptor followed by animation commands before the
  next frame. Check every other directory and constant pointer load before
  calling the gap unused. Parse the candidate format through its actual
  end and establish a consumer or a live execution check. A spare tuple
  after a counted record can also be a retained extra component: describe
  the read limit and keep its purpose open rather than guessing padding.
- **Unused data is often a feature switched off.** Before calling bytes
  nothing reads unused, test them against the code around them: whether
  another unreferenced table indexes them (its step times its count is
  their length), and whether their values match a constant nearby code
  writes where they would have been read. A table whose reader was taken
  out keeps the reader's shape, and says what the game was meant to do.
- **Bytes no instruction reads may still be read.** The video chip fetches
  its screen, character set, bitmap and sprites from wherever its
  pointers say, and a references search sees none of it. Before calling a
  range unused, check every value that reaches the video chip's pointers
  and bank, including any the loader writes, which a checkpoint on stores
  to those registers during the load shows: a loader can load them from
  the tape like any other byte, and then no instruction names them.
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
  map, the machine's own (`edges` in `symbols_export.py`'s
  `PLATFORM_DEFAULTS`): a table that runs across one of them needs a
  second symbol there, with a comment saying where the whole starts. A
  routine runs on across them. A line comment on bytes no span reaches
  starts a span of its own, as a label there would. Typed data that no
  span reaches is counted bare, and untyped data is not counted at all.
  A data table of a few hundred
  bytes under a 64-byte symbol therefore needs a data type and a name of
  your own, or a named symbol every 64 bytes or less, each with its own
  description,
  or most of it stays bare, or out of the count if it has no type,
  however well you have explained
  the whole. The work queue says which rule left each run bare. "No
  comment on" names the symbol to describe; a run "past" a symbol's
  reach, or after one that "stops" at its block's end or an edge of the
  map, wants a symbol of your own at the run's address.

## A game of several parts

Each part (`15-parts`) has a ledger of its own: give `coverage.py`,
`symbols_export.py` and `listing.py` the part's folder. The game's
figure, `coverage.py <game dir>`, is the sum over its parts, each byte
counted in the part that owns it, and 100 % means every part the game
has a folder for.

A part that lies over another is annotated in one session with it: the
snapshot holds both. `symbols_import.py <part> <snapshot>` puts the
names of the part beneath into the session, so the code the part calls
is readable. Export each part's share from that session:

```
python3 kit/scripts/symbols_export.py games/<platform>/<slug>/parts/<level>
python3 kit/scripts/symbols_export.py games/<platform>/<slug>/parts/<engine> --from games/<platform>/<slug>/parts/<level>
```

The export says when the session holds a label or a comment of yours at
an address the part does not own and no other part has it: export the
part that owns it, or it is lost. Build the listing of the part beneath
from any snapshot that holds it, and of each part over it from that
part's own. `listing.py` names what the part calls by the names of the
part beneath, and `check_listing.py` says when one of those has changed
(`listing.py <part> --relabel`, no snapshot needed).

The session traces the code of the part beneath as well, and where that
code refers to an address in this part's ranges the disassembler mints an
automatic symbol there. Where the part beneath wrote that address in its
own load (its own routine or table, which this part's load replaced), the
name is one this part's own code may never use. The export from a live
session, and `coverage.py --live`, leave out each of those that only code
another part owns refers to, and the export says how many; a label of
yours stays. An address the part beneath never wrote is kept, since code
beneath that refers there means what this part holds (a level's entry, its
tables). An export from a project file cannot ask what refers to what, so
it keeps them all: export from the live session.

## Data the ledger cannot see

The ledger counts what code, symbols, data types and `game.json` name.
Untyped data that nothing refers to by address is outside the count
altogether, neither explained nor bare, so the work queue never shows it
and a game can reach 100 % without it: sprite shapes found through
pointers, a picture's colours, the tail of a table past its symbol's
reach, and anything under a default exclusion.

`listing.py` lists it after every build. It names the RAM a platform
default excludes but a game can still use (on the C64, the RAM under the
I/O area) whenever that RAM holds data and `game.json` has not said what
it is. With the hand-over snapshot, `work/entry.<ext>` (`10-orient`; the
extension is the platform's snapshot form, from `PLATFORM_DEFAULTS`), it
also lists every stretch of loaded data, the same bytes at the hand-over
and in play, that the ledger neither tracks nor has been told to leave
out. When the listing is built from the hand-over itself (the start-up
code exists nowhere else), the list holds every untracked stretch in it;
give it the play snapshot as the second image, `--entry work/<play>.<ext>`,
to leave out what play overwrites. Before calling 100 %, go through that list and say what each stretch
is: label and describe it, or list it in `game.json` under
`coverage.extra` (authored data), `coverage.include` (RAM under a default
exclusion) or `coverage.exclude` (not the game's, with the reason). One
game reached 100 % with 1.6 KB of its own tables and its picture's
colours outside the count. `listing.json` keeps the list as
`uncounted`, `coverage.py` prints it under the figure, and
`check_listing.py` fails a game at Silver or above that has any left.

Data the start-up copies elsewhere (out of the way of the I/O area, under
a ROM, into another bank) differs between the images at its own address,
so the list also looks for it at another: an untracked stretch of 32
bytes or more in play that the hand-over holds somewhere else is listed
with both addresses ("copied here after the hand-over"). One game reached
100 % with half a kilobyte of moved graphics outside every span before
the list did this. A copy the start-up changes on the way (unpacked,
shifted, interleaved, or built from pieces) matches nowhere, so follow
the start-up's copy loops to their destinations as well, and check each
against the ledger.

## Interpreted programs and code loaded as level data

If a CPU trace reaches an interpreter or calls into a loaded level,
follow the program it dispatches too. Read [compiled-programs.md](compiled-programs.md)
for operand decoding, branch checks and separate loaded-image meanings.

## Inline parameters: the reason a flow disassembler stalls

When control-flow disassembly reaches a few thousand bytes and stops, and a
scan of every call and jump target inside the code it did find turns up
nothing new, the rest is not all data. Look for a routine that takes its
own return address off the stack, reads what follows the call through it,
steps past that and goes on from there. The processor's note shows the
shape in its own instructions (`kit/skills/<platform>/steps`, "cpu").

A call to that routine is followed by an **argument**, not an instruction,
and the disassembler walks straight into it, decodes it as code and shifts
everything after it. Find every call site of every such routine, type the
argument bytes as data, and restart the disassembly at the resume point.
One pass of this can double the tracked image.

Give each argument a label or a comment of its own, saying what it is.
The ledger counts an argument typed as data as bare until it has one, so
the work queue lists every argument still to describe.

The same shape hides more than one routine: look for a family of wrappers
built on one or two stack-unwinding primitives, and check each for the
number of inline bytes it eats, which need not be the same.

### Inline jump tables that never come back

A variant has no resume point: an "on n go to". The routine takes its
return address, picks the n-th word of the table that follows the call
and goes to the handler it names, and control never returns to the call
site. How a word names its handler is the processor's: on one it is the
address itself, on another the address **minus one**, and a target read
the wrong way lands a byte out (`steps`, "cpu"). A state-machine game
can have a hundred such tables, one per behaviour, and flow tracing stalls
at every one of them.

- Find every call to the routine (and to each entry that loads n from a
  different place first) with a byte scan of the whole image, not just the
  traced code.
- The table's length is not stored. It ends where the next call site
  begins, at a handler that nearly every table ends with, or at the first
  word whose target is not code. When testing a target, accept
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

An interrupt that runs a different routine in each band of the screen
often does it with one call whose operand it rewrites from a display
list, and a music driver may dispatch its command bytes through an
indirect jump with an operand it computes. The tracer reaches none of the
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

One agent is the default, and a split buys accuracy, paid for in
tokens (`AGENTS.md`, "Subagents", and the test in
`kit/lessons/2026-10-18-helpers-accuracy.md`). Split only when the
contributor said, in the message that started the run, that it may use
several agents (`kit/START.md`), whatever the size of the game: one
agent to a part when the game is several parts (below), otherwise one to
each range of what is left after your own first pass.

Annotate first yourself, then split. Take the main loop, the interrupt
handlers, the core variables and the naming conventions to described
before anyone else starts: the brief's "Established" list is then short
and checked, and the agents inherit names instead of inventing rival
ones. Start at most four agents, and no more than the contributor
allowed; when they leave the number to you, start two, which did as
well as four for fewer tokens. Give the ranges about the same work,
data to decode as well as code: a range that holds most of the level
and sound data can take longer than one agent takes for the whole step.
When you do split, what matters:

- **One shared disassembler.** Concurrent reads are safe; concurrent
  writes are safe only if agents own **disjoint address ranges**.
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
  skill). Restart the emulator alone (`tools.py stop <emulator>`, by the
  name `tools.py status` gives it). A bare
  `tools.py stop` leaves the disassembler up while its logs are newer
  than the export, and says so; `--force` is for a session you mean to
  lose.
- **One figure per agent.** `coverage.py <game> --live --range $2000 $27FF`
  prints the figure and the work queue for one agent's range alone; the
  whole-image queue is mostly other agents' work.
- Agents read into neighbours' ranges for context; ranges prevent write
  collisions, not two agents naming the same thing. Catch that when
  merging.
- **Find the loaded data before you split the image.** Go through the
  list in "Data the ledger cannot see" before choosing the ranges, not
  only before calling 100 %: found first, the data is a range in a brief,
  and not work left at the end for the lead alone.
- Brief them cold, from `brief.md` beside this file: copy it to the
  game's `work/BRIEF.md` and fill it in. It asks for the feature list,
  `facts.md` so far, the rules above, the exact client command with each
  agent's own log, and the report you want back.
- **A brief carries only what has been checked**: each fact under
  "Established" names its evidence, and the rest goes under "Guesses"
  (the template's opening comment says why).
- **A game of several parts splits by part before it splits by range**:
  one agent to a part, each with a disassembler of its own on that
  part's snapshot. The platform's tool notes say how several run at
  once. Give each agent its part's folder, and have every command name
  it: a command that names no folder reaches whichever session the clone
  started last, and an export from the wrong session writes one part's
  names into another's map.
- **An agent stopped by the account's usage limit keeps its context.**
  When agents stop on the limit, export at once, wait for the reset and
  resume each agent with a message (the harness's resume, not a new
  agent), telling it what is already in the disassembler. A new agent
  rereads its range from nothing.
- **An account that pays by credit can fail every agent at its first
  call**, and on every retry: one run's four agents got
  `402 payment_required` because the runner asked for 128,000 tokens the
  balance could not cover, and one also met the account's cap on
  requests in flight, below five. Before a fan-out on such an account,
  check the balance, start fewer agents, and lower the runner's
  `max_tokens` where it has the setting. An agent that failed at its
  first call left nothing to resume.
- **Correct the brief the moment a fact in it turns out wrong**, and say
  in it that it was corrected. Agents still running read the old line,
  and their reports will contradict it.

## Declare what the bytes are

The About tab draws the game's footprint in the machine's memory and
counts code, graphics,
level data, sound, text, tables and variables. The build classifies
from the listing (code, text, data), the video bases in
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
