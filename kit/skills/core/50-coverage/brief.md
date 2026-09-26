# Brief: <title> (<platform>), annotation agents

<!--
The template for the brief a lead gives its annotation agents
(SKILL.md beside this file, "Splitting the work across subagents"). Copy
it to the game's work/BRIEF.md, replace every <...>, and delete this
comment. One brief serves every agent; each agent's prompt adds only its
number and its range.

The facts go under two headings, and the difference between them is the
point of the template. A line under "Established" names its evidence: the
address of the code that shows it, or the live test that showed it. A
line with no evidence goes under "Guesses", however likely it looks. An
agent takes its brief as ground truth, so an unlabelled guess costs every
agent that meets it the time to disprove it, or gets built on.
-->

You are one of several agents annotating one game in a shared
disassembler, each on its own **disjoint address range**. Your number and
your range are in your prompt. The game folder is
`games/<platform>/<slug>` (GAME below); work from GAME/work.

## The game

<Two or three sentences: what the player does, who made it and when, which
image this is.> Read these first, they are short: GAME/features.md (what
the game is documented to do), GAME/facts.md (what the code has shown so
far), GAME/orientation.md (the machine state, and how the snapshot was
reached).

## Established

Each line says how it is known: traced, with the address of the code that
shows it, or live, with the test that showed it.

- <Memory: what lives where.> (traced: <address>)
- <The screen: where its memory and graphics are, and how a frame is
  built.> (live: <test>)
- <The main loop and the interrupt handlers.> (traced: <address>)
- <Idioms the agents will meet: routines that take inline arguments, jump
  tables, operands written at run time, instructions the disassembler shows
  as data.> (traced: <address>)
- <What is already typed and described, so that nobody does it twice.>

## Guesses

Readings nobody has checked, each with what would settle it. Do not build
on one. If your range settles it, say so in your report, with the
evidence.

- <A likely reading nobody has tested.> Settled by: <what to look for>.

## Rules

- **Your range is yours to write; everything else is read-only.** Read
  anywhere for context. Never label, comment, type or disassemble an
  address outside your range: other agents are writing there now.
- **Prefer "unknown" to a plausible guess.** A description that says "not
  known" beats an invented purpose. Name what the code does, not what the
  box says, unless the code proves it.
- **Distrust your own negative results.** "Nothing references this" is a
  claim about your search. Indexed, indirect and self-modified accesses
  exist, and so do instructions the disassembler shows as data.
- <The emulator: whether agents may use it; usually not, and never start
  or stop a tool.>
- **Do not edit** game.json, facts.md, features.md, symbols.json or any
  file outside GAME/work. What you learn goes in your final report.
- **Your own folder for helper scripts**: GAME/work/agent<n>/. Other
  agents are writing helpers at the same time, under the same obvious
  names.
- **Never commit**, and never copy image or snapshot data outside
  GAME/work.

## Tools

The disassembler, through its client with your own log (the platform's
tool skill has the details):

    python3 kit/<platform>/r2000.py --game GAME --log annotations-<n>.jsonl <tool> '<json>'

The log is how the session is rebuilt after a crash, so every change goes
through it. Addresses in the disassembler's arguments are <in which form>.

- `python3 kit/scripts/coverage.py GAME --live --range <lo> <hi>`: your
  range's figure, and its largest undescribed runs.
- <How to read the snapshot's memory directly, for fast scans.>
- <Helper scripts in work/, one line each.>

## What "explained" means

A byte is explained when the symbol that owns it carries a non-blank line
comment, and a symbol owns only so many bytes (the coverage skill, "Know
how far a description reaches"). Comment each routine's entry, not its
branch targets; give a long table a data type and a name of your own, or
a label with its own description at least every 64 bytes. An identical
comment counts once, so make every description specific.

## How to work

1. Run the coverage command on your range and read the largest
   undescribed runs first.
2. For each routine: what it does in the game's terms, and which feature
   it serves. Label it and write a line comment on its entry: purpose,
   inputs, outputs, side effects, the tables and variables it reads and
   writes.
3. For each variable or table: what it holds, its range of values, who
   writes it and who reads it. Type tables with the right data type.
4. Untraced bytes in your range: find out what they are before you type
   them. Code reached only through a table, a jump written at run time or
   an inline argument has to be disassembled explicitly. Never
   bulk-disassemble labels; never disassemble data.
5. While a routine is in front of you, note anything it accepts that the
   player was never meant to do (an exact match where a range was meant,
   an eight-bit sum that wraps, an unchecked index), as an open question
   with its address.
6. At 100 % of your range, re-read your own names and comments for claims
   you did not check, and soften or fix them.

## Your final report

Your last message is all the lead sees. Write it to
GAME/work/reports/agent<n>.md as well, before you send it.

1. Your range's final coverage figure.
2. What the range holds: the subsystems, the key routines and tables,
   with addresses.
3. Facts for facts.md, each with the address that proves it.
4. Features from features.md you found implemented, and where; features
   you looked for and did not find, and how you looked.
5. **The brief's guesses**: each one you met, and whether your range
   confirmed it, refuted it or left it open, with the evidence.
6. Open questions and oddities, with addresses.
7. Proposed `regions` entries for game.json (`[start, end, kind,
   description]`) for anything larger than a few bytes.
8. Symbols outside your range whose meaning you worked out: the address,
   a proposed name, the meaning and the evidence, so that the owner can
   use it.
