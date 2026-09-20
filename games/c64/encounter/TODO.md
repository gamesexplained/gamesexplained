# Encounter — TODO

Current tier: **Silver**. Coverage 100.0 % of 31,707 tracked bytes (6 bytes
bare: the last two of the seven stub JMPs in the title screen).

## For Gold (a human's work)

- Read the How it works page and cut what is dull. The shape-script
  browser shows bytes and tokens; a human who plays the game may want a
  picture of each object at each size instead, which means finishing the
  edge-cell compositor in JavaScript ($AEDB and the mask tables).
- Decide whether the object-table layout (section 04 and facts.md) or the
  reflection trick should lead the page.
- Set `copy` to `human-edited` once the copy has been worked on.

## Open questions worth a session

- Where a shield is lost on a missed gate or a sphere hit: the code path
  found deducts only on the ordinary death routine; the manual says a
  missed gate costs a shield. Play the warp live and count.
- The purpose of $9E31, which toggles the cassette motor bit of $01 every
  frame.
- The meaning of $8460/$8480 (set to 3 per object, no reader found), the
  ring of eight inactive objects 24-31 before an explosion, and the
  sprite frames $CF and $D0-$DB that nothing points at.
- The seven bytes at $9FF9 and the six no-op calls into the title screen:
  compare against another dump of the game (tape original) to see what
  was there.
- Whether the tape version has the same PAL-only check.

## For Platinum

- The listing reassembles only if the shape scripts are emitted from
  $1E00 and the loader is reproduced; no attempt has been made.
