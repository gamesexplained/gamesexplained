# Lethal Weapon — TODO

Tier: **bronze** until `media.json` exists. The listing has been sampled,
audited and sampled again on a proven model (`game.json`, `accuracy`),
the pages are in the story-first layout with a Graphics tab, and the
reader review is settled except for the items below. `media.json` and the
loading picture need the disk image, which this session did not have.

Next:
- Run `kit/scripts/media.py scan` on the G64, answer every item, draw the
  loading picture on the Graphics tab, then set `tier` to `silver`.
- Graphics: the other stages' sprite files (only stage 1A's are in memory).
- Reader review leftovers: link every named stage, file and enemy to its
  section; draw L4AX's missing slot, SP02, SP23 and the pickups; a player
  for the 18 sound effects (`$F88C`); explain the B stages' doors back to
  L1AX on Maps; the weapon levels behind the three gun sizes; the
  "Riggs fires faster" claim of other versions on Discoveries.

Ideas:
- One frame of play rebuilt from memory with `kit/c64/frame.py`.
- Draw the enemies and pickups on the Maps tab from each overlay's
  records ($3970) and walkers ($3868).
- A player for the 18 sound effects (`$F88C`).
- Name the tune the VGMPF calls "Game Over".
