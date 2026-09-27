# Mercenary — TODO

Tier: Silver (claimed by air; 100 % of 50,703 tracked bytes explained; facts, features,
listing and minisite built; copy `human-edited`, the steward's pass under way).

## For Gold

A human pass over the How it works page and the Maps page, section by
section: cut what is dull, expand what is interesting, rewrite the
clichés, add what the agent missed. The pass is under way (`steward`: air,
`tier: silver-claimed`); record the outcome in `copy`. Two parts arrived
after it began and are agent-written, not yet read by the steward: section
04 of the How it works page (the craft that fly without you) and the Play
tab's four sections (the mod, the port, the speed, the differences).

At a phone's width (390 px) the How it works page scrolls sideways by
about 19 px: the Outside the city table and the lift section's code lines
are wider than the column.

## For Platinum

Reassemble the listing byte for byte to the analysed image. The start-up
code exists only at the hand-over, and the build is a crack: a Platinum
build would reproduce the crack's image, or be made from the original
disk's memory at the same point (`work/orig-entry-5000.vsf`: five places
differ, `orientation.md`).

## Open questions

- *The Second City*: the disk's `MERC 2ND CITY` has not been unpacked. The
  code's side is traced: after a load, `JMP ($BFFD)` runs whatever the file
  put in the zero-page copy. Whether it replaces the city tables
  (`$2600`-`$2FFF`), and whether the eight unused road pieces at `$E000`
  are for it, is open.
- What `$BEBD` was meant for: only the unused script operations 22 and 23
  touch it.
- Why canned messages 10, 11, 13, 14, 22 and 36 exist when nothing prints
  them.
- The hire path with too little money (`$0E6F`, INSUFFICIENT FUNDS) was not
  run live; a Zzap!64 15 reader reported a crash there.
- Room `$51` (the prison): door 0 can never match (`$9456`); whether a
  player can leave it by another way was not tried.
- After an escape and CTRL + Q, `$BEFE` stays set: boarding craft 7 again
  should launch without Y (not tried).
- From some viewpoints within about 2,000 units of the brother-in-law's
  ship, the game's frame (drawn by its own code in the simulator) has a
  line of stray pixels along the view's bottom row; farther away it does
  not. The cause is not traced: a clipped edge of the ship's model is the
  first thing to check.

## Ideas for the page

- The sound on the How it works page: thirteen SID settings at `$B987` and
  the engine note computed from the speed (`$B5D8`) would play through
  `site/lib/sid.js`. The Play tab plays them already, as the game does.
- The Second City's changes, once unpacked; the Play tab could then load
  it.
- The Play tab shows the port's case of the game's two interrupt races
  (the Play page, section 02). Running the interrupts inside a step, at the
  cycle the cost model puts them, would show the black band too.
