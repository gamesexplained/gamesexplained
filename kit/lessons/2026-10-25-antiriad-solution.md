## next · 2026-10-25 · The Sacred Armour of Antiriad (C64) · air with Claude

- **Play a recording on a port by the game's reads of the input, not by
  the frame.** The Maps page's route is the stick a frame at a time, and
  the Play page's port draws each room at a pace of its own, a few
  frames from the C64's. Given the route frame by frame, the page's Tal
  died at frame 1,250, where the route loses no life. Given each change
  of the stick at the cycle the C64 first read it, the page reached the
  Implosion Mine and parted from the route at frame 11,070, five frames
  behind the C64 by then. Given to Tal's controls (`foot_control`
  `$909C`, `suit_control` `$9383`) read by read, each read the value the
  C64 read at the same read, it played the whole route: its 17 stages in
  their rooms, all 1,954 reads used. The waits that poll for fire read
  as often as they can, so they take the stick by the clock
  (`port/page/solution.js` in that game's folder).
