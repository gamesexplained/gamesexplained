## 0.0.7 · 20 September 2026 · Encounter · air with Claude Fable 5.1

**A pointer table is the census of a region.** The init of this game
moves 8 KB of shape scripts from `$3E00` down to `$1E00` and then reuses
`$4000-$5FFF` as character buffers. The block at `$1E00` was excluded from
coverage as "a leftover copy" until the shape-pointer tables were resolved
and every entry landed in it. The coverage skill now says: before a
region goes in `exclude`, resolve every table the code uses as addresses
and see where the entries land.

**When a key does nothing, try the other input tool before blaming the
game.** The matrix tool reported SPACE pressed and the game's pause loop
never ran; the host-key tool reached it on the first try. The vice-mcp
notes now carry the case, with the rule that a hit counter on the routine
that should react is the instrument, not the tool's own status report.

**Registers at a stopping checkpoint are not the values the instruction
saw.** The accumulator read 0 at a `cmp` the game had just executed with
$FF. Count hits or read what the routine wrote; do not quote registers.

**Read the register bits in binary before naming a character set.** A
`$D018` value was decoded as "charset at `$7000`" by mental arithmetic, and
an hour of description of a "second character set" followed before a
sub-agent redid the bits. The platform reference now carries a worked
example.
