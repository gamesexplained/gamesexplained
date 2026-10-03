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
  can really be taken (facts.md, "Corner cases") and let the end screen be
  seen live and captured for the page.
- **The two-guardian case.** The collision test kills only on Mr Hat
  plus exactly one guardian. Staging two guardians on him in one frame
  needs both sprites enabled in that frame; the rooms switch them on and
  off, and the attempt in `work/twotouch.py` could not hold it.
- **A Play tab.** The rooms are copies of one template, which makes a
  port of the main loop, the walk, the jump and the ladder reusable
  across rooms; nothing of it is started.
- **Who patched the `$D022` stores.** A second copy of the game (another
  crack, or the issue 14 reissue) compared byte for byte would tell
  whether the disabled doors and fills are Chiola's or a cracker's.
- Article ideas: the
  title tune's unused order entries; the Supermon copy, and why a monitor
  would ride along in a magazine game.
