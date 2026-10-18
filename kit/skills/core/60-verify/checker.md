# The checker's brief

`60-verify` gives this file to every checker: an agent that wrote none
of the listing's comments and checks them against the code. A checker
does one of two jobs. A sample check marks about 60 comments drawn at
random and changes nothing: the run settles its verdicts and makes the
corrections. An audit checks every comment in a range of addresses and
corrects the ones it finds wrong. Send the brief as it is. Below it, add
five things for this game:

- the job, a sample check or an audit, and for an audit where its
  corrections go: unless the run has a reason to do otherwise, a
  `fixes.json` beside the verdicts, a JSON list with one entry for each
  comment or label to change, `address`, `comment` (the whole new
  text), and `label` or `type` (`line` or `side`) only when they change.
  The platform's steps skill says how such a file reaches the
  disassembler (`kit/skills/<platform>/steps`, "fixes");
- the game, its platform and its folder, and the snapshot the listing was
  built from;
- the comments to check, each with its address, label and text (for an
  audit, its range of addresses instead);
- the commands for this platform's references search and its simulator
  (`kit/skills/<platform>/steps`, "references" and "simulator");
- what is established about the program, from `facts.md`: the memory
  map, the conventions the code keeps, and the routines that take their
  arguments from the bytes after a call, to be used rather than worked
  out again.

Tell the checker nothing about which comments are thought to be wrong.

---

You are checking comments from a reverse-engineering write-up of a game.
You wrote none of them. Check each one against the game's bytes and
code, and report every detail you find wrong in a comment, not only the
first: a comment corrected for one wrong detail often has another.

The note below says which job you are doing. In a sample check, mark
each comment and change nothing. In an audit, mark each comment, and
correct every one you mark wrong in the way the note says.

Prefer "unknown" to a plausible guess. Do not mark a comment wrong on a
hunch: show the bytes, instructions or lines that contradict it.

## Where things are

- `listing.json` in the game's folder: one record per instruction or
  data item, with `a` the address (decimal), `l` the label, `c` the
  comment, `t` the type, `b` the bytes, `m` and `o` the mnemonic and
  operands of an instruction (`oa` the operand's address when it names
  one), and for a BASIC line or variable `d`, the text as LIST shows it.
  It is large: load it in a script and take what you need.
- `facts.md` and `features.md`: the write-up's notes on the game. Use
  them, but they are claims too; a comment that contradicts them is worth
  a second look at both.

## What goes wrong in comments like these

Wrong comments are almost never wrong about what a routine is for. They
are wrong in a detail:

- **Callers and readers**: "called from", "only", "nothing reads this",
  "never set", a caller list that misses one or names a wrong one.
- **Bit numbers and masks**: which bit a mask or a run of shifts picks
  out.
- **Register roles**: which register is the height and which the width,
  which holds the row and which the column, high byte or low.
- **Ranges and counts**: off by one ("3 to 6" for 4 to 6), a loop count,
  a table's length, a number of rows.
- **Units**: pixels or character cells, bytes or entries, frames or
  passes of a loop that skips some frames.
- **Conditions that hold only on some paths**: "every", "always",
  "when", a claim true for one caller of a shared routine but not
  another.
- **Generalising from most rows**: a claim about a table that holds for
  most rows but not all; check every row when a comment generalises.
- **What a field means**: a byte named for its first use when the code
  shows it is something else.
- Addresses, decimal values and line numbers that are slightly off.

## For each comment

Check every concrete detail it states. Read the instructions, the bytes
or the lines at and after the address, and follow the values they use.
Three kinds of detail need more than the lines in front of you:

- **Lists and universal words.** For every list of callers, readers or
  setters, and every "only", "never", "every", "always" or "nothing", run
  the references search and compare what it finds, and how many, with
  what the comment says. A claim about a variable holds only if it holds
  at every place that sets or tests it, anywhere in the program.
- **Figures that combine.** A chance, a count or a range that comes from
  more than one test or step: work out the overall figure through every
  branch, and compare it with the one the comment gives.
- **What a routine does when it runs.** When a comment says what a
  routine draws, computes or leaves behind, and it can be run, run it in
  the simulator with arguments its callers pass, and compare the result
  with the comment.

Verdict:

- `right`: every checkable detail holds.
- `wrong-detail`: what the comment is about is right, but at least one
  stated detail is wrong.
- `wrong`: the main claim is wrong.
- `doubtful`: you suspect a detail is wrong but could not settle it. Say
  which detail, why you doubt it and what you checked. A doubt is a
  finding, not a pass: do not mark a comment `right` while you still
  doubt a detail of it.
- `unverifiable`: a detail cannot be checked from the bytes (say which).

## Output

Write a JSON list with one entry for every comment: `address`,
`verdict`, `problem` (every wrong or doubtful detail, in a sentence or
two; empty when right) and `evidence` (briefly, what you checked). Write
it as you go, every ten comments or so, so that nothing is lost if you
are stopped. When all are done, reply with the counts per verdict.
