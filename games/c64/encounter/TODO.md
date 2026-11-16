# Encounter — TODO

Current tier: **Platinum**, claimed: the Play tab is the whole game, and
air is curating the copy. Coverage 100.0 % of 31,707 tracked bytes (6 bytes
bare: the last two of the seven stub JMPs in the title screen).

## For Gold, and with the Play tab Diamond (a human's work)

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
- The six no-op calls into the title screen: Novagen's cassette has
  the same jumps, so what they were for needs an earlier build or the
  disk release.
- Whether the tape version has the same PAL-only check.
- Why the start samples sprite 3's collision ($9D70, 8 in $C0 on the
  kit's C64, where the sprite parked at X 503 runs on into the left of
  the screen) and takes it from the scenery sprites' X at $B9CB.
- The Play tab's passes cost what the game's do within a few hundred
  cycles, so over the long demonstration the page drifts a frame in
  300 from the C64. A cost model fitted per scene, or the view's
  routines timed by the cells they draw, would close it.
