## 0.0.39 · 29 September 2026 · Chiller, the Gold pass · unorig with Claude

**"Unreachable" is a claim about your search.** Chiller's Silver page led
with a bug: three crosses on the way home that no player could take. The
evidence was a reachability search over a model of the movement code,
checked live on one column. The steward played the Play tab's port
through all ten levels and took every cross. On the game's own code the
boy takes each of the three by walking left along the ground:
`try_move` tests a cell one or two rows below his own, which the model left out.
`60-verify` now puts "unreachable" among the negative results and says
to search with the game's own movement code on the simulator, or with a
port checked in lockstep, before writing it.

**Bytes the interrupt writes, read by read.** The Play tab's lockstep
matched 357 of 366 sessions once the port read the KERNAL's jiffy clock,
key code and shift flag through one function fed with every value the
game read in each stretch, in order. Fed only the first, later reads
were stale and the passes drifted. The other nine sessions are the
game's raster wait reading the line and `$D011`'s bit 7 in two
instructions, with the interrupt between them. `70-minisite` says both.
