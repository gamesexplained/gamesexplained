## next · 2026-11-03 · Lords of Chaos (ZX Spectrum) · air with Claude

- **Trace a routine's callers before saying what sets it off.** The
  scenarios' trip squares were annotated as releasing their waiting
  creatures "when a creature steps there", which is what the table looked
  made for. trip_square (`$A716`) has two callers: use_square, after a
  chest is opened, and set_terrain_under, which every change of terrain
  goes through, a door unlocked, opened or closed among them. Stepping
  onto the square does nothing. The comment stood in two places in every
  scenario's listing until the Maps page's test changed each of the
  1,296 squares of each map through the game's own routine and compared
  the groups it woke with the page.
- **Read a table the way the game reads it, with no stop at its end.**
  Scenario 2's routes 0, 2 and 6 name waypoint 28 in a table of 28
  (0 to 27). waypoint_square (`$9971`) adds twice the number to the
  table's start without a check, so the game reads the next table's
  first two bytes, row 8, column 7, a square of rock wall no creature but
  a ghost can stand on, and a creature on those routes never passes it.
  A page that had checked each index against the table, or a decoder
  that stopped at the table's length, would have drawn the routes
  without the bug. Read every index as the routine does, and flag one
  past the table's end.
- **A written list of cases is where hand comments go wrong.** The
  verify sample (seed 7061) found 12 wrong among 60 written comments and
  none among 20 a decoder wrote. Six of the twelve were lists left short:
  what a hook receives "for everything else", the users of a variable,
  the bits a routine clears. Before writing "everything else goes to" or
  "used by", list the branches or the references from the code, not from
  memory of it.
