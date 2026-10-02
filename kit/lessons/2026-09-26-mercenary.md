## 0.0.26 · 26 September 2026 · Mercenary · air with Claude

**Try what a test ignores.** Mercenary's lift key matches the player's
map square and the spot inside it against a table of eight lift squares,
and never looks at the height. The eighth entry is the lift on the Colony
Craft, 65 squares up; standing on the ground under it, the same key takes
the player into the Colony Craft, a journey every published solution makes
by flying up. And a building hit by a missile is marked destroyed at once,
while its count, its name and the owner's reprisal wait on a 16-pass
countdown whose routine returns early unless the player is in that square:
fired from the next square, the building falls and the game never notices.
Neither shape is a comparison with the wrong sign; both are tests that
leave something out. `60-verify` now names them: for a lookup, list the
coordinates it does not key on; for deferred work, what it requires of the
player later; then try it in the emulator.

**The hand-over has two traps.** A stopping checkpoint on an address that
a ROM covers fires inside the ROM (here BASIC's number conversion, on the
depacker's address), and a second autostart keeps the first boot's RAM
wherever the loader does not write. `10-orient` says to check `$01` at the
stop or stop first on RAM only, to power-cycle before any boot whose memory
will be read, and, for a packed program, to keep the last hand-over.

**Compute the game's figures the game's way.** Mercenary's craft speeds,
worked out in exact arithmetic from the motion records, came within 1 %
of the table Zzap!64 printed, and were written down as consistent. A port
of the flying step in the game's own two-byte logarithmic floats, which
truncate, with the throttle key that refuses its last step, gave the
magazine's figures to the digit, and a hard ceiling for every craft that
the exact version missed. `60-verify` now says so. The ports that
corrected it were tested in a 6502 simulator on the snapshots, and five
widget agents each wrote their own; the kit now has one,
`kit/c64/cpu6502.js`, with a self-test.
