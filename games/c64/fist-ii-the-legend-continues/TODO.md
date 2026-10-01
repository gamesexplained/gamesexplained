# Fist II: The Legend Continues — TODO

Tier: **Silver, claimed** by unorig on 1 October 2026 for the Gold pass
(100 % coverage, 63,256 tracked bytes; facts, features, the Overview,
Gameplay, Maps and solution, Graphics, Music and Discoveries
tabs; copy `agent-draft`).

For Gold, a human pass over every tab, section by section.

Worth doing, found in the run and not done:

- A pose viewer: build each of the 73 poses from its nine images
  (`$B210`, `$1C0F`) and step through the 44 move scripts (`$AF46`).
- The samples: play the ten samples (`$3DB8`).
- Live tests not run: area 5 without scroll 8; the ending scene from room
  `$7A`; setting `$0455` to 0 for a second joystick; combination 8's store
  into the hero's slot; readers of the head sprites at `$B746`.
- The solution: drive the legs the search found and the emulator has not
  run: scroll 3 (room 114, from the stairs of room 113), the crevice in
  room 79 (from room 43's ladder at 88, somersault over 18-24 with scroll
  6), scrolls 7 and 5 and the ending; then win the fights instead of
  switching them off. The route is on the Maps and solution tab;
  `solver/README.md` has the tools.
- Maps: the world map draws every room's scenery from the game's tables;
  only the outdoor sets were checked against screenshots (rooms 94 and
  100). Compare a set 0 room (caves, rooms 0-59) with the emulator, and
  draw the barriers that a scroll or a kick removes in their broken state
  once that is known (`restore_item_shapes`, `$0B2B`).
- symbols.json: `$0491` and `$0492` are the blink count and the scroll
  icon of `blink_icons` (`$2D57`); their comments still say "meaning not
  traced".
- The Training program: a separate load (`LOADIT`, the `TNK` files).
- The Overview has no reception or developer quotes: the review pages
  were refused in this environment. Commodore User, November 1986 (Ken
  McMahon, 8/10) and Zzap!64's interview with Gregg Barnett (October 1986)
  are known to exist; scans are needed to quote them.
- Compare the cassette release with the disk: a Lemon64 player
  describes the late-game respawns on the tape version, and the code read
  here is the disk's.
