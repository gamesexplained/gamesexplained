## next · 9 October 2026 · Mayhem in Monsterland · Vai with Claude

**After a full audit, sample again and aim the next pass at what the
sample names.** The first independent check of 80 comments found 12
wrong, and an audit of every comment followed. A second sample of 80
then found the parts written by one agent each clean and the engine, the
work of three agents and two auditors, still wrong in 9 of 36: loop
bounds read without the instruction that ends the loop, a second case
left out, and indexed accesses credited only to the address the operand
names. A second audit of the engine alone, briefed with those patterns,
rewrote 344 comments, and a third sample of 40 found 3 wrong. A whole
listing is not uniformly good or bad after an audit: the samples say
where the rest of the errors are, and only a sample after the next pass
says whether it worked.

**Check a "nobody can reach it" before publishing a bug.** The score
routine misses the extra life when a 100,000-point award carries the
score past a million, and the simulator proved it. The only award of
100,000 is a bonus paid when the clock reads 000 as the stage-complete
screen opens, and the clock stops when the finish line is crossed, so
no route to the bug was found. The page reports it as a bug in the code
with no known route in play; written from the score routine alone, it
would have told readers to go and find it.

**A late bad line moves the whole screen by the fetches left in the
line.** A game that scrolls by VSP writes `$D011` so that a line becomes a
bad line after cycle 14; the video chip then counts the screen position
up for each fetch cycle left in that line, and every row below starts
that much further on. A renderer that tests for bad lines only at cycle
14, and adds a fixed 40 at the row's end, draws such a game one or more
characters out. Compare a recorded frame of a VSP game with the
emulator's picture before trusting the drawing.
