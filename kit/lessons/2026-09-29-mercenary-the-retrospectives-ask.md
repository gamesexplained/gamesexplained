## 0.0.35 · 29 September 2026 · Mercenary, the retrospective's ask · air with Claude

**The lockstep, in the kit.** Mercenary's port was checked against the
game by a harness written for it, which stayed in the game's gitignored
`work/`: the next Play tab would have started from nothing.
`kit/c64/lockstep.js` now runs any port beside `kit/c64/machine.js`. The
port yields where the game has got to: a checkpoint at each call in the
main loop, a wait for a raster line, or a bare yield for each turn of a
polling loop, on which the game moves on one line. It gives a handler
for each interrupt address. The lockstep stops the game at the port's
checkpoints and names both places when the game goes elsewhere. It runs
the game's interrupts in the port, compares memory at every pass, lets
the game's own code stand in for routines not yet ported, and gives the
timing rows for the pacing fit. Run on Mercenary's own port, 21,000
passes were identical but for the game's own fill race (four passes) and
`$B985`, where the game saves a register the port does not keep (twelve).
They covered the opening from the hand-over, the descent, walking, the
lift to room 8 and the Colony Craft's deck, and the Dart over 92 squares.
Its timing rows gave back the page's fitted cost model to within 1 % a
pass on the ground and on the deck.

**Replay an interrupt on the memory it saw.** A handler run at the end
of a stretch reads what the main program left there, not what the game's
handler read when it came. Mercenary's compass dial stepped once too
often or once too few in 6 of 2,000 passes while the player turned: the
panel interrupt reads the heading the main loop is changing. And a byte
both of them write ended with the interrupt's value where the game's
main program wrote last: `$06`, which the panel interrupt clobbers, in 1
of 900 passes of the descent. Each handler now runs on the bytes the
game's read, at the values it read them, and the game's last writer of
each byte stands. That last is decided only at a checkpoint: at a bare
yield the game may lag behind the port or run ahead of it. Both kinds
of difference went. What remains is the main program reading, mid-stretch,
what an interrupt wrote there, which is the game's own race: Mercenary's
white band, at `$6642` as `facts.md` gives it.

**A pacing fit is only as wide as its sessions.** The same rows put the
page's model 8 % short in a flight across 92 squares, almost all of it in
the object loop, which the fit costs 23 % under what the game takes. The
skill now says to check the fit on every kind of play the page offers.
