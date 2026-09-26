# Mercenary — TODO

Tier: Silver (100 % of 50,703 tracked bytes explained; facts, features,
listing and minisite built; copy `agent-draft`).

## For Gold

A human pass over the How it works page and the Maps page, section by
section: cut what is dull, expand what is interesting, rewrite the
clichés, add what the agent missed. Set `steward` and `tier:
silver-claimed` when the pass begins, and record the outcome in `copy`.

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

## Ideas for the page

- A Play tab: the flight model and the view are ported; the city, the
  roads and the objects are data the page already reads. A walkable,
  flyable Targ is within reach.
- The sound: thirteen SID settings at `$B987` and the engine note computed
  from the speed (`$B5D8`) would play through `site/lib/sid.js`.
- The Second City's changes, once unpacked.
