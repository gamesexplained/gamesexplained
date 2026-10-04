## 0.0.11 · 22 September 2026 · Little Computer People · air with Claude Opus 5.5

**A call can be a jump table that never comes back.** Flow tracing
stalled early, because every behaviour in this game is a state machine
switched by one routine: it pulls its return address, takes the n-th
word of the table that follows the call, and jumps there. A hundred and
three such tables, none with a stored length; each runs up to the next
call site. The coverage skill now describes this beside the calls that
eat an argument and return, says how to find where a table ends, and
names the trap that undoes the work: disassembling a call site again
sends the tracer back into its table. The table that picks the behaviour
was first read as 32 entries and had 128; check such a length against
the values the variable takes live.

**Code can live under the I/O chips.** This game banks them out and runs
code and keeps its dispatch tables in the RAM beneath, which the C64
defaults had taken out of the coverage count as I/O. `coverage.include`
gives such a range back, and the skill says how to spot one:
instructions located in the I/O range, and the bank switch around them.

**Run the control from the same snapshot.** The little person does
things whether or not anyone asked. The emulator replays a snapshot
exactly, random choices included, so the same run without the typed
request shows what he would have done anyway, and any difference is the
request's doing. The flip side is that every run from one snapshot makes
the same "random" choice: one snapshot is one sample.

**Record the music, don't model the driver.** Stepping one frame at a
time and reading the SID after each frame recorded twenty seconds of
each of the eight pieces, which checked two music drivers against what
they actually play. Naming the recorded notes showed the tables are
tuned for NTSC, so a PAL machine plays everything about 0.65 of a
semitone flat; the platform reference now says to find a table's clock
before naming its notes.
