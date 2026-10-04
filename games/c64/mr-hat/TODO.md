# Mr. Hat — TODO

Current tier: **Silver** (100 % coverage, `facts.md`, every feature
confirmed, traced or open with what was tried, the minisite built,
copy `agent-draft`, coverage and verify on `claude-opus-5-5`, a proven
model).

For **Gold**, a human pass over the How it works page, section by
section: cut, expand, rewrite; set `steward` and `tier` to
`silver-claimed` when it starts.

Open work, by value:

- **Play the way through.** The code gives the pieces (room 1's black
  object, room 2's candle, room 5's switch and object, room 8's key, room
  11's block and the Golden Hat), but nobody has played from room 1 to
  the end here. A route a reader can replay would settle which pickups
  can really be taken (facts.md, "Corner cases"). The end screen was
  reached by placing Mr Hat in room 11, not by play.
- **The two-guardian case.** Each collision test compares `$D01E` with
  its own list of exact values, and most lists hold only Mr Hat with one
  guardian; only room 1's `$1F70` also takes `$58`, Mr Hat with sprites 3
  and 6. So two guardians touching him in the same frame should not kill
  elsewhere. Staging it needs both sprites enabled in that frame; the
  rooms switch them on and off, and the attempt in `work/twotouch.py`
  could not hold it.
- **A Play tab.** The rooms are copies of one template, which makes a
  port of the main loop, the walk, the jump and the ladder reusable
  across rooms; nothing of it is started.
- **Issue 6's copy.** The disk studied is issue 14's, a freezer backup
  with the title font damaged and the `$D022` stores switched off. The
  first printing, issue 6 (September 1988, a disk with a `COVER` menu),
  compared byte for byte would tell whether the damage and the
  switch-offs were already there, and whether the ladder was drawn as it
  is (facts.md, "Versions").
- Article ideas: the
  title tune's unused order entries; the Supermon copy, and why a monitor
  would ride along in a magazine game.
